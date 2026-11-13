# API reference

All encoders accept finite NumPy-compatible arrays and return float64 decoded
commands. A trajectory has shape `[T, D]`. Inputs are not modified. Empty
trajectories with shape `[0, D]` are allowed. Normalization is the caller's
responsibility.

## Midpoint scalar grid

```python
quantize_progressive(values, *, bits, low, high)
quantize_action_error_feedback(
    actions, *, bits, low, high,
    passthrough_dimensions=(), reset_interval=None,
)
```

`bits` is an integer from 1 to 30. Bounds can be scalars or per-coordinate
arrays. There are `2**bits` bins of width
`delta = (high - low) / 2**bits`, with centers `low + (i + 0.5) * delta`.
Inputs outside the range saturate; an exact interior boundary selects the
upper bin. The name `quantize_progressive` refers to this dyadic midpoint grid.

CarryQ uses the following coordinatewise update:

```text
residual = 0
for each action in the current chunk:
    adjusted = action + residual
    decoded = quantize(adjusted)
    residual = clip(adjusted - decoded, -delta / 2, delta / 2)
```

For `passthrough_dimensions`, keep the original command and zero its residual.
The optional `quantize_action_schedule(actions, bits=..., low=..., high=...)`
applies memoryless quantization with one bit depth per row; it is not needed
for fixed-rate encoding.

## Endpoint-inclusive scalar grid

```python
quantize_uniform_grid(values, *, num_bins, low, high)
quantize_action_error_feedback_grid(
    actions, *, num_bins, low, high, feedback_strength=1.0,
    passthrough_dimensions=(), feedback_exempt_dimensions=(),
    reset_interval=None,
)
```

`num_bins >= 2`; `low` and `high` are scalar bounds. Centers include both
endpoints, with spacing `(high - low) / (num_bins - 1)`. Exact midpoint ties
select the lower bin. For a power-of-two vocabulary, use `num_bins=2**bits`.

`feedback_strength=1` is the standard feedback update. Zero gives memoryless
encoding; other nonnegative values scale the carried residual before addition.
Residual clipping still uses half a grid step. `feedback_exempt_dimensions`
are quantized but carry no residual, whereas `passthrough_dimensions` bypass
quantization entirely.

This float64 NumPy implementation is not a replacement for the float32
tokenization and normalization behavior of a particular model runtime.

## Frozen vector codebook

```python
model = FrozenCodebook(centers)
tokens = model.predict(actions)
decoded = decode_actions(model, actions)
decoded = decode_actions_error_feedback(
    model, actions, low=-1.0, high=1.0, reset_interval=8,
)
```

`centers` has shape `[M, D]`. Lookup uses Euclidean distance; ties choose the
first center. `FrozenCodebook` copies the centers and makes its array read-only.
A fitted model exposing `cluster_centers_` and `predict` (such as sklearn
KMeans) can also be supplied. There is no training step inside the encoder.

The feedback recurrence is:

```text
adjusted = clip(action + residual, low, high)
token = model.predict(adjusted)
decoded = centers[token]
residual = adjusted - decoded
```

The vector residual has **no scalar half-grid clip**. Supply motion coordinates
to this API and join categorical channels back afterward. An `M`-entry
codebook represents the whole supplied vector, not each coordinate separately.

## Reset behavior

Every call initializes its residual to zero. `reset_interval=None` carries it
through all rows in that call. A positive interval additionally clears it
before rows `0, interval, 2*interval, ...`. A final partial chunk is processed
at its actual length. No residual state is kept between calls.
