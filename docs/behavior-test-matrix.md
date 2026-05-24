# easyChat Phase-1 Behavior Test Matrix

This document defines the phase-1 validation matrix for the highest-value
easyChat workflows. The goal is to keep the repository's quality gates organized
around behavior chains rather than scattered test files.

## Protected Behavior Chains

### 1. Friend request -> accept -> private conversation
- Automated ownership: service and API
- Expected coverage:
  - friend requests can be created or rejected by workflow state
  - accepting a pending request creates the friendship state transition
  - accepting a pending request ensures a private conversation is available

### 2. Conversation member-state behavior
- Automated ownership: service
- Expected coverage:
  - pin and mute are local to the acting user
  - mark-read updates only the acting user's read state
  - clear-history visibility is local to the acting user
  - delete hides the conversation locally without deleting global data

### 3. Message summary consistency
- Automated ownership: service and frontend helper tests
- Expected coverage:
  - latest text and file messages produce stable conversation previews
  - revoke flows update the latest summary semantics correctly
  - rejected revoke attempts do not mutate the latest visible summary

### 4. Group lifecycle and role boundaries
- Automated ownership: service and API
- Expected coverage:
  - only friends can be invited through the current group-create API
  - owner-only fields remain owner-only
  - members can leave, owners must dismiss instead
  - only owners can dismiss a group conversation

### 5. Authentication boundaries
- Automated ownership: API
- Expected coverage:
  - protected routes reject missing authentication
  - protected routes reject invalid authentication
  - representative protected routes succeed with valid authentication
  - password change flows preserve re-login semantics

## Automated Verification Entry Points

Run the full phase-1 automated matrix from the repository root:

```bat
scripts\verify-behavior-matrix.cmd
```

Underlying commands:

```powershell
go test ./...
cd frontend
npm run test:matrix
```

## Manual Desktop Verification

Phase 1 keeps desktop runtime verification explicit but manual. Run these checks
after the automated matrix if a change touches Electron runtime behavior:

1. Start the backend and desktop client.
2. Verify tray or attention indicators appear for hidden-window unread activity.
3. Verify opening the targeted conversation clears only that conversation's
   desktop attention state.
4. Verify restoring or focusing the main window stops global attention only when
   no pending conversation attention remains.
5. Verify preview content stays aligned with the latest unread conversation.
