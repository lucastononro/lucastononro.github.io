# Verification — 5 September 2026

The game has 22 passing automated checks covering source-derived answers, chapter gates, saved progress, inventory, the translated decree, Blender assets, connected roads, rabbit animation and attachments, reachable courtyard approaches, the single unobstructed croquet route, bridge orientations, arrow tracing, clue leakage and touch controls. Touch tests cover device detection, analog movement limits, two independent pointer IDs, cancel/blur handling and portrait suspension.

The site adds three publishing checks: home/category/feed/sitemap discovery, game-first post placement, and a complete production bundle with relative asset paths and no development checkpoint code.

## Browser checks

Desktop checks covered the opening hall through the garden transition, all four appointments, collecting and using the fan, full completion of the five white roses, gardener recognition, both guards, the tart clue, the four trial questions, blocked and successful croquet shots, all colored sign trails, the shuffled clock messages, the figure overlap, wrong and correct bridge orientations, both perspective readings, and the ending. The revised mushroom, gardeners and tart were visually checked for occluded clues. The production game was launched from the local blog post, and its first lock was solved with no runtime errors.

At an actual iframe viewport of 844 × 390 with the touch layout enabled, browser checks covered the separate look control, the right Interact and Explore buttons, story arrows and lock entry, the complete croquet route, the mushroom cap and text, house construction including undo and bridge flipping, both perspective views and the final ending. A 390 × 650 viewport verified the rotation prompt; returning to landscape preserved progress. Pointer concurrency is tested by the real TouchControls class with synthetic independent pointer events in Node.

These are checkpoint and layout checks, not one continuous timed blind playthrough. No physical iPhone or Android handset was available. OS keyboard behavior, hardware performance, browser-specific full-screen/orientation locking and actual two-thumb ergonomics therefore remain device-testing limits. The messenger's text fallback was checked; the quality of installed system voices varies by device.

## Repeatable local review

Run `npm run dev`, then open `touch-review.html` for the phone viewport harness. Its chapter selector seeds explicit development checkpoints and disables saving. `?review=garden&at=caterpillar`, `?review=court&after=trial&at=croquet`, `?review=court&after=croquet&at=effigies`, and `?review=tower&at=assembly` allow desktop review. These controls are excluded from the production game.

Run `npm test` and `npm run build` in the game directory. From the site repository, run `npm run build` followed by `node --test tests/site-game.test.mjs`.
