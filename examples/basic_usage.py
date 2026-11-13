"""CPU-only examples for the three action encoding interfaces."""

import numpy as np

from carryq import (
    FrozenCodebook,
    decode_actions_error_feedback,
    quantize_action_error_feedback,
    quantize_action_error_feedback_grid,
)


def main():
    actions = np.zeros((8, 7))
    actions[:, 0] = 0.02
    actions[:, 6] = 1.0
    midpoint = quantize_action_error_feedback(
        actions, bits=4, low=-1.0, high=1.0,
        passthrough_dimensions=(6,), reset_interval=8,
    )
    endpoint = quantize_action_error_feedback_grid(
        actions, num_bins=16, low=-1.0, high=1.0,
        feedback_exempt_dimensions=(6,), reset_interval=8,
    )
    # Small illustrative codebook, not a trained policy or benchmark asset.
    centers = np.zeros((3, 6))
    centers[:, 0] = [-0.1, 0.0, 0.1]
    model = FrozenCodebook(centers)
    motion = decode_actions_error_feedback(
        model, actions[:, :6], low=-1.0, high=1.0, reset_interval=8,
    )
    vector = np.concatenate([motion, actions[:, 6:]], axis=1)
    for name, decoded in [("midpoint", midpoint), ("endpoint", endpoint), ("vector", vector)]:
        print(f"{name}: decoded shape={decoded.shape}, dtype={decoded.dtype}")


if __name__ == "__main__":
    main()
