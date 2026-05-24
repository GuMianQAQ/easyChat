## Why

easyChat already has a reasonably complete chat product surface, but its automated validation is still scattered across a few service tests and helper tests. That leaves key cross-module behaviors under-specified at the project level and makes future refactors look riskier than they need to.

## What Changes

- Add a project-level behavior test matrix that assigns the highest-value chat workflows to concrete validation layers such as helper, service, API, and manual desktop verification.
- Define phase-1 automated coverage for five critical behavior chains: friend request to private conversation, conversation member-state controls, message summary consistency, group lifecycle roles, and authentication boundaries.
- Standardize how contributors discover and run the validation set so the repo has clearer engineering quality gates.

## Capabilities

### New Capabilities
- `behavior-test-matrix`: Defines the required validation matrix for high-value easyChat workflows, including which behavior chains must be covered automatically and which desktop behaviors remain explicitly manual in phase 1.

### Modified Capabilities

## Impact

- Affected code: Go service and route tests under `internal/`, frontend helper tests under `frontend/src/utils/`, and project verification scripts or documentation.
- Affected systems: social workflow, conversations, messaging, groups, auth boundaries, and desktop validation guidance.
- Dependencies: no new product dependency is required, but the change may extend existing test entry points and repository-level validation documentation.
