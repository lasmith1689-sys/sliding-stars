# Fixed station release checkpoint - October 6, 2026

Stations now stay fixed. Crew reach the glowing side entrance; dragging the station or swapping terrain into it leaves the board and move count unchanged. This supersedes the movable-station behavior in build 17.1. Read the [fixed station audit](2026-10-06-FIXED-STATIONS-AUDIT.md) for implementation, save compatibility and the remaining empty-shuttle usability question.

## Verification

- **1,176 tests / 126 files passed**; TypeScript, production build and Capacitor synchronization passed.
- All **1,000 immutable mission routes replay** with no failures or pending revisions. Advice: **3,983 positions**, proof depth 1-12, mean 3.983.
- Independent review verified every existing station remained identical across every route and checked all packaged hints; no remaining findings.
- Production boundary: **873 modules / 61 chunks / zero development campaign modules**. Offline pack: **208 files**.
- Content SHA-256 remains `9896b20b34aa2a3104a698427c709a53a57002cc06ae9b9f083c37b2f7a2a3c4`. Definitions, goals, rewards and active station positions are preserved.
- At 390-by-844, local browser Mission 3 rescued both crew in seven accepted moves while the station stayed fixed. The astronaut fell through the permanent gap; attempted station moves spent no move.

## Delivery

The [improved web preview](https://next--sliding-stars.netlify.app/) is being updated on the `next` alias only. The original production site and parent game remain preserved. Exact deployment and public browser evidence will be recorded after verification.

Native delivery of this correction is pending. **1.0 (17.1)** is the previous internally available build and still permits station movement. Do not claim it contains this correction. The new `[ship]` release must pass macOS checks, signed upload, Apple processing and exact-build API verification before it is recommended.

Existing public TestFlight/App Store review remains blocked by blank review contact and owner-entered App Privacy. An invitation is not evidence of installation; upload is not approval. See [release instructions](app-store/RELEASE.md).

Next: verify the published web behavior and new native build, then update the iPhone and retry Mission 3, including save/reopen and offline play. Continue in the current thread; no new thread is required.
