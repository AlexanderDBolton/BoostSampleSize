/* Greedy matching, one step at a time.
 *
 * The slider walks through the pairs in the order greedy picks them. The top
 * panel is the sample; the lower strip is the distance of each pair in that
 * same order. That strip is on a log scale because greedy's choices span
 * several orders of magnitude, from pairs that are nearly identical to the
 * stranded pair it is left with at the end.
 *
 * The sample is whitened before it gets here, so S is the identity and the
 * distance being minimised is the plain straight-line distance. The scatter is
 * drawn at equal aspect to keep that true on screen, and the axes are in
 * standard deviations.
 */
(function () {
  var root = document.getElementById("__ID__");
  if (!root) return;
  var D = __DATA__;

  var canvas = root.querySelector("canvas");
  var ctx = canvas.getContext("2d");
  var slider = root.querySelector("input[type=range]");
  var readout = root.querySelector(".gs-readout");
  var btnOpt = root.querySelector(".gs-opt");

  var FONT = '12px -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  var PAD = { l: 52, r: 14, t: 12, b: 38 };
  var SPLIT = 0.64;
  var GAP = 34;
  var showOpt = false;

  function niceStep(span, target) {
    var raw = span / target;
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var n = raw / mag;
    return (n >= 5 ? 5 : n >= 2 ? 2 : 1) * mag;
  }
  function fmtTickVal(v, step) {
    var dp = Math.max(0, -Math.floor(Math.log10(step)));
    var t = v.toFixed(dp);
    return t === "-0" ? "0" : t;
  }

  slider.max = String(D.greedy.length);

  var xs = D.pts.map(function (p) { return p[0]; });
  var ys = D.pts.map(function (p) { return p[1]; });
  var ex = [Math.min.apply(null, xs), Math.max.apply(null, xs)];
  var ey = [Math.min.apply(null, ys), Math.max.apply(null, ys)];

  // log extent of the strip, rounded out to whole decades
  var dmin = Infinity, dmax = -Infinity;
  D.greedy.forEach(function (g) {
    dmin = Math.min(dmin, g[2]); dmax = Math.max(dmax, g[2]);
  });
  dmin = Math.min(dmin, D.optWorst); dmax = Math.max(dmax, D.optWorst);
  var lo = Math.floor(Math.log10(dmin)), hi = Math.ceil(Math.log10(dmax));

  function fmtTick(e) {
    if (e >= 0) return String(Math.pow(10, e));
    return "0." + new Array(-e).join("0") + "1";
  }

  function draw() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);
    ctx.font = FONT;

    var step = parseInt(slider.value, 10);
    var hTop = Math.round((h - GAP) * SPLIT);
    var hBot = h - GAP - hTop;

    // ---------- top panel: the sample, at equal aspect -------------------
    var pw = w - PAD.l - PAD.r, ph = hTop - PAD.t - PAD.b;
    var spanX = (ex[1] - ex[0]) * 1.10, spanY = (ey[1] - ey[0]) * 1.12;
    var sc = Math.min(pw / spanX, ph / spanY);          // one scale for both
    var cx0 = (ex[0] + ex[1]) / 2, cy0 = (ey[0] + ey[1]) / 2;
    var ox = PAD.l + pw / 2, oy = PAD.t + ph / 2;
    var X = function (v) { return ox + (v - cx0) * sc; };
    var Y = function (v) { return oy - (v - cy0) * sc; };

    // frame only the region the data occupies, so equal aspect does not leave
    // a band of empty plot on either side
    var fw = spanX * sc, fh = spanY * sc;
    var fx = ox - fw / 2, fy = oy - fh / 2;

    // ---- gridlines and ticks, in standard deviations -------------------
    var xlo = cx0 - spanX / 2, xhi = cx0 + spanX / 2;
    var ylo = cy0 - spanY / 2, yhi = cy0 + spanY / 2;
    var stepX = niceStep(spanX, 5), stepY = niceStep(spanY, 5);
    var k, v;

    ctx.lineWidth = 1;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (k = Math.ceil(xlo / stepX); k * stepX <= xhi; k++) {
      v = k * stepX;
      ctx.strokeStyle = "#eef1f4";
      ctx.beginPath(); ctx.moveTo(X(v), fy); ctx.lineTo(X(v), fy + fh);
      ctx.stroke();
      ctx.fillStyle = "#a6aeb6";
      ctx.fillText(fmtTickVal(v, stepX), X(v), fy + fh + 6);
    }
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (k = Math.ceil(ylo / stepY); k * stepY <= yhi; k++) {
      v = k * stepY;
      ctx.strokeStyle = "#eef1f4";
      ctx.beginPath(); ctx.moveTo(fx, Y(v)); ctx.lineTo(fx + fw, Y(v));
      ctx.stroke();
      ctx.fillStyle = "#a6aeb6";
      ctx.fillText(fmtTickVal(v, stepY), fx - 7, Y(v));
    }

    ctx.strokeStyle = D.colors.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(fx, fy, fw, fh);

    ctx.save();
    ctx.beginPath(); ctx.rect(fx, fy, fw, fh); ctx.clip();

    var pairs = showOpt ? D.optimal : D.greedy.slice(0, step);
    var used = {};
    pairs.forEach(function (g) { used[g[0]] = 1; used[g[1]] = 1; });

    pairs.forEach(function (g, k) {
      var last = !showOpt && k === pairs.length - 1;
      ctx.strokeStyle = last ? D.colors.red : D.colors.dark;
      ctx.lineWidth = last ? 2.6 : 1.3;
      ctx.globalAlpha = last ? 1 : 0.7;
      ctx.beginPath();
      ctx.moveTo(X(D.pts[g[0]][0]), Y(D.pts[g[0]][1]));
      ctx.lineTo(X(D.pts[g[1]][0]), Y(D.pts[g[1]][1]));
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    for (var i = 0; i < D.pts.length; i++) {
      ctx.beginPath();
      ctx.arc(X(D.pts[i][0]), Y(D.pts[i][1]), 3.5, 0, 2 * Math.PI);
      ctx.fillStyle = used[i] ? D.colors.blue : "#dfe5ea";
      ctx.fill();
      ctx.strokeStyle = used[i] ? D.colors.blue : "#b4bec6";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = "#8a929a";
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(D.xlab, ox, fy + fh + 21);
    ctx.save();
    // beside the frame rather than at the canvas edge: equal aspect leaves the
    // frame centred, so a fixed offset would strand the label
    ctx.translate(Math.max(12, fx - 44), oy);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = "top";
    ctx.fillText(D.ylab, 0, 0);
    ctx.restore();

    // ---------- lower strip: pair distance, in the order chosen ----------
    var by = hTop + GAP, bh = hBot - 20;
    var L = function (v) {
      return by + bh - (Math.log10(v) - lo) / (hi - lo) * bh;
    };
    var xAt = function (k) {
      return PAD.l + ((k + 0.5) / D.greedy.length) * pw;
    };

    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (var e = lo; e <= hi; e++) {
      var yy = L(Math.pow(10, e));
      ctx.strokeStyle = "#eef1f4";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAD.l, yy); ctx.lineTo(PAD.l + pw, yy);
      ctx.stroke();
      ctx.fillStyle = "#a6aeb6";
      ctx.fillText(fmtTick(e), PAD.l - 6, yy);
    }
    ctx.strokeStyle = D.colors.axis;
    ctx.beginPath();
    ctx.moveTo(PAD.l, by); ctx.lineTo(PAD.l, by + bh);
    ctx.moveTo(PAD.l, by + bh); ctx.lineTo(PAD.l + pw, by + bh);
    ctx.stroke();

    // the optimal matching's worst pair: the bar greedy has to stay under
    var yRef = L(D.optWorst);
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = D.colors.green;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(PAD.l, yRef); ctx.lineTo(PAD.l + pw, yRef);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = D.colors.green;
    ctx.textAlign = "left"; ctx.textBaseline = "bottom";
    ctx.fillText("worst pair the optimal matching ends up with",
                 PAD.l + 5, yRef - 3);

    // the sequence itself
    ctx.strokeStyle = "#cfd6dc";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (var k = 0; k < D.greedy.length; k++) {
      var xx = xAt(k), yv = L(D.greedy[k][2]);
      if (k === 0) ctx.moveTo(xx, yv); else ctx.lineTo(xx, yv);
    }
    ctx.stroke();

    for (k = 0; k < D.greedy.length; k++) {
      var on = k < step;
      ctx.beginPath();
      ctx.arc(xAt(k), L(D.greedy[k][2]), (k === step - 1) ? 4.6 : 3.1,
              0, 2 * Math.PI);
      ctx.fillStyle = (k === step - 1) ? D.colors.red
                    : on ? D.colors.blue : "#e2e7eb";
      ctx.fill();
    }

    ctx.fillStyle = "#8a929a";
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText("pair distance D², in the order greedy picks them",
                 PAD.l + pw / 2, by + bh + 5);

    // ---------- readout --------------------------------------------------
    if (showOpt) {
      readout.innerHTML =
        'optimal matching<span class="gs-sep">|</span>total <b>' +
        D.optTotal.toFixed(1) + '</b><span class="gs-sep">|</span>' +
        'worst pair <b>' + D.optWorst.toFixed(2) + '</b>';
    } else if (step === 0) {
      readout.innerHTML = 'no pairs yet. Drag to watch greedy choose.';
    } else {
      var run = D.greedy.slice(0, step);
      var tot = run.reduce(function (t, g) { return t + g[2]; }, 0);
      var wst = run.reduce(function (t, g) { return Math.max(t, g[2]); }, 0);
      readout.innerHTML =
        'pair <b>' + step + '</b> of ' + D.greedy.length +
        '<span class="gs-sep">|</span>this pair <b>' +
        D.greedy[step - 1][2].toFixed(2) + '</b>' +
        '<span class="gs-sep">|</span>worst so far <b>' + wst.toFixed(2) +
        '</b><span class="gs-sep">|</span>total <b>' + tot.toFixed(1) + '</b>';
    }
    btnOpt.textContent = showOpt ? "Back to greedy" : "Show optimal matching";
    btnOpt.setAttribute("aria-pressed", showOpt ? "true" : "false");
  }

  var lastW = -1;
  function resize() {
    var w = canvas.clientWidth;
    if (!w || w === lastW) return;
    lastW = w;
    var h = Math.round(Math.min(Math.max(w * 0.86, 360), 560));
    var dpr = window.devicePixelRatio || 1;
    canvas.style.height = h + "px";
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  slider.addEventListener("input", function () { showOpt = false; draw(); });
  btnOpt.addEventListener("click", function () { showOpt = !showOpt; draw(); });
  if (window.ResizeObserver) new ResizeObserver(resize).observe(root);
  window.addEventListener("resize", resize);
  window.addEventListener("load", resize);
  resize();
  requestAnimationFrame(resize);
})();
