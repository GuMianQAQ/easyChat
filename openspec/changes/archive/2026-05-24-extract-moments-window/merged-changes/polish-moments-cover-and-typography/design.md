## Context

The dedicated Moments window already exists, but its last-mile presentation still carries three concrete flaws. First, profile-backed cover images can be saved as upload-path strings such as `/uploads/...`, yet the Moments renderer currently treats those strings as directly renderable `background-image` values, which is fragile in the standalone desktop window. Second, Moments still inherits the generic app-wide sans/blackface stack, so the surface reads more like a chat utility than a content-first personal space. Third, the dedicated window is fixed at `500px`, which keeps the reading surface tighter than intended even after extracting Moments into its own window.

These are not large architectural problems, but they are cross-cutting enough to benefit from explicit design decisions before implementation because they touch desktop shell sizing, media URL handling, and the visual contract of the Moments surface.

## Goals / Non-Goals

**Goals:**
- Ensure a saved Moments cover reliably renders in the standalone desktop window, including uploaded assets stored as relative backend paths.
- Introduce a more intentional Moments-specific typography treatment without destabilizing the rest of the chat application.
- Widen the dedicated Moments window by roughly 25% while preserving its fixed-width reading-surface behavior.
- Keep the existing cover preview and cover menu interactions intact while making the visible hero reflect the actual saved cover when present.

**Non-Goals:**
- Reworking the Moments cover data model or replacing the existing `momentCover` profile field.
- Building a global media asset system for every image in the application.
- Replacing typography across the entire application shell.
- Turning the Moments window into a freely resizable workspace.

## Decisions

### 1. Relative cover paths will be normalized into runtime-safe media URLs
Moments cover rendering will stop relying on raw `momentCover` strings. Instead, the renderer will resolve relative backend media paths such as `/uploads/...` into fully qualified API URLs before applying them to the hero background.

Why:
- The standalone desktop window is a different runtime surface from the backend origin, so relative upload paths are not dependable as-is.
- This addresses the actual failure mode the user is seeing: successful persistence with missing visible cover rendering.

Alternatives considered:
- Store only absolute URLs in `momentCover`: rejected because it changes persistence semantics and is unnecessary for this fix.
- Special-case only Moments cover rendering inline: acceptable as a first implementation, but still best expressed as a shared resolver function rather than repeated string checks.

### 2. Typography changes will be scoped to Moments first, not the whole application
The new type treatment will be applied primarily through `moments.css`, with optional light support from shared variables if needed. The rest of the app will keep its current global font stack.

Why:
- The user's complaint is specifically about the Moments surface reading like generic desktop UI.
- Local scoping lowers regression risk for chat, contacts, and settings.

Alternatives considered:
- Replace the global font stack in `global.css`: rejected because it is too broad for a Moments-specific polish pass.
- Keep a single font stack and only adjust weights/sizes: rejected because the current complaint is about the overall type feel, not just scale.

### 3. The Moments window stays fixed-width, but the fixed width increases to about 620px
The dedicated Moments window will remain horizontally constrained, but its fixed width will increase from `500px` to roughly `620px`. The internal content column may stay slightly narrower than the window if that still improves reading rhythm.

Why:
- The surface is currently too tight for the intended cover-plus-feed reading pattern.
- The user explicitly wants it wider, but still not stretchable.

Alternatives considered:
- Make the window freely resizable horizontally: rejected because it reintroduces the wide-workspace problem Moments was extracted to avoid.
- Leave width unchanged and only loosen inner content max-width: rejected because the current pinch comes from the shell width itself, not just the inner stream.

## Risks / Trade-offs

- **[Moments-only font styling could feel inconsistent with the rest of the app]** -> Keep controls and utility text close to the existing sans stack while using the new treatment primarily for hero identity, feed text, and comments.
- **[A cover-only URL resolver could diverge from other image paths later]** -> Prefer a small reusable helper so avatar or future media surfaces can reuse the same normalization rule if needed.
- **[A wider fixed window can expose spacing issues in the current feed]** -> Preserve the single-column max-width and widen the window moderately instead of matching window width directly to feed width.

## Migration Plan

1. Add or reuse a frontend media URL normalization helper for backend-relative upload paths.
2. Update Moments hero cover rendering to use normalized URLs before applying the background image.
3. Apply Moments-specific font-family and typography adjustments in the Moments stylesheet.
4. Increase the dedicated Moments window width constant in the Electron main process while preserving fixed-width behavior.
5. Rebuild the desktop app and verify cover rendering, typography, and widened layout in the packaged runtime.

## Open Questions

- Whether the preferred Moments-specific font should be a serif-leaning reading face (`Noto Serif SC` / `Source Han Serif SC`) or a softer humanist sans (`MiSans` / `HarmonyOS Sans SC`) for the first pass.
- Whether the same media URL normalization should be applied immediately to additional profile-card or avatar surfaces, or left intentionally scoped to Moments for this change.
