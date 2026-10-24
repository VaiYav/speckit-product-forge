> Reference for `experiment-design` Step 3 — per-variant sample-size formulas. Use the one that matches the primary metric's type.

Inputs: baseline `p0` (or mean), `MDE` from the hypothesis, power `1 - β`
(default 0.8), significance `α` (default 0.05, two-sided).

## (a) Two-proportion z-test — conversion / rate metrics

```
n = ( z_{α/2} * sqrt(2 * p_bar * (1 - p_bar))
      + z_{β}   * sqrt(p0 * (1 - p0) + p1 * (1 - p1)) )^2
    / (p1 - p0)^2

where:
  p0    = baseline rate
  p1    = p0 + MDE   (if MDE is absolute)   OR   p0 * (1 + MDE)  (if MDE is relative)
  p_bar = (p0 + p1) / 2
  z_{α/2} ≈ 1.96 for α = 0.05 two-sided
  z_{β}   ≈ 0.84 for power = 0.80
```

## (b) Welch two-sample t-test — continuous metrics (means, durations)

```
n = 2 * ( (z_{α/2} + z_{β}) * σ / Δ )^2

where:
  σ = pooled standard deviation of the metric (from historical data)
  Δ = MDE in absolute units
```

For non-normal continuous metrics (latency, revenue-per-user), use the
log-transformed value or apply a non-parametric adjustment, and document the
choice in the experiment plan.
