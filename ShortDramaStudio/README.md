# REA Short Drama Studio

REA Short Drama Studio is a free, offline desktop workspace for creating short drama series. No account or internet connection is required.

## 빠른 시작

Windows에서는 `실행하기.bat`을 더블클릭하거나 바탕화면 REA 폴더의 **REA 숏드라마 스튜디오** 바로가기를 실행합니다. `index.html`은 예전 브라우저 화면을 열던 파일이며, 앱 실행에는 사용하지 않습니다. 앱 파일은 `release/win-unpacked/` 안에 있으므로 폴더를 이동하거나 삭제하지 마세요.

홈 화면의 **처음이라면 이 순서대로** 안내를 따라가세요. 카드를 누르면 해당 작업 화면으로 바로 이동합니다.

1. **작품 기획** — 제목과 로그라인을 씁니다.
2. **회차 구성** — 에피소드를 먼저 하나 만듭니다.
3. **대본 작성** — 초안을 붙여넣고 장면 사이에 빈 줄을 넣은 뒤 **장면으로 나누기**를 누릅니다.
4. **인물 만들기** — 캐릭터와 역할을 추가합니다.
5. **장면 설계** — 장면을 선택하고 장소, 대사, 카메라 메모를 입력합니다.
6. **미리보기** — 재생해 보고 **WebM 영상 저장**으로 결과를 만듭니다.

각 화면의 **쉽게 하기** 안내가 다음에 할 일을 알려줍니다. 처음에는 예시 프로젝트를 자유롭게 둘러보거나, 홈에서 **새 프로젝트**를 눌러 시작하세요.

## Studio sections

- **Series home** — recommended next step and completion status
- **Format & lookbook** — choose 9:16, 16:9, 1:1, or 2.35:1 and one of six visual palettes
- **Episodes and script room** — write a draft, split paragraphs into scenes, and set episode hooks
- **Character bible** — maintain character roles, notes, emoji, and accent colors
- **Storyboard** — edit locations, action, dialogue, camera notes, shot length, and reference frames
- **Camera motion** — assign one of 12 offline motion presets to each shot
- **Preview player** — preview the sequence and render a WebM from the procedural canvas
- **Delivery** — export a project JSON, Markdown production notes, or a standalone HTML brief

## Local-first guarantees

- No account, ad, usage cap, or network service is required.
- All fonts, artwork, camera motion, and preview rendering are local. The app does not load external assets or call an API.
- Autosave is written to the app's local user-data folder with atomic file replacement.
- `.json` project files and Markdown production notes are written only after choosing a local file destination.
- Uploaded reference images are resized and embedded into the project file.
- The packaged Windows portable build can run without an installer. WebM rendering uses the built-in browser media recorder.

## Development

```powershell
npm install
npm run dev
npm run typecheck
npm run build
npm run dist
```

The portable Windows executable is written to `release/`.
