import numpy as np
import pytest

from carryq import FrozenCodebook, decode_actions, decode_actions_error_feedback


def test_lookup_tokens_and_ties():
    model = FrozenCodebook([[-0.5, 0], [0.5, 0]])
    np.testing.assert_array_equal(model.predict([[0, 0], [0.3, 0]]), [0, 1])
    np.testing.assert_array_equal(decode_actions(model, [[0.3, 0]]), [[0.5, 0]])


def test_centers_are_copied_and_readonly():
    centers = np.array([[-0.5], [0.5]])
    model = FrozenCodebook(centers)
    centers[:] = 0
    np.testing.assert_array_equal(model.cluster_centers_, [[-0.5], [0.5]])
    with pytest.raises(ValueError):
        model.cluster_centers_[0] = 1


def test_vector_feedback_recurrence_and_no_scalar_clip():
    model = FrozenCodebook([[-0.5], [0.5]])
    actions = np.full((4, 1), 0.1)
    decoded = decode_actions_error_feedback(model, actions, low=-1, high=1)
    np.testing.assert_array_equal(decoded[:, 0], [0.5, -0.5, 0.5, -0.5])


def test_vector_saturation_and_chunk_reset():
    model = FrozenCodebook([[-0.5], [0.5]])
    actions = np.array([[3.0], [0.0], [0.1], [0.1], [0.1]])
    chunked = decode_actions_error_feedback(model, actions, low=-1, high=1, reset_interval=2)
    separate = np.concatenate([
        decode_actions_error_feedback(model, actions[t:t+2], low=-1, high=1)
        for t in range(0, len(actions), 2)
    ])
    np.testing.assert_array_equal(chunked, separate)
    assert chunked[1, 0] == 0.5


def test_empty_and_invalid_codebook():
    model = FrozenCodebook([[-0.5], [0.5]])
    assert decode_actions_error_feedback(model, np.empty((0, 1)), low=-1, high=1).shape == (0, 1)
    assert decode_actions(model, np.empty((0, 1))).shape == (0, 1)
    with pytest.raises(ValueError):
        model.predict([[1, 2]])
    for invalid in [[], [[np.nan]], [[np.inf]]]:
        with pytest.raises(ValueError):
            FrozenCodebook(invalid)
