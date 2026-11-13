"""Memoryless scalar quantizers and chunk-local residual-feedback encoding.

All functions return decoded commands in float64, not token IDs. Bounds and
commands must use the same coordinate system and normalization.
"""

from __future__ import annotations

import numpy as np


def _positive_integer(value: int, name: str) -> None:
    if isinstance(value, (bool, np.bool_)) or not isinstance(value, (int, np.integer)) or value < 1:
        raise ValueError(f"{name} must be a positive integer")


def _bounds(low: np.ndarray, high: np.ndarray) -> None:
    if not np.all(np.isfinite(low)) or not np.all(np.isfinite(high)) or np.any(high <= low):
        raise ValueError("bounds must be finite with high > low in every coordinate")


def _actions(actions: np.ndarray, reset_interval: int | None, *dimension_lists) -> None:
    if actions.ndim != 2 or actions.shape[1] == 0 or not np.all(np.isfinite(actions)):
        raise ValueError("actions must be a finite [steps, dimensions] array with dimensions > 0")
    if reset_interval is not None:
        _positive_integer(reset_interval, "reset_interval")
    for dimensions in dimension_lists:
        if any(isinstance(d, (bool, np.bool_)) or not isinstance(d, (int, np.integer))
               or d < 0 or d >= actions.shape[1] for d in dimensions):
            raise ValueError("dimension indices must be integers in [0, dimensions)")
        if len(set(dimensions)) != len(dimensions):
            raise ValueError("dimension indices must be unique")


def quantize_action_schedule(
    actions: np.ndarray,
    *,
    bits: np.ndarray,
    low: float | np.ndarray,
    high: float | np.ndarray,
    passthrough_dimensions: list[int] | tuple[int, ...] = (),
) -> np.ndarray:
    """Quantize every action row at its allocated progressive depth."""
    actions = np.asarray(actions, dtype=np.float64)
    _actions(actions, None, passthrough_dimensions)
    raw_bits = np.asarray(bits)
    if raw_bits.dtype.kind not in "iu" or np.any(raw_bits < 1):
        raise ValueError("bits must contain positive integers")
    bits = np.asarray(bits, dtype=np.int64)
    if actions.ndim != 2 or bits.shape != (actions.shape[0],):
        raise ValueError("actions must be [steps, dims] and bits must be [steps]")
    decoded = np.empty_like(actions)
    for depth in np.unique(bits):
        mask = bits == depth
        decoded[mask] = quantize_progressive(
            actions[mask], bits=int(depth), low=low, high=high
        )
    if passthrough_dimensions:
        decoded[:, list(passthrough_dimensions)] = actions[
            :, list(passthrough_dimensions)
        ]
    return decoded


def quantize_action_error_feedback(
    actions: np.ndarray,
    *,
    bits: int,
    low: float | np.ndarray,
    high: float | np.ndarray,
    passthrough_dimensions: list[int] | tuple[int, ...] = (),
    reset_interval: int | None = None,
) -> np.ndarray:
    """Encode midpoint-grid commands with half-bin-clipped residual feedback.

    Residual state starts at zero on every call and at each reset interval.
    Passthrough coordinates retain their original values and carry no residual.
    """
    actions = np.asarray(actions, dtype=np.float64)
    _actions(actions, reset_interval, passthrough_dimensions)
    _positive_integer(bits, "bits")
    if bits > 30:
        raise ValueError("bits must be <= 30")
    if actions.ndim != 2:
        raise ValueError("actions must have shape [steps, dimensions]")
    if reset_interval is not None and reset_interval <= 0:
        raise ValueError("reset_interval must be positive when provided")
    low_array = np.broadcast_to(np.asarray(low, dtype=np.float64), actions.shape[1:])
    high_array = np.broadcast_to(np.asarray(high, dtype=np.float64), actions.shape[1:])
    _bounds(low_array, high_array)
    half_step = 0.5 * (high_array - low_array) / (1 << int(bits))
    passthrough = np.asarray(passthrough_dimensions, dtype=np.int64)
    residual = np.zeros(actions.shape[1], dtype=np.float64)
    decoded = np.empty_like(actions)
    for step, action in enumerate(actions):
        if reset_interval is not None and step % reset_interval == 0:
            residual.fill(0.0)
        adjusted = action + residual
        decoded[step] = quantize_progressive(
            adjusted, bits=int(bits), low=low_array, high=high_array
        )
        residual = np.clip(adjusted - decoded[step], -half_step, half_step)
        if passthrough.size:
            decoded[step, passthrough] = action[passthrough]
            residual[passthrough] = 0.0
    return decoded


def quantize_progressive(
    values: np.ndarray,
    *,
    bits: int,
    low: float | np.ndarray,
    high: float | np.ndarray,
) -> np.ndarray:
    """Memoryless midpoint-grid quantization with ``2**bits`` levels.

    Saturate to bounds; exact interior boundaries select the upper bin.
    Bounds may be scalars or broadcastable per-coordinate arrays.
    """
    values = np.asarray(values, dtype=np.float64)
    _positive_integer(bits, "bits")
    if bits > 30:
        raise ValueError("bits must be <= 30")
    if not np.all(np.isfinite(values)):
        raise ValueError("values must be finite")
    low = np.asarray(low, dtype=np.float64)
    high = np.asarray(high, dtype=np.float64)
    _bounds(low, high)
    levels = 1 << bits
    unit = np.clip((values - low) / (high - low), 0.0, 1.0)
    indices = np.minimum(np.floor(unit * levels).astype(np.int64), levels - 1)
    return low + (indices + 0.5) * (high - low) / levels


def quantize_uniform_grid(
    values: np.ndarray,
    *,
    num_bins: int,
    low: float,
    high: float,
) -> np.ndarray:
    """Memoryless endpoint-inclusive grid; exact midpoint ties select lower bins.

    This NumPy reference uses float64, not a model-specific tokenizer runtime.
    """
    values = np.asarray(values, dtype=np.float64)
    _positive_integer(num_bins, "num_bins")
    _bounds(np.asarray(low), np.asarray(high))
    if not np.all(np.isfinite(values)):
        raise ValueError("values must be finite")
    if num_bins < 2:
        raise ValueError(f"num_bins must be >= 2, got {num_bins}")
    if high <= low:
        raise ValueError(f"high must be greater than low, got low={low}, high={high}")
    centers = np.linspace(float(low), float(high), int(num_bins), dtype=np.float64)
    boundaries = 0.5 * (centers[:-1] + centers[1:])
    indices = np.searchsorted(boundaries, np.clip(values, low, high), side="left")
    return centers[indices]


def quantize_action_error_feedback_grid(
    actions: np.ndarray,
    *,
    num_bins: int,
    low: float,
    high: float,
    feedback_strength: float = 1.0,
    passthrough_dimensions: list[int] | tuple[int, ...] = (),
    feedback_exempt_dimensions: list[int] | tuple[int, ...] = (),
    reset_interval: int | None = None,
) -> np.ndarray:
    """Encode endpoint-grid commands with chunk-local residual feedback.

    Feedback-exempt coordinates are quantized independently. Passthrough
    coordinates are not quantized. With strength zero this is memoryless.
    """
    actions = np.asarray(actions, dtype=np.float64)
    _actions(actions, reset_interval, passthrough_dimensions, feedback_exempt_dimensions)
    _positive_integer(num_bins, "num_bins")
    _bounds(np.asarray(low), np.asarray(high))
    if not np.isfinite(feedback_strength):
        raise ValueError("feedback_strength must be finite")
    if actions.ndim != 2:
        raise ValueError("actions must have shape [steps, dimensions]")
    if feedback_strength < 0.0:
        raise ValueError("feedback_strength must be non-negative")
    if reset_interval is not None and reset_interval <= 0:
        raise ValueError("reset_interval must be positive when provided")
    if num_bins < 2:
        raise ValueError(f"num_bins must be >= 2, got {num_bins}")
    if high <= low:
        raise ValueError(f"high must be greater than low, got low={low}, high={high}")

    half_step = 0.5 * (float(high) - float(low)) / (int(num_bins) - 1)
    passthrough = np.asarray(passthrough_dimensions, dtype=np.int64)
    feedback_exempt = np.asarray(feedback_exempt_dimensions, dtype=np.int64)
    residual = np.zeros(actions.shape[1], dtype=np.float64)
    decoded = np.empty_like(actions)
    for step, action in enumerate(actions):
        if reset_interval is not None and step % reset_interval == 0:
            residual.fill(0.0)
        adjusted = action + float(feedback_strength) * residual
        decoded[step] = quantize_uniform_grid(
            adjusted, num_bins=num_bins, low=low, high=high
        )
        residual = np.clip(adjusted - decoded[step], -half_step, half_step)
        if passthrough.size:
            decoded[step, passthrough] = action[passthrough]
            residual[passthrough] = 0.0
        if feedback_exempt.size:
            residual[feedback_exempt] = 0.0
    return decoded
