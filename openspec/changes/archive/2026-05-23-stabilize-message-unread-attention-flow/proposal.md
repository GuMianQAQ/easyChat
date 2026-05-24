## Why

easyChat now computes message summaries, unread counts, and desktop attention state across the server, the React app, and the Electron shell. Those behaviors mostly work, but the rules are split across layers, which makes refreshes, focus changes, and desktop visibility transitions harder to reason about and more likely to drift.

## What Changes

- Define a single end-to-end behavior for how conversation summaries and unread counts are derived after message delivery, conversation opening, manual mark-read actions, and session refresh.
- Clarify when the desktop client should start, update, and stop attention behavior for background messages.
- Align conversation refresh behavior so server-provided conversation summaries can safely reconcile with local real-time state without producing unstable unread or preview results.
- Add implementation tasks to reduce duplicated summary rules and to introduce tests around unread and attention edge cases.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `conversations`: Refine how conversation list unread state, latest message summary, and refresh reconciliation behave after local real-time updates and mark-read actions.
- `messaging`: Refine how delivered and revoked messages affect conversation previews and read or unread transitions.
- `desktop-shell`: Refine when the Electron desktop runtime starts, updates, and clears attention behavior for unread background messages.

## Impact

- Affected frontend code in `frontend/src/App.tsx`, `frontend/src/app/createConversationActions.ts`, `frontend/src/utils/appHelpers.ts`, and related chat socket helpers.
- Affected desktop runtime code in `frontend/electron/main.ts` and `frontend/electron/preload.ts`.
- Affected server conversation and message summary logic in `internal/chatstore/`.
- Requires new automated coverage for unread, preview, and desktop attention flows.
