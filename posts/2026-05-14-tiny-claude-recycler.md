---
title: "tiny-claude-recycler: a subscription is an API key now"
dek: Anthropic made a Claude subscription programmable. That turns every seat in a company into quota, which is the uncomfortable part.
date: 2026-05-14
tags: [skill]
---

**TL;DR** — [tiny-claude-recycler](https://github.com/lucastononro/tiny-claude-recycler) round-robins a pool of Claude OAuth subscription tokens and falls back to a real API key when they're all rate-limited. `pip install tiny-claude-recycler`, zero runtime dependencies. It exists because `claude setup-token` turned a $200 subscription into something a script can spend.

The change that made it interesting is one command. `claude setup-token` mints a one-year OAuth token, you export it as `CLAUDE_CODE_OAUTH_TOKEN`, and the Agent SDK bills your Pro or Max plan instead of API credits:

![Anthropic's own docs on the long-lived token: one year, subscription-billed, meant for CI](/images/claude-setup-token-docs.jpg)

Read that as a pricing document rather than a CI convenience and it says something else. [Max 20x is $200 a month](https://support.claude.com/en/articles/11049741-what-is-the-max-plan), flat. Before this, driving a product off inference meant metered API billing. After it, one seat is a fixed-cost quota you can point a script at — and a company with forty seats has forty of them.

## What it does

Round-robin the pool, retry on failure, fall back to the master key:

```python
from tcr import recycler, Secret

recycler.master_key = Secret("sk-ant-api03-...")
recycler.oauth_keys = [Secret("sk-ant-oat01-..."), Secret("sk-ant-oat01-...")]

@recycler.cycle(retries=3)
def ask(prompt):
    return query(prompt=prompt)
```

The only subtle part is the unsetting. Claude Code's [authentication precedence](https://code.claude.com/docs/en/authentication#authentication-precedence) puts `ANTHROPIC_AUTH_TOKEN` and `ANTHROPIC_API_KEY` **above** `CLAUDE_CODE_OAUTH_TOKEN`, so a stray API key in your environment silently wins and quietly bills your credit card while you believe you're spending a subscription. Every cycle clears both before it swaps.[^client]

[^client]: The other trap is object lifetime. Construct `Anthropic()` inside the wrapped function — a long-lived client built before the decorator ran already captured whatever key was set at construction and never sees a swap. `Secret` redacts itself in `repr`, so tokens stay out of tracebacks.

## The part I'd rather say out loud

Rotation isn't clever. Rotation is what you write on the afternoon you notice that N seats is N × $200 of quota with no metering attached, and that nothing in the stack checks whose seat it is. The tool doesn't ask, either — it takes a list of strings.

Which is where I'll stop, because there are two very different versions of this. Pooling tokens you own — your Max seat, your CI, your side project — is housekeeping, and that's what I built it for. Pooling your colleagues' seats to run your product is spending someone else's subscription under terms they agreed to and you didn't read, and the fact that it works is not the same as the fact that you may. The mechanism is genuinely interesting. The version of it I keep hearing pitched is a billing exploit with a rotation library in front.

---

Anthropic shipped a convenience for CI and accidentally shipped a price list; the library is just me being tidy about it.
