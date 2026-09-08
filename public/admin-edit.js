/**
 * In-context edit mode — the *only* way to edit site copy and a post's own
 * metadata. There is no separate admin form for any of this: what you see
 * here is what gets saved, with no hand-written field labels standing
 * between you and the actual content.
 *
 * Loaded on every public page, but does nothing at all unless the
 * (non-httpOnly, no privilege of its own) qp_admin_hint cookie is present —
 * real authorization happens server-side on every save, via the actual
 * session cookie.
 *
 * Four kinds of editable thing, converging on the same pending-changes
 * state and the same Save bar:
 *   [data-copy-key]                    plain text, click to edit in place
 *   [data-copy-key][data-copy-template] a {count}/{total} template — click
 *                                        shows the raw template to edit,
 *                                        then re-renders the interpolated
 *                                        preview
 *   [data-copy-key][data-copy-attr]    an attribute (e.g. an input's
 *                                        placeholder) rather than text
 *                                        content — click prompts instead
 *   [data-copy-key][data-copy-image]   an image — click opens a file
 *                                        picker, uploads immediately (its
 *                                        own request, not batched into
 *                                        Save), and the resulting URL
 *                                        becomes this key's pending value
 *   [data-issue-key]                   a post's own metadata (concept
 *                                        title/character, post title/
 *                                        subtitle/quote/ruling) — same as
 *                                        copy keys, but saved to
 *                                        concepts.ts + this post's
 *                                        frontmatter instead
 *
 * [data-copy-key]/[data-issue-key] namespaces never collide ("site.*"/
 * "nav.*"/etc. for copy vs "concept.*"/"post.*" for issue fields), so they
 * share almost all of the same logic and only branch apart at save time,
 * into whichever of two endpoints the changed keys belong to.
 *
 * Deliberately still not covered: a field with no existing value on the
 * page has nothing to click (there's no "add a quote that doesn't exist
 * yet" here), creating a brand-new post (no page exists to click-edit on),
 * and post body prose (rendered MDX -> editable rich text -> Markdown
 * round-tripping is a separate, much bigger problem). Those live on
 * /admin — which this script also links to from the site nav, so it's
 * reachable without knowing the URL, but only for whoever has the hint
 * cookie.
 */
(function () {
  "use strict";

  var HINT_COOKIE = "qp_admin_hint";
  var COPY_SAVE_URL = "/api/admin/save-copy";
  var ISSUE_SAVE_URL = "/api/admin/save-issue";
  var UPLOAD_URL = "/api/admin/upload-image";
  var FIELD_SELECTOR = "[data-copy-key], [data-issue-key]";

  function hasHintCookie() {
    return document.cookie.split("; ").some(function (c) {
      return c.indexOf(HINT_COOKIE + "=") === 0;
    });
  }

  if (!hasHintCookie()) return;

  // an "Admin" nav link, only for whoever has the hint cookie — inserted
  // rather than server-rendered-and-hidden so regular visitors' HTML never
  // contains it at all. No inline styling: it's a plain <a> dropped into
  // the real nav, so the site's own `.site__nav a` rules style it exactly
  // like "Compendium"/"Simulations"/"RSS" already sitting there.
  function addAdminNavLink() {
    var nav = document.querySelector(".site__nav");
    if (!nav || nav.querySelector('a[href="/admin"]')) return;
    var link = document.createElement("a");
    link.href = "/admin";
    link.textContent = "Admin";
    nav.insertBefore(link, nav.firstChild);
  }
  if (document.body) addAdminNavLink();
  else document.addEventListener("DOMContentLoaded", addAdminNavLink);

  function format(template, vars) {
    return template.replace(/\{(\w+)\}/g, function (match, key) {
      return Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match;
    });
  }

  var editMode = false;
  var originals = new Map(); // element -> current baseline value (raw template for template fields; for change detection + live-sync)
  var pending = new Map(); // key -> new value (copy AND issue keys share this — namespaces don't collide)

  var style = document.createElement("style");
  style.textContent =
    "html.qp-edit-mode [data-copy-key],html.qp-edit-mode [data-issue-key]{cursor:text;}" +
    "html.qp-edit-mode [data-copy-key]:hover,html.qp-edit-mode [data-issue-key]:hover{outline:1px dashed #22c4f0;outline-offset:2px;}" +
    "html.qp-edit-mode [data-copy-key].qp-editing,html.qp-edit-mode [data-issue-key].qp-editing{outline:2px solid #ffd23f;outline-offset:2px;background:rgba(255,210,63,0.1);}" +
    "html.qp-edit-mode [data-copy-image]{cursor:pointer;}" +
    "[data-copy-image].qp-uploading{opacity:0.6;pointer-events:none;}" +
    ".qp-upload-status{font-family:monospace;font-size:0.72rem;color:#9aa0b8;}";
  document.head.appendChild(style);

  function getKey(el) {
    return el.dataset.copyKey || el.dataset.issueKey;
  }
  function isIssueKey(key) {
    return key.indexOf("concept.") === 0 || key.indexOf("post.") === 0;
  }
  function allTextElements() {
    return Array.prototype.slice.call(document.querySelectorAll(FIELD_SELECTOR));
  }
  function baselineValue(el) {
    if (el.dataset.copyImage === "true") {
      var img = el.querySelector("img");
      return img ? img.getAttribute("src") || "" : "";
    }
    return el.dataset.copyTemplate === "true" ? el.dataset.copyRaw : el.textContent.trim();
  }

  function snapshot() {
    originals.clear();
    allTextElements().forEach(function (el) {
      originals.set(el, baselineValue(el));
    });
  }

  // true page-load values, captured once — used to decide whether a key is
  // "actually changed" even across multiple edit-mode sessions in one visit
  var initialValues = new Map();
  allTextElements().forEach(function (el) {
    var key = getKey(el);
    if (!initialValues.has(key)) initialValues.set(key, baselineValue(el));
  });

  function cssEscape(s) {
    return window.CSS && CSS.escape ? CSS.escape(s) : s.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  // ---- floating controls ----
  var toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.textContent = "✏️ Edit";
  applyFixedStyle(toggleBtn, {
    bottom: "1rem", right: "1rem", background: "#22c4f0", color: "#0b0e1a",
    fontWeight: "bold",
  });

  var saveBar = document.createElement("div");
  applyFixedStyle(saveBar, {
    bottom: "1rem", left: "50%", transform: "translateX(-50%)",
    background: "#131829", color: "#ece7d9", border: "2px solid #22c4f0",
    display: "none", alignItems: "center", gap: "0.75rem", padding: "0.6rem 1rem",
  });
  var countEl = document.createElement("span");
  var discardBtn = document.createElement("button");
  discardBtn.type = "button";
  discardBtn.textContent = "Discard";
  Object.assign(discardBtn.style, { background: "none", border: "1px solid #9aa0b8", color: "#ece7d9", padding: "0.3rem 0.6rem", borderRadius: "4px", cursor: "pointer", fontFamily: "inherit" });
  var saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.textContent = "Save";
  Object.assign(saveBtn.style, { background: "#22c4f0", border: "none", color: "#0b0e1a", padding: "0.3rem 0.8rem", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", fontFamily: "inherit" });
  saveBar.appendChild(countEl);
  saveBar.appendChild(discardBtn);
  saveBar.appendChild(saveBtn);

  function applyFixedStyle(el, overrides) {
    Object.assign(el.style, {
      position: "fixed", zIndex: "99999", fontFamily: "monospace", fontSize: "0.85rem",
      border: "none", borderRadius: "6px", padding: "0.6rem 1rem", cursor: "pointer",
      boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
    }, overrides);
  }

  function ready() {
    document.body.appendChild(toggleBtn);
    document.body.appendChild(saveBar);
  }
  if (document.body) ready();
  else document.addEventListener("DOMContentLoaded", ready);

  function updateSaveBar() {
    var total = pending.size;
    saveBar.style.display = total > 0 ? "flex" : "none";
    countEl.textContent = total + " change" + (total === 1 ? "" : "s");
  }

  function setEditMode(on) {
    editMode = on;
    toggleBtn.textContent = on ? "✕ Done" : "✏️ Edit";
    document.documentElement.classList.toggle("qp-edit-mode", on);
    if (on) snapshot();
  }

  toggleBtn.addEventListener("click", function () {
    setEditMode(!editMode);
  });

  // suppress navigation while editing — the whole point of edit mode is to
  // stay on the page, not follow a link mid-edit
  document.addEventListener("click", function (e) {
    if (!editMode) return;
    var a = e.target.closest && e.target.closest("a");
    if (a) e.preventDefault();
  }, true);

  document.addEventListener("click", function (e) {
    if (!editMode) return;
    var fieldEl = e.target.closest && e.target.closest(FIELD_SELECTOR);
    if (!fieldEl || fieldEl.isContentEditable) return;

    if (fieldEl.dataset.copyImage === "true") {
      e.preventDefault();
      e.stopPropagation();
      triggerImageUpload(fieldEl);
      return;
    }

    if (fieldEl.dataset.copyAttr) {
      e.preventDefault();
      e.stopPropagation();
      editAttribute(fieldEl);
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    startEditing(fieldEl);
  }, true);

  // ---- image fields ----
  var imageInput = document.createElement("input");
  imageInput.type = "file";
  imageInput.accept = "image/jpeg,image/png,image/webp,image/gif,image/svg+xml";
  imageInput.style.display = "none";
  var uploadTarget = null;
  if (document.body) document.body.appendChild(imageInput);
  else document.addEventListener("DOMContentLoaded", function () { document.body.appendChild(imageInput); });

  function triggerImageUpload(container) {
    uploadTarget = container;
    imageInput.value = ""; // so picking the same file twice in a row still fires change
    imageInput.click();
  }

  imageInput.addEventListener("change", function () {
    var file = imageInput.files && imageInput.files[0];
    var container = uploadTarget;
    uploadTarget = null;
    if (!file || !container) return;
    uploadImage(container, file);
  });

  function uploadImage(container, file) {
    var key = getKey(container);
    var slug = container.dataset.copySlug || key.replace(/\./g, "-");
    var previousHtml = container.innerHTML;
    container.classList.add("qp-uploading");
    container.innerHTML = "";
    var status = document.createElement("span");
    status.className = "qp-upload-status";
    status.textContent = "Uploading…";
    container.appendChild(status);

    var fd = new FormData();
    fd.append("file", file);
    fd.append("slug", slug);

    fetch(UPLOAD_URL, { method: "POST", body: fd })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || "Upload failed (" + res.status + ")");
          return data;
        });
      })
      .then(function (data) {
        container.classList.remove("qp-uploading");
        // sync every element sharing this key, same pattern commitEdit uses
        var escaped = cssEscape(key);
        document.querySelectorAll('[data-copy-key="' + escaped + '"][data-copy-image="true"]').forEach(function (other) {
          other.innerHTML = "";
          var img = document.createElement("img");
          img.src = data.url;
          img.alt = "";
          other.appendChild(img);
          originals.set(other, data.url);
        });
        if (data.url === initialValues.get(key)) pending.delete(key);
        else pending.set(key, data.url);
        updateSaveBar();
      })
      .catch(function (err) {
        container.classList.remove("qp-uploading");
        container.innerHTML = previousHtml;
        alert("Upload failed: " + (err && err.message ? err.message : err));
      });
  }

  // ---- attribute fields (e.g. an input's placeholder) ----
  function editAttribute(el) {
    var key = getKey(el);
    var attr = el.dataset.copyAttr;
    var current = el.getAttribute(attr) || "";
    var next = window.prompt("Edit " + attr + ":", current);
    if (next === null || next === current) return;
    el.setAttribute(attr, next);
    if (next === initialValues.get(key)) pending.delete(key);
    else pending.set(key, next);
    updateSaveBar();
  }
  // seed initial values for attribute fields too (baselineValue() only
  // handles text content) — the attribute IS the value here
  document.querySelectorAll("[data-copy-attr]").forEach(function (el) {
    var key = getKey(el);
    if (!initialValues.has(key)) initialValues.set(key, el.getAttribute(el.dataset.copyAttr) || "");
  });

  // ---- plain text + template fields ----
  function startEditing(el) {
    if (el.dataset.copyTemplate === "true") {
      // show the raw template (literal {count}/{total} tokens) to edit,
      // not the already-interpolated numbers currently on screen
      el.textContent = el.dataset.copyRaw;
    }
    el.contentEditable = "true";
    el.classList.add("qp-editing");
    el.focus();
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    function onKeydown(ev) {
      if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        el.blur();
      } else if (ev.key === "Escape") {
        el.textContent = el.dataset.copyTemplate === "true" ? el.dataset.copyRaw : originals.get(el);
        el.blur();
      }
    }
    function finish() {
      el.contentEditable = "false";
      el.classList.remove("qp-editing");
      el.removeEventListener("blur", finish);
      el.removeEventListener("keydown", onKeydown);
      commitEdit(el);
    }
    el.addEventListener("blur", finish);
    el.addEventListener("keydown", onKeydown);
  }

  function commitEdit(el) {
    var key = getKey(el);
    var newValue = el.textContent.trim(); // the raw template, for template fields

    // sync every element sharing this key (there can be several on one
    // page — e.g. "Issue" on every compendium card) and update their
    // per-element baseline so re-editing compares against what's actually
    // on screen now, not the pre-edit-mode snapshot
    var escaped = cssEscape(key);
    document.querySelectorAll('[data-copy-key="' + escaped + '"], [data-issue-key="' + escaped + '"]').forEach(function (other) {
      if (other.dataset.copyTemplate === "true") {
        other.dataset.copyRaw = newValue;
        var vars = {};
        try { vars = JSON.parse(other.dataset.copyVars || "{}"); } catch (e) { /* leave empty */ }
        other.textContent = format(newValue, vars);
      } else {
        other.textContent = newValue;
      }
      originals.set(other, newValue);
    });

    if (newValue === initialValues.get(key)) {
      pending.delete(key);
    } else {
      pending.set(key, newValue);
    }
    updateSaveBar();
  }

  function postJSON(url, body) {
    return fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data.error || "Save failed (" + res.status + ")");
        return data;
      });
    });
  }

  // ---- save / discard ----
  saveBtn.addEventListener("click", function () {
    var copyBody = {};
    var issueConcept = {};
    var issuePost = {};
    var hasIssueChanges = false;

    pending.forEach(function (v, k) {
      if (isIssueKey(k)) {
        hasIssueChanges = true;
        var field = k.slice(k.indexOf(".") + 1);
        (k.indexOf("concept.") === 0 ? issueConcept : issuePost)[field] = v;
      } else {
        copyBody[k] = v;
      }
    });

    var requests = [];
    if (Object.keys(copyBody).length > 0) requests.push(postJSON(COPY_SAVE_URL, copyBody));
    if (hasIssueChanges) {
      var issueIdEl = document.querySelector("[data-issue-id]");
      var issueId = issueIdEl ? issueIdEl.dataset.issueId : null;
      if (!issueId) {
        alert("Save failed: couldn't find this page's issue id.");
        return;
      }
      requests.push(postJSON(ISSUE_SAVE_URL, { id: issueId, concept: issueConcept, post: issuePost }));
    }
    if (requests.length === 0) return;

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";
    Promise.all(requests)
      .then(function () {
        pending.clear();
        updateSaveBar();
        saveBtn.textContent = "Saved! (redeploying)";
        setTimeout(function () {
          saveBtn.textContent = "Save";
          saveBtn.disabled = false;
        }, 2500);
      })
      .catch(function (err) {
        alert("Save failed: " + (err && err.message ? err.message : err));
        saveBtn.textContent = "Save";
        saveBtn.disabled = false;
      });
  });

  discardBtn.addEventListener("click", function () {
    location.reload();
  });

  // pending edits live only in this page's memory — warn before they'd be
  // silently lost to navigation, a refresh, or closing the tab
  window.addEventListener("beforeunload", function (e) {
    if (pending.size === 0) return;
    e.preventDefault();
    e.returnValue = "";
  });
})();
