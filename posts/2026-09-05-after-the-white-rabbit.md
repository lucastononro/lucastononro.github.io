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

The model is stylized, but the movement still has to make sense. Getting the ears and watch to follow the right body parts took attention. The cook, Hatter and Queen also have small animations when you meet them.

## A correct answer can still be a broken puzzle

When we checked the puzzles against the original, some were giving too much away. An early sign diagram drew most of its own solution. The journal explained the clock puzzle before you had to make the connection. We removed those explanations and revised the clues so you have to compare the messages and clocks yourself. The sign puzzle now asks you to trace its colored arrows.

The croquet puzzle had a different problem. It accepted the intended sequence even though the hedgehog rolled through an obstacle. We changed the lawn and made the shot checks use the visible geometry. A blocked shot now stops at the obstacle.

The guards were harder to model than they looked. An accidental difference between their uniforms became an extra clue, so we had to check every variation. At the tart, the pastry hid part of the crumb outline you needed to recognize. We cut the missing slice into the model and moved the crumbs into view. A sign also covered the gardeners' tunic numbers. These were small modeling mistakes that made the puzzles unfair.

For the final house, we replaced a list of selected pieces with a construction you assemble. You place each part, turn the bridges over, remove mistakes and test whether it holds. The last readings depend on where you stand.

## Keeping the game while changing the medium

Changing your height and comparing uniforms both work in 3D. Other puzzles rely on the cards themselves, so we had to adapt them. Matching the gardeners becomes a tool chest with matching seals. Recoloring a card header becomes painting the roses in front of you. French sound puzzles have English equivalents.

The [fidelity audit](https://github.com/lucastononro/lucastononro.github.io/blob/main/games/white-rabbit/docs/FIDELITY-AUDIT.md) records those changes and compares the puzzles with the original. It contains spoilers too.

On a phone, turn it sideways. Walk with the left joystick and look around with the right pad. Interact and Explore sit beside it, and both thumbs can work at once. Phone mode uses larger puzzle buttons and reduced graphics. The camera leaves space for a puzzle panel beside the clue. Your progress saves in the browser.

We checked the puzzle answers and progression, saves, walking routes, animation attachments, construction rules and touch input with automated tests. We also played through the changed puzzles and ending in the browser and checked phone layouts. We haven't tested on a physical phone yet, and I'd still like to hear where a first-time player gets stuck.

[Play After the White Rabbit](/games/white-rabbit/). If a clue feels unfair, tell me where you were and what you could see.
