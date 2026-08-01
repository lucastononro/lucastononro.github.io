---
title: Tokenizer boundaries and the arithmetic ceiling
dek: Two arguments for why long addition is hard for transformers — one about how numbers get chopped up before the model ever sees them, and one about how many sequential steps a fixed-depth network can afford.
date: 2026-07-06
tags: [tokenization, reasoning, architecture]
---

Ask a language model to add two twelve-digit numbers and you will usually get an answer that is correct in its leading digits, correct in its trailing digits, and wrong somewhere in the middle. That failure shape is a fingerprint. It is not what "the model doesn't know arithmetic" looks like — a model that didn't know arithmetic would fail at the front. It is what a *carry propagation* failure looks like, and there are two independent reasons to expect one.

## The representation is not aligned to the operation

Addition is defined right-to-left over single digits. A byte-pair tokenizer is fit left-to-right over frequency statistics. These two facts do not get along.

```python
# Illustrative: what a frequency-fit merge table does to numerals.
# Exact splits vary by tokenizer, but the *misalignment* is structural.
"1999"    -> ["1999"]          # a common year, one token
"1998"    -> ["199", "8"]      # near-miss, split at an arbitrary point
"20250131"-> ["202", "501", "31"]
"12345"   -> ["123", "45"]
```

The problem is not that numbers get split. It is that the split points are determined by how often a digit string appeared in a web crawl, so *the same numeric magnitude is represented differently depending on its digits*. The model cannot learn "align the ones column" as a positional rule, because position within the token sequence is not position within the number. It has to learn a separate alignment for every merge pattern it encounters.

This is why the two mitigations that work are both about forcing a canonical representation:

- **Single-digit tokenization** for numerals — every digit is its own token, so token index and decimal place stand in a fixed relationship.
- **Fixed-width grouping**, typically three digits, applied consistently.[^groups] Comma-separating the input (`1,234,567`) is a cheap approximation you can do at the prompt level, and it measurably helps models that were not trained with digit-aware tokenizers.

[^groups]: Grouping trades depth for width: with groups of $k$ digits you need $n/k$ sequential carry steps instead of $n$, but each step is a $k$-digit addition the model must have memorized. Three is about where the tradeoff sits for a vocabulary that can afford 1000 numeral tokens.

The diagnostic is easy and worth running on any model you are about to trust with numbers: ask for the *reversed* sum, least-significant digit first. If accuracy jumps, you are looking at an alignment problem rather than a competence problem, because reversal lets the model emit each digit in the order the carries are computed.

## Fixed depth buys a fixed number of sequential steps

The second argument is about the shape of the computation, not the tokens. Carrying is a scan: the carry into column $i$ depends on the carry into column $i-1$, all the way down. Written out, adding two $n$-digit numbers $a$ and $b$ has

$$c_0 = 0, \qquad c_{i+1} = \mathbb{1}\!\left[a_i + b_i + c_i \geq 10\right],$$

which is an inherently sequential recurrence of length $n$. A transformer forward pass, in contrast, has a *fixed* number of sequential steps: $L$ layers. Attention is parallel across positions, so a single forward pass cannot iterate a recurrence more times than it has layers, and in practice each carry step costs more than one layer to implement.[^depth]

[^depth]: The sharp version of this is the circuit-complexity line of work on constant-depth transformers: with fixed precision and fixed depth they sit inside complexity classes that provably cannot express arbitrary-length sequential scans. I am stating the intuition, not the theorem — the theorems have hypotheses about precision and uniformity that matter.

There is a way out, and hardware designers found it in the 1950s. Carry-lookahead reformulates the scan as a parallel prefix over the *generate* and *propagate* signals

$$g_i = \mathbb{1}[a_i + b_i \geq 10], \qquad p_i = \mathbb{1}[a_i + b_i = 9],$$

which composes associatively and therefore resolves in $O(\log n)$ depth rather than $O(n)$. An $L$-layer network can plausibly do $n$ up to roughly $2^{L/k}$ for some per-step cost $k$ — which is the difference between a hard ceiling around a dozen digits and a soft one in the hundreds.

The interesting empirical claim is that this is learnable rather than automatic. Models trained on lots of arithmetic do generalize further than the sequential bound suggests, which implies they found something lookahead-shaped. Models that were not do not, and they fail with exactly the middle-of-the-number error profile you would predict from running out of carry steps.

## Why chain-of-thought fixes it, mechanically

Both arguments point at the same escape hatch, and it explains something that otherwise looks like magic: writing the addition out column by column turns depth into length. Each emitted token is a fresh forward pass that can read the previous carry off the context window instead of recomputing it internally. The recurrence has not gone away — it has been moved from the residual stream, where depth is fixed at $L$, into the token stream, where length is bounded by the context window instead.

That is a much larger budget, and it comes with an interpretability bonus: when a chain-of-thought addition goes wrong, you can point at the column where the carry got dropped. When a single-pass addition goes wrong, all you have is a wrong number.

---

Both of these are arguments about representation and budget, not intelligence. Which is the useful posture for most model failures: before asking whether a model *can* do something, check whether the input encoding makes the task expressible and whether the architecture has enough sequential steps to finish it.
