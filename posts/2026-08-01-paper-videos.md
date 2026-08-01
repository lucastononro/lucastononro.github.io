---
title: "paper-videos: a paper in, an explainer out"
dek: Point it at an arXiv id and it writes the script, narrates it, animates the maths, and assembles the video.
date: 2026-08-01
tags: [agents]
---

The bottleneck in explaining a paper well isn't understanding it. It's the twelve hours of animation between understanding and having something watchable. So [paper-videos](https://github.com/lucastononro/paper-videos) takes an arXiv id, a PDF, or just *"explain backpropagation"*, and fills in an editor at `localhost:5173` while you watch.

[“MELT: Letting AI Think Longer Without Bloated Memory” — a paper, explained.](https://www.youtube.com/watch?v=kHtdshmZsio&t=227s)

[“Évariste Galois — Life and Theory” — the same pipeline, no PDF involved.](https://www.youtube.com/watch?v=ozWnqv_DENI&t=490s)

## The pipeline

@diagram(paper-videos-pipeline) The orchestrator is Claude Code itself, running inside the repo. Deterministic work lives in `src/tools/` as typed CLIs; the agents only do the parts that need judgement.

## The micro-beat doctrine

The part I'd defend in a fight. A **beat** is one visual moment and one narration clip: 8–40 words, two to ten seconds, hard cap 300 characters. A twelve-minute video is therefore 100–160 beats, not thirty segments.

Three reasons, and the third is the one that matters: sync can't drift over two seconds; `narrate.ts` pads each clip so consecutive beats land about 1.35s apart, which is roughly how long a person needs to absorb a claim; and **re-rendering one bad beat is cheap.** When beat 87 is wrong you fix beat 87.[^gate]

[^gate]: After the first three narrated beats the producer stops and makes you listen before continuing. Fail fast, in the voice you'll hear for the next twelve minutes.

## Spot edits

![The editor: chat left, scrubbable player and filmstrip right, spot-edit thread docked](/images/paper-videos-spot-edit.jpg)

The manifest live-syncs after every narration and every render, so you can scrub a half-finished video, select a time-crop, and open a thread about *that range*. A pin-point conversation about beat 87 rather than about the video.

Half of `install.sh` exists because Manim's `MathTex` needs real LaTeX, and without it every equation degrades into yellow Unicode boxes.

---

Alpha, and honest about it. The two videos above are the argument.
