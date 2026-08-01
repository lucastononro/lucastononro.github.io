---
title: "pr-review-evidence: a desktop nobody can see"
dek: Agents can describe a change but never show it working. So give one its own screen and record it.
date: 2026-07-30
tags: [skill]
---

A good engineer attaching a PR does two things: describes the change, and shows it working. Agents are fine at the first and structurally incapable of the second — no screen.

[pr-review-evidence](https://github.com/lucastononro/pr-review-evidence) gives them one. A real X11 desktop in a container, driven computer-use style, recorded while it works. Nothing appears on your monitor. Out comes `evidence.mp4`, `shots/*.png` and a provenance `manifest.json`.

## The loop

```bash
evidence-exec.sh screenshot          # → a PNG path. Look at it.
evidence-exec.sh mousemove 512 384
evidence-exec.sh click
evidence-finalize.sh                 # → evidence/<session>/evidence.mp4
```

Screenshot, look, move a real cursor with `xdotool`, screenshot again — while `ffmpeg x11grab` records the framebuffer. The video contains the cursor travelling and the hover states firing on the way, because mechanically that's what happened.

The verb list is the whole interface: `screenshot`, `mousemove`, `click`, `drag`, `scroll`, `type`, `key`, `launch-browser`, `terminal`, `exec-gui`, `record-start`, `record-stop`, `chapter`. Anything you can do with a mouse is expressible. Nothing else is.

## No Playwright in the loop

That's the point — a browser library can only give you evidence about a browser. This works on any GUI app, an Electron window, or a terminal session. My favourite line in the repo heads off the objection you're forming:

```dockerfile
# The base image is used ONLY for its preinstalled Chromium and system
# libraries — nothing here drives Playwright; input is 100% xdotool.
FROM mcr.microsoft.com/playwright:v1.55.0-noble
```

There's a live noVNC view on `:6080` if you want to watch. You don't need it, and the first time an agent takes over a desktop and starts moving a cursor with intent, you will want it.[^open]

[^open]: It's an open-format Agent Skill, not a plugin — `./install.sh --global` symlinks it into Claude Code, Codex, Kimi Code, Gemini CLI, Cursor, Amp and OpenCode. About 540 lines of bash, and it never learns which agent called it.

---

Tests tell you the logic holds. They say nothing about whether the modal opens behind the header.
