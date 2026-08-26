# Autonomous Builder Memory Loading Contract

Every product batch must load durable project context before planning or coding.

Required first reads inside the checked-out repository:

1. `builder/quality/project-memory.md` — project north star, architecture, product principles and durable operating rules.
2. `builder/quality/lessons.md` — lessons from previous batches, especially rejected or weak implementations.
3. `config/autonomous-builder-queue.json` — current batch objective, status and queue context.
4. The relevant production source files identified from those documents and the batch objective.

Do not treat these files as permission to invent roadmap work. They provide context; the current batch objective remains authoritative.

Before finishing a batch, record any genuinely reusable new architectural/product lesson in `builder/quality/lessons.md` or `builder/quality/project-memory.md` when the objective permits it. Never store secrets, credentials or transient chat details.
