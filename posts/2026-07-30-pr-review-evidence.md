---
title: "pr-review-evidence: a desktop nobody can see"
dek: “Works on my machine” is not review evidence. So the agent gets its own machine — a real X11 desktop inside a container — and records itself using the feature, cursor and all.
date: 2026-07-30
section: skills
tags: [agents, docker, code-review, skills]
---

A good engineer attaching a PR does two things: describes the change, and shows it working. A screen recording, a couple of annotated screenshots. Agents are decent at the first half and, until recently, structurally incapable of the second — they have no screen.

[`pr-review-evidence`](https://github.com/lucastononro/pr-review-evidence) gives them one. It spins up a real X11 desktop inside a Docker container, drives it computer-use style, and records the framebuffer while it works. Nothing ever appears on your monitor. Out the other end come `evidence.mp4`, `shots/*.png`, and a provenance `manifest.json` — the agent equivalent of "here it is working."

## The loop

The agent does not get a browser API. It gets a desktop and a cursor, and it has to look:

```bash
evidence-start.sh                              # Xvfb + openbox + Chromium + xterm
evidence-exec.sh launch-browser http://host.docker.internal:3000
evidence-exec.sh record-start
evidence-exec.sh screenshot                    # → a PNG path. Look at it.
evidence-exec.sh mousemove 512 384
evidence-exec.sh click
evidence-exec.sh type "hello"
evidence-exec.sh record-stop
evidence-finalize.sh                           # → evidence/<session>/evidence.mp4
evidence-clean.sh                              # container gone, recordings kept
```

Screenshot, look, move a real cursor with `xdotool`, screenshot again. Meanwhile `ffmpeg x11grab` is recording the actual framebuffer in real time, so the video contains the cursor travelling across the screen and the hover states firing on the way. It looks like a person using the app, because mechanically it is the same thing a person does.

There is **no Playwright anywhere in the capture path**, which is the whole point. A browser automation library can only give you evidence about a browser. This gives you evidence about *any GUI application* — an Electron app, a native window, a terminal session via `terminal`, or whatever you launch with `exec-gui`. The container ships node and python3 too, so you can run the app inside it instead of on the host.[^host]

[^host]: `host.docker.internal` is how the container reaches a dev server on your machine. That works out of the box on Docker Desktop; on Linux the script adds the mapping itself.

The requirement that makes it work at all: **the agent must be able to view images.** Screenshots are not decoration, they are the feedback signal. Without vision the loop is open and the agent is clicking blind.

## Video or stills, same session

Some things only read in motion — a drag interaction, a loading transition, an animation that turns out to be janky. Some things are better as a still — an empty state, a validation error, the final layout. Both come out of one session, and `chapter` marks a point in the recording so a long video has navigable structure instead of being nine minutes of undifferentiated scrolling.

`evidence-finalize.sh` writes a `manifest.json` next to the artifacts with the provenance: what was run, in what order, against which commit. Which matters, because unverifiable evidence is just a video.

## Watching it work

`evidence-start.sh` also exposes a live noVNC view at `localhost:6080/vnc.html`. You do not need it — the whole design premise is that nothing appears on your screen — but the first time an agent takes over a desktop and starts moving a cursor around with intent, you want to watch. It is the single most unsettling thing I have built.

There is an optional `evidence-upload-gh.sh` that publishes the artifacts to the repository's own GitHub releases, so a PR body can link to a video that lives with the repo rather than in a chat log.

## Open format on purpose

This one is not a Claude Code plugin. It is an [Agent Skill](https://agentskills.io) — plain scripts plus a `SKILL.md` — and the installer symlinks it into whichever conventions your harness reads:

```bash
./install.sh            # this repo:  .claude/skills/ + .agents/skills/
./install.sh --global   # every repo: ~/.claude, ~/.agents, ~/.codex, ~/.kimi-code
```

Claude Code, Codex, Kimi Code, Gemini CLI, Cursor, Amp, OpenCode. Seven scripts and a `lib.sh`, about five hundred lines of bash in total. The skill has no idea which agent is calling it, which is the correct amount of coupling.

---

The reframing I keep coming back to: for a long time "can the agent verify its own work?" meant "did the tests pass?" Tests tell you the logic holds. They say nothing about whether the button is reachable, whether the spinner ever stops, or whether the modal opens behind the header. A recording of the thing being used answers a different question — and it is the question a reviewer actually has.
