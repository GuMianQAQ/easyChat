## ADDED Requirements

### Requirement: Editor window opens after region selection
The system SHALL open a screenshot editor window automatically after the user confirms a region selection in the selector window.

#### Scenario: Editor opens with screenshot
- **WHEN** user confirms region selection in selector window
- **THEN** system closes selector window and opens editor window with the cropped screenshot loaded

#### Scenario: Editor receives screenshot data
- **WHEN** editor window is created
- **THEN** system passes the cropped screenshot dataURL to the editor via IPC

### Requirement: Freehand drawing tool
The system SHALL provide a freehand drawing tool for users to draw annotations on the screenshot.

#### Scenario: Draw with brush
- **WHEN** user selects brush tool and drags on canvas
- **THEN** system draws a freehand path following the mouse movement

#### Scenario: Configure brush size
- **WHEN** user changes brush size setting
- **THEN** system applies new size to subsequent brush strokes

#### Scenario: Configure brush color
- **WHEN** user selects a color from color picker
- **THEN** system applies new color to subsequent brush strokes

### Requirement: Text annotation tool
The system SHALL provide a text tool for users to add text annotations on the screenshot.

#### Scenario: Add text at click position
- **WHEN** user clicks on canvas with text tool selected
- **THEN** system creates an editable text input at the click position

#### Scenario: Confirm text
- **WHEN** user finishes editing text and clicks elsewhere or presses Enter
- **THEN** system renders the text as a non-editable element on the canvas

### Requirement: Shape tools
The system SHALL provide arrow, rectangle, and circle shape tools for marking areas on the screenshot.

#### Scenario: Draw arrow
- **WHEN** user selects arrow tool and drags from point A to point B
- **THEN** system draws an arrow from A to B with the selected color and stroke width

#### Scenario: Draw rectangle
- **WHEN** user selects rectangle tool and drags to define area
- **THEN** system draws a rectangle outline covering the defined area

#### Scenario: Draw circle
- **WHEN** user selects circle tool and drags to define area
- **THEN** system draws an ellipse fitting within the defined area

### Requirement: Mosaic/blur tool
The system SHALL provide a mosaic tool to obscure sensitive information in the screenshot.

#### Scenario: Apply mosaic to area
- **WHEN** user selects mosaic tool and drags over an area
- **THEN** system applies pixelation effect to the covered area

#### Scenario: Mosaic brush size
- **WHEN** user changes mosaic brush size
- **THEN** system applies mosaic with the specified brush width

### Requirement: Undo and redo
The system SHALL support undo and redo operations for all editing actions.

#### Scenario: Undo last action
- **WHEN** user presses Ctrl+Z or clicks undo button
- **THEN** system reverts the last editing action

#### Scenario: Redo last undone action
- **WHEN** user presses Ctrl+Y or clicks redo button
- **THEN** system reapplies the last undone action

#### Scenario: Undo history limit
- **WHEN** undo history exceeds 50 steps
- **THEN** system discards the earliest action to maintain the limit

### Requirement: Export edited screenshot
The system SHALL allow users to confirm and export the edited screenshot.

#### Scenario: Confirm and export
- **WHEN** user clicks confirm button in editor
- **THEN** system exports the canvas as a dataURL and sends it back to the main application

#### Scenario: Export size limit
- **WHEN** exported image exceeds 1MB
- **THEN** system compresses the image to fit within the limit

#### Scenario: Cancel editing
- **WHEN** user clicks cancel button or presses Escape
- **THEN** system closes editor window without exporting

### Requirement: Editor window lifecycle
The system SHALL properly manage the editor window lifecycle.

#### Scenario: Editor window size
- **WHEN** editor window is created
- **THEN** system sizes the window to fit the screenshot aspect ratio, not exceeding 80% of screen dimensions

#### Scenario: Editor window cleanup
- **WHEN** editor window is closed
- **THEN** system cleans up all resources and notifies main process

## MODIFIED Requirements

### Requirement: Screenshot preview in composer
The screenshot preview in the message composer SHALL display the edited screenshot from the editor.

#### Scenario: Preview after editing
- **WHEN** user confirms editing in editor window
- **THEN** composer displays the edited screenshot in the preview area

#### Scenario: Preview after direct capture
- **WHEN** user captures without editing (if editor is skipped)
- **THEN** composer displays the original screenshot in the preview area
