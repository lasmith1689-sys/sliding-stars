# Rescue-shuttle revision (September 30, 2026)

User issue: the gold ring looked like an outer-space raft, could swap without matching, and had no apparent purpose.

- Replaced its production texture with a sealed ivory/purple/teal rescue spacecraft. Original pod.png is retained, and the parent original game is untouched.
- Empty shuttles must create an ordinary terrain match when swapped. An occupied shuttle has powered one-cell flight and carries its guest to a station entrance. Stations retain their existing repositioning rule. Cargo capsules still require matches below them and never direct-swap.
- Board badges distinguish MATCH and passenger count ABOARD. Touching either shuttle explains its rule. Four-tile merges collect the guests participating in that merge; empty shuttles do not magically rescue unrelated crew.
- Repaired affected authored routes. Redesigned mission 114 as two separate capsule departures. Replaced empty shuttle placeholders with ordinary platform terrain in key lessons 561-565 and combined lesson 805.
- Regenerated 1,000 distinct booster-free winning boards and 3,023 verified hint entries, with 63 masks and all 20 implemented nonportal mechanics. Preserved pacing checks by spending more generation attempts on the intended long/short pool. Proof length is 1-9 moves; this does not prove human enjoyment.
- One-time save migration prepares the current unfinished mission using the new catalog. Completed levels, rewards, wallet and attempts remain intact; already won missions are preserved. This reset is necessary because old routes could depend on now-illegal empty-shuttle moves.

## Verification

1,024 tests / 114 files passed. Typecheck, production build, production bundle audit and Capacitor iOS sync passed. All 1,000 exact proof routes and hint maps replayed. The 41-board hint QC sample won 41/41. At 390x844, physically dragged a loaded shuttle in lesson 473 twice and rescued the guest; lesson 758 rejected an empty-shuttle nonmatch with zero moves spent and explanatory feedback. This is desktop browser verification, not physical iPhone testing.

## Art provenance

Built-in image_gen used with public/art/home.png as style reference. Saved project asset: public/art/rescue-shuttle.png. Delivery compression is handled by the existing prepare-art script. Source and alpha preserved.

Prompt: Create one production game sprite on a genuinely transparent background. Reference is STYLE ONLY: cute polished chunky pixel-art space station with dark purple outlines, warm ivory metal, teal windows, golden highlights, three-quarter isometric view. New subject: a tiny enclosed RESCUE SPACE SHUTTLE, clearly a spacecraft and never a boat or inflatable raft. Rounded ivory capsule hull, broad sealed teal cockpit window, two small purple side thruster nacelles with tiny cyan exhaust, gold rescue beacon. Empty cockpit, no people, no lettering, no crosses or logos. Friendly compact toy proportions, crisp silhouette readable at 48 pixels, centered square composition, object fills 85 percent of canvas with transparent margin. No planet, platform, water, ground, white sticker border or background. Match reference pixel-art palette and lighting. Save single transparent sprite.

## Next work

Test the new empty-versus-occupied distinction on the physical iPhone. Decide from that playtest whether powered shuttle flight remains enjoyable; do not silently restore unlimited empty-piece swaps. The broader backlog in CLAUDE-HANDOFF.md remains: deeper procedural strategy, off-route hints and remaining genuinely new mechanics. No new Codex thread is required.
