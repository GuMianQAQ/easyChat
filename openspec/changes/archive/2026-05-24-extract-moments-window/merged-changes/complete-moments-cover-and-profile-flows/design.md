## Context

The dedicated Moments window solved the biggest container problem, but it still behaves like an incomplete first pass. In [frontend/src/components/moments/MomentsWindow.tsx](D:/GoItem/easyChat/frontend/src/components/moments/MomentsWindow.tsx), cover upload and reset flows swallow errors, author clicks are intentionally no-ops, and the window only understands self-view. In [frontend/src/components/contacts/ContactsDetail.tsx](D:/GoItem/easyChat/frontend/src/components/contacts/ContactsDetail.tsx), contact information has no dedicated Moments entry even though Moments is now a first-class desktop surface.

At the same time, the app already has useful pieces that should be reused rather than reinvented: the existing profile-card flow in [frontend/src/App.tsx](D:/GoItem/easyChat/frontend/src/App.tsx) and [frontend/src/components/common/UserProfileCard.tsx](D:/GoItem/easyChat/frontend/src/components/common/UserProfileCard.tsx), the `momentCover` profile field in auth models, and the dedicated Electron `momentsWindow` lifecycle in [frontend/electron/main.ts](D:/GoItem/easyChat/frontend/electron/main.ts).

## Goals / Non-Goals

**Goals:**
- Make cover change/reset behavior observable, with explicit success or failure feedback instead of silent failure.
- Let the dedicated Moments window open in either self mode or friend/profile mode based on launch context.
- Reuse profile-card behavior inside Moments so feed authors can be inspected from the standalone window.
- Add a dedicated Moments row to contact details in a stable, intentional location.
- Preserve the standalone-window architecture rather than falling back to chat-shell embedding.

**Non-Goals:**
- Reworking the backend feed model or changing friend visibility rules beyond what is needed to browse a friend's feed in read-only mode.
- Introducing multi-window Moments management or tabbed profile browsing.
- Building a new profile-card component specifically for Moments.
- Adding a complex cover editor, cropper, or image-positioning workflow.

## Decisions

### 1. The Moments window launch contract becomes context-aware
`window.myChatMoments.open()` will evolve to accept optional launch context such as `{ userId?: string }`. The main process keeps a single `momentsWindow` instance, but the renderer receives updated context when the user opens their own feed versus a friend's feed.

Why:
- It preserves the clean standalone window boundary while removing the current self-only limitation.
- It avoids proliferating separate windows just to support one additional browsing mode.

Alternatives considered:
- Keep self-only and add a second “friend moments” surface elsewhere: rejected because it would split one concept across two containers.
- Open a new Electron window per user: rejected because it adds window-management complexity too early.

### 2. Profile mode is read-only in the dedicated window
When the target user is not the current user, the Moments window shows that user's visible feed and cover but hides composer and cover-edit actions. Self mode keeps create/delete/edit-cover behavior.

Why:
- It aligns with the user's request for viewing a friend's Moments without re-opening the full permissions problem.
- It lets the same renderer handle both modes with a clear capability split.

Alternatives considered:
- Allow commenting/cover actions to vary by many fine-grained states in v1: rejected because it adds branching before the main flows are reliable.

### 3. Cover operations must surface explicit feedback
Cover change and reset actions will expose user-visible status such as uploading/saving states plus clear error feedback if upload or profile update fails. The system must no longer swallow these failures.

Why:
- The current product issue is not just logic failure; it is invisible failure.
- A desktop interaction that opens a file picker must always tell the user whether the requested change actually completed.

Alternatives considered:
- Keep silent failure and rely on a later retry: rejected because it is indistinguishable from broken functionality.

### 4. Moments reuses the existing profile-card system rather than inventing a new one
Author-name/avatar clicks inside Moments should route through the same lookup and card model already used in the main app shell. The dedicated window will own its own local card state, but it should reuse the same profile payload and card component patterns.

Why:
- This reduces duplication and keeps profile inspection behavior coherent across the app.
- The existing card already encodes friend/self/request state and primary actions.

Alternatives considered:
- Build a Moments-specific author popover: rejected because it duplicates profile semantics and creates another UI branch to maintain.

### 5. Contact details get a dedicated Moments row, not a hidden action
The contact detail page will add a standalone `朋友圈` row between `朋友权限` and `个性签名`. That row acts as the stable entry point to open the dedicated Moments window for that contact.

Why:
- It matches the user's requested placement and keeps Moments as profile information rather than a buried overflow action.
- It supports future expansion if the row later needs to display visibility state or last-updated metadata.

Alternatives considered:
- Put the action in the overflow menu: rejected because it hides a now-important social surface.
- Put the action at the bottom with chat buttons: rejected because it makes Moments feel like a secondary action rather than a profile facet.

## Risks / Trade-offs

- **[Friend-view Moments may expose permission gaps]** → Keep profile mode read-only and rely on existing backend visibility rules before adding richer interactions.
- **[Reusing profile-card code across windows can create hidden coupling]** → Keep data lookup shared but let the standalone Moments window own its own card state and close behavior.
- **[More feedback around cover upload can introduce extra UI states]** → Limit the first pass to a small status/error surface rather than adding a full media workflow.
- **[Context-aware window opening expands preload/runtime contracts]** → Keep the launch payload minimal and additive, centered on target user identity only.

## Migration Plan

1. Extend the `myChatMoments` desktop bridge and main-process handler to accept optional user context.
2. Refactor the Moments renderer to derive self mode versus friend mode from launch context.
3. Add visible cover-operation feedback and preserve full-size preview/menu behavior in self mode.
4. Reuse profile-card lookup/rendering inside the Moments window for author interactions.
5. Add the dedicated Moments row to contact details and wire it to the standalone window open flow.
6. Rebuild the desktop app and verify self-view, friend-view, profile-card, and cover-operation flows.

## Open Questions

- Whether friend-view should allow commenting immediately or remain fully read-only in the first pass.
- Whether the contact-detail Moments row should later display availability text such as “可查看” / “不可查看” once the friend-view rules are surfaced more explicitly.
