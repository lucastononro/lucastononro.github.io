# Puzzle fidelity audit

Spoilers below. Reviewed on 5 September 2026 against all seven rendered pages of the [supplied walkthrough](https://www.nos-jeux-de-societe.fr/wp-content/uploads/2023/08/Solution-Unlock-heroic-adventure-a-la-poursuite-du-lapin-blanc.pdf). This is an independent adaptation with original models and English wording. It preserves the puzzle progression and principal deductions; it does not reproduce the cards or their illustrations.

| Source page | Puzzle | Adaptation and audit result |
| --- | --- | --- |
| 1 | Ten story fragments, 2135 | Ten movable memories; the same four number words in chronological order. Arrow buttons also work on phones. |
| 1 | Rotate M, then its shadow, 33 | A rotatable brass glyph and a second shadow shape. Entering only 3 gives the missing-shadow clue. |
| 1 | False multiplication table, 13 | The same three equations and continuation. |
| 1–2 | A + LICE | Five separate doors supply the missing A. The revised examination view includes the full arrangement. |
| 2 | Grow 55, triangular key, door 6; shrink 11 | Cake grows and the bottle shrinks. The high key can be collected at 55, turns the triangular lock at any height, and opens a physical passage whose clearance accepts only 11. The player crosses it to continue. Card-number arithmetic used to retrieve cards is replaced by using objects. |
| 2 | Missing feet, 89 − 12 = 77; look up | Crossing the doorway opens the same subtraction puzzle. Looking upward after solving it triggers the garden transition. The popup can be dismissed without trapping the player in a reopen loop. |
| 3 | Smoke 88, unique mushroom | Alice enters at size 11. The close-up includes smoke forming 88 above the caterpillar. A separate mushroom among the roots has 33 spots and restores size 33. The smaller character keeps normal outdoor travel speed. |
| 3 | Messenger’s repeated word, 1 | Optional spoken English dialogue and transcript use won/one, translating the French hein/un sound puzzle. |
| 3 | Unique fan, pepper kitchen | Find the solitary fan, approach the cottage through its open front and sweep away the smoke. Side and back walls do not permit fanning. The cook gives the same evidence and message fragment. |
| 3 | Hat 10/6 distraction, tea → T | The Hatter wears 10/6; the spare hat retains its tag at the opposite end of the table so it does not cover his face. The inspectable distraction and the drink-to-letter deduction remain. |
| 3 | Four messages and appointments, 2580 | Shuffled messages must be ordered beside the four clocks. Unsolved journal entries no longer reveal the minute-hand digits. |
| 4 | Cat, colored EXIT trails, 5210 | Cheshire eyes appear above the crossing. Follow mixed arrows of each color on a 3D table; traced lines reveal digits. Removed the old diagram that drew the answer immediately. |
| 4 | Three maze operations, 29 / 99 / 49 | The same operations on 33 unlock three physical paths in the Queen’s grounds. |
| 4 | Recognize gardeners and recolor header | Match tunics 2, 5, 7 to three spade seals on a tool chest. Painting five physical white blooms red translates the original act of changing a white card header to red. This is a deliberate mechanical change, not an identical puzzle. |
| 4–5 | Tart heart and guards’ seven differences | A missing pastry wedge and a visible heart of crumbs identify the suit. Exactly seven intended uniform differences; removed an unintended eighth sash change. |
| 5 | Queen’s four questions | Cook; Knave of Hearts; seven; remember who stole the tarts. The order and memory trick are preserved. |
| 5 | Hedgehog, three rebounds and flag, 4761 | Individual animated shots use actual obstacle geometry. Only 4 → 7 → 6 → 1 clears the course in three distinct rebounds. Incorrect shots visibly hit obstacles and reset. The layout is rebuilt for 3D, not copied. |
| 6 | Overlapping effigies, 54 | Permanent painted fragments on the three figures align after stacking and lowering their heads. Wrong arrangements are inspectable. Removed the number that previously appeared as an unrelated overlay. |
| 6 | Queen’s near-pangram, R K Z | Original English decree contains exactly the same three missing letters, checked automatically. |
| 7 | Kings’ construction | Nine separately placed pieces follow the written instructions. Both bridge kings must face down, matching the 8s and 9s. A wrong order or bridge face fails the structure check. The source illustration/text disagree on piece count; this follows the written nine-piece sequence. |
| 7 | Perspective, amber 78 and ivory 32, 7832 | Two marked viewpoints align separated number fragments. The cat’s left amber eye establishes the order. The final geometric object is original and approximates the source perspective mechanism. |

## Changes to exploration and presentation

The hall leads into a connected wooded valley, with bridges to appointment clearings, three routes through the Queen’s grounds, and a road to the house. Small discoveries require approaching their hiding places. Optional assisted walking reduces repeated travel without replacing free exploration. There is no countdown or wrong-answer penalty; hints escalate only when requested.

The rabbit retains authored Idle, Hop and CheckWatch clips, attached ears and a watch attached to its paw. Separate Blender assets add articulated frog dialogue, caterpillar movement, a curling hedgehog and resident actions. The cook stirs, the Hatter raises a cup and the Queen gestures. Model and animation changes preserve the gardeners' spade tunics 2, 5 and 7, the guards' seven differences, appointment clocks and message props. These are stylized models.

The first release's correct answer table did not catch overlapping doors, misleading clearance, reversed size controls or difficult phone panels. The repairs now check the visible geometry and controls as well. [BUGS.md](BUGS.md) records those failures and the fixes found while playing the route.

The recorded playthrough started with a fresh save and used ordinary controls and saved progress across repair builds. It completed the nine-piece construction with both bridges facing down, both viewing rings, the elevated cat-eyes approach and the final exit. The ending showed 25 puzzles solved with no hints. Separate development checkpoints were used for targeted phone and layout review, not to advance the recorded solution.

This comparison checks deductions and adaptation choices. It does not establish how entertaining or difficult the adventure will be for a first-time player. The current walkthrough uses known answers and is not a blind playtest. See [TESTING.md](TESTING.md) for the evidence and limits.
