## Why

The standalone Moments window exists, but key interaction flows still feel broken: cover changes can fail silently, author names do not open profile cards, and contact details do not expose a clear route into a friend's Moments surface. Now that the window boundary is established, the next gap is completion and trust, not another round of surface-only restyling.

## What Changes

- Complete the Moments cover flow so changing or resetting the cover provides observable success or failure feedback instead of failing silently.
- Extend the dedicated Moments window from self-only launch behavior to context-aware launch behavior that can show the current user's own Moments or a friend's read-only Moments view.
- Connect author-name and avatar interactions inside Moments to the existing profile-card system so people in the feed are inspectable instead of exposing dead clicks.
- Add a dedicated `朋友圈` row to contact details, placed between `朋友权限` and `个性签名`, to provide a stable entry for viewing a friend's Moments surface.
- Keep the existing feed, publishing, like, comment, and delete business logic, but constrain edit actions to self-view and read-only browsing to friend-view.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `moments-feed`: Moments must support complete cover interactions, profile-card access from the feed, and a read-only friend-view mode in the dedicated Moments window.
- `desktop-shell`: The desktop runtime must pass launch context into the dedicated Moments window instead of supporting only no-argument self-view opening.
- `friends`: Contact details must expose a dedicated Moments entry for a friend profile, including stable placement in the detail layout.

## Impact

- Affected Electron window/preload/runtime code in [frontend/electron/main.ts](D:/GoItem/easyChat/frontend/electron/main.ts), [frontend/electron/preload.ts](D:/GoItem/easyChat/frontend/electron/preload.ts), and [frontend/src/vite-env.d.ts](D:/GoItem/easyChat/frontend/src/vite-env.d.ts).
- Affected Moments renderer and profile-card integration in [frontend/src/components/moments/MomentsWindow.tsx](D:/GoItem/easyChat/frontend/src/components/moments/MomentsView.tsx), [frontend/src/components/common/UserProfileCard.tsx](D:/GoItem/easyChat/frontend/src/App.tsx), and related social/profile lookup helpers.
- Affected contact detail UI in [frontend/src/components/contacts/ContactsDetail.tsx](D:/GoItem/easyChat/frontend/src/components/contacts/ContactsDetail.tsx) and related contact/profile styling.
- Likely requires small additive state changes for Moments window launch context and user-facing error/success feedback around profile-backed cover updates.
