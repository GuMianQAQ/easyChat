## MODIFIED Requirements

### Requirement: Desktop shell runtime behavior
The Electron desktop client SHALL preserve its current shell behavior, including single-instance handling, tray integration, custom title bar behavior, and close-to-tray behavior. Clarifying unread and attention flows SHALL not change the current close-to-tray or normal shell lifecycle behavior.

#### Scenario: User closes the desktop window
- **WHEN** the user closes the main desktop window through the current UI
- **THEN** the desktop client follows the existing close-to-tray behavior rather than exiting unexpectedly

### Requirement: Desktop attention behavior
The Electron desktop client SHALL support the current attention behavior for incoming messages, including tray flashing, taskbar flashing, title updates, and hover preview behavior. Desktop attention SHALL be driven by background unread message conditions and SHALL clear when the relevant conversation becomes actively visible under desktop runtime visibility rules.

#### Scenario: Desktop client receives a background message
- **WHEN** a new message arrives while the relevant desktop attention conditions are met
- **THEN** the desktop client triggers the existing attention behavior without changing web client behavior

#### Scenario: Desktop client opens the attention target conversation
- **WHEN** the user restores or focuses the desktop client and opens the conversation associated with the active desktop attention state
- **THEN** the desktop client clears attention for that conversation and stops global attention behavior when no attention-target conversations remain
