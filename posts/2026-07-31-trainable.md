---
title: "trainable: nine agents and a dataset walk into a sandbox"
dek: Upload a CSV and watch a team of specialist agents argue their way through EDA, feature engineering, training and deployment — with every chart and metric streaming into the browser as it happens.
date: 2026-07-31
tags: [trainable, project, agents, ml]
---

[Trainable](https://github.com/lucastononro/trainable) is the largest thing on this list and the hardest to describe in one line, so here is the video instead.

[“Trainable — agents for data science and machine learning.”](https://www.youtube.com/watch?v=hwmT-4pKJQ8)

The pitch: upload a dataset, and AI agents autonomously do the exploratory analysis, the data preparation, and the model training — with the reports, files and live metrics streaming into a canvas next to the chat. `pip install trainable-ai && trainable init` and a wizard walks you through Docker, keys and launch.

What I actually want to write about is the architecture, because the interesting decisions are not in the ML.

## Nine agents, defined in YAML

There is no giant prompt. There are nine agent definitions in `backend/agents/`, each a YAML file:

```
orchestrator  eda  data_prep  feature_eng  trainer  reviewer  deploy  researcher  chat
```

Each one declares its model, its depth limit, the skills it may call, and which subagents it is allowed to delegate to:

```yaml
name: eda
description: >
  Exploratory Data Analysis. Profiles datasets, finds patterns,
  generates visualizations, and writes a summary report.
default_model: claude-sonnet-4-6
max_depth: 1

skills:
  - name: execute-code
  - name: append-notebook-cell
  - name: delegate-task
  # …plus the experiment-lifecycle skills

subagents:
  - data_prep
  - feature_eng
  - reviewer

opener: "Begin EDA. Start by listing the dataset files."
```

The orchestrator sits at `max_depth: 2` and can delegate to any of the specialists; `eda` sits at `max_depth: 1` and can only reach three. Capability is data, not code — adding an agent is a YAML file, and the interesting constraint is what you *don't* put in its `skills` list.[^skills]

[^skills]: There are about thirty skills in `backend/skills/`, each its own directory: `execute-code`, `run-notebook-cell`, `register-dataset`, `start-training`, `create-serving-app`, `papers-search`, `train-tabular`, and so on. An agent that cannot call `start-training` cannot start a training run, no matter how convinced it is that it should.

## The workspace is a real Python repo

This is my favourite decision in the codebase, and it is one line of setup with a large consequence. Each session gets a directory, and that directory is the working directory for every code execution *and* every notebook cell, with `src/` on `sys.path` and an auto-created `__init__.py`.

So an agent can promote a helper out of a notebook into a module:

```python
# src/loaders.py — written by the eda agent
def load_raw():
    ...
```

and a *different* agent, later in the pipeline, can just `from loaders import load_raw` instead of rewriting the loading logic from the notebook it never saw. State passes between agents as **code**, not as a summary of code.

The layout is deliberately conventional rather than enforced:

- `report.md` at the top level — the narrative summary
- `figures/` — charts
- `data/` — processed data, parquet preferred
- `scripts/` — auto-saved by `execute-code`, the agent doesn't manage it

The system prompt is explicit that the UI and downstream agents find files through an artifact index rather than hardcoded paths, so the conventions exist for *humans browsing the workspace*, not for the machine. That is the right way round.

## Sandboxing and the boring good ideas

Code runs in [Modal](https://modal.com) sandboxes — isolated Python, optional GPU, ten-minute timeout per execution, with pandas, numpy, scikit-learn, duckdb, statsmodels and friends preinstalled. The EDA prompt tells the agent to reach for DuckDB over pandas past a million rows:

```python
duckdb.sql("SELECT ... FROM read_csv_auto('path')")
```

which is the kind of instruction that only appears in a prompt after you have watched an agent try to `pd.read_csv` a two-gigabyte file and time out.

The rest of the stack is deliberately unexciting: FastAPI and SQLAlchemy with SSE for streaming, Next.js and Recharts on the front, S3/MinIO for artifacts and Modal Volumes for the workspace, SQLite in dev and Postgres in prod. Multi-arch images published to GHCR so `docker compose up` works on both an M-series laptop and a cloud box.

## What surprised me

**Live streaming changes what people trust.** Watching a chart appear as the agent writes it is a completely different experience from being handed a finished report. You catch the wrong-column mistake at minute two instead of at the end, and the whole thing stops feeling like a slot machine.

**The reviewer agent earns its place.** It exists purely to be sceptical about what the others produced, and it is the agent I would keep if I had to delete eight.

---

Still alpha, still moving. But the shape I would keep in any future version is the same: capability as data, one shared workspace that is a real repo, and every artifact visible while it is being made rather than after.
