import numpy as np
import pytest

from carryq import quantize_action_error_feedback, quantize_action_error_feedback_grid, quantize_progressive


@pytest.mark.parametrize("bits", [0, -1, 1.5, True, 31])
def test_invalid_bit_depth(bits):
    with pytest.raises(ValueError):
        quantize_progressive([0.1], bits=bits, low=-1, high=1)


@pytest.mark.parametrize("reset", [0, -1, 1.5, True])
def test_invalid_reset(reset):
    with pytest.raises(ValueError):
        quantize_action_error_feedback([[0.1]], bits=4, low=-1, high=1, reset_interval=reset)


@pytest.mark.parametrize("low,high", [(1, 1), (1, -1), (np.nan, 1), (-1, np.inf)])
def test_invalid_bounds(low, high):
    with pytest.raises(ValueError):
        quantize_action_error_feedback([[0.1]], bits=4, low=low, high=high)


@pytest.mark.parametrize("dims", [(-1,), (2,), (0, 0), (0.5,)])
def test_invalid_passthrough(dims):
    with pytest.raises(ValueError):
        quantize_action_error_feedback([[0.1, 0.2]], bits=4, low=-1, high=1, passthrough_dimensions=dims)


def test_partial_chunks_per_coordinate_bounds_and_input_unchanged():
    actions = np.random.default_rng(0).uniform(-2, 2, (19, 3))
    original = actions.copy()
    kwargs = dict(bits=4, low=np.array([-1, -2, -3]), high=np.array([1, 2, 3]))
    decoded = quantize_action_error_feedback(actions, reset_interval=8, **kwargs)
    separate = np.concatenate([
        quantize_action_error_feedback(actions[t:t+8], **kwargs) for t in range(0, 19, 8)
    ])
    np.testing.assert_array_equal(decoded, separate)
    np.testing.assert_array_equal(actions, original)


def test_single_action_and_empty_chunk():
    actions = np.array([[0.13, -0.24]])
    kwargs = dict(bits=4, low=-1, high=1)
    np.testing.assert_array_equal(quantize_action_error_feedback(actions, **kwargs),
                                  quantize_progressive(actions, **kwargs))
    assert quantize_action_error_feedback(np.empty((0, 2)), **kwargs).shape == (0, 2)


def test_reject_nonfinite():
    for value in [np.nan, np.inf]:
        with pytest.raises(ValueError):
            quantize_action_error_feedback([[value]], bits=4, low=-1, high=1)
        with pytest.raises(ValueError):
            quantize_action_error_feedback_grid([[0.1]], num_bins=16, low=-1, high=1,
                                               feedback_strength=value)
