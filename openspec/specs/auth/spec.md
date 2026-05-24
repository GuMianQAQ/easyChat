## Purpose

Describe the stable authentication and account-management behavior for easyChat, including registration, login, current-user retrieval, and self-service profile maintenance.

## Requirements

### Requirement: User authentication and account access
The system SHALL allow users to register, log in, and retrieve the current authenticated user profile.

#### Scenario: User signs in successfully
- **WHEN** valid credentials are submitted
- **THEN** the system returns an authenticated session result usable by the existing frontend and desktop client

### Requirement: User profile maintenance
The system SHALL allow authenticated users to update their own profile information and password according to current behavior.

#### Scenario: User updates own profile
- **WHEN** an authenticated user submits valid profile changes
- **THEN** the system persists the changes and returns the updated result in the existing format
