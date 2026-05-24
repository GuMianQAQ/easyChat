## ADDED Requirements

### Requirement: Chat frontend state has clearer domain ownership
The chat frontend SHALL organize its hottest responsibilities so future changes do not need to reason about one monolithic top-level control surface. State and side-effect ownership for the core chat flow SHALL be grouped into clearer domains such as session, chat, social, desktop runtime, or preferences where that boundary materially reduces maintenance drag.

#### Scenario: Maintainer inspects the top-level chat frontend structure
- **WHEN** a maintainer reviews the chat frontend's main orchestration layer after this change
- **THEN** the maintainer can identify clearer ownership boundaries for session bootstrap, chat state, social state, desktop attention behavior, and user preferences instead of one mixed control center

### Requirement: Conversation updates converge on fewer state paths
The chat frontend SHALL reduce the number of custom conversation-list mutation paths involved in the core chat flow. Refresh, incoming message, mark-read, clear, delete, and relevant group conversation actions SHALL converge on fewer explicit update paths so future behavior changes do not require editing scattered list logic.

#### Scenario: Maintainer follows an incoming-message conversation update
- **WHEN** a maintainer traces how a new incoming chat message updates the conversation list
- **THEN** the maintainer encounters a smaller, more explicit set of conversation update paths than before the refactor

#### Scenario: Maintainer follows a non-message conversation update
- **WHEN** a maintainer traces how mark-read, clear, delete, or a relevant group action updates the conversation list
- **THEN** the update logic reuses the converged conversation state paths instead of introducing another unrelated list mutation branch

### Requirement: Shell assembly surface is reduced for the chat flow
The chat frontend SHALL reduce the size of the top-level shell assembly contract for chat-facing behavior. The main application layer SHALL pass more domain-shaped state and actions into the shell instead of expanding a single mixed prop surface indefinitely.

#### Scenario: Maintainer reviews shell integration for the chat flow
- **WHEN** a maintainer inspects the shell assembly layer after this change
- **THEN** the chat-facing shell integration exposes a narrower and more organized contract than the prior mixed top-level prop surface

### Requirement: Chat behavior remains stable through maintainability refactoring
The refactor SHALL preserve current user-visible chat behavior while improving maintainability boundaries. Existing regression coverage from the behavior matrix and relevant helper tests SHALL remain valid and be used to verify that conversation semantics, message semantics, and desktop-attention-related behavior do not regress during the refactor.

#### Scenario: Contributor validates the maintainability refactor
- **WHEN** a contributor runs the relevant frontend and behavior-matrix verification after the refactor
- **THEN** the verification still passes without requiring user-visible chat behavior changes to justify the new structure
