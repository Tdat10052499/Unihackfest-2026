# Final files: the client receives what was accepted, the freelancer keeps the files until release. Claude Code prompts F1–F3

**Owner:** PO (Hồ Du Tuấn Đạt) · **Written:** 7 Oct 2026 · **Base:** `main` at `09b1506` (R1–R3 done) · **Amends:** D27 (handover), U6

## Why

After a milestone is released, the client has no place to receive the final files. The freelancer can hand them over, but on the client's side the design only lets them check files, not receive them.

| # | Gap | Where |
| --- | --- | --- |
| G1 | **No place to receive.** The client's only entry is "Check final files" in a banner. Links show as "Open" cards, with no download. | `Contract.tsx` (released banner), `FinalFiles` in `Review.tsx` |
| G2 | **The check compares against the wrong files.** Final files are compared with the fingerprints of the *first* delivery, which are usually the watermarked preview (U6). Real final files almost always show "Not one of the committed files". | `FinalFiles({ first: versions[0] … })` |
| G3 | **No waiting state.** The client does not know which files are coming, or when. | Released banner |
| G4 | **No handover after a split or a cancellation.** `canHandover` requires `Released`, and the program's `post_note` rules do the same. | `rules.ts`, `post_note.rs` |
| G5 | **The client can close the contract before the files arrive.** After that, the freelancer cannot hand over. | `canClose` |

## Rules: what protects each side

| Who | Protection | How |
| --- | --- | --- |
| **Freelancer** | The final files leave their device only after the money is released | Handover is possible only on a `Released` milestone (approve, or Release now). Before release, only fingerprints and file names are shared. |
| **Freelancer** | Their work is not given away if the money goes back | Refund, Return to client: no handover, no promised list shown as owed. |
| **Freelancer** | Not blamed when the client closes early | If the client closes the contract before the handover, the page and any future record say "closed by the client before handover". |
| **Freelancer** | Can explain an honest change | A promised file can differ at handover (format, final export), with a written reason shown to the client. |
| **Client** | Knows exactly what they will receive *before* accepting | At submit, the freelancer commits a **promised list**: name, size and fingerprint of each final file. Review shows it next to the preview. Accepting means accepting the preview and the list. |
| **Client** | Can check that what arrives is what was promised | After download, the client drops the files in. Each one is compared with the promised list of the **accepted version**, not the first delivery. |
| **Client** | Gets files even if they did not review in time | Release now opens the handover just like Accept & release. |
| **Client** | Has proof of what was received | "Save receipt": a JSON file built on their device with the fingerprints, links, times and transaction signatures. |
| **Client** | Is warned before closing too early | Close shows which milestones still have no handover. |
| **Both** | See the same status | "Waiting for final files (since …)", "Handed over", "Late (after 48 hours)", with in-app reminders to the freelancer. |

**N.E.D cannot force a handover.** Once released, the money has left the program. Fingerprints prove what was promised; they do not make anyone deliver. The two sides of this:
- **The client is told before accepting:** "After release, N.E.D cannot make @x hand over the files. Check the list below before you accept."
- **Roadmap (B-17):** final files encrypted before review, with the key released by the same transaction as the money.

**Splits and cancellations (G4) are not fixed before the freeze.** That needs a program change to the `post_note` rules. The split sheet says: "Agree which files are handed over as part of the split. N.E.D cannot record a handover after a split in this version."

## How to run

One new Claude Code session per prompt, in order F1 → F3. Each follows section 0 of [`prompts-6oct.md`](prompts-6oct.md): work on `main`, pull first, tests before each push, no secrets, English UI, the word table, a progress row in `docs/progress-log.md`.

**Not changing:** program, note kinds, the encryption, the evidence hash of existing deliveries, settlement rules.

---

## F1 · Core: promised list, accepted version, handover check, receipt, close guard

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0 (work on main: git switch main && git pull --ff-only origin main).
Read: docs/09-milestone-lock/prompts-final-files.md (Why, Rules), review-decision-plan.md (D27 and its 7 Oct amendment),
packages/ned-core/src/milestone/{content.ts,links.ts,embed.ts,notes.ts,rules.ts,events.ts,view.ts} and their tests,
packages/ned-core/src/actions.ts (runSubmit, runSendRevision, runHandover).
Task (packages/ned-core only):
1. DeliveryDraft gets an optional `finals: { name: string; size: number; sha256: string }[]`, the promised list.
   - Canonical JSON includes `finals` only when non-empty, so every existing delivery keeps its canonical form and still
     matches its on-chain fingerprint (deliveryEvidence). Decoding accepts deliveries with and without `finals`.
   - `files` stays as it is: the preview or proof files.
2. validateDelivery:
   - First submission and 'revision':
     - `finals` is required (1–10 entries, unique sha256, names 1–120 characters), unless at least one link is a
       fixed version (isFixedVersion: a Figma version or a Git commit). Message: "List the final files you will hand
       over after release. Only their fingerprints are shared now."
     - A promised file cannot also be the preview (the same sha256 in `files` and `finals`). Message: "The preview and
       the final files must be different files."
   - 'handover': at least one link is required (where the client downloads). Message: "Add the link where
     {client} can download the final files." `files` = the final files handed over (fingerprints). `finals` is not
     used.
   - The whole encoded delivery must still fit the note size limit (NOTE_MAX_LEN × NOTE_MAX_PARTS minus the encryption
     overhead). Add a test with 10 finals of 120-character names.
3. acceptedVersion(history): the last delivery that is not a handover (revisions are only possible before release),
   returned with its index (Version N), time and content.
4. compareHandover(promised, received):
   - Returns, for each promised file: 'same' | 'missing'; for each received file not in the list: 'extra'.
   - Matching is by sha256; the name is only shown.
   - A handover delivery with any 'missing' or 'extra' needs a note of at least 10 characters (validateDelivery for
     'handover' gets the accepted version's finals as a second argument). Message: "Explain what changed from the
     files you promised."
5. checkDownload(promised, files hashed on the client's device) → the same three states, plus 'different' when a
   received name matches but its sha256 does not.
6. handoverStatus(fund, index, history, releaseTime?, now) → 'not-due' | 'waiting' | 'late' | 'handed-over' |
   'not-applicable'.
   - 'waiting' from release; 'late' 48 hours after release (HANDOVER_SOFT_SECS = 172800). The time is a soft
     reminder: nothing is enforced.
   - 'not-applicable' for Refunded and Cancelled.
   - Release time: from the MilestoneReleased event in the contract's transactions when available (events.ts);
     otherwise no countdown, only 'waiting'.
7. buildReceipt(...) → a plain object, serialised by the app:
   - contract address, title and milestone;
   - the accepted version (index, time, preview links);
   - the promised list, and the handover (links, files, note, time, signature);
   - the release (time, signature, by approve or Release now, when known);
   - the client's local check results with the time of the check;
   - the program id and cluster;
   - the line "Built on the client's device. Not legal advice."
8. closeWarnings(fund, histories) → the released milestones with no handover. canClose itself does not change.
Tests: old deliveries (with and without files) keep their evidence hash; every validation message above; a fixed-version
link without finals passes; acceptedVersion with a revision; compareHandover and checkDownload for same, missing, extra
and different; handoverStatus for every state including Release now and Refunded; buildReceipt keys; closeWarnings.
Done when: core tests and typecheck pass; ned-workspace and ned-wallet typecheck (list callers that R2/F2 must change);
progress row; pushed.
```

## F2 · Workspace: promised list at submit, "What you will receive" in Review, the Final files card, the Files tab

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0 (work on main).
Read: prompts-final-files.md (Rules), the F1 exports, ned-workspace/src/pages/{Submit.tsx,Review.tsx,Contract.tsx,
Milestone.module.css,Flow.module.css}, src/components/PreviewFrame.tsx, src/lib/{preview.ts,delivery.ts},
src/pages/__tests__/{submit,contract}.test.tsx, and the notification code from S9 (bell).
Task:
1. Submit (first submission and revised version):
   - Under the preview link, a new required section "Final files you will hand over after release". The freelancer
     picks files on the device; they are hashed, never uploaded. Show the list (name, size, short fingerprint).
   - Hint: "Keep these files. {client} sees only their names, sizes and fingerprints until the money is released."
   - With a fixed-version link the section is optional: "Your fixed version link is the final work."
   - "Files (optional)" is renamed "Preview files · fingerprints only". The U6 preview check is unchanged.
   - The confirm sheet shows the count of promised files.
2. Review (before a decision):
   - In the right column, above the decision card, a card "What you will receive after release" with the promised
     list of the version on screen. With a fixed-version link and no list: "The fixed version link above is the final
     work."
   - Under the decision buttons: "After release, N.E.D cannot make {name} hand over the files. Check this list before
     you accept."
3. Final files card (client and freelancer). It replaces FinalFiles and is shown first on a released milestone, both in
   Review and as a section on the contract page:
   - Waiting:
     - "Waiting for final files from {name} · since {release time}" ("Late · {n} hours after release" after 48 h);
     - the promised list in grey;
     - for the freelancer, the primary button "Hand over final files".
   - Handed over:
     - "Handed over {time} · for Version {n}, accepted {time}";
     - one row per link with a "Download" button; a single Google Drive file uses
       https://drive.google.com/uc?export=download&id=<id>; any other link opens in a new tab with noopener noreferrer;
     - the freelancer's note, and the reason when the files changed;
     - the promised list with compareHandover chips ("Same as promised" / "Missing" / "Extra").
   - "Check your download":
     - a drop zone for files or a folder; hashing happens here;
     - each file gets a checkDownload chip: "Same as promised before you accepted ✓", "Different from what was
       promised", "Not in the promised list";
     - results are kept for the page session only.
   - "Save receipt": downloads ned-receipt-<contract-short>-m<n>.json (buildReceipt), made on the device.
   - Footer line: "Download and keep your own copy. These links are hosted by {name} and can stop working."
   - Refunded or Cancelled: "No final files: this milestone was {refunded / split}." For a split, add "Agree which files
     are handed over as part of the split."
4. Contract page: a "Files" tab or section listing every milestone (status from handoverStatus, accepted version,
   Download, Receipt). For the client, the released banner button reads "Get final files" when they are handed over,
   and "View status" while waiting.
5. Handover page (Submit in handover mode):
   - A required download link, with the hint "Share with download access (Google Drive: Anyone with the link · Viewer).
     Keep the link working for at least 30 days."
   - The freelancer picks the final files: a live compareHandover against the accepted version's promised list, and a
     required reason when something differs.
   - Handover is only offered on a Released milestone (canHandover, unchanged).
6. Close: before the confirm sheet, if closeWarnings is not empty, show "{name} has not handed over the final files for
   milestone {n}. Closing ends this contract's page for both of you, and {name} can no longer hand them over." The
   buttons are "Keep open" (primary) and "Close anyway".
7. Notifications (bell, existing mechanism): at release, freelancer "Released · hand over the final files"; 24 h and
   48 h after release with no handover, freelancer "Final files for milestone {n} are due"; on handover, client "Final
   files received · milestone {n}".
8. Mobile (ned-wallet): if the app has a handover or review screen, use the same core validation and show the promised
   list read-only. Otherwise list the gap in the report for S13. Do not build new mobile screens here.
Copy: English only; the word table; no "guaranteed", "safe", "escrow" or "pay". Motion only through src/motion.ts.
Tests: submit is blocked without finals unless there is a fixed-version link; the preview cannot be a promised file;
Review shows the promised list and the no-enforcement line; the Final files card in each state; Download uses the Drive
direct URL for a file link; checkDownload chips; the receipt file contents; the close warning; handover blocked before
release; existing D27 and R2 tests still pass.
Done when: tests, typecheck, lint and build pass; screenshots desktop and 390 px of submit with finals, Review with "What
you will receive", the Final files card (waiting, late, handed over, checked, refunded), the Files tab, the close warning;
progress row; pushed.
```

## F3 · Docs, copy review and an end-to-end check

```
Follow docs/09-milestone-lock/prompts-6oct.md section 0 (work on main).
Read: prompts-final-files.md, review-decision-plan.md, delivery-review-updates.md (U5, U6), system-tracker.md (sections 3,
6C F-5, 7, 8, 9), packages/ned-core/src/legal/copy.ts (Terms, the submit guide GUIDE), final-pitch.md (slide 3, Q&A).
Task:
1. Docs (do not delete anything; date each change):
   - review-decision-plan.md: "Amendment 7 Oct (final files)", with the Rules table of prompts-final-files.md.
   - README.md D27 row: "(amended 7 Oct: promised final files at submit; Final files card with download, check and
     receipt; close warning)".
   - system-tracker.md:
     - section 3.2, the handover row;
     - F-5: promised list, 48-hour soft reminder, receipt;
     - section 7: "Handover missing" does not count when the client closed the contract first;
     - section 9: the new notifications;
     - section 12: a B row for F1–F3.
2. Submit guide (GUIDE in legal/copy.ts) and Terms: one line each, CL to review before the push.
   - Guide: "List your final files when you submit. Hand them over after release, with a link that allows download."
   - Terms, on the work: "After release, N.E.D cannot make the freelancer hand over files. The promised list and
     fingerprints show what was agreed."
3. final-pitch.md:
   - Q&A (the pitch and Q&A are in Vietnamese only; button names stay in English), a new line for "Nếu freelancer
     không bao giờ gửi file cuối thì sao?": "Trước khi đồng ý, client thấy danh sách file cuối kèm fingerprint. Sau khi
     release, client kiểm tra file tải về với danh sách đó và lưu biên nhận. Hiện chúng tôi chưa thể bắt buộc bàn giao;
     mã hoá file cuối và mở khoá cùng lúc với tiền nằm trong roadmap."
   - Slide 3 (optional, only if time allows): after Accept & release, show the Final files card in the "waiting" state.
4. End-to-end on devnet with two logins (or the exact clicks for the PO):
   1. submit with a preview link and 2 promised files;
   2. request changes, then a revision with a changed list;
   3. accept;
   4. the handover page with one file changed (a reason is required);
   5. the client downloads, checks (one same, one different) and saves the receipt;
   6. the close warning on another contract with no handover.
Done when: docs and copy are updated (the CL review is noted in the progress row); the e2e run or the click list is in
the progress row with screenshots; pushed.
```

---

## Limits

- **No enforcement after release:** the money has already moved, so N.E.D cannot make anyone hand over. This is stated before the client accepts.
- **Hosting:** links are hosted by the freelancer and can expire. The client is told to download and keep a copy.
- **What a match proves:** a fingerprint match shows the client received the promised files. It does not judge their quality; that was the review.
- **Splits and cancellations:** no recorded handover until the program allows delivery notes on Cancelled milestones (roadmap).
- **Local state:** check results and "late" status are computed on the device. Only the notes and the transactions are on-chain.
