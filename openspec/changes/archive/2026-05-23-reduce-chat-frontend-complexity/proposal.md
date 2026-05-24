## Why

easyChat's chat frontend has reached the point where the main maintenance cost is no longer missing features but the width of the state and side-effect surface that must be understood before making routine changes. `App.tsx`, `createConversationActions.ts`, `useChatSocket.ts`, and `AppShell.tsx` currently spread the chat flow across too many overlapping truth sources, which slows down future feature work and increases regression risk even for a solo-maintained project.

## What Changes

- Reduce chat-frontend complexity by separating the hottest chat-facing state and side-effect responsibilities into clearer domains instead of continuing to expand `App.tsx` as a control center.
- Introduce a more explicit ownership model for conversation updates so refresh, incoming message, mark-read, delete, clear, and group lifecycle flows converge on fewer update paths.
- Narrow the shell assembly surface so the main application layer passes more domain-shaped data and actions rather than one large, mixed prop contract.
- Preserve current user-visible chat behavior while using the existing behavior matrix as the regression guardrail during refactoring.

## Capabilities

### New Capabilities
- `chat-frontend-maintainability`: Defines the required maintainability boundaries for the chat frontend, including clearer domain ownership for state, unified conversation update paths, and reduced top-level orchestration pressure.

### Modified Capabilities

## Impact

- Affected code: `frontend/src/App.tsx`, `frontend/src/app/createConversationActions.ts`, `frontend/src/hooks/useChatSocket.ts`, `frontend/src/components/app/AppShell.tsx`, and related helper or state modules.
- Affected systems: chat-state orchestration, desktop attention coordination, conversation refresh and unread flows, shell composition, and frontend helper tests.
- Dependencies: no new product dependency is required, but the change may create additional local frontend modules or helper layers to hold the new boundaries.
