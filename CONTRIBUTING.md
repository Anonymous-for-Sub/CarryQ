# Contributing

Please open an issue for a bug report or proposed API change. For a bug,
include a small action array, the quantizer settings, Python/NumPy versions,
and the expected behavior. Do not upload private trajectories or credentials.

For development:

```bash
python -m pip install -e ".[dev]"
python -m pytest
python examples/basic_usage.py
```

Keep changes focused and add a test for changed behavior. In particular,
preserve the documented grid definition, boundary tie rule, residual clipping,
categorical-coordinate handling and reset semantics. Discuss algorithm changes
separately from bug fixes. Contributions are provided under the MIT license.
