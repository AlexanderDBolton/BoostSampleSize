# BoostSampleSize

Articles on Mahalanobis distance, stratification, pairwise matching, and
rerandomization.

Published at <https://alexanderdbolton.github.io/BoostSampleSize>.

## Contents

| Article | Status | Source |
|---|---|---|
| The Mahalanobis distance | published | [`posts/mahalanobis-distance/`](posts/mahalanobis-distance/index.qmd) |
| Stratification | outline only (`draft: true`) | [`posts/stratification/`](posts/stratification/index.qmd) |
| Pairwise matching | outline only (`draft: true`) | [`posts/pairwise-matching/`](posts/pairwise-matching/index.qmd) |
| Rerandomization | outline only (`draft: true`) | [`posts/rerandomization/`](posts/rerandomization/index.qmd) |

Drafts render but are excluded from the listing and navigation. Remove
`draft: true` from a post's front matter to publish it.

## Setup

Requires [Quarto](https://quarto.org) and Python 3.12+.

```bash
python -m venv .venv
.venv/Scripts/python.exe -m pip install numpy matplotlib pandas scipy networkx jupyter ipykernel
```

`.venv/` is gitignored. On macOS or Linux use `.venv/bin/python` throughout.

`networkx` is used only by the pairwise-matching article, for the
minimum-weight perfect matching. That page takes about 65 seconds to render,
most of it the blossom algorithm at N = 400.

It deliberately does **not** set `freeze: auto`, and it should stay that way.
Quarto's freeze hashes the `.qmd` and nothing else, so editing a widget's
`.js` file leaves the frozen output in place and the site silently ships the
previous version of the script. The frozen folder also keeps figures from
earlier runs without pruning them, so a renamed figure reappears in `docs/`
after every render and deleting it from `docs/` alone does not stick. Both
cost more than the minute the freeze saves.

## Home page thumbnails

The cards on the home page use `posts/<slug>/thumbnail.png`. Each article's own
centrepiece is an interactive canvas, which leaves nothing for a card to show,
so the thumbnails are drawn separately by `make_thumbnails.py`. Regenerate and
commit them when one needs changing:

```bash
.venv/Scripts/python.exe make_thumbnails.py
```

## Building

Quarto has to use the virtual environment, otherwise it picks up whatever Python
is first on `PATH`. The simplest way is to activate the venv once per terminal
session — after that, plain `quarto` commands do the right thing.

PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
quarto render
```

bash / macOS / Linux:

```bash
source .venv/bin/activate
quarto render
```

To preview locally while editing — this serves the site and re-renders on every
save, which is the way to work on an article:

```powershell
.\.venv\Scripts\Activate.ps1
quarto preview
```

Press Ctrl+C to stop it.

If you would rather not activate, set the variable instead. Note that the
bash-style `VAR=value command` prefix is **not** valid PowerShell syntax:

```powershell
$env:QUARTO_PYTHON = ".venv\Scripts\python.exe"
quarto render
```

Output goes to `docs/`, which **is** committed — GitHub Pages serves the site
from `main` / `docs`, configured under *Settings → Pages → Build and deployment
→ Deploy from a branch → main / docs*.

## Notes

- Do not use the Microsoft Store build of Python. It virtualises writes to
  `%LOCALAPPDATA%`, which breaks Quarto's Jupyter kernel logging. Install
  Python from python.org or via `winget install Python.Python.3.12`.
- `docs/.nojekyll` is generated from the empty `.nojekyll` file in the repo root
  (declared under `project: resources:` in `_quarto.yml`). It stops GitHub Pages
  running Jekyll, which would otherwise drop the `_files` asset directories.

## Vendored datasets

`data/` holds two small public datasets, committed so that renders never
depend on the network:

- `lalonde-nsw.csv` — the National Supported Work job-training experiment
  (LaLonde's "NSW") in Dehejia and Wahba's
  version, from <https://users.nber.org/~rdehejia/data/nsw_dw.dta>. Covariates
  and 1978 earnings only. Measured R² is 0.04, the low end of what balancing
  is worth.
- `star-grade3.csv` — a fixed 400-pupil sample of Project STAR records with
  complete grade-two and grade-three scores, via
  <https://vincentarelbundock.github.io/Rdatasets/csv/AER/STAR.csv>. Measured
  R² is 0.65, the high end.

Neither article uses the original treatment assignment. What these supply is a
real covariate structure and a real outcome, so R² is measured rather than
chosen.
