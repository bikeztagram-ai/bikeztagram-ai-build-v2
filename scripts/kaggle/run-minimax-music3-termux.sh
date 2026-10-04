#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

REPO="bikeztagram-ai/bikeztagram-ai-build-v2"
BRANCH="feat/kaggle-minimax-music3-t4x2-test"
KERNEL_SLUG="bikeztagram-minimax-music3-t4x2"
BASE_DIR="$HOME/.bikeztagram-kaggle-music3"
RAW="https://raw.githubusercontent.com/$REPO/$BRANCH"

echo "=== Bikeztagram MiniMax Music 3 — Termux → Kaggle Runner ==="

pkg update -y >/dev/null 2>&1 || true
pkg install -y python git curl >/dev/null 2>&1 || true
python -m pip install -q --upgrade kaggle

if ! kaggle kernels list --mine --page-size 1 >/dev/null 2>&1; then
  echo "Kaggle is not authenticated. Starting Kaggle OAuth..."
  kaggle auth login
fi

mkdir -p "$BASE_DIR/kernel"
curl -fsSL "$RAW/scripts/kaggle/minimax_music3_batch.py" -o "$BASE_DIR/kernel/minimax_music3_batch.py"

OWNER=""
CSV="$(kaggle kernels list --mine --page-size 1 -v 2>/dev/null || true)"
if [ -n "$CSV" ]; then
  OWNER="$(printf '%s\n' "$CSV" | tail -n +2 | head -n 1 | cut -d',' -f1 | cut -d'/' -f1 | tr -d '"' | tr -d '[:space:]')"
fi

if [ -z "$OWNER" ] || [ "$OWNER" = "ref" ]; then
  echo
  read -r -p "Enter your Kaggle username: " OWNER
fi

cat > "$BASE_DIR/kernel/kernel-metadata.json" <<EOF
{
  "id": "$OWNER/$KERNEL_SLUG",
  "title": "Bikeztagram MiniMax Music 3 T4x2",
  "code_file": "minimax_music3_batch.py",
  "language": "python",
  "kernel_type": "script",
  "is_private": "true",
  "enable_gpu": "true",
  "enable_internet": "true",
  "machine_shape": "NvidiaTeslaT4"
}
EOF

echo
echo "Pushing remote GPU job: $OWNER/$KERNEL_SLUG"
kaggle kernels push -p "$BASE_DIR/kernel" --accelerator NvidiaTeslaT4 --timeout 43200

echo
echo "=== JOB STARTED ==="
echo "Kernel: $OWNER/$KERNEL_SLUG"
echo
echo "Follow logs:"
echo "kaggle kernels logs $OWNER/$KERNEL_SLUG --follow --interval 10"
echo
echo "Check status:"
echo "kaggle kernels status $OWNER/$KERNEL_SLUG"
echo
echo "Download WAV when complete:"
echo "mkdir -p ~/Bikeztagram-Music3-Test"
echo "kaggle kernels output $OWNER/$KERNEL_SLUG -p ~/Bikeztagram-Music3-Test -o --file-pattern '.*\\.wav'"
