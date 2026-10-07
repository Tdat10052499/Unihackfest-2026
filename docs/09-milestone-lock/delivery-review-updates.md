# Delivery, review and notification updates (decision D26)

**Owner:** PO (Hồ Du Tuấn Đạt) · **Written:** 6 Oct 2026 · **Builds on:** `main` at `2fb0318`
**Source:** five changes the team agreed on 6 Oct. The current behaviour below was read in the code on 6 Oct \[Verified\].

| # | Team request (6 Oct) | Task |
| --- | --- | --- |
| 1 | The client can check the real work, milestone by milestone | U1 |
| 2 | Comparing files against the freelancer's becomes optional | U2 |
| 3 | Notifications still use the old design | U3 |
| 4 | When the client does not review in time, both sides see it, and the freelancer still receives the earnings | U4 (PO confirmed: this is the review-deadline case, no program change) |
| 5 | A guide so freelancers submit without exposing secrets or personal data | U5 |
| 6 | Check design previews for a watermark and warn the freelancer; everything else is shared as a Google Drive link (PO, 6 Oct) | U6 |

None of these tasks changes the program. U1, U2, U4 and U5 change `@ned/core`, the Workspace and the mobile app; U3 changes mainly the mobile app and adds a bell to the Workspace.

## U1 · Check the real work for each milestone

**Now:**
- Web review (`ned-workspace/src/pages/Review.tsx`) shows the note, the links, the listed files and an integrity line. The done-when ticks are local.
- Mobile review (`ned-wallet/app/contracts/[fund]/review.tsx`) shows the delivery only when it matches the on-chain fingerprint, and has no criteria checklist.
- Neither app shows past deliveries from the contract page.

**Change**

- **Contract page, both apps, both roles:** each milestone row gets a **Delivery** line once submitted ("Submitted 6 Oct · 2 links · 1 file · View delivery"). It stays available after release or refund, so the history is visible.
- **Review page, side by side** (stacked on mobile):
  - **Left, "What to check"**: the milestone's done-when points from the brief, as a checklist. The ticks stay local, as now.
  - **Right, "What {name} delivered"**: each link as a card (label, domain, **Fixed version** badge when the URL points at a version, **Open** in a new tab), then the note, then the files (see U2), then the integrity line ("Same delivery that was submitted ✓").
- **Bottom line**, replacing any suggestion of a dispute: "Not ready? Tell {name} before {review deadline}. If you don't review by then, this milestone can be released to them." The review deadline comes from the chain.
- **Freelancer:** the same page in read-only mode, titled "What you delivered".
- **Mobile:** while the fingerprint check is still running, show "Checking the delivery…". The mismatch message stays as it is.

## U2 · File comparison becomes optional

**Now:**
- The compare step is already non-blocking: Approve is gated only by `busy` (`Review.tsx:349`).
- However, the confirmation sheet shows "Delivery: Not checked" (`Review.tsx:138`), and each file carries a "Not checked" chip. Together these read like a warning.
- Submit requires at least one link or one file (`content.ts:134`).

**Change**

- **Review (web):**
  - Move `FileDrop` into a collapsed row: **"Optional · Check a file you received"**.
  - Files show no chip until someone checks them.
  - The confirmation sheet shows a file line only when a file was checked.
- **Submit (web):**
  - Rename the section to **"Files (optional)"**.
  - Hint text: "Add files only if you send them to {name} outside N.E.D. Files stay on your computer; we keep only a fingerprint so {name} can check they match."
  - Keep the rule "at least one link or one file". Links become the expected path.
- **Mobile:** no change. It has no file input and no compare step today.

## U3 · Notifications in the new design

**Now**

- `NotificationInAppBanner.tsx` is the old "neo-brutalism" style: hard-coded yellow and lime colours, black borders, offset shadows, and its own animation values.
- `NotificationModal.tsx` uses deprecated colour aliases.
- The store has Vietnamese strings ("Nhận tiền thành công", "Chuyển tiền thành công", "Bạn đã nhận được … vào ví.", …), which is also fix C5 in the compliance fix list.
- Banner and modal print `+$${Number(amount)}` while contract notices pass a formatted string, so they probably show "+$NaN" \[Inference: not run\].
- Milestone events cover only created, locked, submitted and released.
- The Workspace has no notifications.

**Change**

1. **Design**
   - Rebuild the banner and the modal with `components/design` and `constants/motion`: white surface, radius 16, shadow S1, no borders, icon tile, title and one line of body text.
   - Banner: enters with the 200 + 360 ms tokens, hides after 4 s, swipe up to dismiss, and follows reduced-motion settings.
2. **Copy**
   - All English. The modal empty state reads: "Contract updates, transfers and alerts show up here."
   - Group the list into Today and Earlier.
3. **Amounts**
   - Pass numbers, and format them in one place.
   - In the Vietnam view, no transfer or USDC notification at all (A4, V1). Contract notices show "≈ … VND (estimate)".
4. **Events** (shared in `@ned/core`, moved from `ned-wallet/services/milestone/notices.ts`)

   | Event | Client | Freelancer |
   | --- | --- | --- |
   | Contract created | — | "New contract from {name}" |
   | Accepted | "{name} accepted · lock to start" | — |
   | Locked | "Locked · {name} can start" | "Locked · you can start" |
   | Submitted | "Milestone {n} submitted · review by {date}" | — |
   | Review deadline in 24 h (devnet: 1 min) | "Review milestone {n} before {time}" | — |
   | Review time over (U4) | "Review time over · milestone {n} can be released" | "Review time over · release your earnings" |
   | Submission deadline passed | "Milestone {n} can be refunded to you" | "Submission deadline passed for milestone {n}" |
   | Released | "Milestone {n} released" | "Milestone {n} released to you" or "… sent as VND" |
   | Refunded | "Milestone {n} refunded to you" | "Milestone {n} refunded to the client" |
   | Jobs (D25) | "New applicant for {job}" | "You were selected for {job} · accept by {time}" / "{job} was filled" |

5. **Workspace**
   - Add a bell to `TopBar` with the same events.
   - Events are read from the chain every 30 s and on focus.
   - "Seen" is a per-browser UI marker only. No event is stored anywhere else.

## U4 · Review time over: both sides see it, the freelancer still receives the earnings

**Rule (unchanged program, D1):**
- When a submitted milestone passes its review deadline without approval, **anyone** can call `release_after_review`. The amount goes to the destination fixed at accept: the freelancer's wallet, or the payout partner, which sends VND.
- **Nothing is automatic.** There is no backend to send the transaction (D4), so a person must press the button.

**Now**

- Mobile shows the "Anyone can do this" banner and bar to both sides.
- On the web, `nextAction` suggests the release only to the freelancer (`view.ts:238-239`), and the only button opens the wallet.
- The client's status reads "auto-release in …" (`view.ts:137-139`). This is wrong, because nothing releases by itself.

**Change**

- **`@ned/core` `view.ts`:**
  - When review time is over, both roles get the primary action **Release now**:
    - client copy: "You didn't review by {date}. This milestone can now be released to {name}. Anyone can do this, including you."
    - freelancer copy: "Review time is over. Release your earnings now."
  - Both roles see the same status: "Review time over · ready to release".
  - Replace "auto-release in {t}" with **"Release opens in {t} if not reviewed"**.
  - Apply the same symmetry to refunds: the freelancer sees "Submission deadline passed · can be refunded to the client".
- **Workspace:** the Contract page shows **Release now** (and **Refund now**) to both parties. It opens the wallet panel at the confirmation sheet (D23).
- **After the release**, the timeline, Records and notifications say **"Released after the review deadline"** to both sides, with the Explorer link. For the Vietnam view the wording is "sent as VND" (C4).
- **Disclosure text** stays as in compliance review A1: "If the client does not review before the review deadline, anyone can release the milestone to the freelancer."

## U5 · "Before you submit" guide

**Naming:** product-spec section 6 bans "safe" and "an toàn" in copy. The guide is therefore called **"Before you submit: what to share, what to keep private"**.

**Placement:**
- A link at the top of Submit (web and mobile) opens a sheet with the guide.
- A three-line version sits above the Submit button.
- The guide also appears under Help in Settings.

**Copy (English, final):**

> **What happens to what you submit**
> - Your links and note are encrypted with the contract key. Only you and {name} can read them.
> - A fingerprint of the delivery is saved on Solana. It proves what you submitted and reveals nothing about it.
> - Files never leave your device. N.E.D keeps only their fingerprints.
> - A link is only as private as its sharing setting.
>
> **Do**
> - Link to one fixed version (a Figma version, a Git commit, a shared file version).
> - Give view-only or comment-only access.
> - Share previews (watermarked or lower resolution) if you prefer to hand over final files after release.
> - Say which done-when point each part covers.
> - Keep your own copy of everything you submit.
>
> **Don't**
> - Put passwords, API keys, private keys or recovery phrases in links, the note or file names.
> - Include personal data: ID numbers, phone numbers, home addresses, bank details, yours or anyone else's.
> - Include client data you don't need to show.
> - Use links that let anyone edit or delete your work.
>
> **Quick check** (three optional ticks above Submit)
> - My links open with the access I chose (try a private window).
> - Nothing secret or personal is in the links, note or file names.
> - Each done-when point is covered.

The ticks never block Submit.

## U6 · Preview check and watermark tool, then share by Google Drive link

> **Amended 7 Oct 2026 (R1–R3):** a preview link is now **required** for the first delivery and for a revised version (hand-over keeps "a link or a file"). Review and Submit show the link in a preview frame that **loads only when the user presses Load preview** (Drive, Docs, Figma, YouTube, Loom or an image link; sandboxed, no referrer). The local design check and watermark tool below are unchanged. See [review-decision-plan.md](review-decision-plan.md), "Amendment 7 Oct".

**PO decision (6 Oct):**
- Previews are **not** stored on-chain. Writing a preview into notes costs the freelancer about 30 transactions per image, so that option was dropped.
- Deliveries stay as links. The guide tells the freelancer to upload a **watermarked preview** to Google Drive and paste the link.
- For design work, N.E.D checks the preview on the freelancer's computer before Submit. When the check finds no watermark, N.E.D warns the freelancer and asks them to add one.

**What can and cannot be checked, without a server:**
- N.E.D cannot open a Drive link to look at the file: Drive files need the owner's Google sign-in, and browsers block reading them from another site.
- The check therefore runs on the **local preview file** that the freelancer drops into Submit. The file never leaves the computer, as files do today: N.E.D keeps only its fingerprint (U2).
- Detecting *any* watermark in an image needs image recognition and would often be wrong. N.E.D does not try it. Instead, N.E.D **adds its own watermark** and checks for that.
- The check protects the freelancer from their own mistake, not from an attacker, so a simple and reliable rule is enough.

### Work type

At the top of Submit, the freelancer picks a work type:

- Design
- Writing & translation
- Code
- Video
- Other

For a job (D25), the work type is pre-filled from the listing category. The choice is local to the Submit screen; it changes neither the brief nor its hash.

### Design: checks on the preview file

| Check | Rule | Message |
| --- | --- | --- |
| Source format | `.svg`, `.ai`, `.eps`, `.psd`, `.fig`, `.sketch`, `.pdf` | "This looks like a source file. Share a watermarked PNG or JPG preview instead, and keep the source for after release." |
| Resolution | Long side over 1600 px | "This preview is large enough to use as the final. Make a smaller preview (up to 1200 px)." |
| N.E.D watermark | Marker missing (see below) | "No N.E.D watermark found. Add one before you share this preview." with the button **Add watermark** |

**Add watermark** runs in the browser:
1. It shrinks the image so the long side is 1200 px.
2. It tiles the text "PREVIEW · {contract title} · not for use" diagonally at 18% opacity, and adds a corner badge "N.E.D preview".
3. It writes a marker into the file: the PNG `tEXt` chunk `NED-Preview: v1 {fund address}`, or the JPEG `COM` segment for a JPG.
4. It offers the new file as a download (`{name}-preview.png`).

The freelancer then uploads that file to Drive and pastes the link. The check passes when the marker names this contract.

**Gate:**
- When the work type is Design and a check fails, Submit stays disabled.
- The freelancer can still submit by ticking: "I added my own watermark and kept the resolution low." This covers freelancers who use their own watermark. The tick is not saved anywhere.
- Other work types get the guide only, with no file check.

### Link checks (no network calls)

| Link | Message |
| --- | --- |
| Not `https` | Existing rule |
| Google Drive **folder** (`/drive/folders/`) | "This is a folder link. A folder can hold your final files; link the preview file itself." |
| Unknown host | "Make sure this link opens without signing in and doesn't allow editing." (warning only) |
| Drive, Docs, Figma, YouTube, Loom, a deployed demo | No message |

### Guide per work type (added to the U5 sheet)

> **Share a preview on Google Drive**
> 1. Upload the **watermarked preview**, not the final file.
> 2. Share → General access → **Anyone with the link** → **Viewer**.
> 3. In the sharing settings (gear icon), untick **"Viewers and commenters can see the option to download, print and copy"**.
> 4. Copy the link of the **file**, not the folder, and paste it here.
> 5. Open the link in a private window to check what {name} will see.
>
> Drive shows the file owner's Google name to anyone with the link. Use a work account if you don't want to show your personal one.
>
> | Work type | Share for review | Keep until release |
> | --- | --- | --- |
> | Design | Watermarked preview (N.E.D can add it), up to 1200 px | Source files (.ai, .svg, .fig) and full-size exports |
> | Writing & translation | A view-only Google Doc with download and copy turned off, or an excerpt | The editable file |
> | Code | A deployed demo link, a screen recording, test results | Repository access and source code |
> | Video | A watermarked, lower-resolution version on Drive or as an unlisted video | The master file |

### Limits

- **A screenshot still captures the preview.** The watermark and the low resolution make a stolen preview much less useful; they don't make it impossible.
- **The marker proves only that N.E.D made the file**, not that the Drive link points at that file. Optionally, the client can check this by downloading the preview and dropping it into Review (U2): the fingerprint is in the delivery.
- **"Disable download" in Drive** stops the buttons, not every way of saving a file \[Inference\].
- **Mobile:** the guide and the link checks only. The watermark tool and the file checks are web-only until there is time; mobile shows "Use the Workspace on a computer to check a design preview".

## Schedule and priority

The work joins the compliance P0 work on 7–8 Oct. Funded Jobs (D25) keeps 6 Oct.

| Order | Task | Size \[Assumption\] | When | Note |
| --- | --- | --- | --- | --- |
| 1 | U4 (core copy + Workspace button) | 1.5 h | 7 Oct morning | Fixes a wrong claim ("auto-release"); goes with C2 |
| 2 | U5 (guide sheet, both apps) | 1 h | 7 Oct morning | Copy is final above |
| 3 | U2 (optional files) | 0.5 h | 7 Oct morning | — |
| 4 | U3 (notifications) | 3 h | 7 Oct afternoon | Includes C5; the Workspace bell is the first thing to cut |
| 5 | U6 (work type, preview checks, watermark tool, link checks, Drive guide) | 3 h | 7 Oct afternoon | Web first; mobile gets guide + link checks only |
| 6 | U1 (per-milestone delivery view) | 2.5 h | 8 Oct morning | Mobile side is the second thing to cut |

**Cut line, 8 Oct 18:00:** whatever is not merged stays out. The disclosure and Q&A must still match the build.

## Prompts (Claude Code; rules of `build-plan.md` section 10 apply)

### U-A · Core and copy: U4, U5, U2

```
Read CLAUDE.md, docs/09-milestone-lock/delivery-review-updates.md (all), product-spec.md section 6 (words),
packages/ned-core/src/milestone/{view.ts,rules.ts}, ned-workspace/src/pages/{Review.tsx,Submit.tsx,Contract.tsx},
ned-workspace/src/components/{FileDrop.tsx,WalletPanel.tsx}, ned-wallet/app/contracts/[fund]/{index.tsx,submit.tsx}.

Task:
1. U4: in view.ts give both roles the Release now / Refund now action and the shared status labels, replace "auto-release in"
   with "Release opens in {t} if not reviewed", and use the exact copy of U4. Update view tests. In the Workspace Contract page
   show Release now / Refund now to both parties, opening the wallet panel at the confirm sheet.
2. U5: a "Before you submit" sheet with the exact copy of U5, linked at the top of Submit on web and mobile, the three optional
   ticks above the Submit button (never blocking), and a Help entry in mobile Settings.
3. U2: Review (web) moves FileDrop into a collapsed "Optional · Check a file you received" row; no file chips until checked;
   the confirm sheet shows a file line only when a file was checked. Submit (web) renames Files to "Files (optional)" with the
   U2 hint. Keep validateDelivery as it is.
Branch: feat/delivery-updates-a. Done when: typecheck, tests and both builds pass; screenshots of review, submit and the
review-over state for client and freelancer in the PR; progress row added.
```

### U-D · Preview check and watermark tool: U6

```
Read delivery-review-updates.md sections U2, U5 and U6, ned-workspace/src/pages/Submit.tsx, ned-workspace/src/lib/delivery.ts,
ned-workspace/src/components/FileDrop.tsx, ned-wallet/app/contracts/[fund]/submit.tsx, product-spec.md section 6.

Task (web first):
1. Work type picker at the top of Submit (pre-filled from the job category when the contract came from a job). Local only.
2. ned-workspace/src/lib/preview.ts (pure, unit-tested): source-format check, image size check (decode in the browser),
   PNG tEXt / JPEG COM marker read and write ("NED-Preview: v1 <fund>"), and addWatermark(file, title, fund) -> Blob
   (canvas: long side 1200 px, diagonal tiled "PREVIEW · {title} · not for use" at 18% opacity, corner badge "N.E.D preview",
   then the marker). Tests with small fixture images.
3. Submit: for Design, the dropped preview file runs the three checks with the exact messages of U6; "Add watermark" downloads
   "<name>-preview.png"; Submit stays disabled until the checks pass or the override tick is ticked.
4. Link checks of U6 on every link (no network calls), on web and mobile.
5. Add the Drive guide and the per-type table of U6 to the "Before you submit" sheet (U5) on web and mobile; mobile shows
   "Use the Workspace on a computer to check a design preview" for Design.
Branch: feat/preview-check. Done when: tests and builds pass; PR screenshots of each warning, the watermarked output and the
override; progress row added.
```

### U-B · Notifications: U3

```
Read delivery-review-updates.md section U3, ned-wallet/stores/useNotificationStore.ts, ned-wallet/components/
{NotificationInAppBanner,NotificationModal,GlobalNotificationManager}.tsx, ned-wallet/services/milestone/notices.ts,
ned-wallet/hooks/useContractWatch.ts, ned-wallet/constants/{design,motion}.ts, ned-workspace/src/components/TopBar.tsx.

Task:
1. Move the notice texts to @ned/core (milestone/notices.ts) with every event of the U3 table, numbers in, one formatter.
2. Rebuild the banner and the modal with components/design and constants/motion (no borders, shadow S1, reduced motion).
3. English only; remove the Vietnamese strings (fix C5). No transfer or USDC notification in the Vietnam view.
4. Fix the amount formatting (no "+$NaN").
5. Workspace: a bell in TopBar with the same events, polled every 30 s and on focus; "seen" kept per browser only.
Branch: feat/notifications-v2. Done when: tests and builds pass; screenshots of banner and modal (both views) and the web bell.
```

### U-C · Per-milestone delivery view: U1

```
Read delivery-review-updates.md section U1, ned-workspace/src/pages/{Contract.tsx,Review.tsx},
ned-wallet/app/contracts/[fund]/{index.tsx,review.tsx}, packages/ned-core/src/milestone/notes.ts (readContractContent).

Task: the Delivery line per submitted milestone on the contract page (both apps, both roles, also after release/refund), the
side-by-side review ("What to check" from the brief's done-when points, "What {name} delivered" with link cards and the
Fixed version badge), the bottom line with the review deadline from the chain, the read-only "What you delivered" view for
the freelancer, and "Checking the delivery…" on mobile while the fingerprint check runs.
Branch: feat/delivery-view. Done when: tests and builds pass; screenshots for a contract with one released and one submitted
milestone, as client and as freelancer.
```

## Limits

- Previews are not stored on-chain (PO, 6 Oct: about 30 transactions per image is too costly for the freelancer).
- Link cards show no previews: fetching a preview of a third-party page would need a server, and would reveal the link.
- Review-deadline reminders only appear while the app or the Workspace is open. There are no push or email reminders without a backend (D4).
- Ticks and "seen" markers are per device. They are not records.
