---
title: "trainable: nine agents and a dataset"
dek: Upload a CSV, watch specialist agents do the EDA, the prep and the training, with every chart streaming in live.
date: 2026-07-31
tags: [agents]
---

[Trainable](https://github.com/lucastononro/trainable) is the biggest thing I've built and the hardest to summarise, so: the video.

[“Trainable — agents for data science and machine learning.”](https://www.youtube.com/watch?v=hwmT-4pKJQ8)

`pip install trainable-ai && trainable init`, and a wizard handles Docker and keys. The interesting decisions aren't in the ML.

## Capability is data

There is no giant prompt. There are nine YAML files in `backend/agents/` — `orchestrator`, `eda`, `data_prep`, `feature_eng`, `trainer`, `reviewer`, `deploy`, `researcher`, `chat` — each declaring its model, its depth limit, the skills it may call and who it may delegate to:

```yaml
name: eda
default_model: claude-sonnet-4-6
max_depth: 1
skills: [execute-code, append-notebook-cell, delegate-task, …]
subagents: [data_prep, feature_eng, reviewer]
```

Adding an agent is a file. The interesting constraint is what you leave *out* of `skills` — there are about thirty of them, and an agent without `start-training` cannot start a training run however strongly it feels.

## The workspace is a real repo

My favourite decision, and it's one line of setup. Each session directory is the cwd for every code execution and notebook cell, with `src/` on `sys.path`. So the EDA agent can promote a helper out of a notebook:

```python
# src/loaders.py
def load_raw(): ...
```

and a *different* agent, later, does `from loaders import load_raw` instead of rewriting it. State passes between agents as code, not as a summary of code.[^conv]

[^conv]: The layout — `report.md`, `figures/`, `data/` — is convention, not enforcement. The UI finds files through an artifact index; the folders exist for humans browsing them. That's the right way round.

Code runs in Modal sandboxes with a ten-minute timeout. The EDA prompt tells the agent to use DuckDB past a million rows, which is an instruction that only gets written after you watch one try to `read_csv` two gigabytes.

---

Watching a chart appear as it's drawn changes what people trust. You catch the wrong-column mistake at minute two.
