import numpy as np


def test_progressive_quantizer_decodes_dyadic_cell_centers_and_clips():
    """Catches off-by-one bins and endpoint overflow in prefix decoding."""
    from carryq.quantization import quantize_progressive

    actions = np.array([-2.0, -1.0, -0.75, -0.01, 0.0, 0.99, 1.0, 2.0])

    decoded = quantize_progressive(actions, bits=2, low=-1.0, high=1.0)

    np.testing.assert_allclose(
        decoded,
        np.array([-0.75, -0.75, -0.75, -0.25, 0.25, 0.75, 0.75, 0.75]),
    )


def test_action_schedule_uses_each_steps_depth_and_preserves_gripper():
    """Catches applying one global depth or quantizing the binary gripper."""
    from carryq.quantization import quantize_action_schedule

    actions = np.array([[0.1, -0.6, -1.0], [0.1, -0.6, 1.0]])

    decoded = quantize_action_schedule(
        actions,
        bits=np.array([1, 2]),
        low=-1.0,
        high=1.0,
        passthrough_dimensions=[2],
    )

    np.testing.assert_allclose(
        decoded, np.array([[0.5, -0.5, -1.0], [0.25, -0.75, 1.0]])
    )


def test_error_feedback_quantization_reduces_cumulative_delta_drift():
    from carryq.quantization import quantize_action_error_feedback

    actions = np.full((4, 1), 0.1)
    memoryless = np.full((4, 1), 0.25)

    decoded = quantize_action_error_feedback(actions, bits=2, low=-1.0, high=1.0)

    assert abs(float(decoded.sum() - actions.sum())) < abs(
        float(memoryless.sum() - actions.sum())
    )


def test_error_feedback_preserves_passthrough_dimension_exactly():
    from carryq.quantization import quantize_action_error_feedback

    actions = np.array([[0.1, -1.0], [0.1, 1.0], [0.1, -1.0]])
    decoded = quantize_action_error_feedback(
        actions,
        bits=2,
        low=-1.0,
        high=1.0,
        passthrough_dimensions=[1],
    )

    np.testing.assert_array_equal(decoded[:, 1], actions[:, 1])


def test_error_feedback_can_reset_at_policy_chunk_boundaries():
    from carryq.quantization import quantize_action_error_feedback

    actions = np.full((8, 1), 0.1)
    chunked = quantize_action_error_feedback(
        actions, bits=2, low=-1.0, high=1.0, reset_interval=4
    )
    separate = np.concatenate(
        [
            quantize_action_error_feedback(part, bits=2, low=-1.0, high=1.0)
            for part in np.split(actions, 2)
        ]
    )

    np.testing.assert_array_equal(chunked, separate)


def test_uniform_grid_endpoint_definition():
    from carryq.quantization import quantize_uniform_grid

    values = np.array([-2.0, -1.0, -0.75, -0.25, 0.0, 0.25, 0.75, 1.0, 2.0])

    decoded = quantize_uniform_grid(values, num_bins=5, low=-1.0, high=1.0)

    np.testing.assert_allclose(
        decoded,
        np.array([-1.0, -1.0, -1.0, -0.5, 0.0, 0.0, 0.5, 1.0, 1.0]),
    )


def test_uniform_grid_error_feedback_zero_strength_is_memoryless():
    from carryq.quantization import (
        quantize_action_error_feedback_grid,
        quantize_uniform_grid,
    )

    actions = np.linspace(-1.2, 1.2, num=32).reshape(16, 2)
    memoryless = quantize_uniform_grid(actions, num_bins=8, low=-1.0, high=1.0)
    decoded = quantize_action_error_feedback_grid(
        actions,
        num_bins=8,
        low=-1.0,
        high=1.0,
        feedback_strength=0.0,
        reset_interval=8,
    )

    np.testing.assert_array_equal(decoded, memoryless)


def test_uniform_grid_error_feedback_reduces_chunk_endpoint_drift():
    from carryq.quantization import (
        quantize_action_error_feedback_grid,
        quantize_uniform_grid,
    )

    actions = np.full((8, 1), 0.24)
    memoryless = quantize_uniform_grid(actions, num_bins=5, low=-1.0, high=1.0)
    decoded = quantize_action_error_feedback_grid(
        actions, num_bins=5, low=-1.0, high=1.0, reset_interval=8
    )

    assert abs(float(np.sum(decoded - actions))) < 0.1 * abs(
        float(np.sum(memoryless - actions))
    )


def test_uniform_grid_error_feedback_preserves_passthrough_dimension():
    from carryq.quantization import quantize_action_error_feedback_grid

    actions = np.array([[0.24, -1.0], [0.24, 1.0], [0.24, -1.0]])
    decoded = quantize_action_error_feedback_grid(
        actions,
        num_bins=5,
        low=-1.0,
        high=1.0,
        passthrough_dimensions=[1],
        reset_interval=8,
    )

    np.testing.assert_array_equal(decoded[:, 1], actions[:, 1])


def test_uniform_grid_feedback_exempt_dimension_keeps_memoryless_decode():
    from carryq.quantization import (
        quantize_action_error_feedback_grid,
        quantize_uniform_grid,
    )

    actions = np.full((8, 2), 0.24)
    decoded = quantize_action_error_feedback_grid(
        actions,
        num_bins=5,
        low=-1.0,
        high=1.0,
        feedback_exempt_dimensions=[1],
        reset_interval=8,
    )
    memoryless = quantize_uniform_grid(actions, num_bins=5, low=-1.0, high=1.0)

    assert not np.array_equal(decoded[:, 0], memoryless[:, 0])
    np.testing.assert_array_equal(decoded[:, 1], memoryless[:, 1])
