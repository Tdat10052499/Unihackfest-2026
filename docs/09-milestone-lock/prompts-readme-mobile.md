# README with the phone app first: Claude Code prompt M1 (phone screenshots)

**Owner:** PO (Hồ Du Tuấn Đạt) · **Written:** 7 Oct 2026 · **Base:** `main` at `b9bc53a`

## Why

The PO decided on 7 Oct that **the phone app is the main product**. The Workspace, N.E.D Jobs and the future landing page support it. The README is rewritten in that order: it opens with "The N.E.D app" and a gallery of eight phone screens, and the other parts move to "Around the app". The repository has no screenshots of the current phone screens: the old `assets/images/home.png`, `analytics.png`, `scan.png` and `auth.png` show the earlier wallet. The session that wrote the README could not reach devnet, so M1 captures the screens on a team computer, then applies the README patch.

**Update 8 Oct:** the main `README.md` is already on `main` with the app first. Its phone gallery is inside an HTML comment (`<!-- PHONE-GALLERY … PHONE-GALLERY -->`), so nothing is broken. M1 only has to add the images and remove the two comment lines. There is no separate README for the app: this is the repository's main README.

**Update 8 Oct (PO):** the gallery is now open, with eight screens rendered from the design boards (`docs/02-design/screenshots/mobile-app/README.md` gives the source of each and the A4 note). A line under the gallery says they are designs. M1 still applies: overwrite the eight files with captures from the running app (same names), then change the line under the gallery to say they are app captures. Steps 4 to 6 stay the same; skip the step-5 comment removal.

## M1 · Capture the phone screens and publish the README

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0 (work on main: git switch main && git pull --ff-only origin main).
Read: docs/09-milestone-lock/prompts-readme-mobile.md, README.md (the commented "The N.E.D app" gallery lists the eight file
names and captions), ned-wallet/app/dev/{home-preview,contract-preview}.tsx (read-only previews for a public wallet,
FEATURES.devTools builds only), docs/09-milestone-lock/final-pitch.md §3 (demo accounts and contracts).
Task:
1. Data. Use the team's demo accounts on devnet: Person A (client, USDC wallet) and Person B (freelancer, Vietnam view).
   Ask the PO for:
   - the two wallet addresses;
   - one contract between them in each state needed below (Created, Funded, with a Released milestone), with their
     invite links (#k=…).
   If a state is missing, create it with the two logins as in the demo runbook. Never write keys, invite fragments or
   .env values into the repo or into a commit message.
2. Run the app locally with dev tools (never for the public build):
   cd ned-wallet && EXPO_PUBLIC_DEV_TOOLS=1 npm run web
   Use Playwright with Chromium (or Chrome DevTools device mode) at 390 × 844, deviceScaleFactor 2.
   For each screen:
   - wait for the data to load (no skeletons, no spinners);
   - hide any Google name or e-mail address on screen.
3. Capture these eight screens to docs/02-design/screenshots/mobile-app/ (exact names):
   - 01-welcome.png: / signed out (welcome, "Continue with Google").
   - 02-home-vn.png: /dev/home-preview?wallet=<B>&view=vn.
   - 03-accept-vn.png: /dev/contract-preview?wallet=<B>&fund=<Created contract>&view=vn&screen=accept&k=<key>, with
     "VND to my Vietnamese bank account" selected and Slide to accept visible.
   - 04-locked-vn.png: …&screen=locked for a Funded contract ("Locked for you · ≈ … VND (estimate)").
   - 05-contract-vn.png: …&screen=detail for a Funded contract with one milestone Submitted (deadlines, status, the
     promised final files).
   - 06-released-vn.png: …&screen=detail for a contract with a Released milestone ("Released to payout partner · VND
     transfer simulated").
   - 07-records-vn.png: /dev/contract-preview?wallet=<B>&view=vn&screen=records.
   - 08-lock-client.png: …wallet=<A>&view=intl&screen=lock for an Accepted contract (Slide to lock).
4. Frame each image the same way, with a small script under docs/02-design/screenshots/mobile-app/ or ned-wallet/scripts/:
   - rounded corners, radius 48 px at 2×;
   - a 12 px dark bezel (#16161C);
   - a transparent background;
   - final width 780 px.
   Keep the raw captures out of the repo. Check every image:
   - the Vietnam-view screens show no "USDC" and no SOL amount (rule A4);
   - no screen shows a personal e-mail or phone number.
5. In README.md, delete the two comment lines around the phone gallery (the line starting "<!-- PHONE-GALLERY" and the
   line "PHONE-GALLERY -->"). Check that every image path in README.md exists:
   grep -o 'docs/02-design/screenshots/[^"]*' README.md | xargs ls
6. Commit the images and the README together (docs: phone screenshots and README with the app first), and push.
Done when: the eight framed images and the README are on main; the README renders on GitHub with no broken image;
progress row "M1 README phone screens"; CL notified (README is in the CL's CODEOWNERS paths).
```

## Notes for the CL

The README copy follows the word table and the same limits as before. New statements, each checked against the code:

- **Workspace only for now:** request changes, revised versions, splits, and submitting with a list of final files (F-1).
- **Readable before sign-in:** Terms, Privacy and Disclosures (`PUBLIC_SEGMENTS` in `ned-wallet/app/_layout.tsx`). Help is not in that list.
- **Records:** described as "a CSV export … (not tax advice)". The README does not claim the CSV is in VND, because D16 (`amount_usdc` in the Vietnam CSV) is still open.
- **The landing page** is marked "Planned".
