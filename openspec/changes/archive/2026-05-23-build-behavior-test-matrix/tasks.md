## 1. Matrix Structure and Validation Entry Points

- [x] 1.1 Add or update repository-facing guidance that explains the phase-1 behavior matrix, its five protected behavior chains, and which desktop flows remain manual.
- [x] 1.2 Standardize the commands or scripts used to run the automated matrix so contributors can discover the required Go and frontend verification entry points from one place.

## 2. Social, Conversation, and Messaging Coverage

- [x] 2.1 Add service or API coverage for the friend-request acceptance chain, including friendship state transition and automatic private-conversation availability.
- [x] 2.2 Add service coverage for per-user conversation member-state behavior, including mark-read, clear-history visibility, and local-only state changes such as pin, mute, or delete.
- [x] 2.3 Add service coverage for message summary consistency across send and revoke flows, including authorization or time-window rejection cases where the latest summary must remain stable.

## 3. Group and Auth Boundary Coverage

- [x] 3.1 Add service or API coverage for group lifecycle role boundaries, including create constraints, owner-only actions, member leave behavior, and dismiss behavior.
- [x] 3.2 Add API coverage for protected-route authentication boundaries using representative endpoints with missing, invalid, and valid authentication states.

## 4. Frontend and Verification Follow-through

- [x] 4.1 Add or organize frontend helper-level coverage where the phase-1 matrix depends on deterministic client-side state transitions or preview logic.
- [x] 4.2 Run the automated matrix entry points, update any manual desktop verification checklist required by the new guidance, and confirm the change is ready for `/opsx:apply`.
