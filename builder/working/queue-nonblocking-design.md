# Queue non-blocking review design

The autonomous builder treats completed draft PRs as durable review storage rather than a queue lock. An open PR for one batch does not prevent later eligible batches from being selected. Each batch retains its own immutable working branch and draft PR until human review/merge/rejection. GitHub Actions concurrency still serializes builder runs, so only one engineering pass runs at a time while the scheduler can continue advancing through eligible batches on later runs.
