---
title: What a loss spike actually tells you
dek: A short note on the arithmetic of Adam under a rare large gradient, and why the number that matters is not your learning rate but the ratio between your two betas.
date: 2026-07-24
tags: [optimization, training-dynamics]
---

Everyone who has watched a pretraining run has watched a loss spike, and the folk response is to blame the data. Sometimes it is the data. But there is a mechanism inside Adam that manufactures spikes out of ordinary gradients, and it is worth being able to rule in or out in thirty seconds before you go shard-hunting.

## The arithmetic

Adam's update for a single coordinate is

$$\theta \leftarrow \theta - \eta \frac{\hat{m}}{\sqrt{\hat{v}} + \epsilon}, \qquad
m \leftarrow \beta_1 m + (1 - \beta_1) g, \qquad
v \leftarrow \beta_2 v + (1 - \beta_2) g^2 .$$

Consider a coordinate that has been quiet for a long time — $m \approx 0$, $v \approx 0$ — and then receives one large gradient $G$. After that single step:

$$m \approx (1 - \beta_1) G, \qquad v \approx (1 - \beta_2) G^2,$$

so the update magnitude is

$$\eta \cdot \frac{(1-\beta_1) G}{\sqrt{(1-\beta_2) G^2}} = \eta \cdot \frac{1 - \beta_1}{\sqrt{1 - \beta_2}} .$$

The $G$ cancels. This is the whole point.[^biascorr] The size of the step does not depend on how large the gradient was — a gradient one thousand times bigger produces the *same* update. What it depends on is a pure constant of your hyperparameters:

[^biascorr]: With bias correction the constant differs on the first few steps, but the cancellation of $G$ is exact regardless, and the asymptotic ratio is what governs a spike thousands of steps into a run.

| $\beta_1$ | $\beta_2$ | $(1-\beta_1)/\sqrt{1-\beta_2}$ | step, in units of $\eta$ |
| --- | --- | --- | --- |
| 0.9 | 0.95 | 0.447 | under half |
| 0.9 | 0.98 | 0.707 | most of one |
| 0.9 | 0.999 | 3.162 | **three and a bit** |
| 0.95 | 0.999 | 1.581 | one and a half |

The bottom-heavy rows are the interesting ones. With the classic $\beta_2 = 0.999$ from the original Adam paper, a single rare gradient moves a parameter more than three times your nominal learning rate in one step. That is not a small perturbation to a language model — it is enough to knock a layer out of the regime its neighbours were tuned for, which produces a loss spike one or two steps *later*, once the damaged activations propagate.

This is the real reason $\beta_2 = 0.95$ became standard for large language model pretraining, and it is a much better reason than "it works better empirically." A shorter second-moment window means $v$ has not gone stale, so a large gradient arrives against a denominator that has some idea of the current scale.

## Triage order

Given a spike, the mechanism above is cheap to test and the data hypothesis is expensive, so check in this order:

1. **Is the spike in the loss or in the gradient norm?** Log both. A gradient-norm spike that precedes the loss spike points at data. A loss spike with no preceding gradient-norm spike points at the optimizer taking a step it shouldn't have — the mechanism above, or a clipping threshold that isn't binding.
2. **Did it recover on its own within ~100 steps?** Self-healing spikes are usually a stale $v$ against a rare feature, and lowering $\beta_2$ or tightening clipping fixes them. Spikes that plateau at a higher loss have broken something.
3. **Are attention logits growing?** Track $\max |q \cdot k|$ per layer. Monotonic growth ending in a spike is entropy collapse, and it is a different disease with a different fix (QK normalization, logit soft-capping).
4. **Only now, look at the batch.** Reproduce with the same shard and seed. Repeated-token documents, base64 blobs, and single-token-dominated batches are all real causes — they are just the expensive thing to check.

```bash
# Find the offending step in a JSONL log and print its neighbourhood,
# so you can see whether grad_norm led or followed the loss.
jq -r 'select(.loss != null)
       | [.step, .loss, .grad_norm, .lr] | @tsv' train.jsonl \
  | awk 'NR>1 && $2 > prev*1.5 { print "spike at step " $1 }
         { prev = $2 }'
```

## The part that is not mechanical

One caveat on all of the above: a spike is a *symptom of a heavy tail*, and heavy tails in gradient distributions are not a bug you can hyperparameter your way out of. Language data has rare tokens, rare formats, and rare topics. A well-conditioned run does not have zero rare gradients; it has rare gradients that produce bounded steps.

So the goal is not a smooth curve. A perfectly smooth loss curve on a large run usually means your learning rate is too low, and you are paying for stability with sample efficiency you will not get back. The goal is spikes that recover.

---

Two numbers worth adding to your dashboard if they are not there: $(1-\beta_1)/\sqrt{1-\beta_2}$, printed once at startup so you know your worst-case single-step move, and the fraction of steps where gradient clipping actually binds. If the second is near zero, your clipping is decorative.
