## MODIFIED Requirements

### Requirement: Real-time message exchange
The system SHALL support real-time private and group messaging through the current WebSocket-based behavior. Delivered messages SHALL update conversation previews and unread transitions using the same summary rules that are used for refreshed conversation summaries.

#### Scenario: User receives a message
- **WHEN** another participant sends a valid message into an accessible conversation
- **THEN** the receiving client can obtain the message through the existing real-time channel

#### Scenario: Delivered message updates conversation preview
- **WHEN** a real-time message is delivered into a visible conversation list
- **THEN** the conversation preview uses the same content summarization rules that the system uses after a refresh of that conversation summary

### Requirement: Message history and message actions
The system SHALL support loading message history, revoking messages, and maintaining current unread and read behavior. Message-history retrieval and revoke flows SHALL not cause conversation preview semantics or unread transitions to diverge from the latest server-visible conversation state.

#### Scenario: User loads older messages
- **WHEN** a client requests message history for an accessible conversation
- **THEN** the system returns paginated history in the existing format

#### Scenario: User receives a revoked latest message
- **WHEN** the latest visible message for a conversation is revoked
- **THEN** the conversation preview and unread state reflect the revoked-message summary consistently across real-time updates and refreshed conversation summaries
