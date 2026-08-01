---
title: "paper-videos: turning a paper into a 3Blue1Brown episode"
dek: Point it at an arXiv id and it drafts a script, narrates it, animates the maths with Manim, and assembles an explainer video — while you watch the timeline fill in beat by beat.
date: 2026-08-01
tags: [paper-videos, project, agents, manim]
---

The premise of [paper-videos](https://github.com/lucastononro/paper-videos) is that the bottleneck in explaining a paper well is not understanding — it is the twelve hours of animation work between understanding it and having something watchable. So: point the pipeline at an arXiv id, a URL, a local PDF, or just say *"explain backpropagation"*, and watch it materialise in an editor at `localhost:5173`.

The Galois video below is the interesting proof, incidentally. Nothing about the pipeline requires a PDF — the storyteller will take a subject and write the brief itself, and the only part that changes is that there are no `paperPage` or `highlightedQuote` cues to hang visuals on.

Two it has made — one from a paper, one from a topic, which is the whole range in two clips:

[“MELT: Letting AI Think Longer Without Bloated Memory” — a paper, explained.](https://www.youtube.com/watch?v=kHtdshmZsio&t=227s)

[“Évariste Galois — Life and Theory” — the same pipeline pointed at a subject rather than a PDF.](https://www.youtube.com/watch?v=ozWnqv_DENI&t=490s)

## The pipeline

```
arXiv id  →  fetch PDF + extract paper  →  critic plans the brief
                                             ↓
                                          storyteller writes script
                                             ↓
                                  asset-fetcher resolves images / diagrams
                                             ↓
                       producer narrates each beat (live-syncs after every one)
                                             ↓
                       visualizer renders Manim per beat (live-syncs after every one)
                                             ↓
                       you click ▶ Render in the editor → output.mp4
```

The orchestrator is **Claude Code itself, running inside the repo**. There is no bespoke agent framework: a top-level `CLAUDE.md` carries the doctrine, a `.claude/` skill provides `/paper-video`, and six specialist subagents — `critic`, `storyteller`, `paper-extractor`, `asset-fetcher`, `producer`, `visualizer`, plus a `video-qa` — do the work. Everything deterministic lives in `src/tools/` as small typed CLIs: `arxiv-search.ts`, `extract-paper.ts`, `narrate.ts`, `render-manim.ts`, `render-remotion.ts`, `qa.ts`, and so on.

The division is the whole trick. Anything that can be a script *is* a script, and the agents are left doing only the parts that need judgement.

## The micro-beat doctrine

The part I would defend in a fight. The atomic unit of a video is a **beat**, not a "segment":

- one visual moment
- one narration clip of 8–40 words, two to ten seconds, hard cap 300 characters
- or silence, for breathing

A twelve-minute video is therefore **100–160 beats**, not thirty multi-sentence segments. Three reasons, and the third is the one that matters in practice:

1. Narration and visuals stay in sync because the unit is small enough that drift cannot accumulate.
2. Beats need room. `narrate.ts` auto-pads every mp3 with leading and trailing silence — 0.25s and 0.9s by default — and shifts the word timestamps so captions stay aligned. The effective gap between consecutive beats works out around 1.35 seconds, which is roughly how long a human needs to absorb a claim before the next one arrives.
3. **Re-rendering one bad beat is cheap. Re-rendering a thirty-second monologue is not.** Everything about the doctrine follows from this. When beat 87 is wrong, you fix beat 87.

There is a rule in `CLAUDE.md` I like more than any other: after the first three narrated beats, the producer *stops* and asks you to listen before continuing.[^gate] Fail fast, in the voice you will hear for the next twelve minutes.

[^gate]: The same document warns against hand-writing `[PAUSE 0.2s]` beats, because the automatic audio padding already provides that gap — you only reach for an explicit pause at 0.6s or longer, for emphasis. Doctrine that anticipates the way you will misuse it is doctrine that has been used.

## The editor

The pipeline live-syncs the manifest after *every* narration and *every* Manim render, so the editor's timeline fills in as work completes. You can scrub a half-finished video, watch the filmstrip populate, and — the good part — select a time-crop and spawn a **spot-edit thread** on just that range. A pin-point conversation about beat 87, not about the video.

Then one button renders the final mp4 through Remotion, which drives headless Chrome over a typed React composition in `src/remotion/`.

## The unglamorous part

Half of `install.sh` exists because of LaTeX. Manim's `MathTex` needs a real LaTeX installation, and without it every equation degrades into broken Unicode boxes — the yellow `[20 9C]` artefacts that mean *this frame is going to look stupid*. So the installer puts TinyTeX in user space, no sudo, plus exactly the packages Manim reaches for. It also installs `uv`, ffmpeg, and Chrome Headless Shell via `npx remotion browser ensure`.

Narration is ElevenLabs' v3 model with audio-tag personality cues — `[curious]`, `[serious]` — placed by the producer. One secret, `ELEVENLABS_API_KEY`, in a gitignored `.env`. Claude Code brings its own OAuth session and arXiv search needs no key at all.

For visuals the visualizer picks a provider based on how the cue is written: a `clip:` prefix routes to ElevenLabs video, `veo:` to Veo, and everything else to Manim. Maths gets animated; b-roll gets generated; the agent does not have to fake either with the other.

---

Alpha, and honest about it. But it produces real videos end to end, and the two above are the argument.
