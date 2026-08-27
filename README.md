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
.venv/Scripts/python.exe -m pip install numpy matplotlib pandas scipy jupyter ipykernel
```

`.venv/` is gitignored. On macOS or Linux use `.venv/bin/python` throughout.

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
