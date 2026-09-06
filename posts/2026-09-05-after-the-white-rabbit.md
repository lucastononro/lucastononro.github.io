---
title: "After the White Rabbit: taking a puzzle deck into 3D"
dek: A browser adventure inspired by Unlock!, built with Codex, Blender and Three.js. How we adapted the puzzles and fixed the models that got in their way.
date: 2026-09-05
tags: [agents]
game: white-rabbit
---

I wanted a version of this game I could walk around in. Follow the rabbit through Wonderland, explore between puzzles and get close enough to inspect a clue. A room was fine when it fit the story. I just didn't want the whole thing stuck in one.

## What is Unlock!?

[Unlock!](https://www.spacecowboys-games.com/game/unlock/) is a series of cooperative escape-room card games from Space Cowboys. You play alone or with other people around a table, using a deck and a free companion app. The cards show locations, objects and clues. You look for hidden details, work out which objects belong together and solve puzzles to advance the story. The app checks codes, runs interactive puzzles and gives you hints. It also keeps time, with adventures usually designed for about an hour.

*In Pursuit of the White Rabbit* is one of the three adventures in [Unlock! Heroic Adventures](https://store.asmodee.com/products/unlock-heroic-adventures). It takes Alice through Wonderland and its strange inhabitants. That gave this project both its story and its puzzle progression. I wanted to keep the deductions, then give you a world where you could make them by looking around and handling objects.

I worked with Codex from the [French solution booklet](https://www.nos-jeux-de-societe.fr/wp-content/uploads/2023/08/Solution-Unlock-heroic-adventure-a-la-poursuite-du-lapin-blanc.pdf). Save that link for after playing. It contains the answers. We made original environments, models and an interface for a single-player, first-person browser game. The puzzle logic follows the tabletop adventure closely. This is an independent fan adaptation with no affiliation to Space Cowboys.

## A place between the puzzles

The hall stays indoors because its puzzles depend on scale. A table can be out of reach, and a door can be too small. Beyond it, you follow paths through a wooded valley to the bridges, the pepper-filled cottage and the tea clearing. The Queen's grounds have separate areas to explore before you reach the final construction.

I wanted a reason to walk somewhere. Small objects become discoverable when you get close, and some clues need a different viewing angle. The Explore menu helps you return to landmarks, while the journal records what you've found. I also wanted time to look around, so this version has no countdown or penalty for a wrong answer.

## The rabbit had to behave like a rabbit

The rabbit was one of my first complaints. Bouncing the whole model up and down wasn't enough. We made separate animations in Blender for standing idle, hopping and checking his watch. His ears move with his head, and the pocket watch stays attached to his paw. He follows a route and waits when you fall behind.

The model is stylized, but the movement still has to make sense. Getting the ears and watch to follow the right body parts took attention.

## The first fidelity pass

When we checked the puzzles against the original, some were giving too much away. An early sign diagram drew most of its own solution. The journal explained the clock puzzle before you had to make the connection. We removed those explanations and revised the clues so you have to compare the messages and clocks yourself. The sign puzzle now asks you to trace its colored arrows.

The croquet puzzle had a different problem. It accepted the intended sequence even though the hedgehog rolled through an obstacle. We changed the lawn and made the shot checks use the visible geometry. A blocked shot now stops at the obstacle.

The guards were harder to model than they looked. An accidental difference between their uniforms became an extra clue, so we had to check every variation. At the tart, the pastry hid part of the crumb outline you needed to recognize. We cut the missing slice into the model and moved the crumbs into view. A sign also covered the gardeners' tunic numbers. These were small modeling mistakes that made the puzzles unfair.

For the final house, we replaced a list of selected pieces with a construction you assemble. You place each part, turn the bridges over, remove mistakes and test whether it holds. The last readings depend on where you stand.

## The first release still had bugs

We published too early. Codex reported passing checks, and I still ran into overlapping doors before leaving the opening hall. I hadn't solved the game yet. The earlier review checked answers and selected checkpoints, but missed problems in the route between them.

The doors made that gap obvious. Their panels overlapped, and parts of the arches looked broken. Door 6 looked big enough to walk through at a size the game refused. Its triangular lock was a tiny symbol, and a separate height condition could stop a collected key from working. Knowing the intended solution wasn't enough to tell whether I was stuck on a puzzle or a bug.

![The first release, with overlapping door panels and broken-looking arches.](/images/white-rabbit-repairs/doors-before.png)

*Before. This is the original published build, captured again without changing its models.*

The original adventure asks Alice to shrink for this passage. The size rule was faithful, but our model gave the wrong evidence. We separated the doors and rebuilt the small opening to match the player's body. The triangular keyway is now part of a brass plate attached to the door. Once unlocked, the leaf swings open and you walk into the passage to leave the hall. The geometry and the interaction need to agree.

![The repaired hall doors, with separate frames and a small passage at floor level.](/images/white-rabbit-repairs/doors-after.png)

*After. The opening has to explain why shrinking helps before the game asks you to do it.*

The cake and bottle had another basic mistake. Both menus offered every size, so cake could shrink you and a drink could make you grow. Cake now offers larger sizes; the bottle offers smaller ones. Both stay available, so choosing the wrong size doesn't leave you stuck. This went into the [bug log](https://github.com/lucastononro/lucastononro.github.io/blob/main/games/white-rabbit/docs/BUGS.md) with the door failures and the rest of the repair pass.

## Reading and moving on a phone

The first phone layout was hard to read and use. The book had small controls and a scrollable list inside a scrollable popup. That cost space in landscape and made it easy to scroll the wrong part of the page.

![The first phone popup, with a narrow reading panel and small book controls.](/images/white-rabbit-repairs/phone-before.png)

*Before, in the browser's 844 by 390 phone layout.*

We gave phone puzzles the full width, enlarged the buttons and removed the extra scroll region. Close stays in a pinned toolbar. A separate Look at the clue button lets you switch back to the scene without losing your place in the puzzle.

![The revised phone popup, with a pinned toolbar and larger book controls.](/images/white-rabbit-repairs/phone-after.png)

*After, at the same game viewport size.*

The keyboard needs room too. We added a check with the available height reduced to 210 pixels, then made the answer field and submit button reachable in that space. This is a browser layout check, not evidence from a physical phone.

![The answer field and submit button visible in a shortened phone viewport.](/images/white-rabbit-repairs/phone-keyboard-space.png)

*Reduced-height check with sample input. The keyboard itself is not being emulated.*

Walking also felt twitchy and slow. We smoothed the joystick response, reduced look sensitivity and added a Run toggle. Small Alice still enters the second chapter because that follows the source, and the mushroom belongs to that part of the story. We removed the outdoor speed penalty. Looking small shouldn't turn the trip to the next clue into a crawl.

The residents needed another Blender pass as well. The frog and caterpillar were mostly static shapes, and the caterpillar got in the way of its appointment clock. The new characters have moving joints and facial animation. The cook's spoon stays in the cauldron, the Hatter raises his cup, and the Queen gestures while holding her scepter. We preserved the clue props and left the gardeners' numbers and guards' uniform differences alone.

The cook was a useful lesson in checking animation inside the scene. Her new face sat behind the old kitchen sign, and her stirring hand dipped below the pot's solid top. We moved the sign onto the counter front, raised the hand and lengthened the spoon. A spare hat also hid the Hatter's face. We moved that prop to the other end of the table and kept its price tag.

![The frog messenger rebuilt in Blender, with separate limbs and facial features.](/images/white-rabbit-repairs/frog.png)

*Blender model view of the revised frog. His speaking motion uses the mouth and throat; his body no longer has to bounce to suggest life.*

![The cook's raised stirring hand and face clear the cauldron in the Blender inspection render.](/images/white-rabbit-repairs/cook-blender.png)

*Blender inspection render. The spoon still reaches inside the pot while the hand stays above its rim.*

## What the recorded run caught

Recording the solution became another test. The fan could clear smoke while I stood beside a solid kitchen wall. We restricted it to the open front and made assisted walking approach that entrance. Closing the little passage's popup also used to reopen it immediately. It now responds when you enter, so closing it lets you move again.

Slow rendering exposed a separate walking bug. The game counted at most 50 milliseconds per frame, so a slow frame also slowed the player's travel. We corrected the timing and split movement into short collision steps. Assisted walking now keeps its remaining movement when it reaches a waypoint. This fixes lost travel time; it doesn't promise a particular frame rate on a phone.

The court's approach had a wall across part of the road. We pulled that wall back and widened the hedge opening. The source of this one was embarrassingly familiar. The visible world and the walking rules had been built separately.

![A castle wall covering part of the road into the court during the repair playthrough.](/images/white-rabbit-repairs/court-road-before.png)

*Caught during the recording. This is an intermediate build in the repair pass, not the first published release.*

![The repaired approach, with the road visible through the court entrance.](/images/white-rabbit-repairs/court-road-after.png)

*The final entrance checked in the game. The path continues around the low maze.*

The final run reaches the ending through all 25 puzzles. It uses known answers and resumes ordinary saved progress after the fixes found along the way. I kept the video and solution screenshots in the [spoiler appendix](/white-rabbit-walkthrough/). It is useful evidence that the route works, but a first-time player may still find a clue confusing in a way this run couldn't reveal.

I put too much weight on the answer checks. A player also has to recognize the opening, turn the key, reach the input field and walk to the next scene. Those actions need a playthrough with the actual controls. The first release hadn't earned the confidence we gave it.

## Keeping the game while changing the medium

Changing your height and comparing uniforms both work in 3D. Other puzzles rely on the cards themselves, so we had to adapt them. Matching the gardeners becomes a tool chest with matching seals. Recoloring a card header becomes painting the roses in front of you. French sound puzzles have English equivalents.

The [fidelity audit](https://github.com/lucastononro/lucastononro.github.io/blob/main/games/white-rabbit/docs/FIDELITY-AUDIT.md) records those changes and compares the puzzles with the original. It contains spoilers too.

On a phone, turn it sideways. Walk with the left joystick and look around with the right pad. Interact and Explore sit beside it, and both thumbs can work at once. Phone mode starts with reduced graphics. Your progress saves in the browser.

The automated checks cover puzzle answers, progression, saves, walking routes, animation attachments, construction rules and touch input. They missed the first-release failures above. The repair log records what we found and the checks for each fix. We still haven't tested on a physical phone.

[Play After the White Rabbit](/games/white-rabbit/). If a clue feels unfair, tell me where you were and what you could see.

## Solution appendix

The [walkthrough appendix](/white-rabbit-walkthrough/) contains the recorded solution and screenshots for each chapter. Keep it for when you want the answers. The main article shows the development mistakes without giving away the puzzle codes.
