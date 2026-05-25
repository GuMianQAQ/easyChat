## MODIFIED Requirements

### Requirement: Desktop shell can open a dedicated Moments window
The Electron desktop client SHALL support a dedicated Moments window that is separate from the main chat window and the attention preview window. Activating the Moments entry from the main desktop shell MUST create, focus, restore, or foreground that dedicated window instead of reusing the main chat workspace container. The window-open contract MUST accept launch context so the same dedicated window can show either the current user's self-view Moments surface or a targeted friend's read-only Moments surface.

#### Scenario: User opens self Moments when no window exists
- **WHEN** the desktop user activates their own Moments entry and no Moments window is currently open
- **THEN** the system creates a dedicated Moments window and shows the user's self-view Moments surface there

#### Scenario: User opens friend Moments when the window already exists
- **WHEN** the desktop user activates a friend's Moments entry and a Moments window already exists
- **THEN** the system focuses or restores that existing Moments window and updates it to the requested friend's read-only Moments context instead of opening duplicate windows by default

#### Scenario: User reopens self Moments after browsing a friend
- **WHEN** the desktop user activates their own Moments entry while the dedicated Moments window is currently showing another user's feed
- **THEN** the system reuses the same Moments window instance and switches it back to the viewer's self-view Moments context

#### Scenario: User closes the main chat window while Moments is open
- **WHEN** the main chat window changes visibility or close-to-tray state according to existing desktop shell behavior
- **THEN** the dedicated Moments window lifecycle remains explicitly managed as its own desktop window rather than being silently remapped into the chat workspace
