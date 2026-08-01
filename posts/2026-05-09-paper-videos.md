---
title: "paper-videos: a paper in, an explainer out"
dek: An arXiv id goes in; a hundred-odd narrated beats come out, growing live in a browser tab.
date: 2026-05-09
tags: [agents]
---

The bottleneck in explaining a paper well isn't understanding it. It's the twelve hours of animation between understanding and having something watchable. So [paper-videos](https://github.com/lucastononro/paper-videos) takes an arXiv id, a PDF, or just *"explain backpropagation"*, and fills in an editor at `localhost:5173` while you watch.

[“MELT: Letting AI Think Longer Without Bloated Memory” — a paper, explained.](https://www.youtube.com/watch?v=kHtdshmZsio&t=227s)

[“Évariste Galois — Life and Theory” — the same pipeline, no PDF involved.](https://www.youtube.com/watch?v=ozWnqv_DENI&t=490s)

## The pipeline

@diagram(paper-videos-pipeline) The orchestrator is Claude Code itself, running inside the repo. Deterministic work lives in `src/tools/` as typed CLIs; the agents only do the parts that need judgement.

That split is most of the design. `narrate.ts`, `render-manim.ts`, `sync-manifest.ts`, `qa.ts` and `render-remotion.ts` are ordinary `commander` CLIs — arguments in, JSON on stdout, exit codes that mean something. Anything requiring taste — what to cut, what to animate, where to slow down — is a subagent. What holds them together is written down: "Each subagent has its own context window — the brief / script / manifest in `videos/<slug>/` are the persistent contract between them." Seven agent files, one folder of shared state, no message bus.

That contract is a table of reads and writes: `paper-extractor` takes `paper.pdf` and emits `paper.md` + `equations.json`; the critic reads those and emits `brief.json`; the storyteller reads the brief and emits `script.md`. Rule 2 keeps it honest: "Equations are sacred. Pull LaTeX strings only from `equations.json`. Never type LaTeX from memory of the paper." Topic mode has no paper at all, so the critic fills `equations.json` from its own research — same file, different upstream.

## The micro-beat doctrine

The part I'd defend in a fight. A **beat** is one visual moment and one narration clip: 8–40 words, two to ten seconds, hard cap 300 characters. A twelve-minute video is therefore 100–160 beats, not thirty segments. As data, a beat is three lines of markdown:

```markdown
### beat-002
[VISUAL: continue]
"On a thirty-two thousand token generation, Ouro burns about twenty-eight gigabytes of VRAM."

### beat-004
[PAUSE 0.8s]
(silent)
```

`[VISUAL: continue]` earns its keep. The parser inherits the previous cue, and the migrator then coalesces adjacent identical visuals into one `visualBlock` with one fade in and one fade out. Re-emit the same cue instead and you get two blocks, each fading through the background — a visible flash to navy and back at a boundary where nothing actually changed.

Downstream that becomes two independent arrays, not one:

```json
"voice":        [ { "id": "beat-001", "startFrame": 0,
                    "durationFrames": 214, "audioFile": "narration/beat-001.mp3", … } ],
"visualBlocks": [ { "id": "vb-001",   "startFrame": 0, "durationFrames": 588,
                    "visual": { "kind": "manimClip", "mp4": "manim/kv_tax_two_bars.mp4" } } ]
```

`voice[]` is one-to-one with the mp3s; `visualBlocks[]` are spans. That 588-frame animation sits under three voice beats; the MELT video has 90 voice beats to 59 blocks. The mp4 plays once and holds its final frame for the remainder — which is why scenes are required to end on a held tableau rather than a `FadeOut`. Held black is indistinguishable from a broken render.

Reason three in the doctrine is the one that actually pays: "Re-rendering one bad beat is cheap; re-rendering a 30-second monologue is not." When beat 87 is wrong, you fix beat 87.

## The padding arithmetic

`narrate.ts` hands each mp3 to ffmpeg (`adelay` + `apad`) with two constants:

```ts
const DEFAULT_PAD_LEADING_SEC = 0.25;
const DEFAULT_PAD_TRAILING_SEC = 0.9;
```

Overridable per run with `--pad-leading` / `--pad-trailing`. ElevenLabs returns character-level alignment; it gets collapsed into words and shifted — `start: w.start + padLeading` — so captions stay glued to speech that just moved. The reported `audioDurationSeconds` is the last word's end plus the trailing pad. Then the segment builder adds one more slice — `secondsToFrames(ts.audioDurationSeconds + 0.2, fps)`, commented "add 200ms tail so visual settles after voice ends".

Worked through, on beat-001 of the MELT video: the last word ends at 6.015s, `audioDurationSeconds` is 6.915, `durationFrames` is `ceil(7.115 × 30) = 214`, and beat-002's first word starts at exactly 0.250s. Speech-end to speech-start: 1.368s. Segments butt straight up against each other in the manifest — every millisecond of that silence lives inside the audio files.[^drift]

@diagram(paper-videos-beat) Two consecutive beats: the gap is three defaults stacked, not a gap.

Which is why the doctrine pre-empts the obvious mistake: "Pauses between beats come for free via the audio-padding logic — do NOT also insert `[PAUSE 0.2s]` beats when the natural mp3 pad already provides the gap." `[PAUSE Xs]` is reserved for deliberately long beats, 0.6s and up, where the silence is the point.

[^drift]: The repo disagrees with itself here — 0.6s appears in the prose section of `CLAUDE.md`, in `producer.md` and in `storyteller.md`; 0.9s appears in hard rule 4 and in the code. The mp3s on disk say 0.9.

## Cue-level dispatch

Some beats want photographic motion rather than maths. The storyteller signals that inside the cue's own `description`, with a `clip:` prefix (`veo:` is a legacy alias, treated identically):

```markdown
[MANIM: teaser_markdown_accreting description="clip: cinematic 8 seconds, slow
push-in on a single glowing markdown file titled 'best_skill.md' floating in a
black void, characters appear line by line in soft amber … 3blue1brown color
palette. 8s, 16:9."]
```

The visualizer expands that hint into a full cinematographic prompt and walks the provider chain — ElevenLabs Studio, then Veo, then Manim:

```bash
npm run elevenlabs-video -- "<prompt>" -m kling-2.6 --aspect 16:9 \
  --duration 8 --no-audio --out videos/<slug>/manim/beat-NNN.mp4
# exit code 2 = 401/403/404 from the Studio endpoint → private-beta gate, not a failure
npm run veo -- "<same prompt>" --model veo-3.1-generate-preview --aspect 16:9 …
```

Exit code 2 is reserved for 401/403/404, so "you don't have beta access" is machine-distinguishable from "the render failed". Any other non-zero exit means Manim, which is always reachable.

The dispatch lives in the cue rather than in an agent's head for a boring reason: the mp4 lands at `manim/beat-NNN.mp4` whichever provider produced it, the composition renders it as a `manimClip` either way, and the winner is recorded in a sidecar — `.elevenlabs.json` or `.veo.json`, with the full prompt, not a summary. A re-render reads the sidecar and takes the same path. The script never has to know which API key you happen to hold.

## Spot edits

![The editor: chat left, scrubbable player and filmstrip right, spot-edit thread docked](/images/paper-videos-spot-edit.jpg)

The manifest live-syncs after every narration and every render, so you can scrub a half-finished video, select a time-crop, and open a thread about *that range*. A pin-point conversation about beat 87 rather than about the video.

`sync-manifest` is just `rebuildSegmentsFromScript(slug, { partial: true })`: include every beat whose mp3 and timestamps are on disk, truncate cleanly at the first unfinished one, and swap any Manim mp4 that hasn't rendered yet for a `Rendering: <scene>…` title card. A chokidar watcher notices the write and broadcasts `preview:reload` on a 600ms debounce. Because the teaser is generated first, you judge the voice within seconds instead of at minute twelve.[^fds]

A spot-edit thread is handed a time crop and a finding aid, not a task list — "Edit whatever needs editing within that crop to address their ask", then "Stay inside the time crop. If a fix genuinely requires editing material outside it, stop and explain rather than silently widening scope." It closes itself by emitting one line beginning `SUMMARY:`, which the server watches for.

[^fds]: The watcher is capped at `depth: 3` and ignores `media/`, `paper-md-assets/` and `manim-last-frames/`, because watching the whole tree opened 2000+ kqueue FDs on macOS, exhausted the process pool, and made the editor's later `spawn('claude')` fail with `EBADF`. The symptom was "chat turn failed: spawn EBADF" and a dead server.

## Gates and TinyTeX

After the first three narrated beats the producer stops and makes you listen — `afplay` on beats 001 to 003 — before spending anything else. Fail fast, in the voice you'll hear for the next twelve minutes. The remedies are all script-side: bad pronunciation is a phrasing problem, and pacing gets fixed with commas and em-dashes rather than voice settings.

Then `npm run qa -- <slug>`, which exits 2 if anything is error-severity. It flags audio overlaps, silent gaps over 1.5s, missing mp3s or timestamps or mp4s, unknown equation ids, bounding boxes off the page, forbidden audio tags, and adjacent same-content blocks — the flicker regression above, caught mechanically. My favourite check re-runs the LaTeX splitter over every equation and errors on any fragment with unbalanced `\begin`/`\end`, because a regex-based splitter tears the `\\` row separators inside a `pmatrix` and KaTeX renders the wreckage as red error text mid-frame.

Which brings me to the least glamorous requirement in the repo. Manim scenes must use `MathTex`, never `Text("vₜ")`, because "the default font lacks many codepoints and renders them as yellow `[20 9C]` boxes". So step 9 of `install.sh` installs TinyTeX into user space, then `tlmgr install standalone preview dvisvgm xcolor amsmath amsfonts physics mathtools wasysym jknapltx fontspec babel-english`, and `render-manim.ts` prepends `~/Library/TinyTeX/bin/universal-darwin` to `PATH` so Manim finds it without further configuration. If `tlmgr` isn't there, the installer prints what I consider the most honest line in the project: "Manim equations will fall back to broken Unicode."

## The unit is the design

The beat is not a formatting convention, it is the decision that sets the cost of being wrong, and everything else in the repo is downstream of it. A pipeline whose smallest replaceable piece is a thirty-second monologue has to be right early, so the effort migrates into planning and review. Make the smallest piece four seconds of audio and one animation, and being wrong forty times is an ordinary afternoon. The partial manifest can truncate at the first unfinished beat only because beats don't depend on each other. A spot-edit thread can be confined to a crop because beat 87 is something you can name and re-run. The QA checks are per-beat assertions for the same reason.

That generalises past video. The useful thing to ask of a generative pipeline is not how good its output is on a good day, but how much you must discard to change one thing you dislike. It isn't free: small units bought me `[VISUAL: continue]`, block coalescing and three stacked padding constants, all of which exist to hide seams a monologue would never have had.

---

Alpha, and honest about it — the two videos above are the argument.
