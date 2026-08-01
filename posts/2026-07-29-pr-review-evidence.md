---
title: "pr-review-evidence: a desktop nobody can see"
dek: Agents can describe a change but never show it working. So give one its own screen and record it.
date: 2026-07-29
tags: [skill]
---

A good engineer attaching a PR does two things: describes the change, and shows it working. Agents are fine at the first and structurally incapable of the second — no screen.

[pr-review-evidence](https://github.com/lucastononro/pr-review-evidence) gives them one. A real X11 desktop in a container, driven computer-use style, recorded while it works. Nothing appears on your monitor. Out comes `evidence.mp4`, `shots/*.png` and a provenance `manifest.json`. Seven bash scripts, 541 lines, and Docker.

@diagram(pr-review-evidence-loop) The only thing that crosses back out of the container is files.

## The loop

One beat of a real session — bring up the scene, mark the chapter, look, act, look again:

```bash
evidence-start.sh                      # → live view: http://localhost:6080/vnc.html
evidence-exec.sh launch-browser http://host.docker.internal:3000
evidence-exec.sh record-start          # → recording to raw/desktop-141207.mp4
evidence-exec.sh chapter "2. Archive a task"
evidence-exec.sh screenshot            # → …/shots/shot-141219.png  ← view this
evidence-exec.sh mousemove 1042 318
evidence-exec.sh click
evidence-exec.sh screenshot archived   # → …/shots/archived.png
evidence-finalize.sh                   # → …/evidence.mp4 + manifest.json
```

`screenshot` runs `scrot -o /evidence/shots/<name>.png` inside the container and then prints the *host* path, because `/evidence` is a bind mount of the session directory. The agent reads the PNG off its own filesystem with the tool it already has; no image travels over a protocol. Everything else in that list prints nothing at all — `mousemove`, `click` and `type` are silent, so the only way to learn what happened is the next screenshot, which is the behaviour I wanted.[^blind]

Session state is one file. `evidence/.current-session` holds an id like `fix-archive-modal-20260730T141152Z`: the current git branch, slugged and truncated to 40 characters, plus a UTC stamp. Every script resolves it from `--session`, then `$EVIDENCE_SESSION`, then that marker. The container is named `pre-<session>` and holds nothing of value, so `evidence-clean.sh` removes it and leaves the files behind.

There's a live noVNC view on `:6080` unless you start with `--no-live`, in which case no ports are published at all. You don't need it, and the first time an agent takes over a desktop and starts moving a cursor with intent, you will want it.[^open]

[^blind]: The playbook's phrasing is "never act blind". Coordinates from an old frame are stale the moment the layout moves, and the failure mode isn't an error — it's a click that lands somewhere plausible and wrong, on video.

[^open]: It's an open-format Agent Skill, not a plugin — `./install.sh --global` drops symlinks into `~/.claude/skills`, `~/.agents/skills`, `~/.codex/skills` and `~/.kimi-code/skills`, which covers Claude Code, Codex, Kimi Code, Gemini CLI, Cursor, Amp and OpenCode; all of them follow symlinks. Which is exactly why `lib.sh` resolves its own *physical* directory with `pwd -P` before walking up three levels to find the Dockerfile — from the logical path, `cd ../../..` lands in a completely different tree.

## Recording the framebuffer

`record-start` execs one detached command and keeps its PID at `/evidence/.ffmpeg.pid`:

```bash
ffmpeg -y -loglevel error -f x11grab -video_size 1280x720 -framerate 15 -i :99.0 \
  -c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p 'raw/$file'
```

`:99.0` is the display the entrypoint brings up as `Xvfb :99 -screen 0 1280x720x24` — which is why the same resolution appears in two files and must not drift. Recording starts on demand rather than in the entrypoint, so an idle session costs nothing.

Grabbing the framebuffer is the whole difference. A browser-automation screencast records a page: no cursor, because there is no cursor, and nothing outside the viewport exists. x11grab records whatever was composited into the screen — the software cursor Xvfb draws, native menus, an xterm, a GTK dialog, and any window you forgot was open. Real time at 15 fps also means the video's clock is the agent's clock, so a pause while it was thinking is a pause on screen.

That generality is the point, and the repo heads off the objection you're forming:

```dockerfile
# The base image is used ONLY for its preinstalled Chromium and system
# libraries — nothing here drives Playwright; input is 100% xdotool.
FROM mcr.microsoft.com/playwright:v1.55.0-noble
```

`launch-browser` really does just glob `/ms-playwright/chromium-*/chrome-linux/chrome` and run the binary with `--no-sandbox`. Then it spends up to ten seconds polling `xdotool search --onlyvisible --class chrom` to force the window to 1280x720, because `--start-maximized` is unreliable under openbox and a browser that opens at the wrong size ruins the take.

## Pacing for a reviewer

The best file in the repo is `references/recording-playbook.md`, and it exists because of a failure I hadn't anticipated: an agent will produce a recording that is entirely correct and unwatchable. Nothing for twelve seconds, then everything at once, cursor teleporting between coordinates.

So the playbook is mostly about time. Aim for 20–90 seconds and 3–7 chapters, because "a reviewer gives you about a minute". Move the mouse toward a target in two or three steps instead of jumping, since the glide is what makes it read as a person. Linger about two seconds on each result so it can actually be read. A `sleep 1` on the host after navigation is a natural pause in the video for free. Number the chapters, because reviewers write "chapter 3" in comments. Don't record spinners or deploy waits. Don't ship a first take with a visible stumble at 0:05 — clean and start over.

`type` is `xdotool type --delay 80`, slow on purpose so keystrokes are visible; troubleshooting explains how to speed it up to 15 ms and the playbook tells you not to bother for short strings. And the chapter card is `zenity --info --no-wrap --timeout 2`: a GTK dialog drawn on the desktop, which ends up in the video because everything on the desktop ends up in the video. No overlay, no compositing pass, no burn-in step.

## The manifest

`finalize` stops the recorder, concatenates the raw segments if `record-start` ran more than once, probes the duration, warns if it comes back under two seconds[^mount], and writes the one file a publisher is meant to read — shape below, values from the session above:

```json
{
  "schema": "pr-review-evidence/1",
  "capture": { "mode": "desktop", "display": "1280x720", "recorder": "ffmpeg x11grab" },
  "video": { "file": "evidence.mp4", "duration_s": 41, "size_bytes": 1934812 },
  "source": { "repo": "…", "branch": "…", "commit": "…", "pr_url": "…" },
  "agent": { "harness": "unknown", "model": "unknown" },
  "chapters": ["1. Empty board", "2. Archive a task"]
}
```

The two halves are not equally trustworthy, and it's worth being precise about which claim is which. `source` is read on the host at finalize time — `git remote get-url origin`, `git branch --show-current`, `git rev-parse HEAD`, `gh pr view --json url` — so anyone can check it against the repo. `agent` is `${EVIDENCE_HARNESS:-unknown}` and `${EVIDENCE_MODEL:-unknown}`: self-declared, and genuinely `unknown` unless someone exported them. I'd rather ship a field that admits it doesn't know than one that guesses.

`chapters` is the nicest part and the least designed. It isn't authored anywhere: finalize greps `actions.jsonl` for `"cmd":"chapter ` and reads the titles back out of the log of what was actually sent to the desktop. The chapter list therefore cannot disagree with what appeared on screen. Same instinct as the rest of the skill — derive the description from the thing that happened, don't ask the agent to narrate it.

[^mount]: Which catches my favourite bug. Under colima, `$HOME` is shared with the VM but `/tmp` isn't, so running a session from an unshared path bind-mounts an empty directory in total silence and every capture stays trapped inside the container. It looks exactly like a broken recorder.

## The gap tests leave

Before this, an agent's account of manual verification was prose. It told me the archive modal came up clean, and I either took its word or opened the browser and repeated the work myself, which amounts to having no account at all. Recording the framebuffer collapses claim and artefact into one object; the video isn't a description of the check, it is the check. The silent commands are what hold that together. `click` and `type` print nothing, so an agent cannot report on a click it never looked at, and the only channel back is a screenshot — the frame a reviewer sees.

The part that travels is duller than the desktop. Chapters are read back out of the log of what was actually sent, so the caption cannot drift from the event, and the manifest keeps host-checkable provenance apart from self-declared fields rather than averaging them into one blob. Any tool emitting machine-generated evidence has that same split to make. The scope is narrow: a recording shows one path through a UI, and a well-paced one can conceal as much as it proves.

---

Tests tell you the logic holds; they say nothing about whether the modal opens behind the header.
