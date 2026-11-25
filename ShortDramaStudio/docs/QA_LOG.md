# QA log

## Guided workflow review

Reviewed at 1152 × 720, the minimum comfortable window size used in the initial layout pass.

## Visual comfort update

- Raised workspace, navigation, cards, and form surfaces from near-black to soft warm-white and lavender.
- Reworked the hero, episode covers, character cards, lookbook artwork, and preview canvas into soft pastel tones.
- Kept contrast in the preview by using dark, legible typography on a light title panel.
- Switched primary buttons to a light lavender gradient with dark text and increased contrast on supporting labels.

### Five critique-and-fix passes

1. **Color identity:** the decorative art still used green/brown accents after the violet look was fixed. Recolored the hero, episode covers, cast backdrops, frame art, and lookbook to match the locked violet/magenta palette.
2. **Navigation reachability:** the full menu and offline status could compete for space in a short window. Made the sidebar scroll independently and kept the offline status reachable.
3. **First-use clarity:** a new project could reach script splitting before any episode existed. Moved episode creation before script writing and added a six-step clickable checklist with completion and next-step states.
4. **Action language:** some actions used internal studio terms without explaining what to do. Added short Korean “쉽게 하기” directions to each work area and made the video action explicit: “WebM 영상 저장”.
5. **Small-screen feedback:** a filter with no results could resemble a broken panel, and side-menu icons were not self-explanatory to assistive technology. Added a clear no-results message, descriptive menu hints, and a compact-window layout.

### Verified

- [x] Home displays all six steps as clickable workflow cards.
- [x] A fresh project directs the user to title/logline, then episode creation, then script writing.
- [x] Script splitting creates scene cards; the persistent next-step control then guides the user to characters and the storyboard.
- [x] Camera-motion page presents all 12 selectable presets.
- [x] Preview page paints the canvas, plays through the sequence, and records a WebM file.
- [x] Main navigation exposes nine labeled work areas.
- [x] Korean UI guidance and offline desktop fonts do not require a web connection.

## Follow-up: guided flow and warm color palette

- Moved the six-step checklist to the top of the home screen and removed dashboard tiles that competed with it.
- Added a persistent numbered stepper with previous/next actions to each guided screen; the next action explains missing episodes or scenes.
- Put title, genre, and logline before optional visual settings on the first step.
- Kept script splitting on the script screen so the user can proceed in the displayed order.
- Replaced the lavender background and accents with warm cream surfaces and sage-green controls; updated the default project and presets to match.

### Validation

- [x] `npm run typecheck`
- [x] `npm run build`
- [x] `npm run dist`
