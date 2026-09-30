# Pirate drone delivery

Original bespoke host-native image_gen source selected by the controller. No reference-game assets were copied. The original source, exact prompt, provider provenance and original frame preflight are preserved in this directory. Source SHA256: `9c003d32b78d4dfb3e8e576d5c74828f726ed8a41d339a1bc08ea83c81e4a166`. Generated image usage follows the account's native generation terms; no third-party asset license was introduced.

Source: 1254×1254 RGBA, four complete 627×627 cells. Top-left idle, top-right distracted (original candidate label actionable), bottom-left warning/waiting, bottom-right happy parcel return. All framing boundaries are fixed source units; no body/effect-bound cropping.

Approved fallback: game-dev CLI is not installed (`Get-Command game-dev -ErrorAction SilentlyContinue` returned no command). Existing `node scripts/prepare-art.mjs` uses Sharp to composite each full frame on a transparent 720×720 canvas, then compress to 256×256 WebP at quality88/alphaQuality100. Full frames retain antenna, hat, side thrusters, grippers, parcel and confetti. Explicit per-pose canvas placement aligns the chassis center while preserving all margins; it does not derive frames from effect bounds. Uniform square aspect and common pivot (.5,.53) are consumed by `pirateSpriteLayout` at 1.04 playable-cell widths. Runtime does not squash individual poses to separate body bounds.

Original and compressed frames were directly viewed. Actual phone views at 375×667, 390×844 and 320×568 show legible face, parcel, 2/2 and1/2 labels, next-stop arrows and dock mark. Waiting/near-dock use a warning face plus exact coaching. The happy-return texture is selected only by the typed return event. Its parcel travels to the authored dock while the drone leaves; reduced motion removes the drone lift. A durable returned-parcel mark is derived from intercepted IDs and survives reload.

Exact delivery/source hashes, dimensions, alpha and byte counts are generated in `public/optimized/campaign/manifest.json`. This is delivery acceptance, not a claim of measured physical iPhone performance.
