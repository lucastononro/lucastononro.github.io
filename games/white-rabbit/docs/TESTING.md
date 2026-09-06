# Verification

The most recently confirmed game test run has 51 passing checks. The recorded repair playthrough reached the ending through the ordinary game UI. This document separates that run from the earlier checkpoint checks, which missed the failures listed in [BUGS.md](BUGS.md). The site build and four publishing checks also pass.

## Automated coverage

The game checks cover source-derived answers, chapter gates, saved progress, inventory, the translated decree, exported Blender geometry and clue roots, connected roads, reachable courtyard approaches, the unique clear croquet route, bridge orientations, arrow tracing and premature answer disclosure.

Repair checks add non-overlapping door frames and physical clearance, cake/bottle direction, invisible-object raycasts, travel at 60, 15 and 5 frames per second, thin-wall collision, distance carried across navigation waypoints, the kitchen's front entrance and the court opening. The elevated cat-eyes test verifies a walkable ground-level approach and keeps the original height requirement for collectible objects. Static batching checks verify world geometry, opaque ray blocking, preserved moving/clue objects and fewer static draws in the actual valley.

Character checks cover exported clips, bounds and attachments for the rabbit, woodland animals and residents. The cook's spoon tip stays inside the original cauldron. A separate check samples 120 points in her animation to verify clear sightlines to both eyes, mouth and stirring hand from the kitchen examination camera, including possible obstruction by her own arm.

Touch checks exercise the actual TouchControls class with synthetic pointer events. They cover automatic detection and overrides, joystick response, independent thumb IDs, the Run toggle, cancellation, blur and portrait suspension. They are not physical two-thumb tests.

The site has four additional publishing checks for home/category/feed/sitemap discovery, game-first post placement and a complete production bundle with relative asset paths and no development checkpoint code. The fourth check verifies the spoiler appendix, video URL and every referenced evidence image.

## Recorded repair playthrough

The solution recording started with a fresh save in the normal game UI. When the playthrough exposed further defects, the build was repaired and recording resumed from the same ordinary save. No development checkpoint or injected progress advanced this recording. Three raw capture segments form an edited walkthrough, which may omit repeated travel and pauses. It should not be described as one uninterrupted take of a single build. Capture used Low graphics with a software renderer and no audio.

Confirmed progression in this run:

- Hall story, rotating glyph, arithmetic, missing letter, directional size changes, key collection, triangular lock, physical doorway crossing, missing feet and upward exit.
- Caterpillar and mushroom, messenger, fan collection, approach to the kitchen's open front, three sweeps, tea, assembled appointment messages and colored crossing trails.
- Physical approach to the Queen's grounds, all three path gates, gardener seals, five painted roses, tart, guard comparison and all four trial questions.
- Croquet rebounds 4, 7, 6, then flag 1; stacked and lowered effigies; the decree; physical travel along the northern road into the tower.
- Nine-piece house construction with both bridges facing down, followed by both viewing rings.
- Explore's assisted approach to the elevated cat eyes, their clue, and the final 7832 exit. The ending reports 25 puzzles solved and zero hints.

The final production snapshot was `index-CCssolBJ.js`. Runtime captures `189-cat-arrived` and `192-ending` show the last approach and completion. The ending displays 48 in-game minutes; this is neither an uninterrupted wall-clock measurement nor a blind-play benchmark. The previous release's checkpoint ending check is separate from this run.

Separate final-build runtime checks verified the cook and Hatter examination views. Screenshots `200-court-opening-fixed` and `201-court-inside` document walking through the widened entrance from the east road. These checks used development checkpoints with saving disabled.

The local evidence session is `evidence/rabbit-walkthrough-20260905T223743Z/`, with an action log, raw recordings and screenshots. Published excerpts now appear inline in the main game post. Door and phone before images come from the unchanged earlier build. The court before image comes from an intermediate repair build; Blender composition renders are distinguished from runtime captures.

## Phone and targeted browser review

Separate development checkpoint checks covered the revised phone panels, story arrows and answer input, clue-view toggle, movement and look controls, fan/paint instruction controls, mushroom inspection, croquet, construction undo and bridge flipping, and perspective views. Review viewports include 844 by 390, 667 by 375 and portrait 390 by 650. A shortened 844 by 210 viewport checks space available when a keyboard occupies part of the display. It does not render or emulate an operating-system keyboard.

Earlier checkpoint checks also reached the ending on the phone layout. Those checks provide targeted coverage; they are separate from the current recorded progression above.

No physical iPhone or Android handset was available. Actual keyboard behavior, sustained hardware performance, full-screen/orientation support and thumb ergonomics remain unverified on those devices. Frame-delta handling caps a single update at 250 ms, so the movement tests do not promise constant travel after arbitrarily long stalls. The messenger has a text fallback; installed speech voices vary by device.

This is a solution-guided playthrough, not a blind assessment of difficulty or pacing.

## Repeatable local review

In the game directory, run `npm test` and `npm run build`. From the site repository, run `npm run build`, then `node --test tests/site-game.test.mjs` for publishing checks.

For development-only visual review, run `npm run dev` in the game directory and open `touch-review.html`. Its selector seeds explicit checkpoints and disables saving. Useful desktop review URLs include `?review=garden&at=caterpillar`, `?review=garden&after=fan&at=kitchen`, `?review=court&after=trial&at=croquet`, `?review=court&after=croquet&at=effigies` and `?review=tower&at=assembly`. These controls are excluded from production.

To repeat the progression check, use the normal Begin a new dream action in a separate test browser profile, then play through with ordinary controls. Keep the player's existing save separate from review checkpoints and recording saves.

## Visual finale rebuild

That rebuild added three geometry and construction checks, bringing the game suite to 45 tests at the time. Four site checks cover discovery, game-first placement, the production bundle and the inline study/walkthrough. The latter checks all 27 comparison entries, both recordings, local evidence images and the old walkthrough URL's redirect.

Targeted runtime review used `?review=tower&at=assembly` and `?review=tower&after=assembly&at=amber_view` or `ivory_view`. These checkpoints disable saving. The rebuilt assembly accepts pieces in arbitrary order, including a roof before its supports. Clicking a real painted piece and a real socket places the same mesh. The structure check rejects bridges facing upward. Both manual viewing controls produce readable, vertically stacked digits. Wrong readings leave the panel open; correct submitted readings add their respective inventory entry.

The phone layout checks include 844 × 390, 667 × 375 and a reduced 844 × 210 viewport. Camera dragging, scrolling the panel, answer submission and Step back remain available. The game follows `visualViewport` for keyboard space; these checks do not emulate an operating-system keyboard or physical touch hardware.

The archived finale recording begins at a chapter-four development checkpoint. It originally supplemented the older full repair playthrough, whose final chapter predates the manual viewpoint rebuild. It must not be described as a second fresh-save full playthrough.

Capture session: `evidence/rabbit-visual-finale-20260906T020507Z/`. The checkpoint omits the earlier gardeners-match history flag, so its ending shows 24 solved. The normal-game full repair run above shows 25. The new clip is an edited finale demonstration with real desktop input, no audio and no injected progress after its starting checkpoint.

## Door disclosure and diagonal recording repair

Six additional game checks bring the suite to 51. Five exercise straight diagonal paths, collision-safe shortcuts, touching blocked corners, a thin obstacle between grid nodes and the short angular turn across the wraparound point. The sixth casts 750 sight rays at the exported hall cutout from several player heights and side angles. The locked doorway must cover them; the open leaf must leave the passage clear.

A separate browser check approached the biscuit, grew to 55, collected the high key, shrank to 11 and unlocked Door 6. Holding W crossed the repaired opening and displayed the missing-feet puzzle. A native canvas still records the casing from above and to one side, next to the player's two original screenshots in the blog.

The new 52-second share edit uses seven fresh takes at 1280 by 720 with game audio. The outdoor walks use visible local buttons that hold synthetic keydown events through the ordinary listeners, then release them with keyup. They do not set the camera position or use Explore. The opening diagonal held W and D for four seconds. All 471 sampled frames retained both keys, the camera heading stayed fixed, and both coordinates changed along one straight line. One deliberate right turn followed, then a short forward approach. Puzzle takes use the ordinary buttons and pointer dragging. Explore positioned the player between some hall takes, outside the edit. Chapter checkpoints disable saving.

The MP4 decodes without errors and played to the end in the native browser. The playback report records dropped frames rather than claiming a zero-drop guarantee. Source key/position traces and edit points accompany the release. The rejected 62-second Explore recording remains unchanged as a labeled failure example. Its selection and inadequate review are documented as a GPT-6 Astra workflow failure. The separate finale player was removed from the post; the older 24-minute walkthrough remains.

The post was checked at 390 by 844, 844 by 390 and 1280 by 720. All 87 rabbit-related images load with matching intrinsic dimension attributes, preserved proportions and no horizontal page overflow. Comparison images use contained letterboxing. These remain browser viewport checks, not physical handset tests.
