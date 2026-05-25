## ADDED Requirements

### Requirement: Stale frontend branches are removed after surface extraction
The chat frontend SHALL remove product-path remnants once a surface has been fully extracted into a different runtime or shell path. Obsolete dock variants, duplicate style wiring, and other no-longer-reachable frontend branches MUST NOT remain as dormant compatibility paths after the new surface is established.

#### Scenario: Maintainer reviews the frontend after Moments extraction
- **WHEN** a maintainer inspects the main frontend shell and shared frontend types after Moments has been moved into its dedicated window
- **THEN** the maintainer does not encounter stale dock/state variants or duplicate shell/style paths that still pretend Moments is a main-workspace dock surface

### Requirement: Hot frontend update helpers avoid redundant full-list work
The chat frontend SHALL reduce redundant repeated scans and whole-list work in hot update helpers where the current state already provides enough local context. Conversation mutation helpers and desktop-attention helpers MUST reuse known entries or cached lookups where practical instead of repeating equivalent `find`, `findIndex`, or full-list sort work for the same event path.

#### Scenario: Maintainer traces a hot conversation update path
- **WHEN** a maintainer reviews a helper involved in incoming message, group-summary, or related conversation-list updates
- **THEN** that helper uses a smaller set of repeated scans and avoids unnecessary equivalent whole-list work for the same update step

#### Scenario: Maintainer traces desktop attention preview assembly
- **WHEN** a maintainer reviews how desktop attention derives conversation and friend display data for a new attention event
- **THEN** the helper uses clearer and less repetitive lookup flow than a chain of repeated equivalent list scans for the same event
