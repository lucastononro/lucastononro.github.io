---
title: "How You Could Have Invented Muon from Memory"
dek: The matrix trick hiding in plain sight that made AdamW look less inevitable.
date: 2026-10-25
tags: [research]
draft: false
---

AdamW is a comfortable default. Then someone remembers that a matrix is a transformation, and suddenly there is a suspiciously simple optimizer to explain.

Let's try to invent it. We have a model, some data, and enough calculus and linear algebra to be dangerous. How should we change the weights?

We'll start with the obvious answer, gradient descent. Then we'll notice that a matrix does more than store a list of numbers. Taking that seriously will lead us to Muon's update. The aim is to make each choice follow from the previous one, so the formula becomes something we can reconstruct.

The optional explanations are folded away. Open whichever bits you need; there is no entrance exam.

## A function, some data, and a loss

A model is a mathematical function $f_\theta:\mathcal X\to\mathcal Y$, with adjustable parameters $\theta$. We choose those parameters to approximate a relationship we do not know. In regression, call that relationship $f_*$; after fitting, our estimate is $\hat f=f_{\hat\theta}\approx f_*$. The hat means "estimated from data".

This covers a line $f_\theta(x)=ax+b$, a vision network, or an LLM. For an LLM, the output is a probability distribution over possible next tokens. We are estimating a conditional distribution, rather than assuming every input has one inevitable answer.

A **loss** turns "how well are we doing?" into a number to minimize. It doesn't have to be a [distance in the formal mathematical sense](https://en.wikipedia.org/wiki/Metric_space#Definition). Here, it measures what we intuitively call distance or difference: how far the model's predictions are from what we want.

For regression, our training data consists of pairs $(x_i,y_i)$. The input is $x_i$, the desired output is $y_i$, and the model predicts $f_\theta(x_i)$. For a language model, $x_t$ is the observed token at position $t$, and $x_{<t}$ is the preceding context. Two common losses are

$$
\begin{aligned}
L_{\mathrm{reg}}(\theta)
&=\frac1N\sum_{i=1}^N\bigl(f_\theta(x_i)-y_i\bigr)^2,\\[10pt]
L_{\mathrm{LM}}(\theta)
&=-\frac1T\sum_{t=1}^T\log p_\theta(x_t\mid x_{<t}).
\end{aligned}
$$

The first is mean squared error over $N$ input/output pairs. The second is token cross-entropy over $T$ predicted tokens: it penalizes assigning low probability to the token that actually occurred. A lower loss means improvement on this objective; choosing a useful objective is our responsibility.

<details class="muon-aside" id="cross-entropy-refresher">
<summary>Why does low token probability give a large loss?</summary>

For a target distribution $y$ and predicted probabilities $p$, [cross-entropy](https://d2l.ai/chapter_linear-classification/softmax-regression.html) is $-\sum_j y_j\log p_j$. A [one-hot](https://en.wikipedia.org/wiki/One-hot) target puts all its mass on the observed token, so only $-\log p(\text{observed token})$ remains.

Giving the correct token probability $0.8$ costs about $0.223$ nats. Giving it $0.2$ costs about $1.609$. The negative logarithm makes confident mistakes expensive. Averaging this quantity over tokens gives the loss above.

</details>

Training moves $\theta$ through a space with one dimension per parameter. We want a useful direction and a sensible distance. We get local information about the loss, not a map showing the best route to the bottom.

## First, take a step downhill

So far, $\theta$ has meant all the model's adjustable parameters. To work out one update, focus on the weight matrix of a single layer, $W\in\mathbb R^{m\times n}$, and hold the other parameters fixed. We will write the loss as $L(W)$ to show which parameters we are changing. It is the same training objective, viewed as a smaller optimization problem.

Once we have a rule for this matrix, we can apply it to other weight matrices too. Biases and other parameter shapes may use a different update rule. For now, assume $L(W)$ is differentiable: small weight changes have a first-order effect that we can predict from the local slopes.

An optimizer adds a **step** $D$, with the same shape as $W$:

$$
W_{\mathrm{new}}=W+D.
$$

Each $D_{ij}$ says how much to change the corresponding weight $W_{ij}$. We keep uppercase $W$ and $D$ for the whole matrices throughout this derivation. In the small examples below, lowercase $w_1,w_2$ denote individual weights.

The gradient matrix $G$ collects the partial derivatives, $G_{ij}=\partial L/\partial W_{ij}$. Each entry measures the local change in loss per tiny change in that weight, with the others held fixed. A positive slope says increasing the weight raises the loss locally; a negative slope says the opposite.

The gradient gives us slopes. To turn them into an actual step, choose a positive scale $\alpha$, called the **learning rate**, and define

$$
D=-\alpha G.
$$

The minus sign reverses the slopes; $\alpha$ controls how far we move along them. This is gradient descent. Whether it lowers the actual loss still depends on how large a step we take.

<link rel="stylesheet" href="/muon-animations.css">

<details class="muon-aside" id="derivative-refresher">
<summary>Derivatives and partial derivatives, without the ceremony</summary>

For $f(w)=w^2$, changing $w=1$ by $h$ changes the output by $2h+h^2$. Divide by $h$ to get the average slope $2+h$. As $h$ approaches zero, this approaches the derivative $f'(1)=2$.

@diagram(muon-derivatives) The moving point approaches w = 1. The blue secant measures the slope over a finite interval; the dashed tangent shows its limit. A partial derivative does the same experiment while holding the other weights fixed.

<div class="muon-controls" data-animation="derivatives"><button data-action="play" disabled>Play animation</button><button data-action="restart" disabled>Restart</button><button data-action="previous-step" disabled>← Back</button><button data-action="next-step" disabled>Next →</button><span data-status>Shrink the interval and watch the slope settle.</span></div>

A derivative measures slope. A second derivative measures how that slope changes, which is curvature. If every partial derivative is zero, we have a stationary point. It could be a minimum, a maximum, or a saddle. Zero does not come with a "best possible answer" certificate.

</details>

<details class="muon-aside" id="gradient-worked-example">
<summary>Work out a two-weight loss and its gradient</summary>

Let two predictions be $\hat y_1=w_1$ and $\hat y_2=2w_2$, both with target zero. Half the sum of squared errors gives

$$
\begin{aligned}
L(w_1,w_2)
&=\tfrac12\bigl[(\hat y_1-0)^2+(\hat y_2-0)^2\bigr]\\[10pt]
&=\tfrac12\bigl[w_1^2+(2w_2)^2\bigr]\\[10pt]
&=\tfrac12(w_1^2+4w_2^2).
\end{aligned}
$$

The $1/2$ tidies the derivatives. The $4$ comes from squaring the second prediction's factor of $2$. In this two-weight example, collect the derivatives in a vector $g$:

$$
\begin{aligned}
g&=\left(\frac{\partial L}{\partial w_1},\frac{\partial L}{\partial w_2}\right)\\[12pt]
&=\left(\tfrac12\cdot2w_1,\tfrac12\cdot8w_2\right)\\[10pt]
&=(w_1,4w_2).
\end{aligned}
$$

A real network chains layers together. An early weight affects later activations, then the prediction, then the loss. [Backpropagation](https://d2l.ai/chapter_multilayer-perceptrons/backprop.html) applies the chain rule through those layers to compute the same kind of partial derivatives.

</details>

Choosing $D$ gets harder when the loss has curved valleys, flat regions, saddles, or several minima. A downhill step can settle in a shallow basin even when a deeper one exists elsewhere.

The surface below has two minima. The first run settles in the higher one. Try the other basin to see a different result. You can also drag the graph to look around and zoom with the buttons.

@diagram(muon-gradient-descent) Height is loss; the floor axes are two weights. Orange follows computed gradient steps. The left basin contains a local minimum with positive loss; the right basin reaches the global minimum, zero. This small example shows why local slope information cannot promise the best solution.

<div class="muon-controls" data-animation="gd"><button data-action="play" disabled>Play animation</button><button data-action="restart" disabled>Restart</button><button data-action="previous-step" disabled>← Back</button><button data-action="next-step" disabled>Next →</button><button data-action="new-start" disabled>Try the other basin</button><button data-action="zoom-in" aria-label="Zoom in on the loss surface" disabled>Zoom +</button><button data-action="zoom-out" aria-label="Zoom out of the loss surface" disabled>Zoom −</button><button data-action="reset-view" disabled>Reset view</button><span data-status>Drag to rotate. Arrow keys also rotate; + and − zoom.</span></div>

<details class="muon-aside" id="surface-formula">
<summary>The exact loss behind the picture</summary>

The surface uses

$$
\begin{aligned}
L_{\mathrm{draw}}(x,y)&=(x^2-1)^2\\[6pt]
&\quad+0.3(x-1)^2+8y^2.
\end{aligned}
$$

Its gradient is $(4x(x^2-1)+0.6(x-1),\,16y)$. The global minimum is $(1,0)$: all three nonnegative terms vanish there. There is also a strict local minimum at $x=(-1-\sqrt{0.4})/2\approx-0.816$, $y=0$, separated from the deeper basin by a saddle.

The animation recomputes the gradient at each step, using $\alpha=0.09$. The same function drives the surface and the path. Moving between iterates is only a visual aid; the optimization steps are discrete. This is a two-weight illustration, not a claim that shallow local minima are the main difficulty in every large network.

</details>

<div id="frobenius-is-the-dot-product-of-the-entries" class="section-alias" aria-hidden="true"></div>

## Turn many slopes into one score

We have a candidate step $D$, but its entries only tell us how much to change the weights. They do not tell us whether those changes help. For that, we need to know how the loss responds. That is the information in $G$.

Hold every weight except $W_{ij}$ fixed. Recall that $G_{ij}=\partial L/\partial W_{ij}$ is the local slope: loss change per unit change in this weight, in the limit of a tiny move. Near our current weights, we approximate the curve by a straight line. On a straight line, change in height is slope times horizontal movement. Here that becomes

$$
\text{predicted loss change}\approx G_{ij}D_{ij}.
$$

For example, if $G_{ij}=3$ and we increase that weight by $D_{ij}=0.01$, the predicted loss change is $3\times0.01=0.03$. Moving it by $-0.01$ instead predicts $-0.03$, a decrease. A negative gradient entry reverses which direction helps. The same weight change can help or hurt depending on its slope.

When several weights change together, differentiability tells us that their first-order effects add. This does not assume the weights act independently: the slopes depend on the whole current matrix, and the linear approximation leaves a remainder. We will make that approximation explicit in the next section. For now, our combined score is

$$
\sum_{i,j}G_{ij}D_{ij}=\langle G,D\rangle_F.
$$

This is the ordinary dot product of the entries, keeping them arranged as matrices. Its name is the **Frobenius inner product**. For any two matrices $A$ and $B$ of the same shape, we write

$$
\langle A,B\rangle_F=\sum_{i,j}A_{ij}B_{ij}
=\operatorname{tr}(A^\top B).
$$

Here $A^\top$ is the transpose, which swaps rows and columns. $\operatorname{tr}$ denotes the **trace**, the sum of a square matrix's diagonal entries. The whole expression returns one number.

<details class="muon-aside" id="trace-refresher">
<summary>What does the trace notation mean?</summary>

For a square matrix $C$, the trace is the sum of its diagonal entries:

$$
\operatorname{tr}(C)=\sum_j C_{jj}.
$$

For example,

$$
\begin{aligned}
C&=\begin{bmatrix}3&0\\2&-2\end{bmatrix},\\[10pt]
\operatorname{tr}(C)&=3+(-2)=1.
\end{aligned}
$$

The entry $2$ below the diagonal contributes nothing. Trace takes a square matrix and returns one scalar.

Why does it appear in our score? The $j$th diagonal entry of $A^\top B$ is the dot product of column $j$ of $A$ with column $j$ of $B$:

$$
\begin{aligned}
(A^\top B)_{jj}&=\sum_i A_{ij}B_{ij},\\[10pt]
\operatorname{tr}(A^\top B)&=\sum_j\sum_i A_{ij}B_{ij}.
\end{aligned}
$$

Adding those diagonal entries counts every matching pair once. That gives the same inner product we started with.

</details>

We will also need a way to measure the size of a step. Using the same entries, define the **Frobenius norm**:

$$
\|A\|_F=\sqrt{\sum_{i,j}A_{ij}^2}.
$$

It is the Euclidean length we would get by listing all the entries in a vector. This length and our score are related: the difference between the squared lengths of $A+B$ and $A-B$ isolates their inner product.

$$
\boxed{\langle A,B\rangle_F
=\frac{\|A+B\|_F^2-\|A-B\|_F^2}{4}.}
$$

This is the real polarization identity.

<details class="muon-aside" id="polarization-proof">
<summary>Where does the polarization formula come from?</summary>

Start with the norm's definition. Squaring it removes the square root, and each entry of $A+B$ is $A_{ij}+B_{ij}$. Apply the ordinary identity $(a+b)^2=a^2+2ab+b^2$ to each entry:

$$
\begin{aligned}
\|A+B\|_F^2&=\sum_{i,j}(A_{ij}+B_{ij})^2\\[10pt]
&=\sum_{i,j}A_{ij}^2+\sum_{i,j}B_{ij}^2\\[6pt]
&\quad+2\sum_{i,j}A_{ij}B_{ij}\\[10pt]
&=\|A\|_F^2+\|B\|_F^2\\[6pt]
&\quad+2\langle A,B\rangle_F.
\end{aligned}
$$

The last line simply recognizes the two squared norms and the inner product from their definitions. Replacing $B$ by $-B$ changes the sign of the cross term:

$$
\begin{aligned}
\|A-B\|_F^2&=\|A\|_F^2+\|B\|_F^2\\[6pt]
&\quad-2\langle A,B\rangle_F.
\end{aligned}
$$

Subtract the second expansion from the first. The squared norms cancel, and the cross terms leave $4\langle A,B\rangle_F$. Dividing by four gives the formula above.

</details>

<div id="taylor-turns-the-step-into-a-loss-prediction" class="section-alias" aria-hidden="true"></div>

## Predict whether a step will lower the loss

Our sum of slopes times changes looks like a useful score. Now we need to connect it to the quantity we actually care about, the loss after taking the step.

A differentiable function is locally approximated by its value plus a linear change. Applied to the weights, that linear change is exactly $\langle G,D\rangle_F$. This is the first-order [Taylor expansion](https://mathworld.wolfram.com/TaylorsTheorem.html):

$$
\boxed{L(W+D)\approx L(W)+\langle G,D\rangle_F.}
$$

The first term is our current loss. The second is the predicted change. A more negative inner product means a larger predicted decrease. The approximation is local, so the step size still matters.

<details class="muon-aside" id="taylor-refresher">
<summary>Why does the local slope predict a change in loss?</summary>

Taylor approximates a function near a point using derivatives there. For a sufficiently smooth scalar function,

$$
\begin{aligned}
f(x+h)&=f(x)+f'(x)h\\[8pt]
&\quad+\frac{f''(x)}{2!}h^2+\cdots\\[8pt]
&\quad+\frac{f^{(N)}(x)}{N!}h^N+R_N(h).
\end{aligned}
$$

The remainder $R_N$ records the error. If the next derivative is continuous and bounded in magnitude by $B$ along the interval, $|R_N(h)|\leq B|h|^{N+1}/(N+1)!$. Keeping only the value and slope gives the first-order approximation.

For $f(x)=x^2$ at $x=1$, the tangent predicts $1+2h$ and the exact value is $1+2h+h^2$. Watch the terms appear with their geometric meaning.

@diagram(muon-taylor) First locate the value, then build the tangent prediction, then reveal the gap to the curve. Halving h halves the linear change but quarters the error h².

<div class="muon-controls" data-animation="taylor"><button data-action="play" disabled>Play animation</button><button data-action="restart" disabled>Restart</button><button data-action="previous-step" disabled>← Back</button><button data-action="next-step" disabled>Next →</button><span data-status>Value, slope, and the part the tangent misses.</span></div>

For matrices, restrict the loss to a line, $\phi(t)=L(W+tD)$. The [chain rule](https://d2l.ai/chapter_preliminaries/calculus.html#chain-rule) gives

$$
\phi'(0)=\sum_{i,j}\frac{\partial L}{\partial W_{ij}}D_{ij}
=\langle G,D\rangle_F.
$$

That is where Frobenius enters: it packages the sum of slopes times changes. Differentiability gives the precise statement

$$
\begin{aligned}
L(W+D)&=L(W)+\langle G,D\rangle_F\\[6pt]
&\quad+R(D).
\end{aligned}
$$

The remainder becomes small relative to the step:

$$
\frac{R(D)}{\|D\|_F}\longrightarrow0\quad\text{as }D\to0.
$$

A quadratic error bound needs extra smoothness, such as a continuous [Hessian](https://mathworld.wolfram.com/Hessian.html) nearby. For our earlier quadratic, the remainder is exactly $\tfrac12(d_1^2+4d_2^2)$. An oversized step can let this positive remainder overwhelm the predicted decrease.

</details>

<div id="steepest-needs-a-budget" class="section-alias" aria-hidden="true"></div>

## Decide how far we are willing to move

We can now compare steps by their predicted change in loss. But the prediction only uses local slopes. We choose a size limit so we stay close enough for it to be useful. A huge downhill step can overshoot, raise the actual loss, and send training bouncing around. The tangent line will happily recommend it anyway.

Call the limit $\eta>0$, our step **budget**. We choose both its size and how to measure it; a limit alone does not guarantee convergence. Measuring size with the Frobenius norm gives

$$
\min_{\|D\|_F\leq\eta}\langle G,D\rangle_F.
$$

Read this as: **among all steps within the budget, choose the one with the most negative predicted loss change**. The gradient $G$ is fixed at our current weights; the step $D$ is what we get to choose.

To see the geometry, imagine listing the matrix entries in vectors. For nonzero $G$ and $D$, call the angle between those vectors $\varphi$:

$$
\langle G,D\rangle_F=\|G\|_F\|D\|_F\cos\varphi.
$$

The quantity $\|D\|_F\cos\varphi$ is the signed projection of the step onto the gradient direction. Multiplying by $\|G\|_F$ turns that displacement into a predicted loss change. Moving with the gradient gives a positive score; moving against it gives a negative one. A perpendicular step scores zero, which predicts no first-order improvement. We want the most negative score our budget allows.

[Cauchy–Schwarz](https://mathworld.wolfram.com/CauchysInequality.html) says $|\langle G,D\rangle_F|\leq\|G\|_F\|D\|_F$. Taking the negative side of that bound and applying our budget,

$$
\langle G,D\rangle_F
\geq-\|G\|_F\|D\|_F
\geq-\eta\|G\|_F.
$$

For $G\neq0$, choose $D_F=-\eta G/\|G\|_F$. Substitution gives $\langle G,D_F\rangle_F=-\eta\|G\|_F$, exactly the lower bound. There is our minus sign and our best direction.

Ordinary SGD uses $-\alpha G$: the same direction, with step length $\alpha\|G\|_F$ instead of a fixed $\eta$.

Our budget so far measures the combined size of the changes to the matrix entries. There is another useful question: how much will this update change what the layer outputs?

To see the difference, feed the **same input vector** $x$ into the layer before and after the update. Here $x$ means the activations entering this layer. For the linear part of the layer, call the output $z$:

$$
\begin{aligned}
z_{\mathrm{before}}&=Wx,\\[8pt]
z_{\mathrm{after}}&=(W+D)x,\\[8pt]
&=Wx+Dx,\\[8pt]
z_{\mathrm{after}}-z_{\mathrm{before}}&=Dx.
\end{aligned}
$$

The old output $Wx$ cancels. An unchanged bias would cancel too. What remains, $Dx$, is exactly the change caused by updating the weights. Even in one dimension, this distinction matters: changing a weight from 2 to 2.1 changes the output for input 3 from 6 to 6.3. The weight changed by 0.1; the output changed by $0.1\times3=0.3$.

So we can choose a budget based on the update's effect on the layer's outputs. We need it to cover different inputs, not just one example. That leads to the next question: which input direction does $D$ change the most?

## Measure the largest output change

Keep the same loss prediction, but measure the update by its largest output change per unit of input length.

We must fix the input length before comparing directions. Otherwise, simply doubling $x$ doubles $Dx$, even though the update $D$ has not changed. Try every input with length 1 and measure the resulting change $Dx$. The largest length we find is the **spectral norm**, also called the Euclidean operator norm:

$$
\|D\|_{\mathrm{op}}=\max_{\|x\|_2=1}\|Dx\|_2.
$$

Here $\|x\|_2$ is Euclidean vector length (the size of the vector, $\sqrt{x_1^2+\cdots+x_n^2}$). Fixing it at 1 lets us compare directions fairly.

@diagram(muon-spectral) A unit input sweeps around the circle while its image sweeps an ellipse. For this D, the longest image has length 2, attained at x = (1, 1)/√2 and its negative. The animation then settles on one maximizing direction.

<div class="muon-controls" data-animation="spectral"><button data-action="play" disabled>Play animation</button><button data-action="restart" disabled>Restart</button><button data-action="previous-step" disabled>← Back</button><button data-action="next-step" disabled>Next →</button><span data-status>Keep the input length fixed. Search over its direction.</span></div>

A spectral budget $\|D\|_{\mathrm{op}}\leq\eta$ guarantees $\|Dx\|_2\leq\eta\|x\|_2$ for every input. It controls this layer's worst output change per unit input. It does not, by itself, control the whole network's loss curvature.

For a diagonal update, the two budgets are easy to see:

$$
D=\operatorname{diag}(d_1,d_2)
=\begin{bmatrix}d_1&0\\0&d_2\end{bmatrix},
$$

$$
\begin{aligned}
\|D\|_F&=\sqrt{d_1^2+d_2^2},\\[10pt]
\|D\|_{\mathrm{op}}&=\max(|d_1|,|d_2|).
\end{aligned}
$$

Set $\eta=1$. Each point in the animation is a candidate update $(d_1,d_2)$. Shading marks allowed steps; the outline is the budget limit. Frobenius gives a disk, and the spectral norm gives a square.

@diagram(muon-budgets) Read the stages in order: allowed steps, the −g direction, decreasing score, then the last contact. The blue arrow is a direction guide. The orange point is the candidate update; its matrix and score change together. Both panels use the same gradient and budget η = 1.

<div class="muon-controls" data-animation="budgets"><button data-action="play" disabled>Play animation</button><button data-action="restart" disabled>Restart</button><button data-action="previous-step" disabled>← Back</button><button data-action="next-step" disabled>Next →</button><span data-status>Start at score zero. Follow the blue arrow toward lower scores.</span></div>


Write the score as $c(d_1,d_2)=g_1d_1+g_2d_2$. The blue arrow points along $-g=(-g_1,-g_2)$, where this score decreases. Its drawn length is just for readability. The orange dot is a candidate update $D$, and the dashed line passes through all updates with the same score as that dot.

Start at the origin: no weight change, score zero. Now slide the dashed line in the arrow's direction. More negative scores mean larger predicted decreases. Stop when the line is about to lose contact with the allowed region. The final orange dot is the best allowed update. The arrow tells us which way is better; the boundary decides how far we can go.

Keep our loss prediction in view:

$$
\begin{aligned}
L(W+D)&\approx L(W)\\[8pt]
&\quad+\underbrace{\color{#b54328}{\langle G,D\rangle_F}}_{\text{the change we minimize}}.
\end{aligned}
$$

We changed which steps are allowed. The highlighted score is still the Frobenius inner product.



<div id="the-svd-tells-us-where-to-spend-it" class="section-alias" aria-hidden="true"></div>

## Choose a step in each independent direction

The diagonal examples show what the new budget allows. We now need the best step for a general matrix, whose useful directions may not line up with the coordinate axes:

$$
\min_{\|D\|_{\mathrm{op}}\leq\eta}\langle G,D\rangle_F.
$$

The useful fact is that we can choose perpendicular input and output coordinates in which the matrix only stretches directions. This is the **singular value decomposition**, or SVD. It gives unit input directions $v_i$, unit output directions $u_i$, and stretch factors $\sigma_i$, called singular values. In these coordinates, $Gv_i=\sigma_i u_i$.

<div id="svd-refresher" class="section-alias" aria-hidden="true"></div>

We will use the SVD theorem without proving it here. It says that every real matrix, square or rectangular, can be written as $U\Sigma V^\top$. You can accept that result for this derivation, or follow the construction in [Gilbert Strang's SVD lecture](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/resources/lecture-29-singular-value-decomposition/). What matters for our optimizer is what the factors do.

For an $m\times n$ matrix, the full factorization has $U\in\mathbb R^{m\times m}$, $\Sigma\in\mathbb R^{m\times n}$, and $V\in\mathbb R^{n\times n}$. The middle factor has the same rectangular shape as the original matrix, with nonnegative entries on its diagonal and zeros everywhere else. $U$ and $V$ are orthogonal, so they preserve lengths.

Read $U\Sigma V^\top$ right to left: $V^\top$ changes input coordinates, $\Sigma$ stretches each coordinate, and $U$ changes to output coordinates. Those coordinate changes can include reflections. The original matrix need not look diagonal at all.

For $G=\begin{bmatrix}3&0\\0&1\end{bmatrix}$, the useful directions are already the axes. It triples one and leaves the other unchanged, so $U=V=I$ and $\Sigma=G$. A less conveniently aligned matrix needs the coordinate changes too.

@diagram(muon-svd) Follow the marked input directions through Vᵀ, Σ, and U. This full-rank 2 × 2 example has stretches 2 and ½, with input and output rotations of 45° and 30°. The final stage previews what happens when both stretches become 1.

<div class="muon-controls" data-animation="svd"><button data-action="play" disabled>Play animation</button><button data-action="restart" disabled>Restart</button><button data-action="previous-step" disabled>← Back</button><button data-action="next-step" disabled>Next →</button><span data-status>Follow the factors from right to left.</span></div>

The animation gives us the directions; now we can write the score in those coordinates. The **compact SVD** keeps only the $r$ directions with positive stretches.

For nonzero $G$, its compact SVD is

$$
G=U_r\Sigma_rV_r^\top
=\sum_{i=1}^r\sigma_i u_i v_i^\top.
$$

Here $r$ counts the independent active directions, and $\Sigma_r$ stores the positive stretches on its diagonal. The columns of $U_r$ and $V_r$ are the output and input directions.

The largest $\sigma_i$ is $\|G\|_{\mathrm{op}}$. Combining all their squared lengths gives $\|G\|_F=\sqrt{\sum_i\sigma_i^2}$.

Unlike eigenvalue diagonalization, SVD uses separate input and output coordinates. That is why the same construction works for rectangular matrices too.

Now the score separates into those directions:

$$
\langle G,D\rangle_F=\sum_{i=1}^r\sigma_i\,u_i^\top Dv_i.
$$

Read one term before adding them all. The vector $Dv_i$ is the output change caused by the update when the input is $v_i$. The scalar $u_i^\top Dv_i$ is its signed component along the unit output direction $u_i$. Positive means along $u_i$; negative means against it. The positive number $\sigma_i$ weights that component in our score.

Our spectral budget limits the output change for **every** unit input. Each $v_i$ is one of those inputs, so

$$
\|Dv_i\|_2\leq\|D\|_{\mathrm{op}}\|v_i\|_2
\leq\eta.
$$

A signed component cannot have greater magnitude than the vector itself. A vector of length at most $\eta$ therefore cannot project farther than $-\eta$ in the opposite direction. Written as inequalities,

$$
u_i^\top Dv_i\geq-\|Dv_i\|_2\geq-\eta.
$$

The most negative value occurs when $Dv_i=-\eta u_i$: use the full allowed length and point exactly against $u_i$. Multiplying each bound by $\sigma_i>0$ preserves its direction. Adding gives

$$
\begin{aligned}
\langle G,D\rangle_F
&=\sum_{i=1}^r\sigma_i u_i^\top Dv_i\\[10pt]
&\geq\sum_{i=1}^r\sigma_i(-\eta)\\[10pt]
&=-\eta\sum_{i=1}^r\sigma_i.
\end{aligned}
$$

That is a lower bound. To prove it is the best attainable score, we still need one matrix that sends **every** active $v_i$ to $-\eta u_i$ without breaking the budget. Choose

$$
\boxed{D_*=-\eta U_rV_r^\top.}
$$

To check this, multiply the proposed update by one input direction $v_i$. Let $e_i$ be the coordinate vector with a 1 in position $i$ and zeros elsewhere. The columns of $V_r$ have unit length and are perpendicular to one another, so their dot products with $v_i$ give

$$
V_r^\top v_i=e_i.
$$

Multiplying a matrix by $e_i$ selects its $i$th column, so $U_re_i=u_i$. Substitute those two facts, one at a time:

$$
\begin{aligned}
D_*v_i&=(-\eta U_rV_r^\top)v_i\\[8pt]
&=-\eta U_r(V_r^\top v_i)\\[8pt]
&=-\eta U_re_i\\[8pt]
&=-\eta u_i.
\end{aligned}
$$

Thus this single update matrix sends every active input direction to the opposite output direction with length $\eta$. Every term in the score reaches its lower bound.

It also respects the budget for combinations of inputs. $V_r^\top$ extracts the coordinates in the active input directions without increasing length; $U_r$ maps those coordinates into orthonormal output directions without changing their length. Multiplication by $\eta$ scales that length by $\eta$. So $\|D_*x\|_2\leq\eta\|x\|_2$ for every $x$, with equality on each active $v_i$.

We have both pieces: no allowed update can score lower, and this update achieves the bound. After factoring out the minus sign and step size, its effect is to replace the positive stretches (the singular values stored in $\Sigma_r$) by ones:

$$
U_r\Sigma_rV_r^\top\longmapsto U_rI_rV_r^\top=U_rV_r^\top.
$$

Call $U_rV_r^\top$ the **polar factor**, written $\operatorname{polar}(G)$. It keeps the active input and output directions and replaces their positive stretches by 1. We have derived the matrix transformation at the center of Muon. Next we need to decide which gradient estimate to feed into it, and how to compute it cheaply.



## Give the direction some memory

So far we have treated $G$ as the direction to trust. In training, we usually compute it from a minibatch, a small sample of the data. Different samples give different gradients. Before applying the polar transformation, combine recent gradients into a steadier estimate $M_t$:

$$
M_t=\beta M_{t-1}+(1-\beta)G_t.
$$

Start with $M_0=0$ and choose $0\leq\beta<1$. With $\beta=0.8$, keep 80% of the old estimate and add 20% of the incoming gradient. The animation builds that sum.

<div class="muon-controls" data-animation="momentum"><button data-action="play" disabled>Play animation</button><button data-action="restart" disabled>Restart</button><button data-action="previous-step" disabled>← Back</button><button data-action="next-step" disabled>Next →</button><span data-status>β = 0.8, starting from M₀ = 0.</span></div>

@diagram(muon-momentum) Blue is the retained estimate; dark ink is the new contribution. Add them head to tail to get orange. The vectors list two diagonal entries; values are rounded to three decimals. The lower trace follows the second entry across batches.

Now put that memory on a loss surface. The dark path follows each noisy gradient; the blue path averages them before stepping. Both start at the same weights, use the same learning rate, and receive the same sequence of batch perturbations. Each computes its gradient at its own current position.

@diagram(muon-momentum-landscape) Height is loss; the two floor coordinates are weights. Sideways travel counts the total movement across the narrow valley. The lower plot shows the position along the valley: crossing below zero means passing the minimum in that direction. Both methods take 48 computed steps with α = 0.14. Smooth motion between steps is only a visual aid.

<div class="muon-controls" data-animation="momentumlandscape"><button data-action="play" disabled>Play animation</button><button data-action="restart" disabled>Restart</button><button data-action="previous-step" disabled>← Back</button><button data-action="next-step" disabled>Next →</button><button data-action="toggle-noise" disabled>Remove batch noise</button><button data-action="longer-memory" disabled>Longer memory: β = 0.95</button><button data-action="zoom-in" aria-label="Zoom in on the momentum surface" disabled>Zoom +</button><button data-action="zoom-out" aria-label="Zoom out of the momentum surface" disabled>Zoom −</button><button data-action="reset-view" disabled>Reset view</button><span data-status>Drag to rotate. Compare noisy steps with their moving average.</span></div>

Watch the dark path bounce across the valley while the blue path filters those changing directions. Then remove the noise and try longer memory. The blue path can pass the minimum because its stored direction takes time to reverse. Momentum reduces jitter in this example; it does not guarantee that we avoid overshooting. The learning rate and memory length both matter. [Why Momentum Really Works](https://distill.pub/2017/momentum/) explores this behavior in detail.

Use this momentum estimate in our update:

$$
\boxed{W_{t+1}=W_t-\eta_t\,\operatorname{polar}(M_t).}
$$

Momentum followed by orthogonalization gives the idealized core of Muon. Its step optimizes the local score built from $M_t$, so it need not decrease the current minibatch's loss.

<details class="muon-aside" id="momentum-details">
<summary>How much history is in that average, and why this order?</summary>

Expanding the recurrence gives $M_t=(1-\beta)\sum_{s=1}^t\beta^{t-s}G_s$. Older gradients fade geometrically. The weights sum to $1-\beta^t$, so starting at zero pulls early estimates toward zero.

Average first, then orthogonalize. These operations do not commute. In one dimension, averaging $10$ and $-1$ gives a positive number whose sign is $+1$. Averaging their signs gives zero. The sign function is the scalar version of the polar transformation.

</details>

So far, our optimizer has a clean formula and an SVD bill. Let's deal with the bill.

<div id="make-the-matrix-do-the-svd-algebra-for-us" class="section-alias" aria-hidden="true"></div>

## Change the stretches without finding the directions

Computing a full decomposition at every training step would be expensive. But look at what we actually need from the momentum matrix:

$$
\begin{aligned}
M&=U_r\Sigma_rV_r^\top,\\[10pt]
Q&=U_rI_rV_r^\top=U_rV_r^\top.
\end{aligned}
$$

The step from $\Sigma_r$ to $I_r$ is the important choice here. Let's work through why we made it, starting with two numbers instead of the whole factorization.

Suppose the momentum matrix is diagonal, with stretches (singular values on the diagonal of $\Sigma_r$) equal to 10 and 1. Its input and output directions are just the two coordinate axes. Set the allowed output-change budget to $\eta=1$. We are choosing an update, so we may choose its length in each of those directions.

Recall our score: multiply each slope by its proposed change, then add. Here we use the momentum values 10 and 1 as averaged slopes. A more negative total is better according to that score. Consider these two choices:

| Update along the two axes | Largest output change for a unit input | Score using the momentum |
| --- | --- | --- |
| $-1$ and $-0.1$ | $1$ | $10(-1)+1(-0.1)=-10.1$ |
| $-1$ and $-1$ | $1$ | $10(-1)+1(-1)=-11$ |

The first choice preserves the momentum's 10-to-1 ratio. The second moves farther along the weaker direction. **Both obey the same budget**, and the second has the more negative score. Keeping that ratio would give up an improvement we are allowed to take.

Why doesn't moving in both directions break the budget? Take any unit input $x=(x_1,x_2)$, so $x_1^2+x_2^2=1$. The second update sends it to $(-x_1,-x_2)$, whose length is still 1. The input cannot have length 1 along both axes at once. That is why the spectral budget permits an update length of 1 along each axis. A Frobenius budget would instead measure the entries together as $\sqrt{1^2+1^2}=\sqrt2$ and reject this update when $\eta=1$. These are different definitions of a small update.

Now connect those numbers to the general matrix. Recall that the SVD describes each input direction $v_i$ and its corresponding output direction $u_i$:

$$
Mv_i=\sigma_i u_i.
$$

Here $\sigma_i>0$ is the original stretch. It tells us what $M$ does; it does not require our update $D$ to use that same length. Introduce $a_i\geq0$ as the **update length we choose** in direction $i$. To move against the momentum, we ask for

$$
Dv_i=-a_i u_i.
$$

This is our proposed update rule, not another property of the SVD. It means: when the input points along $v_i$, the change in the layer's output points opposite $u_i$, with length $a_i$. One matrix that does this in every active direction is

$$
D=-U_r\operatorname{diag}(a_1,\ldots,a_r)V_r^\top.
$$

As in the multiplication we checked earlier, $V_r^\top$ selects a coordinate, the diagonal matrix scales it by $a_i$, and $U_r$ turns it into $u_i$. For this choice of $D$, the largest output stretch is $\max_i a_i$. The budget therefore says each $a_i$ may be at most $\eta$.

The score also comes from earlier: we used $\langle G,D\rangle_F$ to predict the loss change. After introducing momentum, we use $\langle M,D\rangle_F$ to choose a step from the averaged slopes. This is a momentum-based score, not an exact prediction from the current gradient. Expanding it in the singular directions gives the same calculation as before:

$$
\begin{aligned}
\langle M,D\rangle_F
&=\sum_i\sigma_i u_i^\top Dv_i\\[8pt]
&=\sum_i\sigma_i u_i^\top(-a_i u_i)\\[8pt]
&=-\sum_i\sigma_i a_i.
\end{aligned}
$$

The last equality uses $u_i^\top u_i=1$. Each positive $\sigma_i$ multiplies a negative term, so increasing $a_i$ makes the score smaller. We can increase every $a_i$ to $\eta$ without exceeding the spectral budget. The earlier lower-bound argument shows this choice is optimal even among updates outside this proposed form.

All chosen lengths are now equal. Factoring out their common size $\eta$ leaves ones on the diagonal:

$$
\begin{aligned}
D_*&=-\eta U_rI_rV_r^\top,\\[8pt]
Q&=U_rI_rV_r^\top.
\end{aligned}
$$

That is why we replace the positive stretches (the singular values stored in $\Sigma_r$) by 1 in $Q$. We keep the directions and choose new update lengths to fit our budget. The learning rate supplies the common size afterward. Only the middle factor becomes an identity; $Q$ still maps the input directions to their corresponding output directions and generally is not the identity matrix.

Newton–Schulz offers a way to approach this target using repeated matrix multiplications. Before deriving its update, we need two tools: a multiplication that changes the stretches without changing their directions, and a scalar rule that brings each stretch toward 1 and keeps it there.

Start with the multiplication. Let $X$ be our current approximation. The following identity changes its stretches without computing the directions explicitly.

If $X=U_r\Sigma_rV_r^\top$, then

$$
XX^\top X=U_r\Sigma_r^3V_r^\top.
$$

Multiplying by the transpose and then itself cubes every singular value while retaining the singular directions. That means

$$
aX+bXX^\top X=U_r(a\Sigma_r+b\Sigma_r^3)V_r^\top.
$$

We can apply $p(s)=as+bs^3$ to all singular values using matrix multiplications alone. We never have to compute $U_r$ or $V_r$. That leaves a scalar design problem: choose $p$ so repeating it brings positive stretches (singular values stored in $\Sigma_r$) to 1.

<details class="muon-aside" id="svd-cancellation">
<summary>Show the factors cancelling</summary>

The compact SVD has $V_r^\top V_r=I_r$ and $U_r^\top U_r=I_r$. Expand the product:

$$
\begin{aligned}
&XX^\top X\\[8pt]
&=(U_r\Sigma_rV_r^\top)(V_r\Sigma_rU_r^\top)
  (U_r\Sigma_rV_r^\top)\\[10pt]
&=U_r\Sigma_r\underbrace{V_r^\top V_r}_{I_r}
\Sigma_r\underbrace{U_r^\top U_r}_{I_r}\Sigma_rV_r^\top\\[10pt]
&=U_r\Sigma_r^3V_r^\top.
\end{aligned}
$$

The same argument produces higher odd powers of $\Sigma_r$. If a polynomial produces a negative value, that sign can be absorbed into a singular vector; the actual singular value is its magnitude. Our classical cubic below stays nonnegative on the interval we use.

</details>

<div id="build-a-polynomial-that-brings-values-to-one" class="section-alias" aria-hidden="true"></div>

## Make one the destination, and keep it there

Now we can work on one stretch at a time. If all the positive diagonal entries approach 1, then

$$
\begin{aligned}
\Sigma_{r,k}&\longrightarrow I_r,\\[10pt]
X_k=U_r\Sigma_{r,k}V_r^\top&\longrightarrow U_rV_r^\top=Q.
\end{aligned}
$$

That is why 1 is the destination. Reaching it in the scalar calculation gives us the polar direction in the matrix calculation. We still need a rule for getting there.

Take one positive stretch $s_0$ and repeatedly feed the result of a function back into that same function:

$$
s_1=p(s_0),\qquad s_2=p(s_1),\qquad \ldots
$$

In general, $s_{k+1}=p(s_k)$. Here $k$ counts these inner iterations, not training steps. We want the numbers to approach 1. Once a number gets there, another iteration should leave it there, so we require $p(1)=1$. A value that a function leaves unchanged is called a **fixed point**.

Staying at the destination is only half the job. Nearby values also need to move toward it. For example, $p(s)=\tfrac12s+\tfrac12$ sends $0.9$ to $0.95$, then $0.975$, halving the distance to 1 each time. But $p(s)=2s-1$ sends $0.9$ to $0.8$, then $0.6$. Both fix 1; only the first attracts nearby values. A fixed point can be a place you approach or a place you get kicked away from.

<details class="muon-aside" id="fixed-point-refresher">
<summary>Watch a value go into the function, then come back as its next input</summary>

A fixed point is where $y=p(s)$ meets $y=s$. Orange goes vertically to evaluate the function, then horizontally to the diagonal to reuse the output. The number also moves into the formula above the graph, so the geometry and substitution tell the same story.

<div class="muon-controls" data-animation="fixedpoints"><button data-action="play" disabled>Play animation</button><button data-action="restart" disabled>Restart</button><button data-action="previous-step" disabled>← Back</button><button data-action="next-step" disabled>Next →</button><span data-status>Plug in the number. Reuse the result.</span></div>

@diagram(muon-fixed-points) Both maps fix 1. Starting at 0.9, p(s) = ½s + ½ halves the error; p(s) = 2s − 1 doubles it. Watch the input travel into the function, the arithmetic appear, and the result feed the next iteration.

</details>

We want the attracting behavior, with fast error reduction near the target. Write the current stretch as $s=1+e$, where $e$ is its error. The local approximation we used for the loss now tells us how the next error behaves. Assuming $p(1)=1$,

$$
p(1+e)-1=p'(1)e+O(e^2).
$$

So $p'(1)$ multiplies the leading part of the error. A slope with magnitude below 1 shrinks nearby errors; choosing $p'(1)=0$ removes that linear term altogether. For the cubic $p(s)=as+bs^3$ that our matrix multiplication can compute, the two requirements are

$$
\begin{aligned}
p(1)=1&\quad\text{keeps the target fixed},\\[10pt]
p'(1)=0&\quad\text{removes the linear error}.
\end{aligned}
$$

Substituting the cubic and its derivative gives

$$
\begin{aligned}
a+b&=1,\\[8pt]
a+3b&=0.
\end{aligned}
$$

Subtract the first equation from the second: $2b=-1$. So $b=-1/2$ and $a=3/2$. Putting these coefficients back into the scalar rule and its matrix counterpart gives the classical **Newton–Schulz** iteration:

$$
\begin{aligned}
p(s)&=\tfrac32s-\tfrac12s^3,\\[10pt]
X_{k+1}&=\tfrac32X_k-\tfrac12X_kX_k^\top X_k.
\end{aligned}
$$

Normalize a nonzero momentum matrix with $X_0=M/\|M\|_F$. Since $\|M\|_{\mathrm{op}}\leq\|M\|_F$, its singular values start in $[0,1]$. Repeated cubic steps bring each positive one toward 1 and keep zero at zero. Consequently, the middle factor approaches $I_r$, and $X_k$ approaches $Q=U_rV_r^\top$. The scalar fixed point gives us the matrix direction we wanted. Zero stretches stay zero, so this also preserves the active subspace when the original matrix has missing directions.

<details class="muon-aside" id="cubic-convergence">
<summary>Why do the iterates actually reach one?</summary>

For $0<s<1$,

$$
\begin{aligned}
p(s)-s&=\tfrac12s(1-s^2)>0,\\[10pt]
1-p(s)&=\tfrac12(1-s)^2(s+2)\geq0.
\end{aligned}
$$

The value increases without crossing 1. Its limit must be a fixed point; the only positive one in this interval is 1. The squared error factor gives quadratic convergence near 1. Very small starting values can still need many iterations to get close.

More generally, $|p'(1)|<1$ gives local attraction. Setting it to zero improves the local error reduction; it does not, on its own, prove that arbitrary starting values converge. That is why we checked the interval.

</details>

<div id="the-useful-approximation-breaks-the-pretty-proof" class="section-alias" aria-hidden="true"></div>

## Get a useful approximation in five steps

We now have an iteration that converges, but a tiny initial stretch can take many steps to get close to 1. Every training step contains this inner matrix calculation. We need to stop it somewhere, or we will spend the training budget polishing one update. The [original Muon experiments](https://kellerjordan.github.io/posts/muon/) found five inner steps sufficient for the models tested. Five is a compute-budget choice, not a convergence guarantee. They use this tuned quintic:

$$
q(s)=3.4445s-4.7750s^3+2.0315s^5.
$$

Its slope at zero is $3.4445$, versus the cubic's $1.5$, so small values initially grow faster. There is a catch: $q(1)=0.701$. One is not even a fixed point.

The bargain is fast early progress toward unit-sized stretches, with some error left over. Running this same quintic forever does not finish the job; it can keep oscillating. Our two cubic conditions do not derive these tuned coefficients. The [Newton–Schulz notes](https://docs.modula.systems/algorithms/newton-schulz/) explain this choice and the resulting oscillation.

<section id="quintic-behavior" aria-label="Compare cubic and quintic iterations">

@diagram(muon-polynomials) Starting at 0.1, the quintic first enters the shaded 0.7–1.3 band at step 2; the cubic takes 6. The band is an illustrative tolerance around 1. Rings mark the first arrival, and the vertical line marks the five-step compute budget. Each value travels into its polynomial and back to the graph. Keep going to see the difference between getting close early and converging. Try starts at 1 and 0 too. Arithmetic is displayed rounded and computed at full precision.

<div class="muon-controls" data-animation="polynomials"><button data-action="play" disabled>Play animation</button><button data-action="restart" disabled>Restart</button><button data-action="previous-step" disabled>← Back</button><button data-action="next-step" disabled>Next →</button><button data-action="five-steps" disabled>Show five steps</button><button data-action="cycle-start" disabled>Try start at 1</button><span data-status>Substitute, calculate, and reuse each result.</span></div>

A quintic $q(s)=as+bs^3+cs^5$ has three coefficients. We could impose $q(1)=1$ and $q'(1)=0$, then use the remaining freedom to shape the interval. Muon's original coefficients make a different tradeoff. Polynomial design includes choosing the conditions, not only solving for the coefficients.

</section>

<details class="muon-aside" id="muon-code">
<summary>Show the matrix code and the practical optimizer details</summary>

Here is the five-step direction calculation in float32. The reference implementation uses bfloat16 for speed.

```python
import torch

@torch.no_grad()
def muon_direction(M, steps=5, eps=1e-7):
    """Approximate polar direction for one finite 2D matrix."""
    assert M.ndim == 2
    X = M.float()
    transposed = X.shape[0] > X.shape[1]
    if transposed:
        X = X.T
    X = X / (X.norm() + eps)  # Frobenius norm; zero stays zero.
    a, b, c = 3.4445, -4.7750, 2.0315
    for _ in range(steps):
        A = X @ X.T
        X = a * X + (b * A + c * (A @ A)) @ X
    return X.T if transposed else X
```

Transposing a tall matrix makes $XX^\top$ smaller and cheaper to multiply; the return restores its shape. The quintic uses the same SVD algebra, adding a $\Sigma_r^5$ term.

The [reference optimizer](https://github.com/KellerJordan/Muon/blob/master/muon.py) also uses a [Nesterov-style](https://distill.pub/2017/momentum/) blend $H_t=(1-\beta)G_t+\beta M_t$ by default, applies matrix-shape scaling, and supports [decoupled weight decay](https://arxiv.org/abs/1711.05101). The finite quintic output need not have spectral norm exactly 1.

The reference setup uses Muon for hidden weight matrices and another optimizer, such as AdamW, for embeddings, the output layer, and scalar or vector parameters. The function above computes the direction, not the full training recipe.

</details>

## Put the pieces together: one Muon step

We have enough parts. Time to assemble the optimizer.

At training step $t$, backpropagation gives the gradient $G_t$. Blend it into the momentum, normalize that matrix, and run five polynomial steps. Then scale the result by the learning rate and subtract it from the weights:

$$
\begin{aligned}
M_t&=\beta M_{t-1}+(1-\beta)G_t,\\[10pt]
X_0&=\frac{M_t}{\|M_t\|_F+\varepsilon},\\[10pt]
A_k&=X_kX_k^\top,\\[10pt]
X_{k+1}&=aX_k+(bA_k+cA_k^2)X_k,\\[10pt]
W_{t+1}&=(1-\eta_t\lambda)W_t-\eta_tX_5.
\end{aligned}
$$

Run the recurrence for $k=0,\ldots,4$, with $a=3.4445$, $b=-4.7750$, and $c=2.0315$. The tiny $\varepsilon$ prevents division by zero. The optional decay $\lambda$ shrinks the old weights separately from the gradient calculation. Set it to zero to recover the update we derived.

This is a minimal Muon step. Practical variants can blend in the current gradient again with Nesterov momentum, scale the update for the matrix shape, or use different polynomial schedules. The [reference implementation](https://github.com/KellerJordan/Muon/blob/master/muon.py) makes those choices explicit. The central operation stays the same: turn the momentum matrix into an approximate polar direction.

@diagram(muon-step) Follow one matrix through memory, normalization, five quintic iterations, and the weight update. Solid arrows show what the current matrix does to the momentum’s two singular input directions v₁ and v₂. Dotted arrows show the exact target Qvᵢ = uᵢ, and the printed gap measures the remaining error. At the last two operations the reference becomes −0.1Q, then W − 0.1Q, so we compare like with like. The ellipse is the current image of the unit circle; the dashed circle has radius 1. Settings: β = 0.8, η = 0.1, λ = 0, no Nesterov blend.

<div class="muon-controls" data-animation="step"><button data-action="play" disabled>Play animation</button><button data-action="restart" disabled>Restart</button><button data-action="previous-step" disabled>← Back</button><button data-action="next-step" disabled>Next →</button><span data-status>Follow one matrix through the whole update.</span></div>

Here $Q=UV^\top$ is the exact polar factor of the momentum matrix, computed as a reference for the illustration. Muon computes $X_5$ instead. The solid arrows approach the dotted ones without landing exactly on them, because five quintic steps leave residual stretch.

Momentum chooses which matrix we trust. Normalization puts its stretches in range. The polynomial reshapes them, and the minus sign turns the result into a weight update. The updated weights themselves need not be orthogonal.

## Same gradients, different optimizers

We have assembled a complete Muon step. To see what its matrix transformation changes, give the same gradient sequence to three update rules.

SGD uses the gradient directly. [Adam](https://arxiv.org/abs/1412.6980) keeps moving averages of both gradients and their elementwise squares, then divides each coordinate by its own estimated scale. [AdamW](https://arxiv.org/abs/1711.05101) adds weight decay separately. Muon rescales the momentum matrix along its singular directions.

Let $R_t$ denote the gradient-driven part before the learning rate and decay:

$$
\begin{aligned}
R_t^{\mathrm{SGD}}&=G_t,\\[10pt]
R_t^{\mathrm{AdamW}}&=\widehat m_t\oslash
\left(\sqrt{\widehat v_t}+\varepsilon\right),\\[10pt]
R_t^{\mathrm{Muon}}&=X_5\approx\operatorname{polar}(M_t).
\end{aligned}
$$

An **entry** is one number in the matrix, such as the number in row 1, column 2. The symbol $\oslash$ means dividing each number by the number in the same position in another matrix. AdamW keeps a separate running scale for each position. For example, if two momentum entries are 4 and 1, and their estimated scales are 4 and 1, their contributions become $4/4=1$ and $1/1=1$. Those scales come from past squared gradients; this is an example of the arithmetic, not a fixed rule that all entries become 1.

That is **entrywise scaling**: rescaling each matrix entry separately. Muon instead uses the matrix's singular directions, which can involve several entries moving together. The next comparison asks whether that distinction changes the path through a loss function.

@diagram(muon-optimizers) Replay the same six supplied gradient matrices through all three methods. Each panel shows the actual step D and its image of the unit circle. The images are divided by each step's Frobenius norm so their shapes fit the same scale; the unscaled norm is printed below. Watch the blue and orange basis arrows as well as the outline. This compares update rules, not training speed or final loss.

<div class="muon-controls" data-animation="optimizers"><button data-action="play" disabled>Play animation</button><button data-action="restart" disabled>Restart</button><button data-action="previous-step" disabled>← Back</button><button data-action="next-step" disabled>Next →</button><span data-status>Same supplied gradients. Watch how each rule reshapes the update.</span></div>

The first gradient has four positive entries. SGD keeps their relative sizes. AdamW's first bias-corrected gradient contribution is nearly the sign of each entry, so it is nearly rank one here. Muon's result keeps both matrix directions active. That difference comes from the rules, before we have trained anything.

The useful conclusion is that Muon gives weaker singular directions room to contribute instead of letting the strongest one dominate the update. That is what the rounder shape shows. It does not mean every step is smaller or gentler. These pictures normalize away the overall size; use the printed norms to compare size. The learning rate still decides how far we move, and a large rate can overshoot.



## Now give them a loss to minimize

The replay showed how the same gradients produce different steps. During training, those steps also change where the next gradient is evaluated. To see that feedback, give all three optimizers an actual loss and let each follow its own path.

Here is a quadratic loss with a narrow valley. In the two matrix directions shown below, it is

$$
L(a,b)=\tfrac12(40a^2+b^2).
$$

The bottom is at $(0,0)$. The loss curves forty times more sharply along $a$ than along $b$. All three methods start at $(1.5,1.5)$, then recompute their gradients at their own new weights. Each curve is an actual optimization run.

Why compare two ways of writing this same valley? AdamW gives each matrix entry its own scale. We want to see whether its behavior changes when one useful movement is spread across several entries instead of stored in just one. Muon's rule uses singular directions, so this is a concrete way to compare what the two rules pay attention to.

Here $a$ measures movement across the steep side of the valley, and $b$ measures movement along its shallow side. The optimizer updates the entries of $W$, not the letters $a$ and $b$ directly. We can encode those two coordinates in $W$ in either of these ways.

**Separate entries.** Put $a$ in the top-left entry and $b$ in the bottom-right entry. Hold $a=1$ and increase only $b$ from 0 to 0.2:

$$
\begin{bmatrix}1&0\\0&0\end{bmatrix}
\quad\longrightarrow\quad
\begin{bmatrix}1&0\\0&0.2\end{bmatrix}.
$$

Only the bottom-right number changes. AdamW's scale for that entry is based on gradients for the shallow movement alone.

**Mixed entries.** Store the same coordinates using $W_{11}=W_{22}=(a+b)/2$ and $W_{12}=W_{21}=(a-b)/2$. Make exactly the same change, $a=1$ and $b:0\to0.2$:

$$
\begin{bmatrix}0.5&0.5\\0.5&0.5\end{bmatrix}
\quad\longrightarrow\quad
\begin{bmatrix}0.6&0.4\\0.4&0.6\end{bmatrix}.
$$

Now the shallow movement needs **all four numbers** to change: add 0.1 on the diagonal and subtract 0.1 off it. Increasing $a$ would instead add to all four entries. Each position therefore participates in both the steep and shallow movements. Its gradient history mixes their contributions, and AdamW's separate scale for that position cannot assign an independent scale to each movement.

The button **Use separate entries for a and b** switches from the second encoding to the first. It changes the formula for $W$ and reruns all three optimizers. It does not change $L(a,b)$, so the bowl itself stays the same. Watch whether the optimizer follows the same path through that bowl. The formula and example matrix above the plots show the selected encoding; the matrices below show the actual weights during the run.

Both encodings start from $a=b=1.5$, which gives $W=1.5I$ in either case. That is why the starting weights look identical even though subsequent updates can differ. With the initial mixed encoding and learning rates, SGD bounces across the steep direction, AdamW makes slow progress along the shallow direction, and Muon gets farther down the valley in 80 steps. Use the switch to test how much of that result depends on the encoding.

@diagram(muon-valley) The left plot shows paths over equal-loss contours. The right plot tracks the actual loss on a logarithmic scale, so small values remain visible. Every point uses the same loss function shown above. Play the run, then try separating the two directions into different matrix entries or raising AdamW’s initial learning rate. Both changes can reverse the ranking. The third plot lifts these same paths onto the loss surface; height is the actual loss. Drag to rotate it, or use the arrow keys. Smooth motion connects computed training steps.

<div class="muon-controls" data-animation="valley"><button data-action="play" disabled>Play animation</button><button data-action="restart" disabled>Restart</button><button data-action="previous-step" disabled>← Back</button><button data-action="next-step" disabled>Next →</button><button data-action="toggle-basis" disabled>Use separate entries for a and b</button><button data-action="adam-rate" disabled>Try AdamW η = 0.32</button><button data-action="zoom-in" disabled>Zoom +</button><button data-action="zoom-out" disabled>Zoom −</button><button data-action="reset-view" disabled>Reset view</button><span data-status>Follow three optimizers. Drag the surface to rotate.</span></div>

Now press **Use separate entries for a and b**. The valley has the same shape, but its directions line up with the individual entries AdamW rescales. AdamW becomes much faster; SGD and Muon follow the same paths as before. Or keep the mixed basis and raise AdamW's learning rate to $0.32$. It catches up and finishes below Muon. AdamW has declined our invitation to be deprecated.

Muon responds to the matrix's coupled directions, so rotating this example does not change its path in valley coordinates. That is a precise sense in which its update follows the matrix geometry. Calling it "more natural" is less useful than seeing which changes of coordinates leave its behavior intact.

There is only one minimum in this quadratic bowl. None of these paths demonstrates escaping a local minimum. At a point with zero gradient and no stored momentum, Muon also has no direction to follow. Momentum can carry an optimizer through a flat or turning region, but replacing singular values by one does not by itself guarantee escape.

The test answers the question we started with. Here, changing how the two movements are distributed across matrix entries changes AdamW's path, while SGD and Muon keep the same paths in the valley. AdamW scales those entries separately; Muon rescales the singular directions that combine them. The learning-rate control also shows that this difference does not establish a universal winner. We count training steps here; a Muon step does more work, so these curves do not measure wall-clock speed.

<details class="muon-aside" id="valley-settings">
<summary>The matrix loss, gradients, and exact settings</summary>

The full problem has a $2\times2$ weight matrix:

$$
\begin{aligned}
L(W)&=\tfrac12\operatorname{tr}(W^\top H W),\\[10pt]
G&=HW,\\[10pt]
H&=B\begin{bmatrix}40&0\\0&1\end{bmatrix}B^\top.
\end{aligned}
$$

The mixed basis uses $B=\tfrac1{\sqrt2}\begin{bmatrix}1&-1\\1&1\end{bmatrix}$; the aligned basis uses $B=I$. All methods start at $W_0=1.5I$. For these two choices of $B$, their iterates stay in the slice $W=B\operatorname{diag}(a,b)B^\top$. Substitution gives the two-dimensional loss plotted above. The code updates all four matrix entries, then reads off $a$ and $b$.

SGD has no momentum and starts with learning rate $0.04$. AdamW starts at $0.08$ or $0.32$, with $\beta_1=0.8$, $\beta_2=0.9$ and $\varepsilon=10^{-8}$. Muon starts at $0.08$, with $\beta=0.8$, five quintic iterations and $\varepsilon=10^{-7}$, without Nesterov or a shape multiplier. Every method has zero weight decay, so AdamW is equivalent to Adam in this example. Momentum histories start at zero; AdamW applies bias correction.

Each method scales its initial rate by the same schedule over 80 training steps:

$$
\eta_t=\eta_0\left[0.1+0.45\left(1+\cos\frac{\pi t}{80}\right)\right].
$$

Here $t=0,\ldots,79$. These settings make the geometric effect visible. The basis and learning-rate controls let us test how fragile any claim about the winner would be. The five inner polynomial iterations belong to each Muon training step; they are a different count from the 80 steps on the horizontal axis.

</details>

That is the optimizer we set out to invent. Use the local loss prediction to choose a direction, decide what "small" means for a matrix, remember recent gradients, and approximate the resulting polar transform cheaply. The remaining question is how well those choices work on the model we actually want to train.

<div id="what-we-just-built-and-where-to-go-next" class="section-alias" aria-hidden="true"></div>

## Where these choices came from

We reconstructed the update by choosing a loss prediction, an output-change budget, a gradient average, and a short polynomial calculation. That is a route to understanding the method. For its historical development and experimental results:

- [Keller Jordan's original Muon writeup](https://kellerjordan.github.io/posts/muon/) describes the optimizer and its early experiments. Start here for the original account.
- [Modular Duality in Deep Learning](https://proceedings.mlr.press/v267/bernstein25a.html), by Bernstein and Newhouse, develops the broader norm-based framework and matrix iterations behind this route.
- [Muon is Scalable for LLM Training](https://arxiv.org/abs/2502.16982), by Liu and collaborators, studies weight decay, update scaling, distributed implementation, and the Moonlight models.
- [Practical Efficiency of Muon for Pretraining](https://arxiv.org/abs/2505.02222), by Essential AI, examines compute versus wall-clock time, large batches, and hyperparameter transfer with μP.
- [The Polar Express](https://arxiv.org/abs/2505.16932), by Amsel and collaborators, designs iteration-dependent polynomials for faster polar approximation and addresses low-precision computation.

If I had to rebuild the argument, I'd start with $Dx$: how much should one update be allowed to change the layer's output?

<script src="/vendor/katex/katex.min.js"></script>
<script type="module" src="/muon-animations.js"></script>

