## 1. Moments window context and desktop bridge

- [x] 1.1 Extend the Electron `momentsWindow` open flow in [frontend/electron/main.ts](D:/GoItem/easyChat/frontend/electron/main.ts) to accept optional target-user launch context and reuse one window instance across self and friend views.
- [x] 1.2 Extend [frontend/electron/preload.ts](D:/GoItem/easyChat/frontend/electron/preload.ts) and [frontend/src/vite-env.d.ts](D:/GoItem/easyChat/frontend/src/vite-env.d.ts) so the renderer can open Moments with self or friend context and read the current launch context inside the standalone window.

## 2. Moments renderer completion

- [x] 2.1 Refactor [frontend/src/components/moments/MomentsWindow.tsx](D:/GoItem/easyChat/frontend/src/components/moments/MomentsWindow.tsx) to derive self mode versus friend mode from launch context, hiding composer and cover-edit actions in friend mode.
- [x] 2.2 Add explicit cover-operation feedback for upload, reset, and persistence failure paths instead of swallowing errors silently.
- [x] 2.3 Reuse the existing profile-card lookup/rendering flow so author names and avatars in Moments open inspectable profile cards instead of no-op clicks.

## 3. Friend entry and read-only profile mode

- [x] 3.1 Add a dedicated `朋友圈` row to [frontend/src/components/contacts/ContactsDetail.tsx](D:/GoItem/easyChat/frontend/src/components/contacts/ContactsDetail.tsx) between `朋友权限` and `个性签名`.
- [x] 3.2 Wire the new contact-detail row to open the dedicated Moments window in the selected friend's read-only view.
- [x] 3.3 Verify that friend-view feed browsing preserves existing visibility semantics and does not expose self-only publish or cover-edit controls.

## 4. Verification

- [x] 4.1 Smoke-test self-view and friend-view Moments window flows, including open/focus switching, author profile cards, and the contact-detail entry.
- [x] 4.2 Rebuild the desktop app and verify cover preview, cover menu, and cover update success/failure feedback in the packaged runtime.
