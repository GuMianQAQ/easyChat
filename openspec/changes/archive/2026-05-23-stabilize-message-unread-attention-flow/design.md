## Context

easyChat currently derives conversation previews, unread counts, and desktop attention state across three layers:

- `internal/chatstore/` produces conversation summaries during list fetches and after server-side mutations.
- `frontend/src/App.tsx` and related helpers apply local real-time updates after WebSocket messages arrive.
- `frontend/electron/main.ts` maintains desktop attention state, preview content, and clear conditions.

This split is workable but fragile because the same user-visible concepts are recalculated in more than one place. The current implementation can drift during refreshes, focus changes, desktop visibility changes, and revoke flows because each layer owns a partial view of "latest preview", "unread", and "attention active".

## Goals / Non-Goals

**Goals:**
- Define a consistent ownership model for conversation preview text, unread transitions, and desktop attention state.
- Preserve the current product shape while making refresh and real-time reconciliation deterministic.
- Reduce duplicated summary logic between server-produced conversation summaries and client-side real-time updates.
- Add test coverage for the edge cases that currently depend on timing and focus state.

**Non-Goals:**
- Redesign the visual layout of the chat UI or desktop preview UI.
- Introduce message delivery receipts, cross-device read sync, or new notification channels.
- Change conversation, message, or WebSocket API shapes unless required to preserve the clarified behavior.

## Decisions

### Decision: Treat server conversation summaries as the baseline and client updates as bounded overlays
The server remains the source of truth for list bootstrap, refresh, and mutation responses. The client may temporarily overlay unread and preview updates after real-time events, but those overlays must reconcile cleanly back to server summaries on refresh.

Rationale:
- The server already owns cleared and hidden visibility rules that are user-specific.
- Refresh flows need a stable base state even after reconnects or page reloads.

Alternative considered:
- Make the client the only source of truth for unread and previews after boot. Rejected because it would further couple refresh correctness to local session history.

### Decision: Use a single preview summarization rule set for both conversation summaries and local real-time updates
Summary formatting rules for text, image, file, and revoked messages should be defined once and reused across server summary generation and client-side conversation updates.

Rationale:
- Prevents refresh-time preview drift.
- Makes revoked-message behavior testable at one semantic boundary.

Alternative considered:
- Keep separate server and client summary helpers with matching conventions. Rejected because behavioral drift is exactly the current risk.

### Decision: Separate conversation unread state from desktop attention bookkeeping
`conversation.unreadCount` represents the unread state shown in the conversation list and title badge. Desktop attention bookkeeping remains a separate runtime concern that starts when a background message needs attention and clears when the relevant conversation is actively visible in the desktop shell.

Rationale:
- Desktop attention has runtime-specific conditions such as minimized or hidden windows that should not redefine conversation unread semantics.
- The shell can maintain attention state without corrupting conversation unread counts.

Alternative considered:
- Reuse conversation unread counts directly as the desktop attention count. Rejected because the shell and the chat list clear under different conditions.

### Decision: Define explicit read-transition triggers
Unread state clears only through explicit conversation-open or mark-read flows that satisfy active-visibility rules, plus explicit mark-read actions. Background message arrival never clears unread. Refresh reconciliation must preserve a locally cleared unread state only when that state has already been acknowledged to the server.

Rationale:
- Removes ambiguity around "focus", "visible", and "active conversation" checks.
- Makes the conversation list and desktop shell easier to reason about during timing-sensitive flows.

Alternative considered:
- Continue relying on whichever layer observes focus first. Rejected because it makes behavior timing-dependent.

## Risks / Trade-offs

- [Risk] Tightening unread semantics may expose existing edge-case bugs that were previously masked by optimistic local resets. → Mitigation: add focused tests around refresh, reopen, revoke, and visibility transitions.
- [Risk] Reusing a single summary rule set across server and client may require modest refactoring across Go and TypeScript layers. → Mitigation: keep the public API unchanged and scope the refactor to summary normalization only.
- [Risk] Desktop attention clear conditions may feel stricter after the behavior is clarified. → Mitigation: keep the current user-facing shell interactions but make the clear rules explicit and testable.
- [Risk] Noisy timing tests can become brittle. → Mitigation: concentrate logic in helper functions and test those helpers directly where possible.
