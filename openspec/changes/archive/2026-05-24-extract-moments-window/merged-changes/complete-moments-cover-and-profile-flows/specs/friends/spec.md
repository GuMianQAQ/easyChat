## MODIFIED Requirements

### Requirement: Friend-specific controls
The system SHALL support friend remark updates, blacklist operations, friend availability rules, and dedicated contact-detail actions according to current behavior. The contact detail surface MUST expose a dedicated `朋友圈` row for eligible friends, and that row MUST appear between `朋友权限` and `个性签名` in the detail layout.

#### Scenario: User blocks a friend
- **WHEN** a user adds a friend to the blacklist
- **THEN** the friend relationship state is updated without changing unrelated user data

#### Scenario: Contact detail shows a dedicated Moments row
- **WHEN** the viewer opens an eligible friend's contact detail
- **THEN** the system renders a standalone `朋友圈` row between `朋友权限` and `个性签名` rather than burying the action in an overflow menu

#### Scenario: Viewer activates the Moments row
- **WHEN** the viewer selects the `朋友圈` row in contact detail
- **THEN** the system opens or focuses the dedicated Moments window in that friend's read-only view
