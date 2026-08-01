---
title: "ccli-prompt: cmd+k for your terminal"
dek: Press Cmd+K, describe the command you've forgotten, and read what comes back before running it.
date: 2026-04-20
tags: [skill]
---

I don't forget commands. I forget flags. `find` with a size predicate, `tar` with the right four letters, whatever incantation evicts whatever is squatting on port 9090. Cursor fixed this inside the editor with Cmd+K, and I wanted the same key to do the same thing one pane over.

[`ccli-prompt`](https://github.com/lucastononro/ccli-prompt) binds a zsh widget to `^[k`. Press Cmd+K, type "find files bigger than 100mb" into a minibuffer, and a command appears on your command line!! Nothing runs. It sits in `$BUFFER` until you read it and press Enter yourself. (Esc then K works too — the widget quietly raises `KEYTIMEOUT` to 100 so the chord doesn't expire in zsh's default 0.4 s.)

[Asking for a command, getting a command, running nothing.](/video/ccli-prompt-demo.mp4)

@diagram(ccli-prompt-daemon) Cmd+K in, a command in $BUFFER out — and nothing runs until the last box.

## The prompt is the product

`pipx install ccli-prompt`, then `ccli-prompt install`. The widget is copied to `~/.ccli-prompt/`, one `source` line is appended to your `.zshrc`, and a two-step wizard runs — auth, then a model list pulled live from `/v1/models` with Haiku 4.5 sorted to the top. That leaves the part that actually decides whether any of this is useful, `~/.ccli-prompt/prompt.md`:

```md
- Output ONLY the command. No prose, no explanation, no markdown, no code fences, no comments.
- Match the user's shell and OS (macOS `zsh` unless told otherwise — prefer BSD-flavored flags…)
- If the user's request cannot be fulfilled with a shell command, output a single line beginning with `# `…
- Never output destructive commands (`rm -rf /`, `dd`, disk/partition formatting, force-push to main…)
…
- Most requests ("kill port 9090", "tar this folder", "find files bigger than X") are obvious — answer immediately…
- If the request depends on specifics you don't know … use an ALL-CAPS placeholder like `<FILENAME>`, `<PORT>`…
```

Every rule there is a scar. No code fences, because a model that helpfully wraps its answer in backticks has just put three backticks on your command line.[^fences] BSD-flavored flags, because half the internet's `find` invocations are GNU and fail differently on a Mac. *Do not deliberate*, because at a prompt, thinking is latency you can feel. And the placeholder rule is the one that keeps it usable: the model isn't allowed to ask a clarifying question, so it commits to a shape and leaves you a hole to fill.

[^fences]: The widget doesn't trust it either. A `sed` pass deletes fence lines from whatever comes back, then trims surrounding whitespace, before anything reaches `$BUFFER`.

## Three requests

These are illustrative, not recorded, but each is what those rules demand. "Kill whatever is on port 9090" is the case the prompt names as obvious, so it arrives as one line with nothing around it: `lsof -ti tcp:9090 | xargs kill -9`. Ask the same thing without naming a port and you get `lsof -ti tcp:<PORT> | xargs kill -9` — a placeholder, not a question. Ask "which test file covers the auth flow" and you get `# need more context: the test files in this repo`, because the daemon has no tools and can't read your disk.

The context it *does* get matters more than I expected. The widget sends your working directory, `${SHELL:t}`, `uname -sr`, and — the interesting one — whatever was already on your command line, as a `draft` field. Type `tar -c`, press Cmd+K, ask to compress a folder, and the last rule in the prompt tells the model to finish your line instead of starting its own.

## A daemon, not a subprocess

Shelling out to `claude -p` per keystroke means paying for a CLI boot every time you can't remember a flag. So the widget talks to a stdlib-only Python daemon over a Unix socket, spawning it on first use:

```sh
local req=$'cwd\t'"$PWD"$'\nshell\t'"${SHELL:t}"$'\nos\t'"$(uname -sr)"…
output=$(printf '%s' "$req" | nc -U "$CCLI_SOCKET" 2>/dev/null)
```

Tab-separated lines and `nc -U`. No HTTP, no JSON, no framing to parse. The socket is `/tmp/ccli-$USER.sock`, `chmod`ed to `0600` immediately after `start_unix_server` returns. That matters: anything that can write to that socket can spend your tokens and see your `$PWD`, so on a shared box, mode 0644 would be an open proxy with your subscription attached. The daemon keeps one `HTTPSConnection` to `api.anthropic.com` open with a 30 s timeout, resets and retries once if it finds the connection dead, and exits after `CCLI_IDLE_TIMEOUT` — 1800 seconds of nobody asking it anything. The README's ~500 ms warm figure (yes, I measured) is TLS you already paid for plus Haiku's first tokens. The cold path adds a `nohup` spawn and a poll loop that waits forty 50 ms ticks before giving up.[^cache]

[^cache]: The system prompt is sent with `cache_control: {"type": "ephemeral"}`, which on Haiku 4.5 achieves nothing — it's under 500 tokens, far below that model's 4096-token minimum cacheable prefix. Harmless, aspirational.

## Auth without an API key

My favorite part, because it asks you for nothing. With no `$ANTHROPIC_API_KEY` set, the daemon runs `security find-generic-password -s "Claude Code-credentials" -w`, lifts `claudeAiOauth.accessToken` out of the JSON Claude Code already stored there, and picks its headers off the token's prefix:

```python
if is_oauth_token(self._token):
    headers["Authorization"] = f"Bearer {self._token}"
    headers["anthropic-beta"] = "oauth-2025-04-20"
else:
    headers["x-api-key"] = self._token
```

`sk-ant-oat…` rides `Authorization` with the oauth beta header; `sk-ant-api03…` rides `x-api-key`. Identical code path otherwise. A 401 reloads the token once and retries, on the assumption that it rotated rather than that you've been thrown out.[^linux]

[^linux]: Linux never touches the Keychain — it reads the same `claudeAiOauth.accessToken` from `~/.claude/.credentials.json`, which is also the macOS fallback.

## Hash-space

The detail I'd keep if I had to throw the rest away. Daemon failures come back as strings beginning `# `, and the widget tests for that prefix before it goes anywhere near your command line:

```sh
if [[ "$output" == \#\ * ]]; then
  print -P "%F{red}$output%f"
  BUFFER="$saved_buffer"
  CURSOR=${#BUFFER}
  zle reset-prompt
  return 1
fi
```

Three things happen there. The message prints above the prompt instead of landing in the buffer — the widget has already called `zle -I`, so it can write outside its own line. The half-typed draft you had before pressing Cmd+K is restored verbatim, so a failed guess costs you nothing you'd typed. And `# ` is also a shell comment, so the worst case — a convention I got wrong somewhere — is a line that does nothing when executed: `# api error 401: …` is not a command you can accidentally run. The system prompt reuses the same prefix for *I can't do that in a shell*, so model refusals and HTTP failures leave by the same door.

## Nothing runs, on purpose

The design commitment worth stealing is the one that sounds like a limitation. The daemon has no tools, can't read the disk, and hands its answer to `$BUFFER` — a human presses Enter. That one decision pays for most of what I never had to build: no sandbox, no confirmation dialog, no audit of what the model may touch, no rollback. The `# ` prefix is only viable because of it. A comment is a safe failure mode when the worst case is a line you read and delete, not an action already taken.

It also settles where the human sits. Reviewing generated shell is a chore when it means opening something to review it. Here the review is the keypress you were going to make anyway, so it costs nothing and can't be skipped. The price shows up in the "which test file covers the auth flow" case — no tools, no answer. Before adding autonomy to anything like this, I'd now ask where the workflow already puts a person. That seat is cheaper than one I'd have to build.

---

Zero runtime dependencies, which felt right for something whose entire job is to type.
