---
title: "trainable: the data was never the bottleneck"
dek: Every company has the data; almost none have the two specialist weeks that turn it into a model.
date: 2026-04-05
tags: [agents]
---

[Trainable](https://github.com/lucastononro/trainable) is a studio in which agents do the data science. Start with the demo, because it is faster than anything I can write here.

[Trainable - Agents for data science and Machine Learning — the current build, one session, end to end.](https://www.youtube.com/watch?v=hwmT-4pKJQ8)

## Having the data is not enough

Every company I have worked with already has the data. That was the last decade's project and it worked: the warehouse exists, the events are instrumented, the nightly job runs, and storage costs less per terabyte than the meeting about it.

What almost none of them have is the person who turns that table into a model somebody will actually deploy. That person knows which distribution to be suspicious of, reads a 0.99 AUC as a leaked column rather than a result, and insists on beating the dull benchmark before anyone is allowed to try something interesting. They are scarce, expensive, and slow to hire. So the table sits there. The bottleneck was never storage and has not been compute for years; it is the calendar of about four people.

Most of what fills that calendar is not the judgement — it is the fortnight afterwards. Profiling every column, arguing with the missingness pattern, choosing encodings, splitting the data once and meaning it, fitting the boring baseline, thirty Optuna trials on top, writing up the leaderboard and the feature importances. That fortnight is what Trainable automates, and I want to be exact about where it stops. It does not frame the problem, decide whether the model should exist, or notice that the label you were handed is a proxy for something you would rather not predict. A human still picks the target, says what a false negative costs, and reads the review. The roster includes a `reviewer` agent whose entire brief is to disagree with the others — leakage, temporal leakage, features derived from the target — and it is there because judgement is the part that needs checking, not the part that got replaced.

The input need not be a table, either. `sample-data/` ships seven datasets: six are a single CSV with a guessable header — Titanic, telco churn, wine quality, California housing, heart failure, employee attrition — and the seventh is 1,765 photographs of cars with a COCO annotation file beside them. Nothing in the upload path inspects a file: bytes go to S3 and to the Modal Volume under whatever relative path the browser sent, the content type falls back to `application/octet-stream`, and the agent opens them with Python. The honest limit is the paved road rather than the door: the prep explorer and the tabular training skill both want parquet splits and a named target, so a detector gets the sandbox, a GPU and a live grid of prediction overlays, but no pre-written methodology.

![One of three images in the smoke-test split, 472×303 in the dataset, carrying a single COCO box at 249, 186, 101, 49 — nothing a SELECT could return](/images/trainable-license-plate.jpg)

@diagram(trainable-context) Redrawn from the repo's own C4 context diagram: the whole system is one box, and the person stands outside it.

## Every call, a sandbox

`pip install trainable-ai && trainable init`, and a wizard handles Docker and keys. What took the time is not the agent roster; it is what happens after an agent decides to run some Python. The `execute-code` skill hands a string to `services/sandbox.py:run_code`, which builds a fresh Modal Sandbox per call:

```python
sb = await modal.Sandbox.create.aio(
    "python", "-u", "-c", full_code,
    image=_get_image(),
    volumes={"/data": get_volume()},
    gpu=gpu,
    timeout=effective_timeout,
    workdir=f"/data/sessions/{session_id}",
    app=await _get_app(),
)
```

Every argument there is a decision. `-u` because buffered stdout defeats the streaming below. The image is `debian_slim(python_version="3.11")` with pandas, scikit-learn, xgboost, lightgbm, duckdb, optuna, shap, statsmodels, CPU-wheel torch and `tensorflow-cpu` preinstalled, memoised in a module global so the definition is assembled once per backend process and Modal serves the built layers to every sandbox after that. `gpu` and `timeout` come from a profile on the project row, so moving a project onto an A10G is a settings modal and the next call picks it up.[^gpu] When Modal kills a sandbox at the 600-second mark the handler does not fail the run: it returns a tool result with `is_error=True` and prose explaining the options — split the work, shrink the data, or retry with `heavy=true`.

## State between calls

The sandbox is gone the moment it exits. What survives is the Modal Volume at `/data`, and `workdir=/data/sessions/{session_id}` is the line I would keep if I could only keep one. Every execution and every notebook cell runs with the session workspace as its cwd, so `pd.read_parquet("data/train.parquet")` lands on the volume without anyone reasoning about absolute paths.

Modal needs that workdir to exist before Python starts, so an empty `src/__init__.py` is written there before every spawn, and the preamble prepended to every execution puts that `src/` on the path:

```python
def _bootstrap_session_repo() -> None:
    session_src = _VOL_ROOT / "sessions" / _SID / "src"
    session_src.mkdir(parents=True, exist_ok=True)
    …
    sys.path.insert(0, src)
```

So the workspace is a small repo. One agent promotes a helper out of a notebook into `src/loaders.py`, and a different agent, later, does `from loaders import load_raw` instead of rewriting it. State passes between agents as code, not as a summary of code. Notebooks get the one thing a per-call sandbox cannot offer — a kernel that remembers — from a long-lived sandbox per session driven over its own stdin, so variables set in `data-overview` are visible in `baseline-model`.

The volume is reloaded before each spawn so a new sandbox sees the last one's writes, and afterwards a recursive diff emits one event per new path. Nothing in the UI knows where a figure is supposed to live: a post-run pass classifies every file by extension into an `artifacts` table — `.png` a chart, `.md` a report, `.pkl` a model — and the frontend renders from that index.[^layout]

S3 (MinIO in dev) is the second tier and pointedly not the authority. The volume is primary because it is what sandboxes mount; S3 takes a mirror of the finished workspace, and gets read back only to surface files that were uploaded but never made it into a sandbox, reported per file as `in_sandbox: false`.

[^layout]: The folder layout — `report.md`, `figures/`, `data/` — is convention, not enforcement. The prep explorer resolves the parquet splits through three tiers (prep metadata, then the artifact table, then a recursive scan) precisely so nothing hardcodes a path. Agents rearrange their workspace; indexes don't mind.

## Stdout as protocol

@diagram(trainable-infra) Where a line of agent-written Python goes, and where its output ends up.

There is no agent in the loop of the live dashboard. Inside the sandbox, `trainable.log()` prints a line:

```python
def log(step, metrics, run=None):
    payload = {"step": int(step),
               "metrics": {k: float(v) for k, v in dict(metrics).items()}}
    if _MODE == "sandbox":
        _emit(payload)      # print(json.dumps(...), flush=True)
        return
```

`run_code` consumes the sandbox's stdout chunk by chunk, buffers it into lines, and sends each through `parse_stdout_line`. Recognised envelopes — scalar metrics, a `chart_config`, or a rich event such as an image, table or confusion matrix — get persisted and published; everything else is just output the model will read back. The whitelist of rich types is small deliberately, because a new one needs a frontend renderer first, and otherwise a typo in agent code quietly fills the table with rows nothing can draw.

Publishing means a per-session `asyncio.Queue` in an in-process broadcaster, drained by exactly one SSE route. The routers never learn the event types; they call `broadcaster.publish`, and the generator behind the endpoint is thirteen lines long.

This is the part that changes how the thing feels, and the part I would defend to somebody who cares about none of the above. A chart that appears while the fit is still running is a chart you check at minute two, when the wrong column is still cheap to fix. A report twenty minutes later is something you audit; a metric arriving now is something you supervise.

## What you can actually do

A project owns datasets; an experiment is an agent-declared bundle of processed dataset, model and metrics inside a session. `fork-experiment` copies the parent's input datasets under a new name and hypothesis and leaves the parent alone — the "same prep, different model" loop, agent-only, no button. Comparing runs is one route: up to eight session ids in, and metric series, feature-column overlap and per-session cost out. The prep explorer runs DuckDB over the parquet splits in-process and locks the connection down *after* loading rather than before: `SET enable_external_access = false`, SELECT-only, `read_csv` and `glob` blocked, limit forced to 1000.

Promotion is where the session stops mattering. `promote_session_model` copies artifact bytes to a versioned path under the project, freezes the metric summary, and infers the framework from the extension. The module docstring is the design: *sessions die; promoted models don't.* Deploying is a second, separate step, because a pickle isn't a service — an agent writes a Modal `app.py` next to the artifact, where `@app.cls` loads the model at container start and a `fastapi_endpoint` exposes `predict` behind a typed Pydantic contract. `validate-serving-app` runs before the Deploy button becomes clickable, and the check that earns its keep is the dullest one: that the artifact path resolves on the volume. A wrong path makes `@modal.enter` raise `FileNotFoundError`, Modal then retries the container forever, and that presents as a hung endpoint rather than an error.

And you can leave. The session download streams a zip of the workspace with a `requirements.txt`, a README and a local shim for the `trainable` module appended, so scripts that `from trainable import log` still run on a laptop.

[^gpu]: Compute choices are coerced to a known set — `cpu`, `T4`, `L4`, `A10G`, `A100-40GB`, `A100-80GB`, `H100` — and anything unrecognised falls back to `cpu`, so that a misspelled value never silently lights up an expensive A100.

## Where this started

The demo at the top is an update. This is the first version, recorded before most of the machinery above existed:

[Trainable - Introducing a different path to Data Science — the original cut, and the argument unchanged.](https://www.youtube.com/watch?v=FhQlUC7YokA&t=1s)

I keep it up because the framing in that title is the one I still hold, and everything that changed since is underneath it. A different path to the same deployed model: the labour is automatable, the judgement is not, and the interesting engineering is the part nobody demos — a machine per call, a directory that outlives it, and a stream that lets you catch a mistake at minute two rather than in the write-up.

## State as code, not summaries

The question underneath all of this is how you let a language model run arbitrary code for twenty minutes without the run becoming unauditable. My answer turned out not to be a permission model but a shape of storage: destroy the machine after every call, keep the directory. Because everything a run produced is a file on the volume with a path, a recursive diff and a classification by extension are enough to build the index the UI reads. Nothing had to be declared up front, and no agent had to remember to register its own output.

The transferable idea is the smaller one. When an agent promotes a helper out of a notebook into `src/loaders.py` and a later agent imports it, the second one isn't working from a paraphrase of the first one's reasoning — it is running the same code, and it fails loudly if that code was wrong. Summaries drop precisely the details that break. Delete the volume and what remains is a transcript of a data science project: fluent, ordered, and reproducible by nobody.

---

The agents are the demo; the fortnight is the point.
