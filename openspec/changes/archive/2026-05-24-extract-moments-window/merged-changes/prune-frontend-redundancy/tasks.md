## 1. Remove Verified Stale Frontend Paths

- [x] 1.1 Remove confirmed stale Moments dock/state remnants from shared frontend types and shell wiring.
- [x] 1.2 Remove duplicate or redundant shared style wiring that no longer serves the current runtime structure.
- [x] 1.3 Verify that the remaining imports and branches still map to active product paths only.

## 2. Simplify Hot Update Helpers

- [x] 2.1 Reduce repeated scans inside conversation-list helper paths such as group-summary and related mutation flows.
- [x] 2.2 Reduce repeated conversation/friend lookup work inside desktop attention preview assembly without changing preview behavior.
- [x] 2.3 Keep list ordering and unread semantics stable while trimming unnecessary whole-list work.

## 3. Validate Stability

- [x] 3.1 Run the relevant frontend tests or helper tests affected by the cleanup.
- [x] 3.2 Build the frontend/desktop bundles to confirm the cleanup does not break packaging.
- [x] 3.3 Manually verify the main chat shell and dedicated Moments window still open and behave as before.
