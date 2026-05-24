## Purpose

Describe the stable favorite-message behavior for easyChat, including adding favorites, removing favorites, and listing saved message items.

## Requirements

### Requirement: Favorite message management
The system SHALL support adding messages to favorites, removing favorites, and listing favorite items according to current behavior.

#### Scenario: User favorites a message
- **WHEN** an authenticated user favorites a supported message
- **THEN** the system stores the favorite and returns it through the existing favorites flows
