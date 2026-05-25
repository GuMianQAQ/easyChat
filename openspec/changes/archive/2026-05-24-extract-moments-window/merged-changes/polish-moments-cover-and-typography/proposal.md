## Why

The standalone Moments window is functionally present, but it still feels unfinished in three visible ways: custom covers can be saved yet fail to render reliably, the typography still reads like generic desktop chat UI, and the window remains narrower than the intended reading surface. These are now the highest-friction issues because they undermine trust in cover customization and keep the Moments window from feeling like a deliberate content space.

## What Changes

- Fix Moments cover rendering so profile-backed cover images display reliably after a successful update, including uploaded `/uploads/...` assets in the desktop runtime.
- Introduce a more intentional Moments-specific typography treatment instead of relying entirely on the default app-wide sans/blackface stack.
- Widen the dedicated Moments window by roughly one quarter while preserving the controlled single-column reading layout and fixed-width desktop behavior.
- Keep existing cover preview and cover menu behavior, but ensure the visible cover always reflects the saved profile value when available.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `moments-feed`: Moments cover rendering and visual presentation requirements change so saved covers must render reliably and the dedicated reading surface must use a more intentional typography treatment.
- `desktop-shell`: The dedicated Moments window width requirement changes to support a slightly wider but still constrained reading surface.

## Impact

- Affected Moments rendering and media URL handling in [frontend/src/components/moments/MomentsWindow.tsx](D:/GoItem/easyChat/frontend/src/components/moments/MomentsWindow.tsx) and related frontend URL helpers.
- Affected Moments visual design in [frontend/src/styles/moments.css](D:/GoItem/easyChat/frontend/src/styles/moments.css) and potentially shared font tokens in [frontend/src/styles/global.css](D:/GoItem/easyChat/frontend/src/styles/global.css).
- Affected dedicated desktop window sizing in [frontend/electron/main.ts](D:/GoItem/easyChat/frontend/electron/main.ts).
