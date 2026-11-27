# Pocket Town

A pretend-play sandbox game for kids, built as an installable, offline-ready web app (PWA).
There are no scores and no rules. You explore three rooms and play with whatever you find there.

## How to play

The game opens on a title screen. Tap **Play** to start, or **How to play** for an 8-step picture guide; the **?** button in the game opens the guide again.

- **Drag anyone or anything.** Things drop onto beds, shelves, tables and the floor.
- **Feed a friend:** drop food on their mouth.
- **Dress up:** drop a hat, crown or bow on someone's head.
- **Hand them something:** drop it on their hand.
- **Bedtime:** put a friend on the bed and they fall asleep.
- **Tap to discover:** the wardrobe (hats), toy box (toys), fridge (food), oven (treats), lamps (lights on or off), the apple tree, the flower bush, and the sun (day or night).
- Tap a friend to make them hop. Swipe the background, or use the arrows and room buttons, to move between rooms.

The town is saved automatically on the device. ↺ starts it over.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page shell and on-screen buttons |
| `style.css` | Rooms, animations, UI |
| `game.js` | All art (inline SVG), physics, drag and drop, sound, and saving |
| `sw.js` | Service worker that makes the game work offline |
| `manifest.webmanifest`, `icons/` | Lets the game be installed to the home screen |
| `.github/workflows/pages.yml` | Deploys the game to GitHub Pages on every push to `main` |

There is no build step and there are no dependencies.

## Run locally

A service worker needs `http://localhost` (or HTTPS), so serve the folder rather than opening the file directly:

```sh
npx serve .
# or
python -m http.server 8000
```

## Publish with GitHub Pages

1. Push to the `main` branch.
2. On GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions** (one-time setup).
3. The game is published at `https://<user>.github.io/Home_game/`.

On a phone or tablet, open that address and choose **Add to Home Screen** (Safari) or **Install** (Chrome or Edge).

## Releasing an update

Change `CACHE` in `sw.js` (for example `pocket-town-v2`) whenever you change any file. Otherwise players who installed the game may keep seeing the old version.
