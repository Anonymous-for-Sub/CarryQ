"""Residual feedback for an unchanged nearest-centroid vector codebook."""

from __future__ import annotations

from typing import Protocol

import numpy as np

from .quantization import _actions, _bounds


class Codebook(Protocol):
    """Interface also satisfied by a fitted sklearn KMeans model."""

    cluster_centers_: np.ndarray

    def predict(self, actions: np.ndarray) -> np.ndarray: ...


class FrozenCodebook:
    """A fixed codebook loaded from an array of shape [codes, dimensions].

    Euclidean nearest-centroid lookup; exact ties select the first centroid.
    Fitting a codebook is deliberately separate from encoding.
    """

    def __init__(self, centers: np.ndarray):
        centers = np.array(centers, dtype=np.float64, copy=True)
        if centers.ndim != 2 or min(centers.shape) < 1 or not np.all(np.isfinite(centers)):
            raise ValueError("centers must be a finite nonempty [codes, dimensions] array")
        centers.flags.writeable = False
        self.cluster_centers_ = centers

    def predict(self, actions: np.ndarray) -> np.ndarray:
        actions = np.asarray(actions, dtype=np.float64)
        _actions(actions, None)
        if actions.shape[1] != self.cluster_centers_.shape[1]:
            raise ValueError("action dimensions must match the codebook")
        # Row-wise lookup avoids a [steps, codes, dimensions] allocation.
        return np.asarray([
            np.argmin(np.sum((self.cluster_centers_ - action) ** 2, axis=1))
            for action in actions
        ], dtype=np.int64)


def decode_actions(model: Codebook, actions: np.ndarray) -> np.ndarray:
    """Memoryless nearest-centroid encoding followed by the fixed decoder."""
    actions = np.asarray(actions, dtype=np.float64)
    _actions(actions, None)
    return np.asarray(model.cluster_centers_[model.predict(actions)], dtype=np.float64)


def decode_actions_error_feedback(
    model: Codebook,
    actions: np.ndarray,
    *,
    low: float | np.ndarray,
    high: float | np.ndarray,
    reset_interval: int | None = None,
) -> np.ndarray:
    """Encode with range-clipped adjusted actions and a frozen vector decoder.

    Unlike scalar encoding, no half-grid clipping is applied to the residual.
    Pass motion coordinates only; handle categorical gripper commands separately.
    """
    actions = np.asarray(actions, dtype=np.float64)
    _actions(actions, reset_interval)
    low_array = np.broadcast_to(np.asarray(low, dtype=np.float64), actions.shape[1:])
    high_array = np.broadcast_to(np.asarray(high, dtype=np.float64), actions.shape[1:])
    _bounds(low_array, high_array)
    residual = np.zeros(actions.shape[1], dtype=np.float64)
    decoded = np.empty_like(actions)
    centers = np.asarray(model.cluster_centers_, dtype=np.float64)
    for step, action in enumerate(actions):
        if reset_interval is not None and step % reset_interval == 0:
            residual.fill(0.0)
        adjusted = np.clip(action + residual, low_array, high_array)
        code = int(model.predict(adjusted[None])[0])
        decoded[step] = centers[code]
        residual = adjusted - decoded[step]
    return decoded
