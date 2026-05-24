## Why

The current Moments surface still inherits the chat workspace container, which forces a conversation-oriented width, shell rhythm, and layout compromises onto a reading-oriented social feed. The result is a Moments experience that remains visually weak even after surface restyling because the wrong desktop container is still in control.

## What Changes

- Move Moments entry behavior from an in-shell dock page to a dedicated desktop Moments window that can be opened or focused independently of the chat workspace.
- Constrain the first implementation to self-view only so the new window boundary, cover interactions, and reading layout can be established without also taking on profile-mode permissions.
- Add user-configurable Moments cover behavior for the self view, including a default fallback cover, left-click full-size preview, and right-click cover actions.
- Keep the existing moments feed, post creation, like, comment, and delete logic, but render them inside the dedicated Moments window rather than the chat shell.
- Remove the need for chat-shell-specific Moments layout exceptions such as hiding the sidebar for a special dock mode.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `moments-feed`: Moments changes from a dock-rendered product area to a dedicated desktop reading window with self-mode cover interactions and the same feed behavior inside that separate container.
- `desktop-shell`: The desktop runtime gains a dedicated Moments window lifecycle that can be opened, focused, minimized, and closed separately from the main chat window.

## Impact

- Affected desktop runtime code in [frontend/electron/main.ts](/D:/GoItem/easyChat/frontend/electron/main.ts) and [frontend/electron/preload.ts](/D:/GoItem/easyChat/frontend/electron/preload.ts).
- Affected frontend shell and Moments rendering in [frontend/src/components/app/AppShell.tsx](/D:/GoItem/easyChat/frontend/src/components/app/AppShell.tsx), [frontend/src/components/moments/MomentsView.tsx](/D:/GoItem/easyChat/frontend/src/components/moments/MomentsView.tsx), and [frontend/src/styles/moments.css](/D:/GoItem/easyChat/frontend/src/styles/moments.css).
- Likely requires extending profile data contracts to include a dedicated Moments cover field across backend and frontend profile models.
