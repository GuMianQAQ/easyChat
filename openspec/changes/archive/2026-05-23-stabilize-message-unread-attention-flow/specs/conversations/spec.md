## MODIFIED Requirements

### Requirement: Conversation list and conversation state
The system SHALL provide conversation list data for private chats and group chats, including unread state and latest message summary. Server-provided conversation summaries SHALL be the baseline state for bootstrap and refresh, and client-side real-time updates SHALL reconcile to that baseline without changing the visible meaning of unread counts or latest-message previews.

#### Scenario: User opens the conversation list
- **WHEN** the authenticated client requests conversations
- **THEN** the system returns the current visible conversations in the existing response structure

#### Scenario: Client refreshes after local real-time updates
- **WHEN** the client reloads or refreshes conversations after applying local unread or preview changes from real-time events
- **THEN** the refreshed conversation list preserves the server-visible latest message summary and unread state instead of producing a conflicting preview or unread interpretation

#### Scenario: User opens an active conversation
- **WHEN** the user opens a conversation and the client satisfies the active read conditions for that conversation
- **THEN** the conversation unread state clears in the conversation list and remains aligned with the next refreshed server summary

### Requirement: Conversation-level preferences
The system SHALL support current conversation-level controls such as pinning, muting, marking read, deleting local visibility, and clearing chat history according to existing behavior. Mark-read behavior SHALL clear unread state without altering unrelated preview, mute, or pin settings.

#### Scenario: User mutes a conversation
- **WHEN** the user updates mute state for a conversation they can access
- **THEN** the system persists the setting without changing unrelated conversations

#### Scenario: User marks a conversation read
- **WHEN** the user triggers a mark-read flow for an accessible conversation
- **THEN** the system clears unread state for that conversation without changing its latest preview content or other conversation-level preferences
