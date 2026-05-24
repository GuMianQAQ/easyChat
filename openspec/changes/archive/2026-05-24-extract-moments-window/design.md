## Context

Moments already exists as a first-class feed capability, but it is still rendered from the main chat renderer through the `activeDock === "moments"` path in [frontend/src/components/app/AppShell.tsx](/D:/GoItem/easyChat/frontend/src/components/app/AppShell.tsx). That forces a communication workspace container onto a reading-oriented feed. Electron runtime code already supports separate windows and preload bridges for desktop-specific behavior in [frontend/electron/main.ts](/D:/GoItem/easyChat/frontend/electron/main.ts) and [frontend/electron/preload.ts](/D:/GoItem/easyChat/frontend/electron/preload.ts), so the right correction is to give Moments its own desktop window lifecycle instead of continuing to special-case the chat shell.

The backend moments service and APIs are already sufficient for the core feed, creation, like, comment, and delete flows. The new work is primarily about desktop container boundaries plus a profile-level cover field for self-view presentation.

## Goals / Non-Goals

**Goals:**
- Establish Moments as a dedicated desktop reading window separate from the main chat window.
- Limit the first implementation to self-mode so the window, hero, and cover interactions can be stabilized without profile-view permission branching.
- Keep the existing moments feed behavior and posting interactions, but render them in a narrower, reading-first window.
- Add a user profile-backed Moments cover field with default fallback, full-size preview, and context-menu-driven cover actions.
- Remove chat-shell-specific Moments exceptions from the main workspace.

**Non-Goals:**
- Supporting profile-mode viewing of another user's Moments window in this phase.
- Supporting multiple simultaneous Moments windows or tabbed window management.
- Reworking the moments backend feed model, visibility model, or interaction semantics beyond what is necessary for self-mode cover data.
- Adding a complex cover editor, cropper, or drag-to-reposition workflow.

## Decisions

### 1. Moments becomes a dedicated Electron window
Moments will no longer be opened by switching the main renderer dock. Instead, the chat renderer will call a preload bridge that asks the Electron main process to create, focus, restore, or re-show a dedicated `momentsWindow`.

Why:
- The current visual problems are driven by the wrong window-level container, not by isolated CSS mistakes.
- The desktop runtime already has explicit window orchestration patterns, so adding another first-class window fits the existing architecture.

Alternatives considered:
- Keep Moments in the main shell and continue adding layout exceptions: rejected because it preserves the wrong top-level container.
- Use a large in-shell modal or sheet: rejected because it would still inherit main shell behavior and likely accumulate overlay-specific complexity.

### 2. The first phase supports self-mode only
The dedicated window opens the current user's own Moments space. Profile-mode support for viewing another user's Moments will be intentionally deferred.

Why:
- Self-mode resolves the current product problem: the user's own Moments surface is visually and structurally wrong today.
- It avoids introducing a second set of view/edit permissions while the new window boundary is being established.

Alternatives considered:
- Build self-mode and profile-mode together: rejected because it would expand scope into permission branching, read-only hero behavior, and profile entry routing.

### 3. Cover data belongs to the user profile model
The cover image will be stored as a profile-level field such as `momentCover`, not as a post field and not as a global wallpaper/theme setting.

Why:
- The cover represents the identity surface for the current user, not a single post.
- The same field will naturally support future profile-mode viewing without another data migration.

Alternatives considered:
- Store cover locally in desktop UI settings: rejected because it would not travel with the account and would break cross-view consistency.
- Treat cover as a Moments-only local config: rejected because it splits profile identity data across unrelated domains.

### 4. Cover interactions split into consume vs configure
Left-clicking the cover opens a full-size preview. Right-clicking the cover opens a context menu containing `View cover`, `Change cover`, and `Reset cover` in self-mode. The same preview behavior may remain available in future read-only modes, but edit actions are self-mode only.

Why:
- This keeps the hero visually clean and desktop-native.
- It clearly separates content viewing from configuration.

Alternatives considered:
- Put always-visible edit buttons on the hero: rejected because it weakens the calm, personal reading surface.

### 5. Existing moments business logic is reused
The dedicated window will continue using the existing feed, create, like, comment, and delete APIs and UI interaction semantics. The change is about the renderer container and profile cover support, not a feed-domain rewrite.

Why:
- It keeps scope controlled and avoids replacing functioning backend behavior.
- The current Moments data model is already good enough for self-mode v1.

## Risks / Trade-offs

- **[Desktop window orchestration grows more complex]** → Keep the first phase to a single reusable `momentsWindow` instance with straightforward open/focus/restore behavior.
- **[Profile model changes ripple across frontend and backend]** → Keep the cover field small and additive, modeled similarly to existing avatar/signature profile fields.
- **[Main-shell Moments code may linger as dead paths]** → Explicitly remove `activeDock === "moments"` rendering and related shell exceptions rather than leaving a second dormant route.
- **[Future profile-mode support may need additional context passing]** → Reserve the open-window contract so it can later accept launch context, but implement only no-argument self-mode behavior now.

## Migration Plan

1. Add the profile-backed Moments cover field and fallback behavior.
2. Add a dedicated Moments window in Electron main/preload and connect the dock entry to open/focus it.
3. Extract the current Moments renderer into a standalone window-scene component with self-mode hero and feed behavior.
4. Remove Moments rendering from the main chat shell and keep the chat workspace focused on communication surfaces only.
5. Verify desktop build and runtime behavior for open/focus/minimize/close plus cover preview/menu interactions.

## Open Questions

- Whether the dedicated Moments window should reuse the standard desktop title bar controls verbatim or introduce a lighter title bar treatment while still staying inside the existing shell system.
- Whether resetting a cover should clear the profile field entirely or set it to an explicit default-cover token.
