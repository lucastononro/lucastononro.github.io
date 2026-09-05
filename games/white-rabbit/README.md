# After the White Rabbit

A complete, single-player first-person puzzle adventure built with Three.js and four original Blender environments. Explore the hall of little doors, then enter a continuous outdoor valley. Cross three bridges, find the ruined conservatory and pepper cottage, keep the rabbit's appointments, and walk the roads to the Queen's grounds and final tower.

## Play

```sh
npm install
npm run dev
```

Open http://localhost:5173. The game requires WebGL 2. Phones automatically use landscape touch controls and reduced graphics. Drag the left joystick to walk, the right LOOK pad to turn, and tap Interact or Explore. Settings can override automatic control detection. Full screen and orientation locking are used where supported; other browsers show a rotation prompt.

- WASD: walk. Shift: move faster.
- Drag the mouse: look. “Capture mouse” enables free mouse look.
- Click an object or aim at it and press E: inspect.
- J: journal. I: satchel. Tab: explore nearby objects and walk to landmarks.
- Escape: step back or pause.

There is no time limit. Incorrect answers do not penalize you. Three progressive hints accompany locks. Progress saves automatically in this browser. The title screen can continue or restart your game.

## Source and adaptation

The puzzle sequence follows the [seven-page French solution for Unlock! Heroic Adventures: In Pursuit of the White Rabbit](https://www.nos-jeux-de-societe.fr/wp-content/uploads/2023/08/Solution-Unlock-heroic-adventure-a-la-poursuite-du-lapin-blanc.pdf). The project uses original Blender geometry and English dialogue. It does not display or simulate the original cards.

Card-number combinations become physical locks, scale changes, object interactions, and arithmetic hedge gates. Device orientation becomes looking up. The last card construction becomes a brass-and-jade architectural sculpture with two viewing positions. The messenger's French sound puzzle uses the English “won / one” homophone.

This is an independent adaptation, not an official Space Cowboys product. The Alice setting draws on Lewis Carroll's public-domain story. No source card illustrations are used as game assets.

See [the spoiler-filled puzzle mapping](docs/PUZZLES.md) for implementation details and the full solution.

## Development

```sh
npm test
npm run build
npm run preview
```

The garden, court and tower share one scene. Puzzle gates open the east and north roads. Smaller objects enter your exploration menu after you discover their area; major landmarks help you find your way. Water, butterflies, the roaming rabbit, and an equipped fan or brush keep the world moving. Press M for the valley map.

The game runs entirely in the browser; it needs no account, API key, or backend. Fonts have local browser fallbacks if Google Fonts cannot load.

- `src/main.js`: interface, interactions and puzzle flow.
- `src/overworld.js`: connected landscape, paths, stream, bridges, world gates, scenery and region coordinates.
- `src/world.js`: renderer, first-person camera, collision movement, pathfinding, scene effects and spatial puzzles.
- `src/puzzles.js`: puzzle definitions, hints, inventory and saved progress.
- `src/rabbit.js`: route following and blended idle, hop, and watch-check animations.
- `src/audio.js`: synthesized ambient audio, effects and optional messenger speech.
- `src/touch.js`: independent pointer capture, analog movement, mobile detection and rotation handling.
- `src/mechanics.js` and `src/spatial-puzzles.js`: construction, arrow tracing and physical croquet rules.
- `public/models/`: runtime glTF assets, about 17 MB total.
- `assets/blender/`: editable scenes generated locally by the Blender scripts. The published repository ships the GLB exports and regeneration scripts.
- `scripts/build_world.py`: deterministic Blender scene builder.
- `scripts/build_rabbit.py`: rabbit model and three authored animation clips.

To rebuild the models with the installed macOS Blender:

```sh
npm run assets
```

On another platform, run your Blender executable with `--background --python scripts/build_world.py` and then `--background --python scripts/build_rabbit.py`.

## Visual style

Original stylized geometry with teal paneling, brass trim, checkerboard stone, garden pavilions, rose beds, full-size guards, physical clock faces, bloom, atmospheric particles and dynamic light. These are compact procedural assets, not photorealistic scanned environments.

## Publishing

The site repository builds this directory into `/games/white-rabbit/` and includes a game-first post at `/after-the-white-rabbit/`. Relative Vite asset paths allow the game to run below that subdirectory. The blog home page, feed, category and sitemap discover the post automatically. Development checkpoints and `touch-review.html` are excluded from the production bundle.
