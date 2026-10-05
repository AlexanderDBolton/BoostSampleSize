/* Precision calculator for rerandomization.
 *
 * v_a = P(chi2_{k+2} <= a) / P(chi2_k <= a) has no closed form in plain JS, so
 * it is precomputed in Python for every k and every offered acceptance rate and
 * shipped as a lookup table. Everything else is arithmetic:
 *
 *   variance ratio   f = 1 - (1 - v_a) R^2
 *   standard error   shrinks by sqrt(f)
 *   equivalent data  1/f, because a standard error scales as 1/sqrt(N)
 */
(function () {
  var root = document.getElementById("__ID__");
  if (!root) return;
  var D = __DATA__;

  var kIn   = root.querySelector(".gc-k");
  var r2In  = root.querySelector(".gc-r2");
  var paIn  = root.querySelector(".gc-pa");
  var kOut  = root.querySelector(".gc-k-val");
  var r2Out = root.querySelector(".gc-r2-val");
  var outV  = root.querySelector(".gc-out-v");
  var outSE = root.querySelector(".gc-out-se");
  var outN  = root.querySelector(".gc-out-n");
  var note  = root.querySelector(".gc-note");

  function update() {
    var k = parseInt(kIn.value, 10);
    var r2 = parseFloat(r2In.value) / 100;
    var va = D.va[paIn.value][k - 1];
    var f = 1 - (1 - va) * r2;

    kOut.textContent = k;
    r2Out.textContent = r2.toFixed(2);

    // Past roughly a tripling, "+950% more data" stops being readable and a
    // multiplier is clearer.
    var ratio = 1 / f;
    var dataStr = ratio > 3
      ? "×" + ratio.toFixed(ratio < 10 ? 1 : 0)
      : "+" + (100 * (ratio - 1)).toFixed(0) + "%";

    outV.textContent = va < 0.001 ? va.toExponential(1) : va.toFixed(3);
    outSE.textContent = (100 * (1 - Math.sqrt(f))).toFixed(1) + "%";
    outN.textContent = dataStr;

    if (r2 < 0.05) {
      note.textContent = "Covariates that explain almost none of the outcome " +
        "buy almost no precision, however hard you rerandomize.";
    } else if (va > 0.5) {
      note.textContent = "With this many covariates and this budget, most of " +
        "the imbalance survives. Balance fewer covariates, or draw more.";
    } else if (ratio > 3) {
      note.textContent = "Equivalent to running the experiment with " +
        ratio.toFixed(1) + " times as many units.";
    } else {
      note.textContent = "Equivalent to running the experiment with " +
        (100 * (ratio - 1)).toFixed(0) + "% more units.";
    }
  }

  [kIn, r2In, paIn].forEach(function (el) {
    el.addEventListener("input", update);
    el.addEventListener("change", update);
  });
  update();
})();
