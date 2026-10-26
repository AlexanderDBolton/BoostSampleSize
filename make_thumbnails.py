"""Generate the listing thumbnails for the home page.

Each article's own centrepiece is an interactive canvas, which leaves nothing
for a card to show, so these are drawn separately. Run after changing one, and
commit the PNGs alongside the source:

    .venv/Scripts/python.exe make_thumbnails.py
"""
import pathlib

import matplotlib as mpl
import matplotlib.pyplot as plt
import networkx as nx
import numpy as np
from matplotlib.patches import Ellipse

C = {
    "blue":   "#2c6e9b",
    "orange": "#d1743a",
    "green":  "#4f8f63",
    "red":    "#b5483d",
    "grey":   "#9aa3ab",
    "dark":   "#2c4a63",
    "pale":   "#dfe5ea",
}

mpl.rcParams.update({"figure.dpi": 150, "savefig.dpi": 150})

ROOT = pathlib.Path(__file__).parent
SIZE = (8, 5)          # 1200 x 750, a comfortable card aspect


def new_axes():
    fig, ax = plt.subplots(figsize=SIZE)
    ax.set_xticks([])
    ax.set_yticks([])
    for side in ax.spines.values():
        side.set_visible(False)
    ax.set_aspect("equal")
    fig.subplots_adjust(0.02, 0.02, 0.98, 0.98)
    return fig, ax


def fit_aspect(ax, target=SIZE[0] / SIZE[1]):
    """Widen the limits so the drawing fills the card instead of being
    letterboxed. Equal-aspect axes otherwise leave white bands at the sides,
    which makes the cards look ragged next to each other."""
    (x0, x1), (y0, y1) = ax.get_xlim(), ax.get_ylim()
    w, h = x1 - x0, y1 - y0
    if w / h < target:
        extra = (target * h - w) / 2
        ax.set_xlim(x0 - extra, x1 + extra)
    else:
        extra = (w / target - h) / 2
        ax.set_ylim(y0 - extra, y1 + extra)


def save(fig, slug):
    for ax in fig.axes:
        if ax.get_aspect() == 1.0:
            fit_aspect(ax)
    out = ROOT / "posts" / slug / "thumbnail.png"
    fig.savefig(out, facecolor="white")
    plt.close(fig)
    print(f"  {out.relative_to(ROOT)}")


def mahalanobis():
    """Equal-distance contours: two points equally far by ruler, not by D."""
    rng = np.random.default_rng(3)
    S = np.array([[1.0, 0.78], [0.78, 1.0]])
    X = rng.multivariate_normal([0, 0], S, 220)

    fig, ax = new_axes()
    ax.scatter(X[:, 0], X[:, 1], s=14, color=C["pale"], zorder=1,
               edgecolors="none")

    vals, vecs = np.linalg.eigh(S)
    angle = np.degrees(np.arctan2(vecs[1, -1], vecs[0, -1]))
    for r, alpha in [(1.0, 0.9), (2.0, 0.55), (3.0, 0.3)]:
        ax.add_patch(Ellipse((0, 0), 2 * r * np.sqrt(vals[1]),
                             2 * r * np.sqrt(vals[0]), angle=angle,
                             fill=False, lw=2.0, ls="--",
                             edgecolor=C["dark"], alpha=alpha, zorder=2))

    # same Euclidean distance from the centre, very different D
    Si = np.linalg.inv(S)
    for pt, col in [(np.array([1.55, 1.55]), C["green"]),
                    (np.array([1.55, -1.55]), C["red"])]:
        ax.plot([0, pt[0]], [0, pt[1]], color=col, lw=2.6, zorder=3)
        ax.scatter(*pt, s=110, color=col, zorder=4, edgecolors="white",
                   linewidths=1.6)
        d = np.sqrt(pt @ Si @ pt)
        ax.annotate(f"D = {d:.1f}", pt, textcoords="offset points",
                    xytext=(12, 6 if pt[1] > 0 else -14), fontsize=15,
                    color=col, fontweight="bold")
    ax.scatter(0, 0, s=50, color=C["dark"], zorder=4, marker="+", linewidths=2.4)
    ax.set_xlim(-3.6, 4.2)
    ax.set_ylim(-3.2, 3.2)
    save(fig, "mahalanobis-distance")


def stratification():
    """Quantile bands, each split between the two arms."""
    rng = np.random.default_rng(11)
    n = 160
    x = rng.normal(0, 1, n)
    edges = np.quantile(x, [0, 0.25, 0.5, 0.75, 1.0])
    y = rng.uniform(0, 1, n)

    fig, ax = new_axes()
    ax.set_aspect("auto")
    for b in range(4):
        if b % 2 == 0:
            ax.axvspan(edges[b], edges[b + 1], color="#f2f5f7", zorder=0)
        ax.axvline(edges[b], color=C["grey"], lw=1.1, ls="--", zorder=1)
    ax.axvline(edges[-1], color=C["grey"], lw=1.1, ls="--", zorder=1)

    band = np.clip(np.digitize(x, edges[1:-1]), 0, 3)
    treat = np.zeros(n, bool)
    for b in range(4):
        idx = np.where(band == b)[0]
        treat[rng.permutation(idx)[: len(idx) // 2]] = True
    ax.scatter(x[treat], y[treat], s=46, color=C["blue"], zorder=3,
               edgecolors="white", linewidths=1.1)
    ax.scatter(x[~treat], y[~treat], s=46, color=C["orange"], zorder=3,
               edgecolors="white", linewidths=1.1)
    ax.set_xlim(edges[0] - 0.25, edges[-1] + 0.25)
    ax.set_ylim(-0.12, 1.12)
    save(fig, "stratification")


def pairwise_matching():
    """The matching itself: every unit joined to its partner."""
    rng = np.random.default_rng(5)
    X = rng.multivariate_normal([0, 0], [[1, 0.0], [0.0, 1]], 46)
    Xc = X - X.mean(0)
    S = np.cov(Xc, rowvar=False, bias=True)
    Xw = Xc @ np.linalg.inv(np.linalg.cholesky(S)).T
    d2 = ((Xw[:, None, :] - Xw[None, :, :]) ** 2).sum(-1)

    G = nx.Graph()
    for i in range(len(Xw)):
        for j in range(i + 1, len(Xw)):
            G.add_edge(i, j, weight=d2[i, j])
    pairs = [tuple(e) for e in nx.min_weight_matching(G)]

    fig, ax = new_axes()
    for a, b in pairs:
        ax.plot(Xw[[a, b], 0], Xw[[a, b], 1], color=C["dark"], lw=2.0,
                alpha=0.75, zorder=2)
    first = np.array([a for a, _ in pairs])
    second = np.array([b for _, b in pairs])
    ax.scatter(Xw[first, 0], Xw[first, 1], s=78, color=C["blue"], zorder=3,
               edgecolors="white", linewidths=1.4)
    ax.scatter(Xw[second, 0], Xw[second, 1], s=78, color=C["orange"], zorder=3,
               edgecolors="white", linewidths=1.4)
    pad = 0.35
    ax.set_xlim(Xw[:, 0].min() - pad, Xw[:, 0].max() + pad)
    ax.set_ylim(Xw[:, 1].min() - pad, Xw[:, 1].max() + pad)
    save(fig, "pairwise-matching")


def rerandomization():
    """Candidate splits, and the few that clear the balance threshold."""
    from scipy import stats

    rng = np.random.default_rng(7)
    N, B = 200, 2600
    S = np.array([[1.0, 0.55], [0.55, 1.0]])
    X = rng.multivariate_normal([0, 0], S, N)
    cov_d = (4 / N) * np.cov(X, rowvar=False, bias=True)
    Ci = np.linalg.inv(cov_d)

    idx = np.argsort(rng.random((B, N)), axis=1)[:, : N // 2]
    sm = -np.ones((B, N))
    np.put_along_axis(sm, idx, 1.0, axis=1)
    d = (2 / N) * (sm @ X)
    M = np.einsum("bi,ij,bj->b", d, Ci, d)
    a = stats.chi2.ppf(0.05, 2)
    acc = M <= a

    fig, ax = new_axes()
    ax.scatter(d[~acc, 0], d[~acc, 1], s=11, color=C["grey"], alpha=0.38,
               zorder=1, edgecolors="none")
    ax.scatter(d[acc, 0], d[acc, 1], s=16, color=C["green"], alpha=0.95,
               zorder=3, edgecolors="none")

    L = np.linalg.cholesky(cov_d)
    th = np.linspace(0, 2 * np.pi, 200)
    for q, lw, ls in [(0.05, 2.6, "-"), (0.5, 1.4, "--")]:
        r = np.sqrt(stats.chi2.ppf(q, 2))
        e = (L @ np.vstack([np.cos(th), np.sin(th)])) * r
        ax.plot(e[0], e[1], color=C["dark"], lw=lw, ls=ls, zorder=4)
    # frame on the bulk rather than the stragglers, so the acceptance region
    # is still legible at card size
    lim = np.percentile(np.abs(d), 94)
    ax.set_xlim(-lim, lim)
    ax.set_ylim(-lim, lim)
    save(fig, "rerandomization")


if __name__ == "__main__":
    print("writing thumbnails:")
    mahalanobis()
    stratification()
    pairwise_matching()
    rerandomization()
