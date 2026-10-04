# MiniMax Music 3 — unattended Kaggle runner

The preferred route is now **GitHub Actions → Kaggle T4×2**. This bypasses the Kaggle browser notebook editor and avoids installing the Kaggle Python CLI in Termux.

## One-time GitHub setup

Add these repository Actions secrets:

- `KAGGLE_USERNAME`: your Kaggle username
- `KAGGLE_API_TOKEN`: your Kaggle API token

Kaggle documents `KAGGLE_API_TOKEN` as a supported non-interactive authentication method. Do not put the token in source code or commit it.

## Start the test

In GitHub:

1. Open **Actions**.
2. Select **MiniMax Music 3 — Kaggle T4x2**.
3. Choose **Run workflow**.
4. Run it from `feat/kaggle-minimax-music3-t4x2-test`.

The GitHub runner installs the Kaggle CLI on Ubuntu, pushes the Python kernel, requests `NvidiaTeslaT4` (Kaggle's current T4×2 accelerator), waits for completion, downloads the WAV, and uploads it as a GitHub Actions artifact.

Termux is no longer required for the actual GPU launch.
