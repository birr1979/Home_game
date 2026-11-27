---
name: pocket-town
description: How to change, test and publish Pocket Town, the pretend-play PWA game in this repo. Covers adding characters, items, furniture, tap actions, how-to steps, sound effects and music, fixing bugs, and deploying to GitHub Pages. Use for any work on this game.
---

# Pocket Town

A pretend-play sandbox for young kids (the same genre as Toca Boca, with all-original content).
There are three rooms side by side: a bedroom, a kitchen and a garden. Friends and things can be
dragged around, fed, dressed up and put to bed, and tapping furniture makes surprises pop out.
It is plain HTML, CSS and JS with no build step and no dependencies, installable and offline-ready.

- Live: https://birr1979.github.io/Home_game/ (the path is **case-sensitive**: `home_game` gives a 404)
- Repo: `git@github.com:birr1979/Home_game.git`, branch `main`. Every push deploys to GitHub Pages.

## Ground rules

- **Original content only.** The game is "like Toca Boca" in genre, never in characters, art, names or levels. Draw new things as inline SVG in the house style: flat pastel shapes, round friendly faces, no outlines on characters.
- **Music must be public-domain compositions**, synthesised in code. Never add recordings, audio files or modern songs.
- **Keep it vanilla.** No frameworks, bundlers, npm dependencies, external fonts or CDNs. The service worker only caches same-origin files, so anything external breaks offline play.
- **The audience is small kids.** Words stay short, tap targets stay at least 44px, and there are no links out, ads, sign-ins or data collection. Everything is saved in `localStorage` on the device.

## Map of the code

| File | What's in it |
| --- | --- |
| `index.html` | Page shell: `#stage > #world` (game), `#ui` buttons, `#intro` title screen, `#howto` guide dialog, `#rotate` tip |
| `style.css` | Rooms, entity animations (`dragging`, `land`, `pop`, `hop`, `chomp`, `sleep`), night shades, UI, intro and guide (with a short-landscape layout) |
| `game.js` | Everything else, in one IIFE (see order below) |
| `sw.js` | Service worker: network-first, falls back to cache offline. **`CACHE` must be bumped on every release.** |
| `manifest.webmanifest`, `icons/` | Install metadata. The icons were drawn with System.Drawing (PowerShell) |
| `.github/workflows/pages.yml` | Separate build and deploy jobs (see Publish) |
| `qr-code.png/svg` | QR code for the live URL (not committed unless the user asks) |

`game.js` sections, in order:
1. constants
2. **ART**: `PEOPLE`/`personSVG`, cat, `item(...)` registry, then the `FOODS`/`BAKES`/`HATS`/`TOYS` spawn lists
3. **FURN** (furniture and decoration)
4. state
5. **sound**: `audio()` unlock, `tone()`, `sfx`, then music `PIECES`, `renderMusic()`, `startMusic`/`stopMusic`
6. `buildWorld`
7. entities and physics (`makeEnt`, `settle`, `fall`, `follow`, `tryInteract`)
8. `ACTIONS` (furniture taps)
9. camera
10. input
11. `tick` loop
12. save/load and `setupDefault`
13. UI buttons
14. intro and **STEPS** (the how-to guide)
15. start-up and service worker registration

## Core concepts

- **World**: 3000 × 700 units, with room *i* at x = i·1000. The view scales to the screen height (portrait uses a smaller scale).
- **Entity position = bottom-centre** `(x, y)`. The walkable floor is the band `FLOOR_MIN..FLOOR_MAX` (565–685); y gives depth.
- **Surfaces** are `{x1, x2, top, tag?}` in world coordinates. Dropped things fall onto the highest surface below them, or to the floor. A surface tagged `'bed'` puts characters to sleep.
- **Z-order** = `y * 2` (characters below items at the same y). Attached items sit at the parent's z + 1, and anything being dragged goes on top. Night shades are `z-index: 60000`.
- **Slots** on characters are offsets from bottom-centre: `head`, `mouth`, `hand`.
  - Dropping food near the mouth eats it.
  - Dropping a `wear` item near the head puts it on, sunk by `wear` units.
  - Dropping anything near the hand makes the character hold it.
- **Item cap**: `MAX_ITEMS` (45). The oldest loose item disappears when a spawn goes over the cap.
- **Save**: `localStorage['pocket-town-save-v1']` holds `{v:1, dark, cam, ents:[{id,k,x,y,a,s,t}]}`. Unknown kinds are skipped on load. If you rename or remove a kind, or change the save shape, bump the key (or migrate) so old saves don't break.
- **Default town** (`setupDefault`): ids 1 pip, 2 juno (asleep in bed), 3 cat, 4 teddy, 5 book, 6 ball, 7 mo, 8 apple, 9 milk, 10 cookie, 11 bo, 12 duck, 13 crown (on Pip's head). The smoke test relies on these, so update it if you change them.

## Recipes

**Add an item.** Call `item('kind', w, h, \`<svg body>\`, props)` next to the others:
- The drawing uses `viewBox 0 0 w h`, and its bottom edge should touch `h` so it sits on surfaces.
- `props` is `{ food: true }` for edible things or `{ wear: N }` for hats, where N is how far it sinks onto the head (6–16).
- To make it appear, add it to a spawn list (`FOODS`, `BAKES`, `HATS`, `TOYS`) or place it in `setupDefault`.

**Add a character.**
- For a kid, add an entry to `PEOPLE` (`skin`, `hair`, `style`, `shirt`, `pants`). The style is `tuft`, `curly`, `pigtails` or `bun`. It becomes `kid-<name>` with standard slots.
- For any other shape, add an `ART` entry with `char: true` and its own `slots`. Include the `.eyes` group plus the `.m-smile` and `.m-open` mouth parts, or blinking, the carried "o" mouth and chomping won't work.
- Add the character to `setupDefault`, and to the intro row (`#introFriends`) if it's a main friend.

**Add furniture or decoration.** Add an entry to `FURN`:
```js
{ room, id, x, y, w, h, svg, action?, surfaces?: [{x1, x2, top, tag?}] }
```
- `x`/`y` is the **top-left** in world coordinates.
- Use `deco: true` for things that can't be tapped. Add `cls: 'cloud'` for drifting clouds.

**Add a tap action.** Add a function to `ACTIONS` and set `action: 'name'` on the furniture.
- Use `spawn(kind, x, y, vx, vy)` to toss things out (negative `vy` throws them up).
- Use `bump(f.el, 'open', ms)` for door or lid animations (`.door` and `.lid` classes in the SVG), plus a sound from `sfx`.
- Light switches use `toggleDark(room)`.

**Add a how-to step.** Add `{ art: [...tokens], title, text }` to `STEPS`.
- A token is an `ART` kind (drawn as a picture), one of `➜ ‹ › ↺` (drawn as a purple symbol), or an emoji.
- Rows shrink to fit by themselves (`fitRow`).
- Keep the text to one or two short sentences for kids.

**Add a sound effect.** Add it to `sfx` using `tone(freq, dur, type, vol, slideTo, delay)`, and keep volumes at or below about 0.16.

**Add or change music.** Edit `PIECES`:
- Each piece is `{ bpm, melody: seq('C5:1 D5:.5 -:1 ...'), bass: seq(...) }`. Notes are `Name[#|b]Octave:beats`, and `-` is a rest.
- Only use public-domain compositions.
- The melody and the bass **must add up to the same number of beats**. Check with:
  ```sh
  node -e "const s=require('fs').readFileSync('game.js','utf8');const seq=t=>t.trim().split(/\s+/).map(x=>{const[n,d]=x.split(':');return[n,+d]});const twice=t=>t+' '+t;const P=eval(s.slice(s.indexOf('const PIECES = [')+15,s.indexOf('];',s.indexOf('const PIECES = ['))+1));const b=a=>a.reduce((x,[,d])=>x+d,0);P.forEach((p,i)=>console.log(i,b(p.melody),b(p.bass)))"
  ```
- The whole playlist is rendered once into a WAV (about 2 minutes, 5 MB), so keep the total short.

## Test

Run these before every push.

1. **Syntax**: `node --check game.js && node --check sw.js`
2. **Smoke test** with Playwright. It drives the installed Microsoft Edge, or falls back to Chromium. Install Playwright in a scratch folder, *not* in the repo:
   ```sh
   cd <scratchpad> && npm init -y >/dev/null && npm install --silent playwright@1.50.1
   NODE_PATH="$PWD/node_modules" node <repo>/.claude/skills/pocket-town/scripts/smoke-test.cjs "file:///C:/Users/LC-BSENDEK/Home_game/index.html"
   ```
   Pass the live URL instead to test the deployed site. Any `FAIL` line, or any page error, makes it exit with code 1.
3. **Screenshots** for any visual or layout change. Check at least iPhone 13 portrait and landscape (`devices['iPhone 13']`, `devices['iPhone 13 landscape']`) and 1280×720, then **look at the images**. Past layout bugs only showed up this way: a too-wide intro row in portrait, and step pictures cut off in landscape.

Testing gotchas:
- **Playwright's WebKit on Windows has no Web Audio.** Use it only to check that iPhone-style rendering has no errors, and test sound in Edge.
- The Play button pulses, so Playwright calls it "not stable". Use `{ force: true }` or `page.click`.
- Headless `--virtual-time-budget` doesn't run `requestAnimationFrame`, so the game loop never ticks. Use Playwright instead.
- A fresh browser context has empty `localStorage`, so the default town is used.

## Publish

1. Bump `CACHE` in `sw.js` (`pocket-town-vN` → `vN+1`). Otherwise installed copies keep old files.
2. Commit. Author identity is set repo-locally to `birr1979 <birr1979@users.noreply.github.com>`. End messages with the Co-Authored-By line from the session's attribution instructions.
3. `git push origin main`. SSH is set up (`~/.ssh/id_ed25519`), and `gh` is **not** signed in.
4. Wait for the Pages run and check the live site:
   ```sh
   H=$(git rev-parse HEAD); until R=$(curl -s "https://api.github.com/repos/birr1979/Home_game/actions/runs?per_page=1"); echo "$R" | grep -q "\"head_sha\": \"$H" && echo "$R" | grep -m1 '"status"' | grep -q completed; do sleep 8; done; echo "$R" | grep -m1 '"conclusion"'
   curl -s "https://birr1979.github.io/Home_game/sw.js?x=$RANDOM" | grep "CACHE ="
   ```
   Run this with a long timeout (5–7 min). Then run the smoke test against the live URL.
5. If the run fails, read the annotations:
   ```sh
   curl -s https://api.github.com/repos/birr1979/Home_game/check-runs/<job-id>/annotations
   ```
   "No artifacts named github-pages" is a transient GitHub problem, so push an empty commit to retry. Full logs need admin rights, which we don't have without `gh`.

## iPhone lessons (don't regress these)

- **Music has to play through an `<audio>` element.** Scheduling notes live with Web Audio was silent on iPhone even though tap sounds worked. So `renderMusic()` renders the playlist with `OfflineAudioContext` into a WAV blob and loops it on `new Audio(url)`.
- **Audio only unlocks on a tap.** `audio()` runs on `pointerdown`, `touchend` and `click`, and the Play button counts as that tap.
- **Silent switch:** `keepPlaybackSession()` sets `navigator.audioSession.type = 'playback'` on iOS 17+, or loops a silent `<audio>` on older iOS.
- **The context can be "interrupted"** after calls or app switches: `audio()` resumes it from any non-running state.
- **Updates:** the service worker is network-first, and the page reloads once on `controllerchange`. Tell users to close and reopen the app (sometimes twice) after a release.
- **Case-sensitive URL:** if a user reports a 404, check the capital `H` in `/Home_game/` first.
