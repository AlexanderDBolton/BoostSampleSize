/* Interactive version of the centre -> whiten demonstration.
 *
 * The slider runs 0 -> 1 in two halves:
 *   first half  (sA): the axis labels slide from raw values to deviations,
 *                     i.e. subtracting the mean, which is a pure relabelling
 *   second half (sB): the cloud is transformed by M = (1-sB)I + sB L^-1,
 *                     morphing the tilted ellipse into a circle
 *
 * The dashed rings are contours of constant Mahalanobis distance throughout,
 * so they start as the data's own ellipses and end as true circles. The red
 * segment is a fixed observation: its on-screen length changes, its
 * Mahalanobis distance does not.
 */
(function () {
  var root = document.getElementById("__ID__");
  if (!root) return;
  var D = __DATA__;

  var canvas = root.querySelector("canvas");
  var ctx = canvas.getContext("2d");
  var slider = root.querySelector("input[type=range]");
  var readout = root.querySelector(".mw-readout");
  var labels = root.querySelectorAll(".mw-labels span");

  var PAD = { l: 56, r: 16, t: 16, b: 30 };
  var FONT = '12.5px -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  function mul(M, v) {
    return [M[0][0] * v[0] + M[0][1] * v[1], M[1][0] * v[0] + M[1][1] * v[1]];
  }
  function matmul(A, B) {
    return [
      [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
      [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]]
    ];
  }
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
    var sA = Math.min(t / 0.5, 1);          // centring (relabelling) progress
    var sB = Math.max(0, (t - 0.5) / 0.5);  // whitening progress

    // M = (1 - sB) I + sB L^-1
    var Li = D.Linv;
    var M = [
      [(1 - sB) + sB * Li[0][0], sB * Li[0][1]],
      [sB * Li[1][0], (1 - sB) + sB * Li[1][1]]
    ];
    var ML = matmul(M, D.L);   // maps the unit circle to the D = 1 contour

    // ---- transform the cloud, and find the extent to fit -------------------
    var pts = new Array(D.pts.length);
    var R = 0;
    for (var i = 0; i < D.pts.length; i++) {
      var q = mul(M, D.pts[i]);
      pts[i] = q;
      R = Math.max(R, Math.abs(q[0]), Math.abs(q[1]));
    }
    // make sure the outermost ring stays inside the frame too
    for (var a = 0; a < 64; a++) {
      var th = (a / 64) * 2 * Math.PI;
      var e = mul(ML, [3 * Math.cos(th), 3 * Math.sin(th)]);
      R = Math.max(R, Math.abs(e[0]), Math.abs(e[1]));
    }
    R *= 1.08;

    var pw = w - PAD.l - PAD.r, ph = h - PAD.t - PAD.b;
    // one scale for both axes => equal aspect => circles look like circles
    var s = Math.min(pw, ph) / (2 * R);
    var cx = PAD.l + pw / 2, cy = PAD.t + ph / 2;
    var X = function (x) { return cx + x * s; };
    var Y = function (y) { return cy - y * s; };

    // ---- axes, ticks, grid -------------------------------------------------
    // During the first half the labels carry the un-subtracted mean, so the
    // numbers count down to zero-centred while nothing moves on screen.
    var off = [(1 - sA) * D.mu[0], (1 - sA) * D.mu[1]];
    var halfX = pw / (2 * s), halfY = ph / (2 * s);
    ctx.font = FONT;
    ctx.lineWidth = 1.2;

    var stepX = niceStep(2 * halfX, 6), stepY = niceStep(2 * halfY, 5);
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    var k, val, px;
    for (k = Math.ceil((-halfX + off[0]) / stepX); k * stepX <= halfX + off[0]; k++) {
      val = k * stepX; px = X(val - off[0]);
      ctx.strokeStyle = D.colors.grid;
      ctx.beginPath(); ctx.moveTo(px, PAD.t); ctx.lineTo(px, h - PAD.b); ctx.stroke();
      ctx.fillStyle = D.colors.tick;
      ctx.fillText(fmt(val, stepX), px, h - PAD.b + 6);
    }
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (k = Math.ceil((-halfY + off[1]) / stepY); k * stepY <= halfY + off[1]; k++) {
      val = k * stepY; var py = Y(val - off[1]);
      ctx.strokeStyle = D.colors.grid;
      ctx.beginPath(); ctx.moveTo(PAD.l, py); ctx.lineTo(w - PAD.r, py); ctx.stroke();
      ctx.fillStyle = D.colors.tick;
      ctx.fillText(fmt(val, stepY), PAD.l - 7, py);
    }

    ctx.strokeStyle = D.colors.axis;
    ctx.strokeRect(PAD.l, PAD.t, pw, ph);

    // ---- constant-Mahalanobis rings ---------------------------------------
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = D.colors.dark;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 1.1;
    for (var r = 1; r <= 3; r++) {
      ctx.beginPath();
      for (var b = 0; b <= 128; b++) {
        var thb = (b / 128) * 2 * Math.PI;
        var p = mul(ML, [r * Math.cos(thb), r * Math.sin(thb)]);
        if (b === 0) ctx.moveTo(X(p[0]), Y(p[1])); else ctx.lineTo(X(p[0]), Y(p[1]));
      }
      ctx.stroke();
    }
    ctx.restore();

    // ---- the cloud ---------------------------------------------------------
    ctx.fillStyle = D.colors.grey;
    ctx.globalAlpha = 0.55;
    for (i = 0; i < pts.length; i++) {
      ctx.beginPath();
      ctx.arc(X(pts[i][0]), Y(pts[i][1]), 2.1, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ---- origin, and the tracked observation ------------------------------
    var f = mul(M, D.focus);
    ctx.strokeStyle = D.colors.red;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(f[0]), Y(f[1])); ctx.stroke();

    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(X(0) - 5, Y(0)); ctx.lineTo(X(0) + 5, Y(0));
    ctx.moveTo(X(0), Y(0) - 5); ctx.lineTo(X(0), Y(0) + 5);
    ctx.stroke();

    ctx.fillStyle = D.colors.red;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(X(f[0]), Y(f[1]), 5.5, 0, 2 * Math.PI);
    ctx.fill(); ctx.stroke();

    // ---- readout -----------------------------------------------------------
    var eucl = Math.sqrt(f[0] * f[0] + f[1] * f[1]);
    readout.innerHTML =
      'straight-line length of the red segment in these coordinates: <b>' +
      eucl.toFixed(3) + '</b>' +
      '<span class="mw-sep">|</span>' +
      'Mahalanobis distance <i>D</i>: <b>' + D.Dval.toFixed(3) + '</b> (never changes)';

    var active = t < 0.25 ? 0 : t < 0.75 ? 1 : 2;
    for (i = 0; i < labels.length; i++) {
      labels[i].classList.toggle("mw-on", i === active);
    }
  }

  // Let CSS own the on-screen width (width:100%), so the canvas always fills
  // the column no matter when this first runs. Only the backing store and the
  // height are set here. Setting an inline pixel width instead would pin
  // whatever the column happened to measure during initial layout.
  var lastW = -1;
  function resize() {
    var w = canvas.clientWidth;
    if (!w || w === lastW) return;
    lastW = w;
    var h = Math.round(Math.min(Math.max(w * 0.58, 250), 420));
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
  // one more pass once layout has settled, in case this ran mid-render
  requestAnimationFrame(resize);
})();
