## ADDED Requirements

### Requirement: File selection via toolbar button
The system SHALL allow users to select and send files through the toolbar file button.

#### Scenario: User clicks file button
- **WHEN** user clicks the file button in the message composer toolbar
- **THEN** system opens a file selection dialog

#### Scenario: User selects a file
- **WHEN** user selects a file from the file selection dialog
- **THEN** system uploads the file and sends a file message to the conversation

### Requirement: File message rendering
The system SHALL render file messages with appropriate file information and download capability.

#### Scenario: File message display
- **WHEN** a file message is displayed in the chat
- **THEN** system shows the file icon, file name, file size, and a download button

#### Scenario: File download
- **WHEN** user clicks the download button on a file message
- **THEN** system downloads the file to the user's device

### Requirement: File message quote support
The system SHALL support quoting file messages.

#### Scenario: Quote a file message
- **WHEN** user quotes a file message
- **THEN** system shows "[文件]" as the quote content

#### Scenario: Display quoted file message
- **WHEN** a message with a file quote is displayed
- **THEN** system shows the quote with "[文件]" label

## MODIFIED Requirements

### Requirement: Image selection via toolbar button
The system SHALL allow users to select and send images through the toolbar image button. This capability already exists (via paste/drag), this change enables the toolbar button entry point.

#### Scenario: User clicks image button
- **WHEN** user clicks the image button in the message composer toolbar
- **THEN** system opens a file selection dialog filtered to image types

#### Scenario: User selects an image
- **WHEN** user selects an image from the file selection dialog
- **THEN** system uploads the image and sends an image message to the conversation
