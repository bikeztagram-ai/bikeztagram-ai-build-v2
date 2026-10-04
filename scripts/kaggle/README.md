# MiniMax Music 3 — Termux to Kaggle runner

This bypasses the Kaggle browser notebook editor entirely.

Run in Termux:

    curl -fsSL https://raw.githubusercontent.com/bikeztagram-ai/bikeztagram-ai-build-v2/feat/kaggle-minimax-music3-t4x2-test/scripts/kaggle/run-minimax-music3-termux.sh | bash

The runner installs the Kaggle CLI, authenticates with Kaggle OAuth if needed, creates a tiny Python kernel instead of importing an ipynb, requests Kaggle's T4 x2 accelerator, starts the remote run, and prints commands for logs, status, and output.

The current Kaggle CLI documents NvidiaTeslaT4 as the accelerator identifier for GPU T4 x2.