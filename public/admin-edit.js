/**
 * In-context edit mode for /admin's site-copy fields. Loaded on every
 * public page, but does nothing at all unless the (non-httpOnly, no
 * privilege of its own) qp_admin_hint cookie is present — real
 * authorization happens server-side on every save, via the actual
 * session cookie, at /api/admin/save-copy.
 *
 * Scope: plain-text `[data-copy-key]` fields and the one `[data-style-key]`
 * field (the logo) that have that attribute rendered into the page.
 * Template fields ({count}/{total} stats) and post/sim content aren't
 * marked up for this — those stay on /admin/copy and /admin/issues.
 */
(function () {
  "use strict";

  var HINT_COOKIE = "qp_admin_hint";
  var SAVE_URL = "/api/admin/save-copy";

  function hasHintCookie() {
    return document.cookie.split("; ").some(function (c) {
      return c.indexOf(HINT_COOKIE + "=") === 0;
    });
  }

  if (!hasHintCookie()) return;

  var editMode = false;
  var originals = new Map(); // element -> current baseline text (for change detection + live-sync)
  var pending = new Map(); // copy-key -> new text value
  var styleValues = new Map(); // style element -> current style value
  var stylePending = new Map(); // style-key -> new style value

  var style = document.createElement("style");
  style.textContent =
    "html.qp-edit-mode [data-copy-key]{cursor:text;}" +
    "html.qp-edit-mode [data-copy-key]:hover{outline:1px dashed #22c4f0;outline-offset:2px;}" +
    "html.qp-edit-mode [data-copy-key].qp-editing{outline:2px solid #ffd23f;outline-offset:2px;background:rgba(255,210,63,0.1);}" +
    "html.qp-edit-mode [data-style-key]{outline:1px dotted #ff3d8b;outline-offset:3px;}";
  document.head.appendChild(style);

  function allCopyElements() {
    return Array.prototype.slice.call(document.querySelectorAll("[data-copy-key]"));
  }
  function allStyleElements() {
    return Array.prototype.slice.call(document.querySelectorAll("[data-style-key]"));
  }

  function inferStyleValue(el) {
    var prefix = el.dataset.styleClassPrefix;
    var options = (el.dataset.styleOptions || "").split(",");
    for (var i = 0; i < options.length; i++) {
      if (options[i] !== "plain" && el.classList.contains(prefix + "--" + options[i])) return options[i];
    }
    return "plain";
  }

  function applyStyleValue(el, value) {
    var prefix = el.dataset.styleClassPrefix;
    var options = (el.dataset.styleOptions || "").split(",");
    options.forEach(function (opt) {
      if (opt !== "plain") el.classList.remove(prefix + "--" + opt);
    });
    if (value !== "plain") el.classList.add(prefix + "--" + value);
  }

  function snapshot() {
    originals.clear();
    allCopyElements().forEach(function (el) {
      originals.set(el, el.textContent.trim());
    });
    styleValues.clear();
    allStyleElements().forEach(function (el) {
      styleValues.set(el, inferStyleValue(el));
    });
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
    renderStyleBadges();
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
    var copyEl = e.target.closest && e.target.closest("[data-copy-key]");
    if (!copyEl || copyEl.isContentEditable) return;
    e.preventDefault();
    e.stopPropagation();
    startEditing(copyEl);
  }, true);

  function startEditing(el) {
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
        el.textContent = originals.get(el);
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
    var key = el.dataset.copyKey;
    var newText = el.textContent.trim();

    // sync every element sharing this key (there can be several on one
    // page — e.g. "Issue" on every compendium card) and update their
    // per-element baseline so re-editing compares against what's actually
    // on screen now, not the pre-edit-mode snapshot
    document.querySelectorAll('[data-copy-key="' + cssEscape(key) + '"]').forEach(function (other) {
      other.textContent = newText;
      originals.set(other, newText);
    });

    // but "is this actually a pending change worth saving" compares
    // against the true page-load value, so cycling back to it — even
    // through several intermediate edits — correctly clears the flag
    if (newText === initialValues.get(key)) {
      pending.delete(key);
    } else {
      pending.set(key, newText);
    }
    updateSaveBar();
  }

  // true page-load values, captured once — used to decide whether a key is
  // "actually changed" even across multiple edit-mode sessions in one visit
  var initialValues = new Map();
  allCopyElements().forEach(function (el) {
    if (!initialValues.has(el.dataset.copyKey)) initialValues.set(el.dataset.copyKey, el.textContent.trim());
  });

  function cssEscape(s) {
    return window.CSS && CSS.escape ? CSS.escape(s) : s.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  // ---- style badges (currently just the logo) ----
  var badges = [];
  function renderStyleBadges() {
    badges.forEach(function (b) { b.remove(); });
    badges = [];
    if (!editMode) return;
    allStyleElements().forEach(function (el) {
      var badge = document.createElement("button");
      badge.type = "button";
      var current = styleValues.get(el) || inferStyleValue(el);
      badge.textContent = "Style: " + current;
      Object.assign(badge.style, {
        position: "fixed", zIndex: "99998", background: "#ff3d8b", color: "#fff",
        fontFamily: "monospace", fontSize: "0.65rem", padding: "0.15rem 0.4rem",
        borderRadius: "3px", border: "none", cursor: "pointer",
      });
      positionBadge(badge, el);
      badge.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var options = (el.dataset.styleOptions || "plain").split(",");
        var idx = options.indexOf(styleValues.get(el) || "plain");
        var next = options[(idx + 1) % options.length];
        styleValues.set(el, next);
        applyStyleValue(el, next);
        badge.textContent = "Style: " + next;
        var key = el.dataset.styleKey;
        var initial = el.dataset.styleInitial || "plain";
        if (next === initial) stylePending.delete(key);
        else stylePending.set(key, next);
        updateSaveBar();
      });
      document.body.appendChild(badge);
      badges.push(badge);
    });
  }
  function positionBadge(badge, el) {
    var rect = el.getBoundingClientRect();
    badge.style.top = (rect.top - 20) + "px";
    badge.style.left = rect.left + "px";
  }
  window.addEventListener("scroll", function () {
    badges.forEach(function (b, i) { positionBadge(b, allStyleElements()[i]); });
  }, true);
  window.addEventListener("resize", function () {
    badges.forEach(function (b, i) { positionBadge(b, allStyleElements()[i]); });
  });

  // remember each style element's page-load value, for change detection
  allStyleElements().forEach(function (el) {
    el.dataset.styleInitial = inferStyleValue(el);
  });

  // ---- save / discard ----
  saveBtn.addEventListener("click", function () {
    var body = {};
    pending.forEach(function (v, k) { body[k] = v; });
    stylePending.forEach(function (v, k) { body[k] = v; });

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";
    fetch(SAVE_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || "Save failed (" + res.status + ")");
          return data;
        });
      })
      .then(function () {
        pending.clear();
        stylePending.clear();
        allStyleElements().forEach(function (el) {
          el.dataset.styleInitial = styleValues.get(el) || inferStyleValue(el);
        });
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
