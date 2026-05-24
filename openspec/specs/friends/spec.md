## Purpose

Describe the stable friend-management behavior for easyChat, including user search, friend requests, accepted friend relationships, remarks, and blacklist controls.

## Requirements

### Requirement: Friend relationship management
The system SHALL support user search, friend requests, friend acceptance or rejection, and friend list retrieval.

#### Scenario: User sends a friend request
- **WHEN** a user submits a valid friend request to another user
- **THEN** the request is stored and becomes visible through the existing friend request flows

### Requirement: Friend-specific controls
The system SHALL support friend remark updates, blacklist operations, and friend availability rules according to current behavior.

#### Scenario: User blocks a friend
- **WHEN** a user adds a friend to the blacklist
- **THEN** the friend relationship state is updated without changing unrelated user data
