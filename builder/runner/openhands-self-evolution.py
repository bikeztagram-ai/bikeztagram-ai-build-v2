#!/usr/bin/env python3
"""Run one tightly scoped AutoBot self-evolution task with OpenHands.

This runner deliberately does not commit, push, create PRs, or touch product code.
The surrounding GitHub Actions workflow owns checkout, scope verification, rollback,
and final audit. OpenHands is used only as the execution engine.
"""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

from openhands.sdk import Conversation, LLM
from openhands.tools.preset.default import get_default_agent


TARGET = "builder/runner/aider-feature-brain.mjs"
ALLOWED = {
    TARGET,
    "builder/runner/ollama-performance-proxy.mjs",
    "builder/runner/self-improvement-planner.mjs",
}


def run(command: list[str]) -> str:
    return subprocess.check_output(command, text=True, stderr=subprocess.STDOUT).strip()


def learning_snapshot() -> str:
    candidates = [
        Path("builder/working/aider-feature-brain-learning.json"),
        Path("builder/working/aider-feature-brain-state.json"),
    ]
    parts: list[str] = []
    for path in candidates:
        if path.exists():
            try:
                data = json.loads(path.read_text())
                parts.append(f"{path}: {json.dumps(data, separators=(',', ':'))[-6000:]}")
            except Exception as exc:  # pragma: no cover - evidence is best effort
                parts.append(f"{path}: unreadable ({exc})")
    return "\n".join(parts) or "No prior learning state was available."


def main() -> int:
    api_key = os.environ.get("LLM_API_KEY")
    model = os.environ.get("LLM_MODEL", "openai/gpt-5.5")
    base_url = os.environ.get("LLM_BASE_URL") or None
    if not api_key:
        raise SystemExit("LLM_API_KEY is required for the OpenHands engine experiment")

    before = run(["git", "status", "--short"])
    prompt = f"""You are the execution engine for Bikeztagram AI AutoBot self-evolution.

THIS IS A CONTROLLED SELF-IMPROVEMENT TASK. PRODUCT WORK IS LOCKED.

Goal: make ONE small, real engineering improvement to the autonomous engineering
mechanism in response to repeated timeout/no-progress evidence.

Primary target file: {TARGET}
Other explicitly allowed files (only if directly necessary):
- builder/runner/ollama-performance-proxy.mjs
- builder/runner/self-improvement-planner.mjs

Protected/read-only areas include product source, package manifests, workflows,
objective definitions, evolution policy, safety/verification scripts, and production
gates. Do not modify them.

Recent evidence:
{learning_snapshot()}

Required behaviour:
1. Inspect the target file and the directly relevant learning/evidence state.
2. Identify one concrete bottleneck supported by the evidence.
3. Make ONE small, reviewable code change that addresses that bottleneck.
4. Prefer a change that can be tested locally in this run. Run the smallest useful
   syntax/unit/build check after editing.
5. Do not merely explain a solution: actually edit the file.
6. Do not refactor unrelated code, add cosmetic logging, or rewrite large sections.
7. Do not commit, push, create a PR, alter git configuration, or modify product code.
8. Stop after the bounded improvement and verification.

Acceptance gate: a non-empty git diff confined to the allowlisted self-improvement
files, plus a meaningful verification result. If you cannot justify a safe change,
do not invent one; leave the tree unchanged and explain why.

The surrounding runner will independently verify scope and audit integrity. Do not
weaken or bypass any safety, rollback, verification, or no-auto-commit controls.
"""

    llm_kwargs = {
        "model": model,
        "api_key": api_key,
        "usage_id": "autobot-self-evolution-openhands",
        "timeout": int(os.environ.get("OPENHANDS_LLM_TIMEOUT", "300")),
        "max_output_tokens": int(os.environ.get("OPENHANDS_MAX_OUTPUT_TOKENS", "4096")),
        "drop_params": True,
    }
    if base_url:
        llm_kwargs["base_url"] = base_url

    llm = LLM(**llm_kwargs)
    agent = get_default_agent(llm=llm, cli_mode=True)
    conversation = Conversation(agent=agent, workspace=os.getcwd())
    conversation.send_message(prompt)
    conversation.run()

    after = run(["git", "status", "--short"])
    diff = run(["git", "diff", "--", *sorted(ALLOWED)])
    Path("builder/working").mkdir(parents=True, exist_ok=True)
    Path("builder/working/openhands-self-evolution-result.json").write_text(
        json.dumps(
            {
                "engine": "openhands-sdk",
                "model": model,
                "target": TARGET,
                "changed": bool(diff.strip()),
                "statusBefore": before,
                "statusAfter": after,
                "diffBytes": len(diff.encode()),
                "metrics": llm.metrics.model_dump() if llm.metrics else None,
            },
            indent=2,
        )
    )
    print("[autobot] OpenHands self-evolution execution completed")
    print(f"[autobot] target={TARGET}")
    print(f"[autobot] changed={bool(diff.strip())}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
