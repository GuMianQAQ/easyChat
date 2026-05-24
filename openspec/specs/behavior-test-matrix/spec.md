# behavior-test-matrix Specification

## Purpose
TBD - created by archiving change build-behavior-test-matrix. Update Purpose after archive.
## Requirements
### Requirement: Phase-1 behavior chains have explicit automated validation ownership
The project SHALL define a phase-1 behavior test matrix for the highest-value easyChat workflows. The matrix SHALL assign each selected workflow to the most appropriate automated validation layer so contributors can identify which behaviors are protected by helper tests, service tests, or API tests.

#### Scenario: Maintainer reviews the phase-1 matrix
- **WHEN** a maintainer inspects the behavior test matrix for this change
- **THEN** the matrix identifies automated ownership for friend-request conversion to private conversation, conversation member-state behavior, message-summary consistency, group lifecycle rules, and authentication boundaries

### Requirement: Automated coverage targets the most valuable phase-1 cases
The project SHALL add or organize automated tests for a phase-1 subset of cases from each selected workflow. The phase-1 subset SHALL prioritize cross-module behavior, authorization boundaries, and user-visible state transitions over exhaustive route-by-route coverage.

#### Scenario: Friend acceptance converts into a private conversation
- **WHEN** a pending friend request is accepted through the existing easyChat flow
- **THEN** the automated test matrix verifies both the friendship state transition and the creation or availability of the expected private conversation

#### Scenario: Conversation member-state actions remain per-user
- **WHEN** a user marks a conversation read, clears history visibility, pins, mutes, or deletes local visibility
- **THEN** the automated test matrix verifies the action affects only that user's conversation state and does not rewrite unrelated participant state

#### Scenario: Message summary behavior stays stable across send and revoke flows
- **WHEN** a latest message is sent or revoked in an accessible conversation
- **THEN** the automated test matrix verifies the resulting summary behavior remains consistent with the existing conversation-summary rules

#### Scenario: Group role boundaries remain enforced
- **WHEN** owner-only or membership-specific group actions are exercised
- **THEN** the automated test matrix verifies that allowed roles succeed and disallowed roles are rejected without corrupting group state

#### Scenario: Protected APIs enforce authentication boundaries
- **WHEN** protected easyChat APIs are called with missing, invalid, or valid authentication
- **THEN** the automated test matrix verifies unauthorized calls are rejected and valid sessions continue into the expected business flow

### Requirement: Desktop-sensitive validation remains explicit in phase 1
The phase-1 matrix SHALL explicitly distinguish automated coverage from manual desktop verification. Desktop runtime flows that are costly or brittle to automate in the current architecture SHALL remain listed as manual checks rather than being silently omitted.

#### Scenario: Maintainer checks desktop validation expectations
- **WHEN** a maintainer reviews the phase-1 validation guidance
- **THEN** the guidance clearly identifies which desktop attention, tray, or window-state behaviors remain manual for this phase

### Requirement: The matrix has discoverable validation entry points
The repository SHALL document or expose the commands needed to run the automated parts of the phase-1 matrix so contributors can apply the same quality gate before and after changes.

#### Scenario: Contributor prepares to verify the matrix
- **WHEN** a contributor follows the repository guidance for phase-1 validation
- **THEN** the contributor can identify the required commands for the automated matrix and any accompanying manual desktop checklist

