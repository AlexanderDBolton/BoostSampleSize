/* Zoomable view of the rerandomization acceptance region.
 *
 * The slider magnifies towards the origin. At the left you see every candidate
 * split as a dot at its pair of covariate mean differences; at the right you
 * are inside the acceptance region itself, which is far too small to make out
 * at full extent. Zoom is geometric in the slider position so the drag feels
 * even.
 */
(function () {
  var root = document.getElementById("__ID__");
  if (!root) return;
  var D = __DATA__;

  var canvas = root.querySelector("canvas");
  var ctx = canvas.getContext("2d");
  var slider = root.querySelector("input[type=range]");
  var readout = root.querySelector(".rz-readout");
  var labels = root.querySelectorAll(".rz-labels span");

  var PAD = { l: 62, r: 16, t: 16, b: 32 };
  var FONT = '12.5px -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  // Tightest view, as a fraction of the full extent. The 5% ellipse reaches
  // sqrt(a) = 0.32 standard deviations along each axis, so this has to leave
  // 3.5 * FMIN comfortably above that or the region gets clipped.
  var FMIN = 0.10;
  var R0 = [3.5 * D.sd[0], 3.5 * D.sd[1]];

  function niceStep(span, target) {
    var raw = span / target;
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var n = raw / mag;
    var m = n >= 5 ? 5 : n >= 2 ? 2 : 1;
    return m * mag;
  }
  function fmt(v, step) {
    var dp = Math.max(0, -Math.floor(Math.log10(step)));
    var s = v.toFixed(dp);
    return s === "-0" ? "0" : s;
  }

  function draw() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);

    var t = slider.value / 1000;
    var f = Math.pow(FMIN, t);                 // geometric zoom
    var Rx = R0[0] * f, Ry = R0[1] * f;

    var pw = w - PAD.l - PAD.r, ph = h - PAD.t - PAD.b;
    var sx = pw / (2 * Rx), sy = ph / (2 * Ry);
    var cx = PAD.l + pw / 2, cy = PAD.t + ph / 2;
    var X = function (x) { return cx + x * sx; };
    var Y = function (y) { return cy - y * sy; };

    // ---- grid and ticks ----------------------------------------------------
    ctx.font = FONT;
    ctx.lineWidth = 1.2;
    var stepX = niceStep(2 * Rx, 6), stepY = niceStep(2 * Ry, 5);
    var k, v, px, py;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (k = Math.ceil(-Rx / stepX); k * stepX <= Rx; k++) {
      v = k * stepX; px = X(v);
      ctx.strokeStyle = D.colors.grid;
      ctx.beginPath(); ctx.moveTo(px, PAD.t); ctx.lineTo(px, h - PAD.b); ctx.stroke();
      ctx.fillStyle = D.colors.tick;
      ctx.fillText(fmt(v, stepX), px, h - PAD.b + 7);
    }
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (k = Math.ceil(-Ry / stepY); k * stepY <= Ry; k++) {
      v = k * stepY; py = Y(v);
      ctx.strokeStyle = D.colors.grid;
      ctx.beginPath(); ctx.moveTo(PAD.l, py); ctx.lineTo(w - PAD.r, py); ctx.stroke();
      ctx.fillStyle = D.colors.tick;
      ctx.fillText(fmt(v, stepY), PAD.l - 8, py);
    }
    ctx.strokeStyle = D.colors.axis;
    ctx.strokeRect(PAD.l, PAD.t, pw, ph);

    // axis titles
    ctx.fillStyle = D.colors.tick;
    ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText(D.xlab, PAD.l + pw / 2, h - 2);
    ctx.save();
    ctx.translate(13, PAD.t + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = "top";
    ctx.fillText(D.ylab, 0, 0);
    ctx.restore();

    // ---- the draws ---------------------------------------------------------
    ctx.save();
    ctx.beginPath(); ctx.rect(PAD.l, PAD.t, pw, ph); ctx.clip();

    var r = f > 0.4 ? 1.9 : f > 0.15 ? 2.6 : 3.4;   // bigger dots when zoomed
    var nVis = 0, nAcc = 0;
    for (var i = 0; i < D.pts.length; i++) {
      var p = D.pts[i];
      if (Math.abs(p[0]) > Rx || Math.abs(p[1]) > Ry) continue;
      nVis++;
      var m = D.Cinv[0][0] * p[0] * p[0] + 2 * D.Cinv[0][1] * p[0] * p[1] +
              D.Cinv[1][1] * p[1] * p[1];
      var acc = m <= D.aMain;
      if (acc) nAcc++;
      ctx.fillStyle = acc ? D.colors.green : D.colors.grey;
      ctx.globalAlpha = acc ? 0.85 : 0.38;
      ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), r, 0, 2 * Math.PI); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ---- nested acceptance ellipses ---------------------------------------
    var theta = [];
    for (var b = 0; b <= 160; b++) theta.push((b / 160) * 2 * Math.PI);
    D.rings.forEach(function (ring) {
      ctx.beginPath();
      for (var b = 0; b < theta.length; b++) {
        var cth = Math.cos(theta[b]), sth = Math.sin(theta[b]);
        var ex = Math.sqrt(ring.a) * (D.L[0][0] * cth + D.L[0][1] * sth);
        var ey = Math.sqrt(ring.a) * (D.L[1][0] * cth + D.L[1][1] * sth);
        if (b === 0) ctx.moveTo(X(ex), Y(ey)); else ctx.lineTo(X(ex), Y(ey));
      }
      ctx.closePath();
      ctx.setLineDash(ring.main ? [] : [5, 4]);
      ctx.lineWidth = ring.main ? 2.2 : 1.3;
      ctx.strokeStyle = ring.main ? D.colors.dark : D.colors.dark;
      ctx.globalAlpha = ring.main ? 1 : 0.55;
      ctx.stroke();
    });
    ctx.setLineDash([]); ctx.globalAlpha = 1;

    ctx.strokeStyle = "#000"; ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(X(0) - 5, Y(0)); ctx.lineTo(X(0) + 5, Y(0));
    ctx.moveTo(X(0), Y(0) - 5); ctx.lineTo(X(0), Y(0) + 5);
    ctx.stroke();
    ctx.restore();

    readout.innerHTML =
      'zoom <b>' + (1 / f).toFixed(1) + '&times;</b>' +
      '<span class="rz-sep">|</span>' +
      'draws in view: <b>' + nVis.toLocaleString() + '</b> of ' +
      D.pts.length.toLocaleString() +
      '<span class="rz-sep">|</span>' +
      'of those, <b>' + nAcc.toLocaleString() + '</b> accepted';

    var active = t < 0.25 ? 0 : t < 0.75 ? 1 : 2;
    for (i = 0; i < labels.length; i++) {
      labels[i].classList.toggle("rz-on", i === active);
    }
  }

  var lastW = -1;
  function resize() {
    var w = canvas.clientWidth;
    if (!w || w === lastW) return;
    lastW = w;
    var h = Math.round(Math.min(Math.max(w * 0.62, 260), 440));
    var dpr = window.devicePixelRatio || 1;
    canvas.style.height = h + "px";
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  slider.addEventListener("input", draw);
  for (var j = 0; j < labels.length; j++) {
    (function (node) {
      node.addEventListener("click", function () {
        slider.value = node.getAttribute("data-at");
        draw();
      });
    })(labels[j]);
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(root);
  window.addEventListener("resize", resize);
  window.addEventListener("load", resize);
  resize();
  requestAnimationFrame(resize);
})();
