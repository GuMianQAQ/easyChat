## MODIFIED Requirements

### Requirement: Real-time message exchange
The system SHALL support real-time private and group messaging through the current WebSocket-based behavior. In private conversations, the `/ai` command SHALL be disabled unless the conversation partner is the AI system user. In group conversations, the `/ai` command SHALL only work when the group bot is enabled.

#### Scenario: User receives a message
- **WHEN** another participant sends a valid message into an accessible conversation
- **THEN** the receiving client can obtain the message through the existing real-time channel

#### Scenario: Private chat disables /ai
- **WHEN** a user sends an `/ai` message in a private chat with a non-AI user
- **THEN** the system SHALL reject the message with an appropriate error

#### Scenario: Group chat requires bot enabled for /ai
- **WHEN** a user sends an `/ai` message in a group with bot disabled
- **THEN** the system SHALL reject the message with an appropriate error
