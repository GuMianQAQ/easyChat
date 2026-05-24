## Purpose

Describe the stable Electron desktop runtime behavior for easyChat, including tray integration, custom title bar behavior, close-to-tray behavior, and desktop attention behavior.

## Requirements

### Requirement: Desktop shell runtime behavior
The Electron desktop client SHALL preserve its current shell behavior, including single-instance handling, tray integration, custom title bar behavior, and close-to-tray behavior. Clarifying unread and attention flows SHALL not change the current close-to-tray or normal shell lifecycle behavior.

#### Scenario: User closes the desktop window
- **WHEN** the user closes the main desktop window through the current UI
- **THEN** the desktop client follows the existing close-to-tray behavior rather than exiting unexpectedly

### Requirement: Desktop shell can open a dedicated Moments window
The Electron desktop client SHALL support a dedicated Moments window that is separate from the main chat window and the attention preview window. Activating the Moments entry from the main desktop shell MUST create, focus, restore, or foreground that dedicated window instead of reusing the main chat workspace container.

#### Scenario: User opens Moments when no window exists
- **WHEN** the desktop user activates the Moments entry and no Moments window is currently open
- **THEN** the system creates a dedicated Moments window and shows the user's self-view Moments surface there

#### Scenario: User opens Moments when the window already exists
- **WHEN** the desktop user activates the Moments entry and a Moments window already exists
- **THEN** the system focuses or restores that existing Moments window instead of opening duplicate windows by default

#### Scenario: User closes the main chat window while Moments is open
- **WHEN** the main chat window changes visibility or close-to-tray state according to existing desktop shell behavior
- **THEN** the dedicated Moments window lifecycle remains explicitly managed as its own desktop window rather than being silently remapped into the chat workspace

### Requirement: Desktop attention behavior
The Electron desktop client SHALL support the current attention behavior for incoming messages, including tray flashing, taskbar flashing, title updates, and hover preview behavior. Desktop attention SHALL be driven by background unread message conditions and SHALL clear when the relevant conversation becomes actively visible under desktop runtime visibility rules.

#### Scenario: Desktop client receives a background message
- **WHEN** a new message arrives while the relevant desktop attention conditions are met
- **THEN** the desktop client triggers the existing attention behavior without changing web client behavior

#### Scenario: Desktop client opens the attention target conversation
- **WHEN** the user restores or focuses the desktop client and opens the conversation associated with the active desktop attention state
- **THEN** the desktop client clears attention for that conversation and stops global attention behavior when no attention-target conversations remain
