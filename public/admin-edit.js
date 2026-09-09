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
 *   [data-copy-key][data-copy-image]   an image — click ANYWHERE in this
 *                                        element (it's the whole click
 *                                        target, decorative children
 *                                        included) opens a file picker,
 *                                        uploads immediately (its own
 *                                        request, not batched into Save),
 *                                        and the resulting URL becomes
 *                                        this key's pending value. An
 *                                        inner [data-copy-image-target]
 *                                        is where the <img> actually
 *                                        lives, if the field has
 *                                        decoration around the image
 *                                        that a re-upload shouldn't wipe
 *                                        out — falls back to the field
 *                                        itself when there isn't one
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
  // contains it at all. Can't just rely on the site's own `.site__nav a`
  // rule the way the old comment here claimed: Astro scopes component
  // styles by stamping every element THAT COMPONENT rendered with a
  // build-specific data-astro-cid-* attribute and compiling `.site__nav a`
  // into `.site__nav a[data-astro-cid-xxxxx]` — a node inserted afterward
  // by plain DOM APIs never carries that attribute, so it silently falls
  // outside the scoped rule and renders as an unstyled browser-default
  // link (serif, blue, underlined) instead of matching its siblings. The
  // explicit qp-admin-link rule below (in this script's own injected
  // <style>, which isn't Astro-scoped at all) states the same values
  // Base.astro's `.site__nav a` uses, so it matches regardless of that
  // internal, version-specific attribute name.
  function addAdminNavLink() {
    var nav = document.querySelector(".site__nav");
    if (!nav || nav.querySelector('a[href="/admin"]')) return;
    var link = document.createElement("a");
    link.href = "/admin";
    link.className = "qp-admin-link";
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
    ".qp-upload-status{font-family:monospace;font-size:0.72rem;color:#9aa0b8;}" +
    // matches Base.astro's `.site__nav a` rule by value — see the comment
    // on addAdminNavLink for why this can't just inherit that rule.
    ".qp-admin-link{font-family:var(--font-mono,ui-monospace,monospace);font-size:0.72rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--paper-dim,#9aa0b8);text-decoration:none;}" +
    ".qp-admin-link:hover{color:var(--cyan,#22c4f0);background:none;}" +
    // crop/zoom reticle — yellow ticks specifically (not cyan) to match
    // the rest of the site's own convention: yellow marks user input.
    ".qp-crop-backdrop{position:fixed;inset:0;z-index:100000;background:rgba(11,14,26,0.82);display:flex;align-items:center;justify-content:center;padding:1.25rem;}" +
    ".qp-crop-modal{background:#131829;border:2px solid #2b3358;border-radius:6px;padding:1.25rem;display:grid;gap:0.9rem;justify-items:center;max-width:22rem;width:100%;font-family:monospace;}" +
    ".qp-crop-stage{position:relative;width:min(280px,70vw);aspect-ratio:1/1;}" +
    ".qp-crop-canvas{width:100%;height:100%;display:block;border-radius:3px;background:#0b0e1a;touch-action:none;cursor:grab;}" +
    ".qp-crop-canvas:active{cursor:grabbing;}" +
    ".qp-crop-reticle{position:absolute;inset:0;pointer-events:none;}" +
    ".qp-crop-tick{position:absolute;width:1.1rem;height:1.1rem;border:2px solid #ffd23f;}" +
    ".qp-crop-tick--tl{top:-2px;left:-2px;border-right:none;border-bottom:none;}" +
    ".qp-crop-tick--tr{top:-2px;right:-2px;border-left:none;border-bottom:none;}" +
    ".qp-crop-tick--bl{bottom:-2px;left:-2px;border-right:none;border-top:none;}" +
    ".qp-crop-tick--br{bottom:-2px;right:-2px;border-left:none;border-top:none;}" +
    ".qp-crop-zoomrow{display:flex;align-items:center;gap:0.6rem;width:100%;font-size:0.72rem;color:#9aa0b8;text-transform:uppercase;letter-spacing:0.08em;}" +
    ".qp-crop-zoomrow input{flex:1;}" +
    ".qp-crop-hint{margin:0;font-size:0.72rem;color:#9aa0b8;text-align:center;}" +
    ".qp-crop-actions{display:flex;gap:0.6rem;width:100%;}" +
    ".qp-crop-cancel,.qp-crop-confirm{flex:1;min-height:44px;border-radius:4px;font-family:inherit;font-weight:bold;cursor:pointer;font-size:0.85rem;}" +
    ".qp-crop-cancel{background:none;border:1px solid #9aa0b8;color:#ece7d9;}" +
    ".qp-crop-confirm{background:#22c4f0;border:none;color:#0b0e1a;}";
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
    openCropModal(file).then(function (result) {
      if (!result) return; // user cancelled the crop — nothing was touched yet, nothing to undo
      uploadImage(container, result);
    });
  });

  // the clickable container (data-copy-image) and the element whose
  // innerHTML is actually safe to replace (the photo box, not decorative
  // siblings like a burst frame) aren't always the same node — an inner
  // [data-copy-image-target] wins when present, else the container itself.
  function imageTarget(container) {
    return container.querySelector("[data-copy-image-target]") || container;
  }

  // ---- crop/zoom reticle, shown before a raster photo upload ----
  // object-fit:cover on the display side means whatever crop the browser
  // happens to pick is the only crop a reader will ever see, with no way to
  // fix a shot the subject isn't centred in or correct which part of a
  // wider photo gets cut off — this puts that framing choice in front of
  // the person uploading instead of leaving it to CSS. One render()
  // function draws both the live stage preview and the final export at a
  // different target size, same "the preview IS the export" reasoning as
  // the Studio's canvas (src/components/admin/studio-core.ts).
  var CROP_TYPES = { "image/jpeg": true, "image/png": true, "image/webp": true };
  var CROP_OUTPUT_SIZE = 640; // export px, square — plenty for a small display box at any pixel density

  function openCropModal(file) {
    if (!CROP_TYPES[file.type] || typeof createImageBitmap !== "function") {
      return Promise.resolve(file); // vector/animated/unrecognised — nothing to crop, let it through
    }
    return createImageBitmap(file, { colorSpaceConversion: "default" })
      .then(function (bitmap) {
        return new Promise(function (resolve) {
          var zoom = 1;
          var cx = bitmap.width / 2, cy = bitmap.height / 2; // image-space point sitting at the reticle's centre

          // "cover" fit: scale by whichever axis needs MORE magnification
          // to fill a `size`-square frame — the fraction of the image this
          // leaves visible doesn't depend on `size` itself, only on zoom,
          // which is what lets clamp() below stay correct for either the
          // small on-screen stage or the larger exported canvas.
          function baseScale(size) { return Math.max(size / bitmap.width, size / bitmap.height); }
          function clamp(size) {
            var eff = baseScale(size) * zoom;
            var halfW = (size / 2) / eff, halfH = halfW; // square frame either way
            cx = Math.min(Math.max(cx, halfW), bitmap.width - halfW);
            cy = Math.min(Math.max(cy, halfH), bitmap.height - halfH);
          }
          function render(ctx, size, res) {
            var eff = baseScale(size) * zoom;
            var k = res / size; // internal resolution vs. the logical square it represents
            ctx.clearRect(0, 0, res, res);
            ctx.save();
            ctx.translate(res / 2, res / 2);
            ctx.scale(eff * k, eff * k);
            ctx.translate(-cx, -cy);
            ctx.drawImage(bitmap, 0, 0);
            ctx.restore();
          }

          var backdrop = document.createElement("div");
          backdrop.className = "qp-crop-backdrop";
          var modal = document.createElement("div");
          modal.className = "qp-crop-modal";
          var stage = document.createElement("div");
          stage.className = "qp-crop-stage";
          var canvas = document.createElement("canvas");
          canvas.className = "qp-crop-canvas";
          var reticle = document.createElement("div");
          reticle.className = "qp-crop-reticle";
          ["tl", "tr", "bl", "br"].forEach(function (corner) {
            var tick = document.createElement("span");
            tick.className = "qp-crop-tick qp-crop-tick--" + corner;
            reticle.appendChild(tick);
          });
          stage.appendChild(canvas);
          stage.appendChild(reticle);

          var zoomRow = document.createElement("label");
          zoomRow.className = "qp-crop-zoomrow";
          var zoomText = document.createElement("span");
          zoomText.textContent = "Zoom";
          var zoomInput = document.createElement("input");
          zoomInput.type = "range";
          zoomInput.min = "1"; zoomInput.max = "4"; zoomInput.step = "0.01"; zoomInput.value = "1";
          zoomRow.appendChild(zoomText);
          zoomRow.appendChild(zoomInput);

          var hint = document.createElement("p");
          hint.className = "qp-crop-hint";
          hint.textContent = "Drag to reposition, zoom to fill the frame.";

          var actions = document.createElement("div");
          actions.className = "qp-crop-actions";
          var cancelBtn = document.createElement("button");
          cancelBtn.type = "button"; cancelBtn.className = "qp-crop-cancel"; cancelBtn.textContent = "Cancel";
          var confirmBtn = document.createElement("button");
          confirmBtn.type = "button"; confirmBtn.className = "qp-crop-confirm"; confirmBtn.textContent = "Use photo";
          actions.appendChild(cancelBtn);
          actions.appendChild(confirmBtn);

          modal.appendChild(stage);
          modal.appendChild(zoomRow);
          modal.appendChild(hint);
          modal.appendChild(actions);
          backdrop.appendChild(modal);
          document.body.appendChild(backdrop);

          // measured, not assumed — .qp-crop-stage's CSS width can shrink
          // on a narrow phone screen, and the drag/zoom math below has to
          // agree with whatever size actually got laid out or dragging
          // would track the pointer at the wrong rate.
          var dpr = Math.min(window.devicePixelRatio || 1, 3);
          var stageCssPx = stage.getBoundingClientRect().width;
          var stageRes = Math.round(stageCssPx * dpr);
          canvas.width = stageRes;
          canvas.height = stageRes;

          var ctx = canvas.getContext("2d", { colorSpace: "srgb" });
          function redraw() { render(ctx, stageCssPx, stageRes); }
          redraw();

          var dragging = null;
          canvas.addEventListener("pointerdown", function (e) {
            dragging = { x: e.clientX, y: e.clientY };
            canvas.setPointerCapture(e.pointerId);
          });
          canvas.addEventListener("pointermove", function (e) {
            if (!dragging) return;
            var eff = baseScale(stageCssPx) * zoom;
            cx -= (e.clientX - dragging.x) / eff;
            cy -= (e.clientY - dragging.y) / eff;
            dragging = { x: e.clientX, y: e.clientY };
            clamp(stageCssPx);
            redraw();
          });
          function endDrag() { dragging = null; }
          canvas.addEventListener("pointerup", endDrag);
          canvas.addEventListener("pointercancel", endDrag);

          zoomInput.addEventListener("input", function () {
            zoom = Math.max(1, +zoomInput.value || 1);
            clamp(stageCssPx);
            redraw();
          });

          function finish(result) { backdrop.remove(); bitmap.close(); resolve(result); }

          cancelBtn.addEventListener("click", function () { finish(null); });
          backdrop.addEventListener("click", function (e) { if (e.target === backdrop) finish(null); });
          confirmBtn.addEventListener("click", function () {
            var out = document.createElement("canvas");
            out.width = CROP_OUTPUT_SIZE;
            out.height = CROP_OUTPUT_SIZE;
            var octx = out.getContext("2d", { colorSpace: "srgb" });
            render(octx, CROP_OUTPUT_SIZE, CROP_OUTPUT_SIZE);
            out.toBlob(function (blob) {
              if (!blob) { finish(file); return; }
              var base = file.name ? file.name.replace(/\.[^./\\]+$/, "") : "photo";
              finish(new File([blob], base + "-cropped.jpg", { type: "image/jpeg" }));
            }, "image/jpeg", 0.92);
          });
        });
      })
      .catch(function () { return file; }); // couldn't decode it here — let the server give its own error
  }

  // ---- client-side downscale before upload ----
  // Vercel's serverless functions hard-reject request bodies over a
  // platform size limit (~4.5MB) with a plain-text "Request Entity Too
  // Large" response, not JSON — which surfaced client-side as a
  // baffling "Unexpected token 'R' ... is not valid JSON" instead of any
  // clear size message. A modern phone photo routinely exceeds that on
  // its own, and the server's own resize (lib/sharp, upload-image.ts)
  // never gets a chance to run — the oversized request is rejected
  // before it ever reaches that code. Downscaling here means the actual
  // bytes sent over the network are already small regardless of the
  // original file's size. Only for formats a canvas can safely
  // round-trip: not SVG (vector, would get rasterized for no reason),
  // not GIF (would flatten an animation to one frame), not HEIC (most
  // browsers can't decode it here either — falls through to the
  // server's own clear error instead of a confusing canvas failure).
  var RESIZE_OUTPUT_TYPE = { "image/jpeg": "image/jpeg", "image/png": "image/png", "image/webp": "image/jpeg" };
  var RESIZE_MAX_DIMENSION = 1600; // matches the server's own resize target

  function resizeImageIfPossible(file) {
    var outputType = RESIZE_OUTPUT_TYPE[file.type];
    if (!outputType || typeof createImageBitmap !== "function") {
      return Promise.resolve(file);
    }
    // colorSpaceConversion is left at its spec default ("default" = do
    // convert), but named explicitly rather than left implicit — a photo
    // straight off an iPhone is typically tagged Display P3, a wider gamut
    // than sRGB, and this is the option that controls whether that gets
    // converted on the way in.
    return createImageBitmap(file, { colorSpaceConversion: "default" })
      .then(function (bitmap) {
        var scale = Math.min(1, RESIZE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
        // already small enough — skip the decode/redraw/re-encode round
        // trip entirely rather than pay its cost (and risk) for no reason.
        if (scale === 1) { bitmap.close(); return file; }
        var w = Math.round(bitmap.width * scale);
        var h = Math.round(bitmap.height * scale);
        var canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        // { colorSpace: "srgb" } forces the canvas's own working space —
        // explicit for the same reason as above: the destination shouldn't
        // be left to whatever a given browser's implicit default happens
        // to be, since that's exactly the kind of gap a wide-gamut source
        // photo falls into and comes out desaturated the other side.
        var ctx = canvas.getContext("2d", { colorSpace: "srgb" });
        ctx.drawImage(bitmap, 0, 0, w, h);
        bitmap.close();
        return new Promise(function (resolve) {
          canvas.toBlob(function (blob) { resolve(blob || file); }, outputType, 0.85);
        });
      })
      .catch(function () {
        return file; // couldn't decode it here — let the server give its own error
      });
  }

  function uploadImage(container, file) {
    var key = getKey(container);
    var slug = container.dataset.copySlug || key.replace(/\./g, "-");
    var target = imageTarget(container);
    var previousHtml = target.innerHTML;
    container.classList.add("qp-uploading");
    target.innerHTML = "";
    var status = document.createElement("span");
    status.className = "qp-upload-status";
    status.textContent = "Uploading…";
    target.appendChild(status);

    resizeImageIfPossible(file)
      .then(function (uploadFile) {
        var fd = new FormData();
        fd.append("file", uploadFile, file.name);
        fd.append("slug", slug);
        return fetch(UPLOAD_URL, { method: "POST", body: fd });
      })
      .then(function (res) {
        return res.text().then(function (raw) {
          var data;
          try {
            data = JSON.parse(raw);
          } catch (e) {
            // the server didn't send JSON at all — almost always a
            // platform-level rejection (e.g. body still too large even
            // after resizing) rather than anything this code raised
            throw new Error(res.status === 413 || /entity too large/i.test(raw)
              ? "That image is too large to upload, even after shrinking it. Try a smaller photo."
              : "Upload failed (" + res.status + "): " + raw.slice(0, 200));
          }
          if (!res.ok) throw new Error(data.error || "Upload failed (" + res.status + ")");
          return data;
        });
      })
      .then(function (data) {
        container.classList.remove("qp-uploading");
        // sync every element sharing this key, same pattern commitEdit uses
        var escaped = cssEscape(key);
        document.querySelectorAll('[data-copy-key="' + escaped + '"][data-copy-image="true"]').forEach(function (other) {
          var otherTarget = imageTarget(other);
          otherTarget.innerHTML = "";
          var img = document.createElement("img");
          img.src = data.url;
          img.alt = "";
          otherTarget.appendChild(img);
          originals.set(other, data.url);
        });
        if (data.url === initialValues.get(key)) pending.delete(key);
        else pending.set(key, data.url);
        updateSaveBar();
      })
      .catch(function (err) {
        container.classList.remove("qp-uploading");
        target.innerHTML = previousHtml;
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
