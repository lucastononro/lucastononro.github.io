---
title: "ccli-prompt: cmd+k for your terminal"
dek: Press Cmd+K at your zsh prompt, describe what you want, get a shell command to review.
date: 2026-04-20
tags: [skill]
---

I do not forget commands. I forget flags. `find` with a size predicate, `tar` with the right four letters, whatever incantation evicts whatever is squatting on port 9090. Cursor fixed this inside the editor with Cmd+K and I wanted the same key to do the same thing one pane over.

[`ccli-prompt`](https://github.com/lucastononro/ccli-prompt) binds a zsh widget to `^[k`. Press Cmd+K — or Esc then K, which needs no terminal config at all — type "find files bigger than 100mb" into a minibuffer, and a command appears on your command line. Nothing runs. It sits in `$BUFFER` until you read it and press Enter yourself.

[Asking for a command, getting a command, running nothing.](/video/ccli-prompt-demo.mp4)

## Install and configure

```sh
pipx install ccli-prompt
ccli-prompt install     # wizard: auth, then model pick
```

## Why it feels instant

Spawning `claude -p` per query means paying for a CLI boot every time. Instead a stdlib-only Python daemon listens on a `0600` Unix socket, holds one warm `HTTPSConnection` to `api.anthropic.com`, caches the system prompt, and exits after thirty idle minutes. Roughly 500 ms warm, plus Haiku.

The auth is my favourite bit. It does not ask for an API key when it does not need one: it reads the OAuth access token Claude Code already stashed in your macOS Keychain under `Claude Code-credentials` and sends `Bearer` with the oauth beta header instead of `x-api-key`.[^1] A plain `sk-ant-api03-…` key works too.

[^1]: On Linux it falls back to `~/.claude/.credentials.json`. Same token, no Keychain.

One deliberate detail: daemon errors come back prefixed with `# `, and the widget prints those above the prompt rather than dropping them into `$BUFFER`. Otherwise a 401 becomes a command you nearly ran.

---

On PyPI as `ccli-prompt`, zero runtime dependencies, which felt right for something that only types.
