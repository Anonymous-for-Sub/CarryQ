"""Encode a user-supplied .npy action trajectory; no simulator is required."""

import argparse
from pathlib import Path

import numpy as np

from carryq import (
    FrozenCodebook, decode_actions, decode_actions_error_feedback,
    quantize_action_error_feedback, quantize_action_error_feedback_grid,
    quantize_progressive, quantize_uniform_grid,
)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--interface", choices=["midpoint", "endpoint", "vector"], default="midpoint")
    parser.add_argument("--method", choices=["carryq", "memoryless"], default="carryq")
    parser.add_argument("--bits", type=int, default=4)
    parser.add_argument("--low", type=float, default=-1.0)
    parser.add_argument("--high", type=float, default=1.0)
    parser.add_argument("--reset-interval", type=int, default=8)
    parser.add_argument("--passthrough", type=int, nargs="*", default=[])
    parser.add_argument("--codebook", type=Path, help="Required for vector encoding; .npy centers")
    args = parser.parse_args()
    if args.output.exists():
        parser.error("output exists; choose a new filename")
    if args.output.suffix != ".npy":
        parser.error("output must end in .npy")
    if not 1 <= args.bits <= 30 or args.reset_interval < 1:
        parser.error("bits must be in [1, 30] and reset-interval must be positive")
    if args.interface == "endpoint" and args.bits > 20:
        parser.error("endpoint CLI limits bits to 20 to bound grid memory")
    actions = np.load(args.input, allow_pickle=False)
    if actions.ndim != 2 or actions.shape[1] == 0 or not np.all(np.isfinite(actions)):
        parser.error("input must be a finite [steps, dimensions] array")
    if len(set(args.passthrough)) != len(args.passthrough) or any(
        d < 0 or d >= actions.shape[1] for d in args.passthrough
    ):
        parser.error("passthrough indices must be unique and in range")
    bounds = dict(low=args.low, high=args.high)
    if args.interface == "vector":
        if args.codebook is None:
            parser.error("vector encoding requires --codebook")
        dimensions = [d for d in range(actions.shape[1]) if d not in args.passthrough]
        model = FrozenCodebook(np.load(args.codebook, allow_pickle=False))
        motion = actions[:, dimensions]
        if args.method == "carryq":
            motion = decode_actions_error_feedback(
                model, motion, reset_interval=args.reset_interval, **bounds,
            )
        else:
            motion = decode_actions(model, motion)
        decoded = actions.astype(np.float64, copy=True)
        decoded[:, dimensions] = motion
    else:
        if args.interface == "midpoint":
            encode, memoryless = quantize_action_error_feedback, quantize_progressive
            rate = dict(bits=args.bits)
        else:
            encode, memoryless = quantize_action_error_feedback_grid, quantize_uniform_grid
            rate = dict(num_bins=2**args.bits)
        if args.method == "carryq":
            decoded = encode(actions, **rate, **bounds, reset_interval=args.reset_interval,
                             passthrough_dimensions=args.passthrough)
        else:
            decoded = memoryless(actions, **rate, **bounds)
            decoded[:, args.passthrough] = actions[:, args.passthrough]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("xb") as handle:
        np.save(handle, decoded, allow_pickle=False)
    print(f"Saved {decoded.shape[0]} decoded commands to {args.output}")


if __name__ == "__main__":
    main()
