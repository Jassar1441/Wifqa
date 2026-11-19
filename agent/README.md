# Autonomous Developer Bootstrap

This directory is a **configuration scaffold only**. It does not yet run an agent or create a persistent background process.

## Safety policy

See `policy.yaml`. The intended agent is restricted to this repository and isolated `agent/*` branches. It must not merge to `main`, deploy, spend money, modify permissions, access secrets, or delete protected branches/repositories.

## Intended loop

1. Inspect repository state and task backlog.
2. Select a small task with explicit acceptance criteria.
3. Create an isolated work branch.
4. Implement in a sandboxed workspace.
5. Run relevant tests and retry at most three times.
6. Review the diff and test evidence.
7. Commit and optionally open a draft PR; never merge.
8. Persist a checkpoint and continue with the next eligible task.

## Runtime status

Not operational yet. The runtime, model, sandbox, scheduler, and durable task ledger must be provisioned and tested before enabling autonomous execution.
