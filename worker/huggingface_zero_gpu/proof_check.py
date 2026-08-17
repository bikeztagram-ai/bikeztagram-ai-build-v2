"""Check a generated ZeroGPU result without introducing a paid dependency."""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


def main() -> int:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("generated.mp4")
    if not path.exists() or path.stat().st_size < 1024:
        print("FAIL: output MP4 is missing or empty")
        return 1

    probe = subprocess.run(
        [
            "ffprobe", "-v", "error", "-show_entries",
            "format=format_name,duration,size", "-of", "default=noprint_wrappers=1", str(path)
        ],
        capture_output=True,
        text=True,
    )
    if probe.returncode != 0:
        print("FAIL: ffprobe could not read the output")
        print(probe.stderr)
        return 1

    print("PASS: real MP4 detected")
    print(probe.stdout.strip())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
