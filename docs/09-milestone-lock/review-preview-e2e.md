# Review and preview: end-to-end run on devnet (R3)

**Written:** 7 Oct 2026 · **For:** the PO, on production (`https://unihackfest-2026.vercel.app`) after the R3 deploy · **Needs:** two Google accounts (A = client, outside the Vietnam view; B = freelancer), two browser windows, a little devnet test USDC and SOL on A.

The run cannot be scripted: it needs two Google sign-ins and a Drive file owned by B. Tick each line and save a screenshot where it says 📷 into `docs/02-thiet-ke/screenshots/r3-e2e/`.

## 0. Prepare (B)

1. In Google Drive (B's account), upload a **watermarked** preview image. For a real one: Submit page → work type **Design** → drop a PNG → **Add watermark**, which downloads `{name}-preview.png`.
2. Share → General access → **Anyone with the link** → **Viewer** → Copy link (the file link, not the folder).
3. Open the link in a private window to check it opens without sign-in.

## 1. Contract with a milestone without done-when points (A)

New contracts now need a done-when point per milestone (R1), so a milestone without points only exists on contracts created before R1. Two ways:

- **Use an older contract** that already has a milestone with an empty "Done when" (made before 7 Oct), with B as the freelancer; or
- **Skip step 3b** and run step 3 with done-when points (the reason-only sheet is covered by the tests and the screenshots in `docs/02-thiet-ke/screenshots/r2-review-preview/d-sheet-no-points.png`).

For a new contract: `/new` → title, 2 milestones × small test amounts, one done-when point each → **Create** → wallet panel → confirm. Send the invite link to B; B accepts (**Open in wallet** → **Slide to accept**); A locks (**Open in wallet** → **Slide to lock**).

## 2. Submit with the Drive link (B)

1. Contract → **Submit** milestone 1.
2. Without a link, press **Submit milestone 1**: the message "Add a preview link the client can open (Google Drive, Figma, YouTube, Loom or an image link)." shows and nothing is sent. 📷
3. Paste the Drive link → **Add**. Under the field, "This is what @A will see" shows a Google Drive box → press **Load preview**: the watermarked image shows. 📷
4. **Submit milestone 1** → confirm in the wallet panel.

## 3. Review (A)

1. Bell → "Waiting for your review" → **Review**.
2. Left: "What @B delivered · on time", the Google Drive box with **Load preview**. Before pressing it, the browser has made no request to Drive (DevTools → Network, filter `google`: empty). 📷
3. Press **Load preview**: the watermarked preview shows inside the box. No CSP error in the console. 📷
4. **3b (milestone without done-when points):** right column says "The brief has no done-when points for this milestone. Judge the preview against the brief." → **Request changes** → the sheet has no checklist; type 9 characters: the button stays off; type a full sentence (10+): **Request changes** → confirm in the wallet panel. 📷
   With done-when points instead: tick one unmet point, add a reason, **Request changes**.

## 4. Revised version (B)

1. Contract → "Changes requested" → **Send revised version**.
2. Paste a second Drive link (a new watermarked preview) → **Load preview** shows it → **Send revised version** → confirm.

## 5. Versions and release (A)

1. **Review revised version**: the switcher shows **Version 1 · Version 2 (revised)**. Switch to Version 1 (integrity line "Same delivery that was submitted ✓"), then Version 2 (revision line). **Load preview** on each. 📷
2. **Accept & release** → confirm. The released screen shows the amount and "Next". 📷
3. B: contract → **Hand over final files** with files only (no link) → it is accepted (hand-over keeps "a link or a file").

## What to report back

- Any step that did not match, with its screenshot.
- The browser and OS used (Safari on iPhone is not in scope: the Workspace shows the phone gate below 900 px).
