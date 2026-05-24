## 1. Normalize conversation preview and unread semantics

- [x] 1.1 Extract or align shared message-summary rules so conversation previews for text, image, file, and revoked messages stay consistent between server-generated summaries and client-side real-time updates.
- [x] 1.2 Refactor conversation state updates in `frontend/src/App.tsx` and related helpers so unread clearing and preview updates follow explicit read-transition rules instead of timing-dependent focus checks.
- [x] 1.3 Reconcile conversation refresh flows in `frontend/src/app/createConversationActions.ts` and related helpers so server summaries remain the baseline after reloads, reconnects, and manual refreshes.

## 2. Stabilize desktop attention behavior

- [x] 2.1 Refine desktop attention bookkeeping in `frontend/src/App.tsx` so desktop attention state remains separate from conversation unread counts.
- [x] 2.2 Update `frontend/electron/main.ts` and preload contracts so attention preview updates, per-conversation clear behavior, and global stop conditions follow the clarified desktop visibility rules.

## 3. Add regression coverage

- [x] 3.1 Add backend tests for conversation summary generation covering latest-message preview and revoked-message summary behavior.
- [x] 3.2 Add frontend tests or focused helper-level coverage for unread transitions during conversation open, mark-read, and refresh reconciliation flows.
- [x] 3.3 Add desktop-runtime coverage or targeted helper tests for attention start and clear behavior across hidden, focused, minimized, and restored states.
