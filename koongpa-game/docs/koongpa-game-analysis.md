# Koongpa Browser Fighter: System and Asset Notes

## Scope

This note documents the Koongpa project source and its own image files. It does not inspect, unpack, or reproduce a third-party fighting game's executable, code, characters, stages, or interface.

The project is a Node.js/TypeScript application with a browser renderer. The Electron desktop shell and the browser build use the same React and Phaser game.

## Runtime structure

| Area | Responsibility |
| --- | --- |
| `src/renderer/src/main.tsx` | Mounts the React application. |
| `src/renderer/src/App.tsx` | Home, fighter selection, battle HUD, result screen, and exit flow. |
| `src/renderer/src/game/GameCanvas.tsx` | Creates and destroys the Phaser game canvas. |
| `src/renderer/src/game/ArenaScene.ts` | Loads assets and runs movement, CPU behavior, attacks, hit reactions, audio, and the arena camera. |
| `src/renderer/src/game/types.ts` | Shared DNA, weapon, result, input, HUD, and scene callback types. |
| `src/main/index.ts` | Electron window configuration, fullscreen shortcut, and application lifecycle. |
| `src/preload/index.ts` | Exposes the narrow quit action to the sandboxed renderer. |

The screen flow is `home -> select -> game -> result`. The renderer communicates HUD and result changes from `ArenaScene` to React using `GameSceneCallbacks`.

## Fighter data model

`ArenaScene.ts` keeps runtime fighter state in a `Fighter` record:

- Position and motion: `x`, `vx`, `z`, `vz`, `facing`, `speed`
- Health and combat: `hp`, `maxHp`, `damage`, `attackKind`, `attackMs`, `attackReach`, `attackPower`
- Reactions: `hitstunMs`, `knockdownMs`, `landingSquashMs`
- Combo and transformation: `combo`, `weakChain`, `gauge`, `transformingMs`, `transformedMs`
- Presentation: image sprite, shadow, aura, result pose

DNA tuning is data-driven in `DNA_STATS`:

| DNA | Speed | Damage multiplier | HP |
| --- | ---: | ---: | ---: |
| POWER | 270 | 1.22 | 130 |
| SPEED | 370 | 0.92 | 95 |
| BALANCE | 315 | 1.00 | 110 |

The CPU uses a separate speed and damage multiplier. Attacks resolve once during an active attack window after checking facing, distance, and vertical separation. A confirmed hit applies damage, knockback, hitstun, hitstop, camera shake, and effects; player hits also advance the combo and transformation gauge.

## Controls and combat loop

- `A/D`: move; a quick double tap dashes. Holding away from the CPU guards.
- `W`: jump; `J+K` recovers while launched in the air.
- `J`: three-step light chain. `K`: heavy knockback. `L`: transformed special.
- `T`: transform when the gauge is full.

The Phaser update loop clamps frame delta, advances fighter timers and movement, updates the CPU, resolves attacks, animates sprites, tracks the arena camera, and periodically reports the HUD. Hit pause is represented by `hitStopMs`; attacks are time-windowed rather than copied from a third-party move script.

The character art is a single image per fighter, so body lean, squash/stretch, bob, tint, and rotation are procedural presentation effects rather than frame-by-frame skeletal animation.

## Image data and runtime mapping

The source images live in `assets/`. Although their filenames end in `.png`, the file signatures identify them as WebP. Their alpha-cleaned runtime counterparts in `assets/processed/` are actual PNG files; the game uses these so characters composite over the rooftop instead of showing the original white image background.

| Asset | Runtime role |
| --- | --- |
| `stage_rooftop.png` | Fixed arena backdrop, scaled to the Phaser viewport. |
| `power.png`, `speed.png`, `balance.png` | Fighter selection and player textures. |
| `rival.png` | CPU texture. |
| `power_transform.png` | Player texture while transformed. |

These are individual images, not a packed character/stage/UI atlas. The asset analyzer produces a contact sheet to review each image and a format report to inspect dimensions, color type, transparency, and container integrity. For PNG it checks chunk CRCs; for WebP it checks RIFF/chunk sizes.

## Build and verification

Run the browser renderer with Node.js:

```powershell
npm run dev:web
```

Open `http://127.0.0.1:5173/` and press `Ctrl+C` in the terminal to stop the server. `npm run dev` starts the Electron desktop app; `npm run build` creates the Windows portable executable.

Generate the owned-asset analysis outputs:

```powershell
python tools\asset_analysis\analyze_assets.py
```

Outputs are written separately to `analysis/koongpa-assets/asset-report.json` and `analysis/koongpa-assets/contact-sheet.svg`. The analyzer uses only Python's standard library and does not decrypt or extract executable resources.
