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
3. *(Since F1, 7 Oct)* Under **Final files you will hand over after release**, choose 2 final files (they are read on the computer, never uploaded).
4. Paste the Drive link → **Add**. Under the field, "This is what @A will see" shows a Google Drive box → press **Load preview**: the watermarked image shows. 📷
5. **Submit milestone 1** → confirm in the wallet panel (the sheet shows "Final files promised: 2").

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
3. B: contract → **Hand over final files**: *(since F1, 7 Oct)* a download link is required; files alone are refused with "Add the link where @A can download the final files." Paste the link → hand over. Part B covers the hand-over in full.

## What to report back

- Any step that did not match, with its screenshot.
- The browser and OS used (Safari on iPhone is not in scope: the Workspace shows the phone gate below 900 px).

---

# Part B · Final files (F3, 7 Oct)

Same two accounts. Prepare on B's computer three local files: `logo.svg`, `logo@2x.png` (the promised list) and `logo@2x-v2.png` (a changed export, used in step B4). Keep exact copies: the check in step B5 compares fingerprints.

## B1. Submit with a preview link and 2 promised files (B)

1. Contract → **Submit** milestone 1. Paste the watermarked preview's Drive link (Part A step 0).
2. **Final files you will hand over after release**: choose `logo.svg` and `logo@2x.png`. Without them, **Submit** shows "List the final files you will hand over after release. Only their fingerprints are shared now." 📷
3. Try the preview file in both lists: "The preview and the final files must be different files."
4. **Submit milestone 1** → the confirm sheet shows **Final files promised: 2** → confirm.

## B2. Request changes, then a revision with a changed list

1. A: **Review** → right column **What you will receive after release** lists the 2 files; under the buttons "After release, N.E.D cannot make @B hand over the files. Check this list before you accept." 📷 → **Request changes** (tick a point or write the reason) → confirm.
2. B: **Send revised version** → a new preview link; final files `logo.svg` and `logo@2x-v2.png` (the changed list) → **Send revised version** → confirm.

## B3. Accept (A)

1. **Review revised version** → switch **Version 1 · Version 2 (revised)**: the receive card follows the version on screen. 📷
2. On Version 2, **Accept & release** → confirm. The **Final files** card shows "Waiting for final files from @B · since …". 📷

## B4. Hand-over page with one file changed (B)

1. Contract → **Hand over final files**. Without a link: "Add the link where @A can download the final files."
2. Upload a zip or the files to Drive, share **Anyone with the link · Viewer**, paste the link.
3. Choose `logo.svg` and `logo@2x.png` (the old export instead of the promised `logo@2x-v2.png`): the list shows **Same as promised**, **Missing**, **Extra**; **Hand over final files** asks "Explain what changed from the files you promised." Write a reason (10+ characters) → hand over → confirm. 📷

## B5. Download, check, receipt (A)

1. Bell: "Final files received · milestone 1" → contract → **Files** → the card shows "Handed over … · for Version 2, accepted …", the reason, the chips. 📷
2. **Download** (a single Drive file downloads directly; a folder opens in a new tab).
3. **Check your download**: drop `logo.svg` (expect **Same as promised before you accepted ✓**) and a file **named** `logo@2x-v2.png` with other content, for example `logo@2x.png` copied under that name (expect **Different from what was promised**: same name, other fingerprint). A file with a name that is not in the list shows **Not in the promised list**. 📷
4. **Save receipt** → a file `ned-receipt-<8 characters>-m1.json` is saved; open it: contract, accepted version 2, promised list, hand-over, release signature, check results, "Built on the client's device. Not legal advice." 📷

## B6. Close warning on another contract (A)

1. Use a contract where every milestone is released (or refunded) and one released milestone has **no** hand-over, so the contract is Settled.
2. Contract page → **Open in wallet** (Close): before the wallet opens, "@B has not handed over the final files for milestone N. Closing ends this contract's page for both of you, and @B can no longer hand them over." with **Keep open** and **Close anyway**. 📷 Press **Keep open** (do not close a demo contract).

Save the 📷 screenshots to `docs/02-thiet-ke/screenshots/f3-e2e/`.
