# Sliding Seas crosscheck and 1,000-mission checkpoint

This updates the broader research and supplement already in this folder. Player reviews are qualitative evidence, not proof of the reference game's exact rules. No reliable source reviewed establishes that Sliding Seas itself generates levels procedurally; seeded generation is our requested design choice.

## Reference findings and revisions

| Reference characteristic | Evidence | Current response and limits |
|---|---|---|
| Terrain merges create land and shelter; people must actually be rescued | [Player.One review](https://www.player.one/sliding-seas-review-match-three-142252), [Gamezebo review](https://www.gamezebo.com/reviews/sliding-seas-review-a-gorgeous-entertaining-match-stuff-puzzler/) | Space terrain, crew clocks, rescue transport and shelter requests are implemented. Opening missions begin with crew needing help. Shelter needs more early and repeated emphasis; it currently introduces a dedicated mechanic at 471. |
| Varied rescue objectives and obstacles, with a home to populate | [Official reference](https://www.slidingseas.com/), [Hardcore Droid review](https://www.hardcoredroid.com/sliding-seas-review/) | Twenty nonportal mechanic modules and authored teaching sequences are used. Station progression exists, but do not claim full room/VIP art parity or 25 finished mechanics. |
| Readable boards, cute characters, responsive interaction | Gamezebo and existing sampled gameplay evidence in SLIDING-SEAS-BROADER-RESEARCH.md | Existing character art preserved; direct finger-following tiles, rounded offline fonts, and automatic completion transition shipped in TestFlight 5.1. This expansion preserves those fixes. |
| Gentle/harder variation matters; labels alone do not guarantee fair difficulty | [US player reviews](https://apps.apple.com/us/app/sliding-seas/id1436245163?see-all=reviews), [Australian player reviews](https://apps.apple.com/au/app/sliding-seas/id1436245163) | Generated practice alternates recent mechanics with familiar breaks every sixth mission; generous clocks and free retry. Proof length estimates difficulty, but human playtesting and stronger structural variation remain necessary. |
| A flashing legal move is not always a useful hint | [UK player reviews](https://apps.apple.com/gb/app/sliding-seas/id1436245163) | Hints now evaluate up to 96 legal moves and prioritize immediate victory, objective progress, then sheltered crew. They reject immediate losses; they are not a multi-turn solver and can still miss setup moves. |

## What the generator establishes

- Exactly 1,000 consecutive missions: 102 unchanged authored teaching boards and 898 deterministic terrain variants.
- Twenty chapter files loaded on demand. All are included in the offline install.
- 1,000 unique initial puzzle fingerprints, excluding mission IDs, seeds, entity naming and clocks.
- 61 distinct masks, nine shape families, and 15 board bounding sizes. Most geometry comes from authored templates and mirrored templates, not newly synthesized topology.
- Twenty implemented mechanics, with generated practice only after the corresponding five-part introduction has finished. Removed portals never appear.
- Each exact definition has an independently replayable, hash-checked, booster-free winning trace. The generator rejects invalid candidates and duplicates; it reports exhaustion rather than silently substituting a board.
- Proofs take 1–9 moves. A short proof is a solvability certificate, not a claim of satisfying difficulty, originality, or safety after every possible move.

Run `node scripts/campaign/generate.mjs` to regenerate the committed seed (20260930). Run `npm test -- --configLoader runner` to independently replay all 1,000 and test state/save behavior. Manifest, proofs and quantitative report live under `validation/campaign/generated/`; none may be imported into the production game. `node scripts/campaign/audit-bundle.mts` checks that boundary.

## Remaining design gap

This is a playable expanded beta, not the full original 25-mechanic promise. Relays (841), tethers (881), repair bots (921) and rendezvous (961) remain unimplemented; those numbers currently contain verified practice with earlier mechanics. A fifth new mechanic must replace the removed portal concept to reach 25 distinct mechanics. The historical schedule is planning data; never present its unimplemented entries as playable features.

Prioritize purposeful multi-step layouts, causal combinations, clear objective teaching and physical iPhone playtesting before adding more nominal level counts. Retain the reference's cozy, readable rescue focus and the user's relaxed-but-thoughtful preference.
