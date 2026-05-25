## 1. Cover rendering reliability

- [x] 1.1 Add or reuse a frontend media URL normalization helper so backend-relative uploaded paths such as `/uploads/...` resolve correctly inside the standalone desktop Moments window.
- [x] 1.2 Update [frontend/src/components/moments/MomentsWindow.tsx](D:/GoItem/easyChat/frontend/src/components/moments/MomentsWindow.tsx) so the visible hero cover always uses the normalized saved `momentCover` value before falling back to the default cover.

## 2. Moments typography polish

- [x] 2.1 Apply a Moments-specific font-family strategy in [frontend/src/styles/moments.css](D:/GoItem/easyChat/frontend/src/styles/moments.css) for hero identity, post text, and comment text without globally changing the rest of the app.
- [x] 2.2 Adjust supporting Moments text styles as needed so the new typography reads as a content-first personal surface rather than a generic chat utility panel.

## 3. Dedicated window width adjustment

- [x] 3.1 Increase the fixed Moments window width in [frontend/electron/main.ts](D:/GoItem/easyChat/frontend/electron/main.ts) from the current narrow first-pass size to roughly 620px while preserving fixed-width behavior.
- [x] 3.2 Verify the internal reading column still feels intentional after widening the shell, and only adjust the inner stream width if the wider window exposes obvious spacing issues.

## 4. Verification

- [x] 4.1 Smoke-test cover update plus reopen flow to confirm a saved uploaded cover now displays correctly in the standalone Moments window.
- [x] 4.2 Rebuild the desktop app and verify the widened Moments window, updated typography, and cover rendering behavior in the packaged runtime.
