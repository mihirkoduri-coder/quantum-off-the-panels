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
 *   [data-issue-key]                   a post's own metadata (concept
 *                                        title/character, post title/
 *                                        subtitle/quote/ruling) — same as
 *                                        copy keys, but saved to
 *                                        concepts.ts + this post's
 *                                        frontmatter instead
 *   [data-style-panel]                 opens a small popover (built from
 *                                        its data-style-fields JSON) with
 *                                        every toggle/select for that
 *                                        element's style — currently just
 *                                        the logo
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
 * /admin.
 */
(function () {
  "use strict";

  var HINT_COOKIE = "qp_admin_hint";
  var COPY_SAVE_URL = "/api/admin/save-copy";
  var ISSUE_SAVE_URL = "/api/admin/save-issue";
  var FIELD_SELECTOR = "[data-copy-key], [data-issue-key]";

  function hasHintCookie() {
    return document.cookie.split("; ").some(function (c) {
      return c.indexOf(HINT_COOKIE + "=") === 0;
    });
  }

  if (!hasHintCookie()) return;

  function format(template, vars) {
    return template.replace(/\{(\w+)\}/g, function (match, key) {
      return Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match;
    });
  }

  var editMode = false;
  var originals = new Map(); // element -> current baseline value (raw template for template fields; for change detection + live-sync)
  var pending = new Map(); // key -> new value (copy AND issue keys share this — namespaces don't collide)
  var stylePending = new Map(); // style-key -> new value, from the style popovers

  var style = document.createElement("style");
  style.textContent =
    "html.qp-edit-mode [data-copy-key],html.qp-edit-mode [data-issue-key]{cursor:text;}" +
    "html.qp-edit-mode [data-copy-key]:hover,html.qp-edit-mode [data-issue-key]:hover{outline:1px dashed #22c4f0;outline-offset:2px;}" +
    "html.qp-edit-mode [data-copy-key].qp-editing,html.qp-edit-mode [data-issue-key].qp-editing{outline:2px solid #ffd23f;outline-offset:2px;background:rgba(255,210,63,0.1);}" +
    "html.qp-edit-mode [data-style-panel]{outline:1px dotted #ff3d8b;outline-offset:3px;}" +
    ".qp-style-trigger{position:fixed;z-index:99998;background:#ff3d8b;color:#fff;font-family:monospace;font-size:0.7rem;padding:0.15rem 0.45rem;border-radius:3px;border:none;cursor:pointer;}" +
    ".qp-style-popover{position:fixed;z-index:100000;background:#131829;color:#ece7d9;border:2px solid #ff3d8b;border-radius:6px;padding:0.8rem;font-family:monospace;font-size:0.8rem;min-width:14rem;box-shadow:0 4px 16px rgba(0,0,0,0.5);}" +
    ".qp-style-popover h4{margin:0 0 0.6rem;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.08em;color:#ff3d8b;}" +
    ".qp-style-row{display:flex;align-items:center;justify-content:space-between;gap:0.6rem;margin:0.45rem 0;}" +
    ".qp-style-row select{background:#1d2440;color:#ece7d9;border:1px solid #2b3358;border-radius:3px;font-family:inherit;font-size:0.75rem;padding:0.15rem;}" +
    ".qp-style-close{margin-top:0.5rem;background:none;border:1px solid #9aa0b8;color:#ece7d9;padding:0.2rem 0.6rem;border-radius:4px;cursor:pointer;font-family:inherit;font-size:0.7rem;width:100%;}";
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
    var total = pending.size + stylePending.size;
    saveBar.style.display = total > 0 ? "flex" : "none";
    countEl.textContent = total + " change" + (total === 1 ? "" : "s");
  }

  function setEditMode(on) {
    editMode = on;
    toggleBtn.textContent = on ? "✕ Done" : "✏️ Edit";
    document.documentElement.classList.toggle("qp-edit-mode", on);
    if (on) snapshot();
    renderStyleTriggers();
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

  // ---- style panels (currently just the logo) ----
  var openPopover = null;
  var triggers = [];

  function allStylePanelElements() {
    return Array.prototype.slice.call(document.querySelectorAll("[data-style-panel]"));
  }

  function renderStyleTriggers() {
    triggers.forEach(function (t) { t.remove(); });
    triggers = [];
    closePopover();
    if (!editMode) return;
    allStylePanelElements().forEach(function (el) {
      var trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "qp-style-trigger";
      trigger.textContent = "🎨 Style";
      positionNear(trigger, el, -24);
      trigger.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (openPopover && openPopover.dataset.forEl === elId(el)) {
          closePopover();
        } else {
          openStylePopover(el, trigger);
        }
      });
      document.body.appendChild(trigger);
      triggers.push(trigger);
    });
  }

  var elIdCounter = 0;
  function elId(el) {
    if (!el.dataset.qpElId) el.dataset.qpElId = String(++elIdCounter);
    return el.dataset.qpElId;
  }

  function positionNear(node, el, yOffset) {
    var rect = el.getBoundingClientRect();
    node.style.top = (rect.top + yOffset) + "px";
    node.style.left = rect.left + "px";
  }

  function closePopover() {
    if (openPopover) {
      openPopover.remove();
      openPopover = null;
    }
  }

  function openStylePopover(el, trigger) {
    closePopover();
    var fields = [];
    try { fields = JSON.parse(el.dataset.styleFields || "[]"); } catch (e) { /* nothing to show */ }

    var pop = document.createElement("div");
    pop.className = "qp-style-popover";
    pop.dataset.forEl = elId(el);
    var heading = document.createElement("h4");
    heading.textContent = "Style";
    pop.appendChild(heading);

    fields.forEach(function (field) {
      var row = document.createElement("div");
      row.className = "qp-style-row";
      var label = document.createElement("span");
      label.textContent = field.label;
      row.appendChild(label);

      var currentValue = stylePending.has(field.key) ? stylePending.get(field.key) : field.value;

      if (field.type === "checkbox") {
        var checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = Boolean(currentValue);
        checkbox.addEventListener("change", function () {
          applyStyleChange(field, checkbox.checked);
        });
        row.appendChild(checkbox);
      } else {
        var select = document.createElement("select");
        (field.options || []).forEach(function (opt) {
          var option = document.createElement("option");
          option.value = opt;
          option.textContent = opt;
          option.selected = opt === currentValue;
          select.appendChild(option);
        });
        select.addEventListener("change", function () {
          applyStyleChange(field, select.value);
        });
        row.appendChild(select);
      }
      pop.appendChild(row);
    });

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "qp-style-close";
    closeBtn.textContent = "Close";
    closeBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      closePopover();
    });
    pop.appendChild(closeBtn);

    document.body.appendChild(pop);
    var rect = trigger.getBoundingClientRect();
    pop.style.top = (rect.bottom + 6) + "px";
    pop.style.left = rect.left + "px";
    openPopover = pop;
  }

  function applyStyleChange(field, value) {
    var initial = field.value;
    if (value === initial) stylePending.delete(field.key);
    else stylePending.set(field.key, value);
    updateSaveBar();
    applyLivePreview(field.key, value);
  }

  // translates a style field change into an immediate visual update, so
  // the popover is previewing the real page, not a guess at what it'll
  // look like once saved
  function applyLivePreview(key, value) {
    if (key === "site.logoVariant") {
      document.querySelectorAll("[data-logo-variant]").forEach(function (el) {
        el.classList.toggle("site__logo-variant--hidden", el.dataset.logoVariant !== value);
      });
      return;
    }
    var titleEl = document.querySelector(".site__title");
    if (!titleEl) return;
    if (key === "site.titleStyle.tilt") {
      titleEl.classList.toggle("site__title--tilt", Boolean(value));
    } else if (key === "site.titleStyle.shadow") {
      titleEl.classList.toggle("site__title--shadow", Boolean(value));
    } else if (key === "site.titleStyle.shadowColor") {
      titleEl.style.setProperty("--shadow-c", "var(--" + value + ")");
    } else if (key === "site.titleStyle.backsplash") {
      ["none", "dots", "burst"].forEach(function (opt) {
        titleEl.classList.remove("site__title--backsplash-" + opt);
      });
      if (value !== "none") titleEl.classList.add("site__title--backsplash-" + value);
    } else if (key === "site.titleStyle.backsplashColor") {
      titleEl.style.setProperty("--backsplash-c", "var(--" + value + ")");
    }
  }

  window.addEventListener("scroll", function () {
    triggers.forEach(function (t, i) { positionNear(t, allStylePanelElements()[i], -24); });
    closePopover();
  }, true);
  window.addEventListener("resize", function () {
    triggers.forEach(function (t, i) { positionNear(t, allStylePanelElements()[i], -24); });
    closePopover();
  });

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
    stylePending.forEach(function (v, k) { copyBody[k] = v; });

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
        stylePending.clear();
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
    if (pending.size + stylePending.size === 0) return;
    e.preventDefault();
    e.returnValue = "";
  });
})();
