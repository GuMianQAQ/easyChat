## 1. Electron window boundary

- [ ] 1.1 Add a dedicated `momentsWindow` lifecycle in [frontend/electron/main.ts](/D:/GoItem/easyChat/frontend/electron/main.ts) with create, focus, restore, and close behavior separate from `mainWindow` and `notificationWindow`.
- [ ] 1.2 Extend [frontend/electron/preload.ts](/D:/GoItem/easyChat/frontend/electron/preload.ts) with a Moments-specific bridge that lets the main chat renderer open or focus the dedicated Moments window.

## 2. Profile-backed cover data

- [ ] 2.1 Extend backend and frontend profile models and update flows to carry a dedicated Moments cover field with default fallback behavior.
- [ ] 2.2 Reuse the existing upload pipeline so the self-view user can change or reset the Moments cover through profile-backed persistence.

## 3. Dedicated Moments renderer scene

- [ ] 3.1 Extract the Moments renderer out of the main chat shell into a standalone window-scene component with a narrow reading layout.
- [ ] 3.2 Implement self-view hero behavior in the standalone Moments scene, including integrated identity, left-click cover preview, and right-click cover context actions.
- [ ] 3.3 Reuse the existing moments feed, publishing entry, like, comment, and delete flows inside the standalone Moments window.

## 4. Main-shell cleanup and verification

- [ ] 4.1 Remove the main-shell `activeDock === "moments"` rendering path and any Moments-specific layout exceptions from [frontend/src/components/app/AppShell.tsx](/D:/GoItem/easyChat/frontend/src/components/app/AppShell.tsx) and related layout components.
- [ ] 4.2 Verify desktop runtime behavior for opening, focusing, minimizing, closing, cover preview, and cover menu interactions, and update any affected tests or smoke-check paths.
