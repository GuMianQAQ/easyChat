# OpenSpec

This workspace is initialized as an OpenSpec project using the default `spec-driven` schema.

## Structure

```text
openspec/
  changes/
    archive/
  specs/
```

## Purpose

- `openspec/specs/`
  Stores the current source-of-truth specifications for stable capabilities.

- `openspec/changes/`
  Stores in-progress change proposals before they are merged into the main specs.

- `openspec/changes/archive/`
  Stores completed and archived changes.

## Typical flow

1. Create a new change proposal under `openspec/changes/<change-name>/`
2. Add proposal / specs / design / tasks artifacts as needed
3. Implement and validate separately
4. Archive the change and fold finalized requirements back into `openspec/specs/`

## Notes for this repository

- This OpenSpec setup was added without modifying application code.
- Runtime behavior, API paths, database schema, and Electron behavior are unchanged.
- The workspace-local `.codex/skills/openspec-*` helpers were generated successfully.
- Archive retention is intentionally strict for this personal project: keep `openspec/specs/` as the long-lived memory, and only keep archive directories that still feel worth reopening later as milestone records.
