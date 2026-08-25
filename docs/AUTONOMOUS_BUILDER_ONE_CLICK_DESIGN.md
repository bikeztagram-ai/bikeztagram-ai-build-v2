# One-click Autonomous Builder design

The Autonomous Builder dispatch UI should expose no required batch/objective inputs. On dispatch, the workflow reads the next unchecked entry from the durable batch queue, derives the batch identifier and isolated branch, and passes the exact queued objective to the bounded builder runner.

The queue remains the single source of truth for the product roadmap. A product batch must not edit the queue or workflow infrastructure. After a batch is reviewed/merged, the queue is advanced by the workflow-maintenance path so the next click is ready.

This prevents stale static defaults such as `batch-83` and prevents the user from having to manually copy objectives or branch names.
