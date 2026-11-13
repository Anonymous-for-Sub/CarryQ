<div align="center">

# CarryQ

### Temporal Residual-Feedback Action Encoding

**Beyond Pointwise Accuracy: Temporal Error Structure in Robot Action Tokenization**

[![Tests](https://github.com/Anonymous-for-Sub/CarryQ/actions/workflows/tests.yml/badge.svg)](https://github.com/Anonymous-for-Sub/CarryQ/actions/workflows/tests.yml)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](#installation)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Project Page](https://img.shields.io/badge/Project_Page-Coming_soon-7B61FF?logo=googlechrome&logoColor=white)](#project-page)
[![arXiv](https://img.shields.io/badge/arXiv-Coming_soon-B31B1B?logo=arxiv&logoColor=white)](#paper)

</div>

CarryQ adds temporal residual feedback to an existing action quantizer. At each
step, it adds the previous encoding residual to the source command, selects a
token from the same vocabulary, and uses the unchanged decoder. Residual state
is reset at action-chunk boundaries.

This repository provides the core encoding implementation, memoryless
counterparts, usage examples and CPU tests. It does not bundle model weights,
datasets, simulator installations or experiment outputs.

## Installation

Requires Python 3.10 or newer and NumPy. No GPU is needed.

```bash
git clone https://github.com/Anonymous-for-Sub/CarryQ.git
cd CarryQ
python -m venv .venv
source .venv/bin/activate
python -m pip install -e .
```

## Quick start

```python
import numpy as np
from carryq import quantize_action_error_feedback

# One normalized incremental-action chunk: XYZ, rotation, gripper.
actions = np.zeros((8, 7), dtype=np.float64)
actions[:, 0] = 0.02
actions[:, 6] = 1.0

decoded = quantize_action_error_feedback(
    actions,
    bits=4,
    low=-1.0,
    high=1.0,
    reset_interval=8,
    passthrough_dimensions=(6,),
)
```

The array shape is `[steps, dimensions]`. The functions return **decoded
commands**, not token IDs. Bounds must be expressed in the same coordinates
as the supplied commands. The example is an API illustration, not a robot
control command sequence.

```bash
python examples/basic_usage.py
python examples/encode_actions.py --help
```

## Encoding interfaces

| Interface | Memoryless API | CarryQ API |
|---|---|---|
| Scalar midpoint grid | `quantize_progressive` | `quantize_action_error_feedback` |
| Scalar endpoint-inclusive grid | `quantize_uniform_grid` | `quantize_action_error_feedback_grid` |
| Frozen vector codebook | `decode_actions` | `decode_actions_error_feedback` |

The scalar implementations clip residuals to half a grid step. The vector
implementation clips the adjusted action to its range and carries the
remaining vector residual without a scalar half-grid bound. All calls start
with zero residual; `reset_interval` also resets within a supplied trajectory.

See [API reference](docs/api.md) for grid definitions and
[integration notes](docs/integration.md) for action coordinates, execution
windows and categorical channels.

## Encode a saved trajectory

Supply your own NumPy array of shape `[steps, dimensions]`:

```bash
python examples/encode_actions.py \
  --input actions.npy --output encoded.npy \
  --interface midpoint --method carryq \
  --bits 4 --low -1 --high 1 --reset-interval 8 --passthrough 6
```

Use `--method memoryless` for independent quantization. For a vector codebook,
pass `--interface vector --codebook centers.npy`; the centers array must have
shape `[codes, motion_dimensions]`. The input/output files are local artifacts
and are ignored by Git.

## Development

```bash
python -m pip install -e ".[dev]"
python -m pytest
python -m build
```

Tests cover grid boundaries, clipping, chunk resets, categorical-coordinate
handling, vector lookup and invalid inputs. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Project page

The project page link will be added here when available.

## Paper

**Beyond Pointwise Accuracy: Temporal Error Structure in Robot Action Tokenization**

The arXiv link and citation will be added when available.

## License

The code is released under the [MIT License](LICENSE). External models,
tokenizers and datasets retain their respective licenses.
