## Why

The frontend has accumulated a mix of genuine leftovers and high-frequency state paths that are more expensive and harder to reason about than they need to be. Now that Moments has moved into its own dedicated window, this is a good point to remove stale branches, shrink redundant shell contracts, and simplify repeated list-update logic before more changes pile onto the current structure.

## What Changes

- Remove verified stale frontend paths that no longer participate in the current product surface, including leftover dock/state variants and duplicate style wiring introduced before Moments was extracted into its own window.
- Collapse small, low-value duplication in shared desktop and shell styling where two blocks now describe the same window behavior.
- Tighten high-frequency frontend update helpers so conversation and desktop-attention flows do less repeated scanning and sorting work while preserving current behavior.
- Narrow the top-level frontend assembly surface by deleting no-longer-used branches instead of keeping compatibility code for product paths that no longer exist.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `chat-frontend-maintainability`: extend the maintainability contract so stale frontend branches are removed after product extraction work, and hot update paths reduce redundant scans/sorts without changing user-visible behavior.

## Impact

- Affected code: `frontend/src/App.tsx`, `frontend/src/types/chat.ts`, desktop shell styling, Moments window wiring, conversation state helpers, desktop attention helpers, and related utility functions.
- APIs: no backend API changes.
- Dependencies: no new dependencies.
- Systems: frontend runtime only; desktop packaging should still pass after cleanup.
