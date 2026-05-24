## Context

easyChat already validates a few isolated behaviors through Go service tests and frontend helper tests, but the repository does not yet express a coherent validation matrix for its highest-risk workflows. The next engineering step is not broad feature work; it is to make the repo read like a maintained system with explicit behavior ownership, predictable test entry points, and a clear distinction between what is automated and what remains manual.

The change is cross-cutting because the target workflows span social relationships, conversation member state, messaging, group roles, authentication boundaries, and desktop runtime guidance. The existing test surface is also split across different languages and runners, so the design must optimize for clarity and maintainable scope instead of raw test count.

## Goals / Non-Goals

**Goals:**
- Establish a phase-1 behavior test matrix for the five highest-value easyChat workflows discussed during exploration.
- Assign each workflow to the most appropriate validation layer: helper, service, API, or manual desktop verification.
- Expand automated coverage where it provides the strongest engineering signal without over-investing in brittle full-stack browser or Electron automation.
- Make it obvious how a contributor runs the relevant validation set and understands what remains intentionally manual.

**Non-Goals:**
- Introduce broad end-to-end automation for the Electron shell in phase 1.
- Achieve blanket coverage for every route, model, or UI component.
- Redesign application architecture as part of the testing change.
- Change stable user-facing product behavior beyond documenting and validating the existing expected behavior.

## Decisions

### Decision: Build the matrix around behavior chains, not code ownership
The matrix will be defined in terms of user-visible workflows rather than packages or files. The phase-1 chains are:
- friend request -> accept -> automatic private conversation
- conversation member-state controls such as pin, mute, mark-read, clear, and delete
- message summary consistency for send and revoke flows
- group lifecycle and role boundaries
- authentication boundaries for protected APIs

This keeps the change aligned with system behavior and makes future refactors safer because tests describe outcomes instead of current implementation structure.

Alternative considered:
- Organize by module and add tests wherever code is currently sparse.
Why rejected:
- That produces a larger but less coherent suite and makes it harder to answer whether a critical workflow is protected end-to-end.

### Decision: Prefer service and API coverage as the center of phase 1
Service tests will carry the product-rule burden, and API tests will carry request binding, authentication, and route-level behavior. Frontend helper tests remain valuable where unread, preview, or state-merging logic is pure and deterministic.

Alternative considered:
- Make frontend integration or Electron automation the primary validation layer.
Why rejected:
- Those tests are more expensive to maintain and add less signal for the current maturity goal than service and API behavior tests.

### Decision: Keep desktop runtime validation explicit but mostly manual in phase 1
The change will document desktop runtime checks, but it will not require full automated Electron scenarios before the matrix is considered complete. Manual verification remains acceptable for focus, tray, preview, and other runtime-sensitive flows unless the behavior can be validated through small helper tests.

Alternative considered:
- Require full desktop automation now.
Why rejected:
- It would expand scope sharply and delay the more valuable goal of establishing a reliable, maintainable project-wide behavior matrix.

### Decision: Separate phase-1 must-have cases from later expansion
Each behavior chain will contribute a small set of must-have cases first. The proposal and spec will describe the broader matrix, while tasks will focus on the highest-signal subset required to make the repository apply-ready and demonstrably more mature.

Alternative considered:
- Attempt to cover every identified case in one pass.
Why rejected:
- That risks turning the change into an unbounded testing sweep rather than a disciplined engineering milestone.

### Decision: Standardize validation entry points alongside test additions
The change will include repository-facing guidance or scripts so contributors can discover and run the matrix consistently. The goal is not just more tests; it is a clearer quality gate.

Alternative considered:
- Add tests only and leave command discovery implicit.
Why rejected:
- A mature project needs repeatable validation habits, not just scattered test files.

## Risks / Trade-offs

- **[Risk] Scope creep from "behavior matrix" into "test everything."** -> Mitigation: keep the change explicitly phase-1 and tie tasks to the five selected behavior chains only.
- **[Risk] API coverage may duplicate service assertions.** -> Mitigation: reserve service tests for business rules and API tests for auth, binding, status, and route-level integration.
- **[Risk] Manual desktop checks could look weaker than automation.** -> Mitigation: document that trade-off explicitly and keep the desktop checklist narrow and intentional.
- **[Risk] Existing tests may need refactoring before new cases fit cleanly.** -> Mitigation: allow targeted test-structure cleanup when it directly supports one of the phase-1 chains.

## Migration Plan

1. Add or organize tests around the selected phase-1 chains.
2. Update repository validation guidance so contributors know which commands cover the matrix.
3. Preserve current build and helper test entry points unless a clearer unified entry point replaces them.
4. Treat this change as additive; no production migration or rollback path is required because the behavior under test already exists.

## Open Questions

- Should phase-1 API tests focus only on the highest-value route per chain, or should each chain include multiple representative routes from the start?
- Does the repository need a single aggregate verification command now, or is documenting the existing Go and frontend test commands sufficient for this phase?
