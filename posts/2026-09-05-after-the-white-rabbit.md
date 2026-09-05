---
title: "After the White Rabbit: taking a puzzle deck into 3D"
dek: A playable Wonderland adventure, built with Codex, Blender and Three.js. The puzzles came first. Making them work in a place you can walk around took the work.
date: 2026-09-05
tags: [agents]
game: white-rabbit
---

I wanted to walk through this game. Follow the rabbit, get lost between appointments, look at an object from another side and have something click. Rooms were fine where the story called for them. Spending the whole adventure in one room wasn't.

The starting point was *Unlock! Heroic Adventures: In Pursuit of the White Rabbit* and its [French solution booklet](https://www.nos-jeux-de-societe.fr/wp-content/uploads/2023/08/Solution-Unlock-heroic-adventure-a-la-poursuite-du-lapin-blanc.pdf). That link contains the solutions, so leave it for after playing. I worked with Codex to turn the progression into a first-person browser adventure. The environments, models and interface are original; the puzzle logic follows the game closely. This is an independent fan adaptation, with no affiliation to Space Cowboys.

## A place between the puzzles

The hall is an interior because scale is the point there: a table can be out of reach, and a perfectly good door can be too small. Beyond it, the appointments are spread through a wooded valley. There are bridges, a pepper-filled cottage and a tea clearing. The Queen's grounds split into different activities, and the final construction has a place of its own.

That gave us a useful constraint. Walking should help you notice something, remember a place, or approach a clue. It shouldn't just stretch the time between two input boxes. Small objects are discovered by getting close; an optional Explore menu helps you walk back to landmarks. Your journal keeps the evidence. There is no countdown, and a wrong answer doesn't punish you.

## The rabbit had to behave like a rabbit

The first correction I cared about was the rabbit. A bunny bouncing as one solid object gets old quickly. The finished character has separate idle, hop and watch-check animations authored in Blender. The ears move with the head, and the pocket watch stays attached to the paw. He follows a route, stops to check the time and waits when you fall behind.

It's a stylized character. We weren't trying to pass it off as a real animal. The work was in making the parts belong to one body and making his movement fit the scene. The cook, Hatter and Queen also have small movements, so reaching an appointment feels like finding somebody there.

## A correct answer can still be a broken puzzle

The fidelity check caught more than wrong numbers. An early sign diagram practically drew its solution for you. Some journal entries explained the later clock puzzle before you'd had to make the connection. We replaced those shortcuts with shuffled messages, readable clocks and colored arrows that you actually trace.

The geometry was harder. A croquet route could accept the intended sequence while the animated hedgehog rolled straight through an obstacle. We changed the lawn and checked each straight shot against the same geometry used to draw it. A blocked shot now stops where it should.

The guards exposed another problem: an incidental modeling difference counted as an extra clue. The tart had the opposite issue; the pastry hid part of the crumb outline, so the intended shape was difficult to recognize. We adjusted the uniforms, cut the missing wedge into the pastry and moved the crumbs into view. Even the gardeners needed a better inspection angle because a sign covered their tunic numbers. Those fixes mattered more than another decorative tree.

The final house needed its own pass. Selecting the right list of pieces wasn't enough. You can now place the individual parts, turn the bridges over, remove a mistake and test whether the structure holds. The last readings depend on where you stand.

## Keeping the game while changing the medium

Some translations are direct: turn a letter, change your height, compare uniforms, remember what the Queen asked. Others need a replacement for something the cards do. Matching the gardeners becomes a tool chest with matching seals. Recoloring a card header becomes painting the roses in front of you. French sound puzzles have English equivalents.

We documented those differences in the [fidelity audit](https://github.com/lucastononro/lucastononro.github.io/blob/main/games/white-rabbit/docs/FIDELITY-AUDIT.md), rather than calling the adaptation an exact copy. That document also contains spoilers.

On a phone, turn it sideways. The left joystick walks; the right pad looks around, with Interact and Explore beside it. Both thumbs can work at once. Puzzle buttons are larger, and the camera leaves room for the panel beside a clue. Phones start with reduced graphics, and progress stays in the current browser.

The automated checks cover answers, progression, saved progress, reachable paths, animation attachments, construction rules and touch input. Browser checks cover the changed puzzles, the ending and the landscape layout. They don't tell us how a first-time player will feel about every stretch of the adventure, and the phone layout checks aren't a substitute for testing every handset.

[Play After the White Rabbit](/games/white-rabbit/). If a clue feels unfair, tell me where you were and what you could see. That's much more useful than “the puzzle is broken.”
