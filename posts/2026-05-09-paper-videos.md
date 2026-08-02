---
title: "paper-videos: a paper in, an explainer out"
dek: The explainer nobody has the weeks to animate, assembled beat by beat while you watch.
date: 2026-05-09
tags: [agents]
---

Start with the output. The first of these came from an arXiv id, the second from a sentence with no paper behind it. Both came out of [paper-videos](https://github.com/lucastononro/paper-videos), which fills in an editor at `localhost:5173` while you watch.

[“MELT: Letting AI Think Longer Without Bloated Memory” — a paper, explained.](https://www.youtube.com/watch?v=kHtdshmZsio&t=227s)

[“Évariste Galois — Life and Theory” — the same pipeline, no PDF involved.](https://www.youtube.com/watch?v=ozWnqv_DENI&t=490s)

## The part that doesn't get made

Reading the MELT paper is not the hard part. It's a clear paper about a real trick — loop the layers, keep one KV cache, stop paying for extra thinking in memory. Plenty of people could read it over a coffee and tell you accurately what it does.

The second craft is not so widely held. Scripting twelve minutes so the first fifteen seconds earn the rest. Deciding which two contributions survive. Narrating it so it sounds like someone who understands it. Animating an equation so the eye lands on the right term as the voice names it. Pacing the thing so attention holds. That's a different profession, and a slow one: a single 3Blue1Brown video is weeks of animation work, and the people who do it that well are countable. Not a complaint about them — it's why the skill is scarce in a way that reading the paper is not.

So the explanation mostly doesn't get made. The knowledge stays in the PDF, read by the few hundred people who were going to read it anyway. The reader who needed twelve good minutes never gets them.

What this pipeline automates is the production, not the understanding. The brief, the beat-by-beat script, the ElevenLabs narration, the Manim scenes, the Remotion assembly — machine work now. The judgment is not: what to explain, what to cut, whether the analogy is honest, whether the voice is bearable. Taste can't be handed over, so the doctrine stops the producer dead after three narrated beats and makes you listen. The `video-qa` agent exists because the pipeline isn't trusted to grade its own output. It's alpha, and the boundary cuts both ways: a bad script now yields a well-produced bad video faster than it used to yield a bad one. Cheap production doesn't make the decisions cheap. It stops them being buried under twelve hours of keyframing.

![The editor mid-Galois: parent chat left, the player above a filmstrip and the visual-blocks / voice-beats lanes, a time crop selected at 10:51→11:44, QA clean across 208 beats.](/images/paper-videos-editor.jpg)

## The pipeline

@diagram(paper-videos-pipeline) The orchestrator is Claude Code itself, running inside the repo. Deterministic work lives in `src/tools/` as typed CLIs; the agents only do the parts that need judgment.

That split is most of the design. `narrate.ts`, `render-manim.ts`, `qa.ts` and `render-remotion.ts` are ordinary `commander` CLIs — arguments in, JSON on stdout, exit codes that mean something. Anything requiring taste is a subagent: a critic plans the brief, a storyteller writes the beats, a producer narrates, a visualizer animates. Six specialists, no message bus, coordination written down as files — "each subagent has its own context window — the brief / script / manifest in `videos/<slug>/` are the persistent contract between them."

Rule 2 keeps that honest: LaTeX comes only from `equations.json`, never from memory of the paper. In topic mode there is no paper — the Galois video never touched a PDF — so the critic fills that same file from its own research.

## The micro-beat doctrine

The part I'd defend in a fight. A **beat** is one visual moment and one narration clip: 8–40 words, two to ten seconds, hard cap 300 characters. So a twelve-minute video is 100–160 beats, not thirty segments. As data, a beat is three lines of markdown:

```markdown
### beat-002
[VISUAL: continue]
"On a thirty-two thousand token generation, Ouro burns about twenty-eight gigabytes of VRAM."

### beat-004
[PAUSE 0.8s]
(silent)
```

`[VISUAL: continue]` earns its keep. The parser inherits the previous cue, and the migrator coalesces adjacent identical visuals into one `visualBlock` with one fade in and one fade out. Re-emit the cue instead and you get two blocks, each fading through the background — a flash to navy and back where nothing changed.

Downstream that becomes two arrays rather than one: `voice[]`, one-to-one with the mp3s, and `visualBlocks[]`, which are spans. MELT has 90 voice beats to 59 blocks. Its opening animation runs 588 frames beneath the first three, plays once, then holds its final frame — which is why scenes must end on a held tableau, never a `FadeOut`. Held black is indistinguishable from a broken render.

Reason three is the one that actually pays: "Re-rendering one bad beat is cheap; re-rendering a 30-second monologue is not." When beat 87 is wrong, you fix beat 87.

## The padding arithmetic

`narrate.ts` hands each mp3 to ffmpeg (`adelay` + `apad`) with two constants:

```ts
const DEFAULT_PAD_LEADING_SEC = 0.25;
const DEFAULT_PAD_TRAILING_SEC = 0.9;
```

ElevenLabs' character-level alignment is collapsed into words and shifted by `padLeading`, so captions stay glued to speech that just moved. `audioDurationSeconds` is the last word's end plus the trailing pad. The segment builder then adds one more slice, `secondsToFrames(ts.audioDurationSeconds + 0.2, fps)`, commented "add 200ms tail so visual settles after voice ends".

Worked through, on beat-001 of the MELT video: the last word ends at 6.015s, `audioDurationSeconds` is 6.915, `durationFrames` is `ceil(7.115 × 30) = 214`, and beat-002's first word starts at exactly 0.250s. Speech-end to speech-start: 1.368s. Segments butt straight up against each other in the manifest — every millisecond of that silence lives inside the audio files.[^drift]

@diagram(paper-videos-beat) Two consecutive beats: the gap is three defaults stacked, not a gap.

Which is why the doctrine preempts the obvious mistake: "Pauses between beats come for free via the audio-padding logic — do NOT also insert `[PAUSE 0.2s]` beats." `[PAUSE Xs]` is for deliberately long silences, 0.6s and up.

[^drift]: The repo disagrees with itself here — 0.6s appears in the prose section of `CLAUDE.md`, in `producer.md` and in `storyteller.md`; 0.9s appears in hard rule 4 and in the code. The mp3s on disk say 0.9.

## Cue-level dispatch

Some beats want photographic motion rather than math. The storyteller signals that inside the cue's own `description`, with a `clip:` prefix (`veo:` is a legacy alias, treated identically):

```markdown
[MANIM: teaser_markdown_accreting description="clip: cinematic 8 seconds, slow
push-in on a single glowing markdown file titled 'best_skill.md' … 8s, 16:9."]
```

The visualizer expands that hint into a full cinematographic prompt and walks the chain — ElevenLabs Studio, then Veo, then Manim:

```bash
npm run elevenlabs-video -- "<prompt>" -m kling-2.6 --aspect 16:9 \
  --duration 8 --no-audio --out videos/<slug>/manim/beat-NNN.mp4
# exit code 2 = 401/403/404 from the Studio endpoint → private-beta gate, not a failure
npm run veo -- "<same prompt>" --model veo-3.1-generate-preview --aspect 16:9 …
```

Exit code 2 is reserved for 401/403/404, so "you don't have beta access" is machine-distinguishable from "the render failed". Any other non-zero exit means Manim, always reachable.

The dispatch lives in the cue rather than in an agent's head for a boring reason: the mp4 lands at `manim/beat-NNN.mp4` whichever provider produced it, and the composition renders it as a `manimClip` either way. The winner is recorded in a `.elevenlabs.json` or `.veo.json` sidecar carrying the full prompt, so a re-render takes the same path. The script never has to know which key you hold.

## Spot edits

The manifest re-syncs after every narration and every render, and the teaser comes first, so you judge the voice within seconds rather than at minute twelve. A watcher notices each write and remounts the player.[^fds] So you can select a range on a video that doesn't exist yet:

![Dragging horizontally on the filmstrip selects a time crop — `1:28→1:36 · 7.8s` — and an `↗ Spot-edit` pill appears beside it. The lanes below show what falls inside.](/images/paper-videos-spot-edit.jpg)

Click it and you get a pin-point conversation about that range rather than about the video — a forked `claude --resume` session docked on the right, re-narrating and re-rendering while the parent chat carries on:

![A thread scoped to `0:51→0:56`, running its own `render-manim` and `sync-manifest` loop while the parent chat reports a separate composition-layer fix.](/images/paper-videos-spot-threads.jpg)

The thread gets the crop and a finding aid, not a task list — "Stay inside the time crop. If a fix genuinely requires editing material outside it, stop and explain rather than silently widening scope." It closes itself by ending a turn with one line beginning `SUMMARY:`, which the server posts into the parent chat. Spawn several and each becomes a tab!!

[^fds]: The watcher is capped at `depth: 3` and ignores `media/`, `paper-md-assets/` and `manim-last-frames/`, because watching the whole tree opened 2000+ kqueue FDs on macOS, exhausted the process pool, and made the editor's later `spawn('claude')` fail with `EBADF`. The symptom was "chat turn failed: spawn EBADF" and a dead server.

## Gates

The first gate is `afplay` on beats 001 to 003: the producer stops and makes you listen before spending anything else. Fail fast, in the voice you'll hear for the next twelve minutes. The remedies are script-side — bad pronunciation is a phrasing problem, and pacing gets fixed with commas and em-dashes, not voice settings.

Then `npm run qa -- <slug>`, which exits 2 on anything error-severity: audio overlaps, silent gaps over 1.5s, missing mp3s or mp4s, unknown equation ids, bboxes off the page, adjacent same-content blocks — the flicker regression above, caught mechanically. My favorite check (having a favorite QA check is its own diagnosis) re-runs the LaTeX splitter over every equation and errors on any fragment with unbalanced `\begin`/`\end`. A regex splitter tears the `\\` row separators inside a `pmatrix`, and KaTeX renders the wreckage as red error text mid-frame while the narration carries on, unbothered. Underneath sits the least glamorous requirement in the repo: scenes must use `MathTex`, never `Text("vₜ")`. So `install.sh` puts TinyTeX in user space — without it, as the installer says, "Manim equations will fall back to broken Unicode."

The gallery keeps what didn't survive alongside what did:

![The home gallery: one card per folder in `videos/`, with duration and beat / block counts. Some carry a gold `✓ rendered` pill; the rest are drafts at `0 beats · 0 blocks`, several still titled `(unknown — will be filled by paper-extractor)`.](/images/paper-videos-gallery.jpg)

## Running it yourself

Two paid accounts and one script. You need a Claude Code login (Pro/Max or API credits — it's the orchestrator *and* the chat backend) and an ElevenLabs key for narration; the free tier covers short demos. Everything else is handled:

```bash
git clone https://github.com/lucastononro/paper-videos && cd paper-videos
./install.sh             # idempotent — re-run any time
claude /login            # once; the claude CLI itself comes from docs.claude.com/claude-code
$EDITOR .env             # paste ELEVENLABS_API_KEY
./run.sh                 # editor at localhost:5173
```

`install.sh` checks Node 20+, installs `uv` and ffmpeg if missing, runs `npm install`, `uv sync` (Manim + Marker + PyMuPDF) and `npx remotion browser ensure`, and puts TinyTeX in user space — the step you'll be tempted to skip with `--quick`, right up until your first equation renders as yellow boxes. Then open the gallery, click **+ New video**, give it an arXiv id or just a topic, and watch the timeline fill in. The only secret in the whole setup is the ElevenLabs key in a gitignored `.env`; Claude Code brings its own OAuth session and arXiv needs nothing.

## The unit is the design

The beat is not a formatting convention. It's the decision that sets the cost of being wrong, and everything else here is downstream of it. A pipeline whose smallest replaceable piece is a thirty-second monologue has to be right early, so the effort migrates into planning. Make the smallest piece four seconds of audio and one animation, and being wrong forty times is an ordinary afternoon. The partial manifest can truncate at the first unfinished beat only because beats don't depend on each other. A thread can be confined to a crop because beat 87 is something you can name and re-run.

That generalizes past video. The useful question for a generative pipeline is not how good its output is on a good day. It's how much you must discard to change one thing you dislike. Small units aren't free: they bought me `[VISUAL: continue]`, block coalescing and three stacked padding constants, all of which exist to hide seams a monologue would never have had.

---

The machine will make the video in an afternoon now. Deciding it was worth making is still the whole job.
