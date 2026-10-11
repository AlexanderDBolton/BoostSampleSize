/* Sinks: excluding the units that have nothing near them.
 *
 * Each slider position is a separate optimal matching, solved in Python with
 * that many sink nodes added. Dropped units are drawn hollow with a cross.
 * The bar on the right is the worst remaining pair, which is the quantity the
 * sinks are there to control.
 */
(function () {
  var root = document.getElementById("__ID__");
  if (!root) return;
  var D = __DATA__;

  var canvas = root.querySelector("canvas");
  var ctx = canvas.getContext("2d");
  var slider = root.querySelector("input[type=range]");
  var readout = root.querySelector(".sk-readout");
  var labels = root.querySelectorAll(".sk-labels span");

  var FONT = '12.5px -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  var PAD = { l: 14, r: 92, t: 12, b: 28 };

  slider.max = String(D.states.length - 1);

  var xs = D.pts.map(function (p) { return p[0]; });
  var ys = D.pts.map(function (p) { return p[1]; });
  var ex = [Math.min.apply(null, xs), Math.max.apply(null, xs)];
  var ey = [Math.min.apply(null, ys), Math.max.apply(null, ys)];
  var mx = (ex[1] - ex[0]) * 0.07, my = (ey[1] - ey[0]) * 0.09;
  ex = [ex[0] - mx, ex[1] + mx];
  ey = [ey[0] - my, ey[1] + my];

  var worstMax = D.states[0].worst;

  function draw() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);
    ctx.font = FONT;

    var si = parseInt(slider.value, 10);
    var st = D.states[si];

    // equal aspect, so a line that looks twice as long really is
    var pw = w - PAD.l - PAD.r, ph = h - PAD.t - PAD.b;
    var sc = Math.min(pw / (ex[1] - ex[0]), ph / (ey[1] - ey[0]));
    var cx0 = (ex[0] + ex[1]) / 2, cy0 = (ey[0] + ey[1]) / 2;
    var ox = PAD.l + pw / 2, oy = PAD.t + ph / 2;
    var X = function (v) { return ox + (v - cx0) * sc; };
    var Y = function (v) { return oy - (v - cy0) * sc; };

    ctx.strokeStyle = D.colors.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(PAD.l, PAD.t, pw, ph);

    var dropped = {};
    st.dropped.forEach(function (i) { dropped[i] = 1; });

    // worst remaining pair drawn in red so the effect of a sink is visible
    var wi = -1, wv = -1;
    st.pairs.forEach(function (p, k) { if (p[2] > wv) { wv = p[2]; wi = k; } });

    ctx.save();
    ctx.beginPath(); ctx.rect(PAD.l, PAD.t, pw, ph); ctx.clip();
    st.pairs.forEach(function (p, k) {
      var hot = k === wi;
      ctx.strokeStyle = hot ? D.colors.red : D.colors.dark;
      ctx.lineWidth = hot ? 2.6 : 1.2;
      ctx.globalAlpha = hot ? 1 : 0.65;
      ctx.beginPath();
      ctx.moveTo(X(D.pts[p[0]][0]), Y(D.pts[p[0]][1]));
      ctx.lineTo(X(D.pts[p[1]][0]), Y(D.pts[p[1]][1]));
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    for (var i = 0; i < D.pts.length; i++) {
      var px = X(D.pts[i][0]), py = Y(D.pts[i][1]);
      if (dropped[i]) {
        ctx.strokeStyle = D.colors.grey;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(px, py, 4.6, 0, 2 * Math.PI); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(px - 2.6, py - 2.6); ctx.lineTo(px + 2.6, py + 2.6);
        ctx.moveTo(px + 2.6, py - 2.6); ctx.lineTo(px - 2.6, py + 2.6);
        ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(px, py, 3.4, 0, 2 * Math.PI);
        ctx.fillStyle = D.colors.blue; ctx.fill();
      }
    }
    ctx.restore();

    // ---- worst-pair bar on the right -----------------------------------
    var bx = w - PAD.r + 26, bw = 26;
    var by = PAD.t + 16, bh = ph - 40;
    ctx.fillStyle = "#eef1f4";
    ctx.fillRect(bx, by, bw, bh);
    var frac = Math.max(0, Math.min(1, st.worst / worstMax));
    ctx.fillStyle = D.colors.red;
    ctx.fillRect(bx, by + bh * (1 - frac), bw, bh * frac);
    ctx.fillStyle = D.colors.tick;
    ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText("worst", bx + bw / 2, by - 4);
    ctx.textBaseline = "top";
    ctx.fillText(st.worst.toFixed(2), bx + bw / 2, by + bh + 5);

    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(D.xlab, PAD.l + pw / 2, PAD.t + ph + 8);

    readout.innerHTML =
      '<b>' + st.sinks + '</b> sink' + (st.sinks === 1 ? '' : 's') +
      '<span class="sk-sep">|</span><b>' + st.dropped.length +
      '</b> units excluded<span class="sk-sep">|</span><b>' +
      st.pairs.length + '</b> pairs kept' +
      '<span class="sk-sep">|</span>worst pair <b>' + st.worst.toFixed(2) +
      '</b><span class="sk-sep">|</span>total <b>' + st.total.toFixed(1) + '</b>';

    for (var k = 0; k < labels.length; k++) {
      labels[k].classList.toggle("sk-on", k === si);
    }
  }

  var lastW = -1;
  function resize() {
    var w = canvas.clientWidth;
    if (!w || w === lastW) return;
    lastW = w;
    var h = Math.round(Math.min(Math.max(w * 0.62, 280), 440));
    var dpr = window.devicePixelRatio || 1;
    canvas.style.height = h + "px";
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  slider.addEventListener("input", draw);
  for (var j = 0; j < labels.length; j++) {
    (function (node, idx) {
      node.addEventListener("click", function () {
        slider.value = String(idx); draw();
      });
    })(labels[j], j);
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(root);
  window.addEventListener("resize", resize);
  window.addEventListener("load", resize);
  resize();
  requestAnimationFrame(resize);
})();
