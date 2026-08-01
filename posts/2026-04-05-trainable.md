---
title: "trainable: where the code actually runs"
dek: Upload a CSV and agents do the ML. The interesting half is the sandbox, the volume and the stream.
date: 2026-04-05
tags: [agents]
---

[Trainable](https://github.com/lucastononro/trainable) is the biggest thing I've built and the hardest to summarise, so: the video.

[“Trainable — agents for data science and machine learning.”](https://www.youtube.com/watch?v=hwmT-4pKJQ8)

`pip install trainable-ai && trainable init`, and a wizard handles Docker and keys. There are nine agent declarations in `backend/agents/` and twenty-nine skills in `backend/skills/`, and the roster is the least interesting thing about it. What took the time is what happens after an agent decides to run some Python.

@diagram(trainable-infra) Where a line of agent-written Python goes, and where its output ends up.

## Every call, a sandbox

The `execute-code` skill hands a string to `services/sandbox.py:run_code`, which builds a fresh Modal Sandbox per call:

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

Every argument there is a decision. `-u` because buffered stdout defeats the streaming below. The image is `debian_slim(python_version="3.11")` with pandas, scikit-learn, xgboost, lightgbm, duckdb, optuna, shap, statsmodels, CPU-wheel torch and `tensorflow-cpu` preinstalled, memoised in a module global so the definition is assembled once per backend process and Modal serves the built layers to every sandbox after that. The repo's own `skills/` directory is copied in at `/skills`, which lets a `SKILL.md` point the agent at a script on disk rather than pasting it into the prompt.

`timeout` falls back to `settings.sandbox_timeout`, 600 seconds, and it is per call rather than per session. When Modal kills a sandbox the handler does not fail the run: it returns a tool result with `is_error=True` and prose explaining the options — split the work, shrink the data, or retry with `heavy=true`. `gpu` and `timeout` both come from a profile on the project row (`projects.sandbox_config`), so a user can move a project onto an A10G in a settings modal and the next call picks it up. The agent reads those profiles in a prompt block rendered from the same config, and is told to persist intermediate state between calls rather than trust one long one.

## State between calls

The sandbox is gone the moment it exits. What survives is the Modal Volume at `/data`, and `workdir=/data/sessions/{session_id}` is the line I'd keep if I could only keep one. Every execution and every notebook cell runs with the session workspace as its cwd, so `pd.read_parquet("data/train.parquet")` lands on the volume without anyone reasoning about absolute paths.

Two bits of housekeeping hold that up. Modal needs the workdir to exist before Python starts, so `ensure_session_workspace` puts an empty `src/__init__.py` there before every spawn; and the SDK preamble prepended to every execution puts that `src/` on the path:

```python
def _bootstrap_session_repo() -> None:
    session_src = _VOL_ROOT / "sessions" / _SID / "src"
    session_src.mkdir(parents=True, exist_ok=True)
    …
    sys.path.insert(0, src)
```

So the workspace is a small repo. One agent promotes a helper out of a notebook into `src/loaders.py`, and a different agent, later, does `from loaders import load_raw` instead of rewriting it. State passes between agents as code, not as a summary of code.

The volume is reloaded before each spawn so the new sandbox sees the last one's writes, and afterwards `detect_new_files` diffs a recursive listing against what it saw before and emits one event per new path. Nothing in the UI knows where a figure is supposed to live: a post-run pass classifies every file by extension into an `artifacts` table — `.png` a chart, `.md` a report, `.pkl` a model — and the frontend renders from that index.[^layout]

S3 (MinIO in dev) is the second tier and pointedly not the authority. `services/s3_sync.py` mirrors a finished workspace to `s3://datasets/datasets/{experiment_id}/processed/{session_id}/`; `routers/projects.py` states the hierarchy out loud. The volume is primary because it is what sandboxes mount. S3 gets checked only to surface files that were uploaded but never made it into the sandbox, reported per file as `in_sandbox: false`.

[^layout]: The folder layout — `report.md`, `figures/`, `data/` — is convention, not enforcement. The prep explorer resolves the parquet splits through three tiers (prep metadata, then the artifact table, then a recursive scan) precisely so nothing hardcodes a path. Agents rearrange their workspace; indexes don't mind.

## Stdout as protocol

There is no agent in the loop of the live dashboard. Inside the sandbox, `trainable.log()` prints a line:

```python
def log(step, metrics, run=None):
    payload = {"step": int(step),
               "metrics": {k: float(v) for k, v in dict(metrics).items()}}
    if _MODE == "sandbox":
        _emit(payload)      # print(json.dumps(...), flush=True)
        return
```

`run_code` consumes the sandbox's stdout chunk by chunk, buffers it into lines, and sends each through `parse_stdout_line`. Recognised envelopes — scalar metrics, a `chart_config`, or a rich `log` event such as an image, table or confusion matrix — get persisted and published. Everything else is just output the model will read back. The whitelist of rich types is small deliberately: a new one needs a frontend renderer first, otherwise a typo in agent code quietly fills the table with rows nothing can draw.

Publishing means a per-session `asyncio.Queue` in an in-process broadcaster, drained by exactly one SSE route, `/api/sessions/{session_id}/stream`:

```python
event = await asyncio.wait_for(
    queue.get(), timeout=settings.sse_keepalive_seconds
)
yield {"data": json.dumps(event)}
except asyncio.TimeoutError:
    yield {"comment": "keepalive"}
```

Queues cap at 1000 events and drop the oldest under pressure, which is correct for a progress feed and wrong for anything you'd bill on — so token counts and sandbox seconds go to the database as `UsageEvent` rows and are only *also* broadcast. The routers never learn the event types; they call `broadcaster.publish`, and the endpoint stays thirteen lines long.

This is the part that changes how the thing feels. A chart that appears while the fit is still running is a chart you check at minute two, when the wrong column is still cheap to fix.

## One kernel per session

Notebooks needed the one thing a per-call sandbox can't offer: a kernel that remembers. So `services/kernel_manager.py` keeps a long-lived sandbox per session running a proxy that spawns a real `ipykernel` subprocess and speaks ZMQ to it locally. The backend drives that proxy over the sandbox's stdin and stdout with newline-delimited JSON — no tunnels, no ports, nothing extra to authenticate, and the same pipe the one-shot executions already use.

One kernel serves every notebook in the session, so variables set in `data-overview` are visible in `baseline-model`. Cell output goes to the browser and into the `.ipynb` on the volume simultaneously, with caps — 100,000 characters of stream output, five million of base64 PNG — so a runaway loop can't take out the feed or the file. An idle kernel is reaped after fifteen minutes and none outlives two hours.

## What you can actually do

A project owns datasets; an experiment is an agent-declared bundle of processed dataset, model and metrics inside a session. Uploads go to both storage tiers in a single `batch_upload`, because the serial version did one Modal round trip per file and a folder of a thousand images made the request look hung for half an hour. `fork-experiment` copies the parent's input datasets under a new name and hypothesis and leaves the parent alone — the "same prep, different model" loop, agent-only, no button.

The prep explorer runs DuckDB over the parquet splits in-process and locks the connection down *after* loading rather than before: `SET enable_external_access = false`, SELECT-only, `read_csv` and `glob` blocked, limit forced to 1000. Comparing runs is one route that takes up to eight session ids and returns metric series, feature-column overlap and per-session cost in a single payload. Lineage draws datasets and models as nodes and leaves experiments implicit, on the grounds that they were visual noise; snapshots SHA-256 every parquet and every `.py` into a manifest at `/sessions/{id}/snapshot.json`.

Promotion is where the session stops mattering. `promote_session_model` copies artifact bytes to `/projects/{pid}/models/{name}/v{N}/model.{ext}` with a monotonic version, freezes the metric summary, and infers the framework from the extension. The docstring is the design: *sessions die; promoted models don't.*

Deploying is a second, separate step, because a pickle isn't a service. An agent writes a Modal `app.py` next to the artifact — `@app.cls` loads the model at container start, a `fastapi_endpoint` exposes `predict` behind a typed Pydantic contract with Swagger for free — and every model in a project shares one Modal App, so deploys need no rebuild and a rollback is a row delete. `validate-serving-app` runs before the Deploy button becomes clickable: `ast.parse` the file, confirm the artifact path resolves on the volume, check the API-key secret name matches. That middle check earns its keep because a wrong path makes `@modal.enter` raise `FileNotFoundError`, and Modal then retries the container forever, which presents as a hung endpoint rather than an error.[^gpu]

And you can leave. The session download streams a zip of the workspace with a `requirements.txt`, a README and a local shim for the `trainable` module appended, so scripts that `from trainable import log` still run on a laptop.

[^gpu]: Compute choices are coerced to a known set — `cpu`, `T4`, `L4`, `A10G`, `A100-40GB`, `A100-80GB`, `H100` — and anything unrecognised falls back to `cpu`, so that a misspelled value never silently lights up an expensive A100. Per-second rates live in `services/sandbox.yml`, which is also how the usage rollup keeps LLM spend and compute spend in separate columns.

## Two containers and a token

Production is deliberately boring: two multi-arch images on GHCR, plus Postgres, MinIO and a Jaeger sidecar in `docker-compose.prod.yml`. Development is `sqlite+aiosqlite:///trainable.db` and a hand-rolled `_run_migrations` that `ALTER TABLE`s in missing columns at startup — no Alembic, which I expect to regret and haven't yet. SQLite also gets a `PRAGMA foreign_keys=ON` connect listener, because without it `ON DELETE CASCADE` is silently a no-op and you discover this via orphan rows.

```yaml
backend:
  image: ghcr.io/lucastononro/trainable-backend:${TRAINABLE_BACKEND_TAG:-latest}
  environment:
    DATABASE_URL: postgresql+asyncpg://trainable:trainable@postgres:5432/trainable
    S3_ENDPOINT: http://minio:9000
    S3_ENDPOINT_EXTERNAL: http://localhost:9000
    OTEL_EXPORTER_OTLP_ENDPOINT: http://jaeger:4317
```

Those two endpoints are one MinIO seen from two places: the backend reaches it at `minio:9000` inside the compose network, and presigned URLs are rewritten to `localhost:9000` so a browser can follow them. What the `.env` genuinely requires is shorter than you'd guess — `MODAL_TOKEN_ID`, `MODAL_TOKEN_SECRET`, and one LLM credential. Everything else has a default, including the database.

## State as code, not summaries

The question underneath all of this is how you let a language model run arbitrary code for twenty minutes without the run becoming unauditable. My answer turned out not to be a permission model but a shape of storage: destroy the machine after every call, keep the directory. Because everything a run produced is a file on the volume with a path, a recursive diff and a classification by extension are enough to build the index the UI reads. Nothing had to be declared up front, and no agent had to remember to register its own output.

The transferable idea is the smaller one. When an agent promotes a helper out of a notebook into `src/loaders.py` and a later agent imports it, the second one isn't working from a paraphrase of the first one's reasoning — it is running the same code, and it fails loudly if that code was wrong. Summaries drop precisely the details that break. Delete the volume and what remains is a transcript of a data science project: fluent, ordered, and reproducible by nobody.

---

The agents are the demo; the volume is the product.
