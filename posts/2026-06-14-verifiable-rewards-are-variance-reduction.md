---
title: Verifiable rewards are a variance reduction trick
dek: A unit test is not a better description of what we want than a reward model. It is a cheaper estimator of it — and in policy gradients, cheap and low-variance beats accurate and noisy.
date: 2026-06-14
tags: [rl, post-training, evals]
---

The usual story about reinforcement learning from verifiable rewards is a story about honesty: a unit test cannot be flattered, so a model trained against one has to actually solve the problem. That story is fine as far as it goes, but it explains the wrong thing. Plenty of reward signals are honest and useless. What makes a verifiable reward work is that it is a *low-variance estimator of the thing you are optimizing*, and policy gradient methods are almost entirely bottlenecked by the variance of their estimator rather than by its bias.

It is worth being precise about where the variance goes.

## Where the gradient comes from

The object being estimated is the policy gradient

$$\nabla_\theta J(\theta) = \mathbb{E}_{x \sim \mathcal{D}} \; \mathbb{E}_{y \sim \pi_\theta(\cdot\mid x)} \big[ A(x, y) \, \nabla_\theta \log \pi_\theta(y \mid x) \big]$$

where $A$ is some advantage. Everything interesting is in how you get $A$. Value-function methods learn a critic and pay for it in critic error, which is correlated across samples and therefore does not average out. Group-relative methods skip the critic: sample $G$ completions per prompt and normalize within the group,[^grpo]

$$\hat{A}_i = \frac{r_i - \bar{r}}{\sigma_r}, \qquad \bar{r} = \frac{1}{G}\sum_j r_j, \quad \sigma_r = \sqrt{\tfrac{1}{G}\sum_j (r_j - \bar{r})^2}.$$

[^grpo]: This is the GRPO estimator. Whether to divide by $\sigma_r$ at all is contested — the normalization makes the update scale-free per prompt, but it also inflates the weight of prompts the group nearly agrees on, which is the failure mode discussed below.

Now specialize to a binary reward, which is what a unit test gives you: $r_i \in \{0, 1\}$, with group pass rate $p$. The mean is $p$, the standard deviation is $\sqrt{p(1-p)}$, and the advantage collapses to something that depends on *nothing but the pass rate*:

$$\hat{A}_{\text{pass}} = \sqrt{\frac{1-p}{p}}, \qquad \hat{A}_{\text{fail}} = -\sqrt{\frac{p}{1-p}}.$$

Average the magnitude over the group and the $p$-dependence becomes very tidy:

$$\frac{1}{G}\sum_i |\hat{A}_i| = p\sqrt{\frac{1-p}{p}} + (1-p)\sqrt{\frac{p}{1-p}} = 2\sqrt{p(1-p)}.$$

That function is zero at $p = 0$ and $p = 1$ and maximal at $p = \tfrac{1}{2}$. Which is to say: **a prompt teaches you something in proportion to how uncertain the model is about it.** A prompt the model always passes contributes exactly nothing to the gradient. Neither does one it always fails. The signal lives entirely in the middle.

| group pass rate $p$ | mean $\lvert\hat{A}\rvert$ | what the prompt is doing |
| --- | --- | --- |
| 0.0 | 0.00 | dead weight — too hard, no gradient |
| 0.1 | 0.60 | rare success, high-magnitude, high-variance |
| 0.5 | 1.00 | maximum information |
| 0.9 | 0.60 | rare failure, mostly confirmation |
| 1.0 | 0.00 | dead weight — already solved |

## The practical consequence

If you have ever watched a verifiable-reward run and wondered why throughput is fine but nothing is learning, this is usually the reason. You are spending compute rolling out $G$ completions for prompts whose group is unanimous, and unanimous groups are algebraically invisible.[^clip] The fix is not a better reward — the reward is already perfect. The fix is to stop sampling prompts that have nothing to say.

[^clip]: Worse than invisible, in a real implementation: a unanimous group makes $\sigma_r = 0$, so you are one epsilon away from dividing by zero. Every serious implementation masks these groups out. If yours silently adds $10^{-8}$ to the denominator, check what fraction of your batch is currently being multiplied by $10^{8}$.

```python
def group_advantages(rewards, eps_mask=True):
    """rewards: (n_prompts, group_size) -> advantages of the same shape."""
    mean = rewards.mean(dim=-1, keepdim=True)
    std = rewards.std(dim=-1, unbiased=False, keepdim=True)

    # A unanimous group carries no signal. Mask it rather than smoothing it:
    # dividing by a clamped near-zero std turns noise into an enormous update.
    live = std.squeeze(-1) > 1e-6
    adv = (rewards - mean) / std.clamp_min(1e-6)
    if eps_mask:
        adv = adv * live.unsqueeze(-1)

    return adv, live
```

Logging `live.float().mean()` — the fraction of prompts in the batch that produced any gradient at all — has been more useful to me than logging the reward itself. Mean reward goes up as the curriculum gets easier relative to the policy, which is exactly when learning stops. The live fraction goes *down*, and it goes down early.

## What the test is actually buying you

So: not honesty. A unit test buys you a reward whose conditional variance given $(x, y)$ is **zero**. Run it twice, get the same bit. Every other source of variance in the estimator — sampling $y$, sampling $x$, the finite group — is variance you chose and can budget for. A learned reward model adds a variance term you cannot see, cannot bound, and cannot reduce by sampling more, because its errors are systematic in the same directions your policy is being pushed.

That framing also tells you where verifiable rewards fail, and it is not where people usually look. The dangerous case is not "the model games the test." It is "the test is a zero-variance measurement of something slightly different from what you wanted."[^hack] Zero variance is not accuracy. You will optimize hard and confidently into the gap, and the loss curve will look beautiful the whole way.

[^hack]: The classic instances are mundane and worth grepping for before every run: solutions that write to the test file, that `sys.exit(0)` before assertions run, that monkeypatch the assertion helper, or that discover the harness counts a timeout as a pass. Each of these is a *correct* answer to the question you actually asked.

---

The summary I keep coming back to: reward design is estimator design. Ask what the variance of your signal is, ask which prompts currently have any, and only then ask whether the signal means what you think it means.
