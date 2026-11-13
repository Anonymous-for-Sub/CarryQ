# Integrating an action encoder

CarryQ sits between a known continuous action source and an existing action
decoder. It changes token selection, not the policy backbone or decoder.

## 1. Establish the action contract

Identify the coordinate frame, normalization, valid range and channel types
before selecting an encoder. Bounds and actions must be in the same units.
For additive translation increments, summing command errors has an additive
interpretation. Absolute joint targets and rotations have different semantics;
do not interpret their simple sums as an end-effector displacement.

Use the model's existing grid, codebook and decoder. The midpoint and endpoint
grids in this package are distinct interfaces, not interchangeable settings.
Keep the same encoder precision and boundary tie behavior when connecting to
a native tokenizer. For example, a native Praxis BinTokenizer integration must
retain its normalization, float32 bin centers, token ordering and detokenizer;
the float64 NumPy endpoint-grid reference alone does not reproduce that runtime.

## 2. Choose the execution window

Call the encoder once per action query, or use `reset_interval` to reproduce
chunk boundaries in an offline trajectory. Preserve the policy's prediction
horizon and actual executed prefix.

```python
# Schematic policy integration; policy and controller are supplied by you.
source_chunk = policy.predict(observation)
decoded_chunk = quantize_action_error_feedback(
    source_chunk, bits=4, low=-1.0, high=1.0,
    passthrough_dimensions=(6,),
)
controller.execute(decoded_chunk[:executed_steps])
```

There is no cross-query carry in these APIs. Do not feed a residual from an
unexecuted plan tail into the next query. With a query reset and only one
executed action, the first action has zero carried residual.

## 3. Preserve categorical handling

Choose channel handling from the existing interface:

- **Passthrough:** preserve the original categorical command and clear its
  residual (`passthrough_dimensions`).
- **Memoryless quantization:** retain the grid decoder for that channel but
  clear its residual (`feedback_exempt_dimensions` on the endpoint-grid API).
- **Vector codebook:** encode only the motion subvector and reattach the
  categorical channels afterward.

Do not assume all policies store a gripper command in the last coordinate.
The seven-dimensional example is a convention, not a required layout.

## 4. Keep the policy and controller unchanged

Apply memoryless and feedback encoders to the same source for an offline
comparison. For online use, each policy branch receives its own observations
after execution. This package does not provide a simulator, trained VLA or
robot driver; use the corresponding upstream installation.

Before hardware use, validate action limits, workspace constraints and the
controller's existing safety checks. The encoder operates on command residuals;
it does not measure physical tracking error or replace robot safety controls.
