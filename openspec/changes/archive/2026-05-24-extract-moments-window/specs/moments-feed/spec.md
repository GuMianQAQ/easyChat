## MODIFIED Requirements

### Requirement: Friend-visible moments feed exists as a first-class product area
The system SHALL provide a Moments area as a first-class surface separate from conversations. On the desktop runtime, authenticated users SHALL open their own Moments feed through a dedicated Moments window rather than by reusing the main chat workspace container. The Moments area MUST present one dominant top-to-bottom reading flow inside that separate reading window instead of looking like a generic list/detail feature page.

#### Scenario: Viewer opens their own Moments window on desktop
- **WHEN** an authenticated desktop user activates the Moments entry
- **THEN** the system opens or focuses a dedicated Moments window instead of switching the main chat workspace into a Moments dock page

#### Scenario: Feed includes self and visible friends
- **WHEN** the viewer loads the Moments feed
- **THEN** the feed includes posts authored by the viewer and their visible friends, ordered from newest to oldest

#### Scenario: Feed reads as one continuous primary stream
- **WHEN** the viewer enters the Moments area
- **THEN** the system presents hero, publishing entry, and posts on a single primary reading axis without requiring the viewer to navigate a separate post list first

### Requirement: Users can create moments with text and optional images
The system SHALL allow an authenticated user to publish a moment containing text content and optional uploaded images. A newly created post SHALL become visible in the author's own feed immediately after successful creation. The desktop Moments surface MUST present publishing through a lightweight inline entry inside the dedicated Moments window that can expand into the existing creation flow.

#### Scenario: Create a text-only moment
- **WHEN** a user submits a moment with text content
- **THEN** the system stores the post and returns it as a valid feed item authored by that user

#### Scenario: Create a moment with images
- **WHEN** a user submits a moment with uploaded image URLs
- **THEN** the system stores the post with those images and renders them in the feed item

#### Scenario: Viewer activates the lightweight publishing entry
- **WHEN** the viewer taps or clicks the Moments publishing entry
- **THEN** the system reveals the existing post creation flow without moving the viewer away from the dedicated Moments window

### Requirement: Moments establishes a personal-social visual hierarchy
The system SHALL render the desktop self-view Moments surface as a calm personal-social space led by a cover-style hero, content-first feed entries, and reduced helper copy inside a dedicated reading window. The current user's identity MUST be integrated into the hero, and the hero MUST support a profile-backed cover image with a default fallback. Left-clicking the hero cover MUST open a full-size cover preview, and right-clicking the hero cover MUST expose self-mode cover actions for viewing, changing, or resetting that cover.

#### Scenario: Viewer opens a non-empty self-view Moments window
- **WHEN** the self-view feed contains one or more posts
- **THEN** the surface shows a cover-led hero, an integrated current-user identity treatment, and content-first post entries that do not rely on elevated app-card styling

#### Scenario: Viewer opens an empty self-view Moments window
- **WHEN** the self-view feed contains no posts
- **THEN** the surface remains coherent through the hero and lightweight publishing entry without depending on explanation-heavy empty-state copy

#### Scenario: Viewer previews the cover image
- **WHEN** the self-view user left-clicks the Moments cover
- **THEN** the system opens a full-size preview of the current cover image without leaving the Moments window

#### Scenario: Viewer opens the cover menu
- **WHEN** the self-view user right-clicks the Moments cover
- **THEN** the system shows cover actions that include viewing the current cover, changing the cover, and resetting the cover to the default fallback
