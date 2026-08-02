---
title: "ralph-installer: five files and a stopping condition"
dek: One line of bash runs the loop; the state files around it are the actual work.
date: 2026-01-19
tags: [skill]
---

The Ralph loop is a coding agent restarted over and over with the same prompt. Nothing carries over in context: the instructions are a file, the plan is a file, the notes the agent leaves for its successor are a file, and every iteration is a fresh context window that reads all three off disk. Geoffrey Huntley, who named it after the Simpsons character, [writes it as one line](https://ghuntley.com/ralph/):

```bash
while :; do cat PROMPT.md | claude-code ; done
```

"Ralph is a technique. In its purest form, Ralph is a Bash loop." That's the whole idea, and it spread: [awesome-ralph](https://github.com/snwfdhmp/awesome-ralph) catalogs forty-plus implementations, and in December 2025 Anthropic shipped [a ralph-wiggum plugin](https://github.com/anthropics/claude-code/tree/main/plugins/ralph-wiggum) inside Claude Code that does the same thing with a Stop hook instead of a shell loop.[^plugin]

[`ralph-installer`](https://github.com/lucastononro/ralph-installer) is my version. `npx ralph-installer@latest install` drops five files into `ralph/` and two skills into `.claude/skills/`. MIT, published to npm the same day the repo started.

@diagram(ralph-loop) The same prompt every pass; the repository is the only thing that changes.

[^plugin]: Check this before reaching for it. Dex Horthy, who wrote [a history of the technique](https://www.humanlayer.dev/blog/brief-history-of-ralph), says the plugin "dies in cryptic ways" and "misses the key point of ralph" — a Stop hook keeps you in one session, so you lose the fresh context window per iteration the bash loop gives you for free.

## What the loop reads

`ralph/ralph-claude.sh`, trimmed to the part that matters:

```bash
for i in $(seq 1 $MAX_ITERATIONS); do
  PROMPT_CONTENT=$(cat "$SCRIPT_DIR/prompt.md")
  OUTPUT=$(claude --print --dangerously-skip-permissions "$PROMPT_CONTENT" 2>&1 | tee /dev/stderr) || true

  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    echo "Ralph completed all tasks!"
    exit 0
  fi
  sleep 2
done
exit 1
```

`prompt.md` is re-read from disk on every pass and handed over untouched. So the only difference between iteration three and iteration four is the repository — a commit, a `passes: true` flipped in `prd.json`, and a few lines appended to `progress.txt`.

The stopping condition is a string the agent has to say. `prompt.md` ends by telling it to check whether all stories have `passes: true` and, if so, reply `<promise>COMPLETE</promise>`. Exit 0 when that appears, exit 1 when the loop burns through `MAX_ITERATIONS` without it. Different exit codes for "done" and "gave up" matter the moment something other than you reads them.

The rest of `prompt.md` is ten numbered steps: read the PRD and the progress log, check out the branch named in `prd.json`, take the highest-priority story where `passes: false`, implement that one, run the project's checks, commit as `feat: [Story ID] - [Story Title]`, flip the flag, append notes. Frontend stories aren't complete until verified in a browser.

## Why a wrapper exists

The loop is five lines. Everything that decides whether it works is in the files it reads, and each one is a place to be slightly wrong.

The plan has to be cut to the size of a context window. `skills/ralph.md` is blunt: "Each story must be completable in ONE Ralph iteration (one context window)... If a story is too big, the LLM runs out of context before finishing and produces broken code." The rule of thumb is that if you can't describe the change in two or three sentences, split it. Criteria have to be checkable — the skill lists "Works correctly" and "Good UX" as bad ones, and appends "Typecheck passes" to every story.

The progress log has to have a shape, or its notes are useless to the next pass. Each iteration appends a **Learnings for future iterations** block, then promotes anything general into a `## Codebase Patterns` section pinned to the top. That section is the closest thing the design has to memory.

And the installer has to not destroy any of it on a second run. The line I'd point at:

```js
// User data files that should never be overwritten if they exist
const PRESERVE_FILES = ['prd.json', 'progress.txt', 'prompt.md'];
```

Those three are the loop's state. Upgrading to a newer runner script would otherwise wipe your plan and your accumulated notes, so `--force` overwrites the scripts and still refuses to touch them — there's a test named exactly that, out of eighteen. Anything else that already exists is a conflict, and conflicts exit 2 with the list rather than guessing.

The rest is small and dull, which is the right amount of interesting for an installer. `ensureFrontmatter` fills a skill's missing `name` from the kebab-cased filename and `description` from its first H1 before writing `.claude/skills/<name>/SKILL.md`. The runner archives itself: when `branchName` no longer matches `.last-branch`, the old plan and log move into `archive/YYYY-MM-DD-<name>/` and a clean log starts. And `view` serves `/api/prd` and `/api/progress` off a stdlib Python server on 8089, to a canvas that redraws every two seconds — you watch stories go green instead of tailing a log.

## Usage as a stopping condition

The criticism of Ralph with numbers attached is cost. The Register [puts Huntley's figure](https://www.theregister.com/2026/01/27/ralph_wiggum_claude_loops/) at "about US $10 of compute and/or SaaS resources each hour", which he notes is "far closer to wages paid to fast food workers" than to developer salaries. Anthropic's plugin README cites a contract "completed for $297 in API costs" and tells you to always set `--max-iterations`.

`scheduled-ralph.sh` measures a different meter, the one you're on when you run `claude` rather than the API. It lifts the Claude Code OAuth token out of the macOS Keychain (or `~/.config/claude-code/auth.json` on Linux) and asks:

```bash
curl -s -f "https://api.anthropic.com/api/oauth/usage" \
  -H "Authorization: Bearer $token" \
  -H "anthropic-beta: oauth-2025-04-20"
```

Then it reads `.five_hour.utilization`, `.seven_day.utilization` and `.five_hour.resets_at`. `--max-usage 70` stops the loop at 70% of the five-hour block. `--wait` parks it instead, re-checking every 300 seconds until the block rolls over. `--wait-next-session` sleeps through the current block before starting — set it before bed and the loop runs on tomorrow's quota!!

If usage is already past the ceiling and you didn't pass `--wait`, it exits 2 instead of starting a loop it can't finish.[^open]

[^open]: When it can't get a token, `get_usage_percent` returns `-1`, the script logs a warning, and the loop runs anyway — bounded only by iterations. It fails open, not closed. That's the wrong default for a script whose whole job is a budget.

## When it's the wrong tool

The people who like this technique hold the sharpest limits on it. Huntley: "There's no way in heck would I use Ralph in an existing code base," and "Engineers are still needed." His framing is greenfield bootstrapping, "with the expectation you'll get 90% done." [how-to-ralph-wiggum](https://github.com/ghuntley/how-to-ralph-wiggum) states the failure plainly: "Ralph can go in circles, ignore instructions, or take wrong directions—this is expected and part of the tuning process." Horthy adds the two that hurt: "If the specs are bad, the results will be meh," and "If you are iterating/exploring, you probably don't want ralph in the first place."

The critics land in the same place from the other side. On [the thread for that history](https://news.ycombinator.com/item?id=46682325), the top comment is "Just look at the code quality produced by these loops... It's complete garbage, and since it runs in a loop, the amount of garbage multiplies over time." Horthy's own reply is the sober version: "I don't think anyone serious would recommend it for serious production systems." Further down sits the shape that does work — somebody Ralphing personal Mac menu bar apps, who reports that "the apps work and scratch the itch that motivated them" and admits they can't judge the Swift.

The reports agree on one thing: the loop needs a machine-checkable definition of done. Migrations, lint sweeps, dependency bumps, test cleanups. Tessl's writeup describes [a Jest-to-Vitest migration](https://tessl.io/blog/unpacking-the-unpossible-logic-of-ralph-wiggumstyle-ai-coding/) where done meant tests pass, `vitest.config` exists, `jest.config` is gone and no Jest imports remain, bounded by "explicit limits on iteration count, token usage, and cost." Nothing on that list requires taste. The same piece quotes Huntley on the part everyone skips: "you really want to babysit this thing."

Measured against that, `passes: true` plus "Typecheck passes" is a weak gate, since the agent sets its own flag. The PRD is doing a spec's job, and a vague criterion gets marked done by an agent that meant well. The honest limit: this makes a good loop cheap to start, and it does not make a bad PRD safe.

---

None of the difficulty is in the five lines.
