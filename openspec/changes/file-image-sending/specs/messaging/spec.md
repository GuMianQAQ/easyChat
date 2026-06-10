## MODIFIED Requirements

### Requirement: Real-time message exchange
The system SHALL support real-time private and group messaging through the current WebSocket-based behavior. In private conversations, the `/ai` command SHALL be disabled unless the conversation partner is the AI system user. In group conversations, the `/ai` command SHALL only work when the group bot is enabled. The system SHALL also support AI-generated messages through the same real-time channel, using special message type markers to distinguish AI responses from user messages. The system SHALL support three message types: text, image, and file.

#### Scenario: User receives a message
- **WHEN** another participant sends a valid message into an accessible conversation
- **THEN** the receiving client can obtain the message through the existing real-time channel

#### Scenario: Delivered message updates conversation preview
- **WHEN** a real-time message is delivered into a visible conversation list
- **THEN** the conversation preview uses the same content summarization rules that the system uses after a refresh of that conversation summary

#### Scenario: AI message delivery
- **WHEN** an AI response is generated
- **THEN** the system SHALL deliver the AI message through the same WebSocket channel, using a special sender ID to mark it as AI-generated

#### Scenario: Private chat disables /ai
- **WHEN** a user sends an `/ai` message in a private chat with a non-AI user
- **THEN** the system SHALL reject the message with an appropriate error

#### Scenario: Group chat requires bot enabled for /ai
- **WHEN** a user sends an `/ai` message in a group with bot disabled
- **THEN** the system SHALL reject the message with an appropriate error

#### Scenario: File message delivery
- **WHEN** a user sends a file message
- **THEN** the system SHALL validate the file URL format and deliver the message through the WebSocket channel

#### Scenario: File message type validation
- **WHEN** a client sends a message with messageType "file"
- **THEN** the system SHALL validate that the content is a valid file URL starting with "/uploads/"
