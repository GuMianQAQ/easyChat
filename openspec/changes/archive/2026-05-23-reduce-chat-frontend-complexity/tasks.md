## 1. Chat State Ownership and Conversation Update Paths

- [x] 1.1 Identify and extract the hottest chat-facing state ownership boundaries from `frontend/src/App.tsx`, starting with the responsibilities that mix chat, desktop attention, and bootstrap orchestration.
- [x] 1.2 Introduce a clearer conversation update layer so refresh, incoming message, mark-read, clear, delete, and relevant group flows reuse fewer explicit conversation-list state paths.

## 2. Action and Runtime Boundary Refactor

- [x] 2.1 Refactor `frontend/src/app/createConversationActions.ts` so chat actions depend on narrower state and setter contracts instead of the current wide top-level orchestration surface.
- [x] 2.2 Clarify the boundary between `frontend/src/hooks/useChatSocket.ts` transport ownership and higher-level chat or desktop orchestration so socket lifecycle, message state, and conversation semantics are less entangled.
- [x] 2.3 Isolate desktop attention coordination into a clearer consumer boundary so chat effects do not continue to accumulate runtime-specific branches inline.

## 3. Shell Surface Reduction

- [x] 3.1 Reduce the chat-facing prop surface of `frontend/src/components/app/AppShell.tsx` by passing more domain-shaped state and actions instead of a single mixed top-level contract.
- [x] 3.2 Update dependent chat-facing views only as needed to support the narrower shell integration without redesigning unrelated UI flows.

## 4. Verification and Regression Guardrails

- [x] 4.1 Add or adjust focused frontend helper or state-level tests where the new ownership boundaries need direct coverage.
- [x] 4.2 Run the relevant frontend build, helper tests, and behavior-matrix verification to confirm the maintainability refactor preserves current chat behavior.
