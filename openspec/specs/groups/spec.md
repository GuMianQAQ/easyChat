## Purpose

Describe the stable group-chat behavior for easyChat, including group creation, group details, group profile updates, membership changes, and owner-restricted actions.

## Requirements

### Requirement: Group conversation lifecycle
The system SHALL support creating group chats, reading group details, updating supported group profile fields, leaving a group, and dismissing a group according to current role rules.

#### Scenario: Group owner creates a group chat
- **WHEN** the owner creates a group with valid members
- **THEN** the system creates the group conversation and initializes members using current permission rules

### Requirement: Group role-sensitive actions
The system SHALL enforce the existing owner and member permissions for editable group fields and destructive operations.

#### Scenario: Non-owner attempts an owner-only action
- **WHEN** a non-owner invokes an owner-restricted group operation
- **THEN** the system rejects the request using the existing permission behavior
