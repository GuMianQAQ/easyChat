## MODIFIED Requirements

### Requirement: Moments establishes a personal-social visual hierarchy
The system SHALL render the desktop self-view Moments surface as a calm personal-social space led by a cover-style hero, content-first feed entries, and reduced helper copy inside a dedicated reading window. The current user's identity MUST be integrated into the hero, and the hero MUST support a profile-backed cover image with a default fallback. When a saved cover image exists, the system MUST resolve and render that saved cover reliably in the standalone desktop runtime, including backend-relative uploaded media paths. Left-clicking the hero cover MUST open a full-size cover preview, and right-clicking the hero cover MUST expose self-mode cover actions for viewing, changing, or resetting that cover. The Moments surface MUST use a more intentional typography treatment than the generic application default so it reads as a content-first personal space rather than a generic utility panel.

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

#### Scenario: Saved uploaded cover renders after persistence
- **WHEN** the self-view user has a saved `momentCover` that references an uploaded backend media path
- **THEN** the Moments hero renders that saved cover instead of falling back to the default cover solely because the path is relative
