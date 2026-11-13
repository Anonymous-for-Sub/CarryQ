import subprocess
import sys
from pathlib import Path

import numpy as np
import pytest


SCRIPT = Path(__file__).resolve().parents[1] / "examples" / "encode_actions.py"


@pytest.mark.parametrize("interface", ["midpoint", "endpoint", "vector"])
@pytest.mark.parametrize("method", ["memoryless", "carryq"])
def test_file_encoding_and_no_overwrite(tmp_path, interface, method):
    actions = np.array([[0.1, 1.0], [0.2, -1.0], [0.1, 1.0]])
    source, output, codebook = [tmp_path / name for name in ["actions.npy", "encoded.npy", "centers.npy"]]
    np.save(source, actions)
    np.save(codebook, np.array([[-0.5], [0.5]]))
    command = [sys.executable, str(SCRIPT), "--input", str(source), "--output", str(output),
               "--interface", interface, "--method", method, "--passthrough", "1"]
    if interface == "vector":
        command += ["--codebook", str(codebook)]
    subprocess.run(command, check=True, capture_output=True, text=True)
    decoded = np.load(output, allow_pickle=False)
    assert decoded.shape == actions.shape
    np.testing.assert_array_equal(decoded[:, 1], actions[:, 1])
    assert np.all(np.isfinite(decoded))
    repeat = subprocess.run(command, capture_output=True, text=True)
    assert repeat.returncode != 0
    assert "output exists" in repeat.stderr
