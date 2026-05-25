## MODIFIED Requirements

### Requirement: Desktop shell can open a dedicated Moments window
The Electron desktop client SHALL support a dedicated Moments window that is separate from the main chat window and the attention preview window. Activating the Moments entry from the main desktop shell MUST create, focus, restore, or foreground that dedicated window instead of reusing the main chat workspace container. The dedicated Moments window SHALL remain a controlled reading surface with a fixed width rather than a freely stretchable workspace, but that fixed width MUST be wide enough to support the intended cover-led reading layout and SHALL be moderately wider than the original first-pass implementation.

#### Scenario: User opens Moments when no window exists
- **WHEN** the desktop user activates the Moments entry and no Moments window is currently open
- **THEN** the system creates a dedicated Moments window and shows the user's self-view Moments surface there

#### Scenario: User opens Moments when the window already exists
- **WHEN** the desktop user activates the Moments entry and a Moments window already exists
- **THEN** the system focuses or restores that existing Moments window instead of opening duplicate windows by default

#### Scenario: User closes the main chat window while Moments is open
- **WHEN** the main chat window changes visibility or close-to-tray state according to existing desktop shell behavior
- **THEN** the dedicated Moments window lifecycle remains explicitly managed as its own desktop window rather than being silently remapped into the chat workspace

#### Scenario: User attempts to widen the Moments window
- **WHEN** the desktop user resizes the dedicated Moments window
- **THEN** the system preserves the configured fixed-width reading surface instead of allowing arbitrary horizontal stretching
