# Review decision: accept or request changes (decision D27)

**Owner:** PO (Hồ Du Tuấn Đạt) · **Written:** 6 Oct 2026 · **Builds on:** `main` at `2fb0318` (program v1.2)

**Status.** The PO asked on 6 Oct for this behaviour:

- After a freelancer submits, the client reviews and decides whether to accept the work.
- A client can refuse work that misses the brief, so that "submit any file and get paid" does not work.
- A freelancer whose work was viewed cannot lose both the earnings and the work.

The PO also asked that every change ship on 6 Oct. This plan therefore **turns the dispute group on** (`FEATURES.dispute = true`). If the PO decides otherwise, skip every step marked D27 in [`build-order-6oct.md`](build-order-6oct.md), keep the flag off, and use the "disputes off" disclosure of compliance fix C2.

## 1. Rules

The program already has the core of it \[Verified on `2fb0318`\]:

- `dispute` works only on a Submitted milestone before its review deadline (`dispute.rs:18-19`), and it stops `release_after_review`.
- A Disputed milestone ends in only three ways:
  - client `approve` → released to the freelancer's destination (`approve.rs:16-17` accepts Disputed);
  - freelancer `concede` → refunded to the client;
  - an agreed split (`propose_cancel` + `accept_cancel`).
- **No instruction lets the client take the amount back alone.**

| Situation | Client can | Freelancer can |
| --- | --- | --- |
| Submitted, before the review deadline | **Accept & release** (`approve`), or **Request changes** (`dispute` + a review note) | Wait |
| Submitted, review deadline passed | Release now (U4) | Release now (U4) |
| Changes requested (Disputed) | Accept & release, request changes again on a revised version, propose or accept a split | **Send a revised version** (delivery note), propose or accept a split, **Return to client** (`concede`) |
| Released | Check the final files against the fingerprints (U2) | **Hand over final files** (delivery note) |

What this protects:

- **The freelancer.** Request changes never refunds the client. A client who copies a preview and then refuses gets nothing back; the amount stays locked until both agree.
- **The client.** A freelancer who submits junk is not paid, because the client requests changes before the review deadline.
- **The work.** Previews before release, final files after release (U6, D26).

## 2. Program changes (part of the single v1.3 upgrade with Funded Jobs)

These change only `post_note.rs` and `constants.rs`. No new instruction, no account change, no change to any other instruction.

| Note kind | Who | When (milestone status) | Use |
| --- | --- | --- | --- |
| 1 delivery (changed) | freelancer | Submitted, **Disputed** or **Released** (was: Submitted only) | First delivery, revised versions, handover of final files |
| 3 review (new, `NOTE_KIND_REVIEW`) | client | Submitted or Disputed | The unmet done-when points and the reason |

Rules that stay the same:

- Kind 0 (brief): the client, while the contract is Created.
- Kind 2 (key wraps): either party, at any time.
- Size and part rules, unchanged.

Tests:

- a review note by the freelancer is refused;
- a review note on a Pending or Released milestone is refused;
- a delivery note on a Pending or Refunded milestone is refused;
- a delivery note on a Disputed or Released milestone is accepted;
- every existing test still passes.

## 3. `@ned/core`

**Content (`content.ts`)**

- `ReviewDraft`:

  ```ts
  { unmet: number[]; reason: string }
  ```

  - `unmet`: indices of the milestone's done-when points; at least one.
  - `reason`: up to 500 characters.
- `canonicalReview()` and `validateReview()`.
- `DeliveryDraft` gets an optional `stage: 'revision' | 'handover'`. **It is left out of the canonical JSON when absent**, so the evidence hash of a normal delivery does not change.

**Notes (`notes.ts`)**

- `NoteKind` gets `3`.
- `readContractContent` returns, per milestone, the ordered list of deliveries (first, revisions, handover) and reviews, each with its time and signature.
- A note only counts when the author the program checked matches the role: the freelancer for deliveries, the client for reviews.

**Actions (`actions.ts`)**

| Action | What it sends |
| --- | --- |
| `runRequestChanges(env, fund, index, review)` | `dispute`, then the review note parts. If a note fails, the milestone is still Disputed: show a retry for the note |
| `runSendRevision(env, fund, index, delivery)` | Delivery note with `stage: 'revision'` |
| `runHandover(env, fund, index, delivery)` | Delivery note with `stage: 'handover'`, on a Released milestone |
| Approve, concede, propose split, accept split | Existing builders, now reachable from screens |

**`view.ts` labels**

| State | Client | Freelancer |
| --- | --- | --- |
| Disputed, no revision yet | "Changes requested · waiting for {name}" | "Changes requested · send a revised version" |
| Disputed, revision sent | "Revised version received · review it" | "Revised version sent · waiting for {name}" |
| Released, no handover yet | "Released · waiting for final files" | "Released · hand over the final files" |
| Released, handover sent | "Final files received" | "Final files handed over" |

**Status line, both sides, while Disputed:** "No deadline while changes are requested. The amount stays locked until you both agree."

## 4. Screens and copy (English, product-spec section 6 words)

### Client: Review (web `Review.tsx`, mobile `review.tsx`)

- **Layout:** U1 side by side. "What to check" lists the done-when points; "What {name} delivered" shows the link cards. When there are revisions, a version switcher reads "Version 1 · Version 2 (revised)".
- **Buttons:** **Accept & release** (primary) and **Request changes** (secondary). Nothing else, and **no "Reject" or "Refund" button**.
- **Request changes sheet**
  - Title: "Request changes".
  - Tick the done-when points that are not met. At least one is required.
  - Reason box: up to 500 characters. Placeholder: "What is missing, and what would make it acceptable."
  - Info line: "The amount stays locked. It does not come back to you. {name} can send a revised version. You can accept it, or you can both agree a split."
  - Button: **Request changes**.

### Freelancer: changes requested (Contract page and Submit)

- **Banner:** the client's unmet points and reason.
- **Buttons:**
  - **Send revised version** opens Submit in revision mode. The U5 and U6 checks apply.
  - **Propose a split**.
  - **Return to client**. Confirmation: "This refunds milestone {n} ({amount}) to {client}. You can't undo it."

### Both: split sheet

- **Explain:** "A split settles every milestone that is still open in this contract, not only this one." This is because `accept_cancel` cancels every non-terminal milestone \[Verified: `accept_cancel.rs`\].
- **Amount:** "{name} receives …" and "{client} gets back …", with the totals.
- **The other side** sees **Accept split**, with the same numbers.

### After release: handover

- **Freelancer:** **Hand over final files** opens Submit in handover mode, with links to the final files.
  - Copy: "Share the final files now. {name} can check them against the fingerprints you committed when you submitted."
- **Client:** a "Final files" block, with **Check a file** (`FileDrop`) against the file fingerprints of the first delivery.
  - Result: "Matches the file committed on {date} ✓" or "Not one of the committed files".

### Disclosures and docs

- **Compliance fix C2, disputes-on version.**
  - Title: "No neutral arbiter".
  - Body: "After a milestone is submitted, the client can request changes instead of releasing. The amount then stays locked until both sides agree: the client accepts a revised version, the freelancer returns it, or both agree a split. Nobody outside the contract decides."
- **Decision log D11.** Replace "so funds never freeze" with "a disputed milestone stays locked until both sides agree".
- **Q&A, A1 version for disputes on:** "A client can request changes; the amount stays locked until both sides agree. There is no neutral arbiter yet; that is on the roadmap."

## 5. Limits

- **Stalemate.** If neither side gives way, the amount stays locked with no end date. There is no arbiter; that comes after legal review, as an `arbiter` field taken from `_reserved` (D11).
- **Pressure on the freelancer.** A client can use the lock to push for a low split. The public dispute count on job listings (D25) makes this visible but does not prevent it.
- **Handover is not enforced.** After release, a freelancer could keep the final files. The client has the committed fingerprints and the public record, nothing more.
- **Revisions are not hashed on-chain.** A revised version is an encrypted note in transaction history, signed by the freelancer and timestamped. The milestone's `evidence` field still holds the first delivery.
- **A split ends the whole contract.** A per-milestone split would need a program change, so it stays on the roadmap.

## Amendment 7 Oct: preview link and preview frame

*(Added 7 Oct 2026 with R1–R3. The decisions are written from the R1–R3 build prompts, because `prompts-review-preview.md` is not in the repository; check them against that file when it is added.)*

1. **A preview link is required to submit.** The first delivery and a revised version need at least one link the client can open (Google Drive, Figma, YouTube, Loom or an image link). Files stay optional and are fingerprints only. The hand-over after release still takes a link or a file. Only the draft check changes: the canonical delivery JSON and its on-chain fingerprint are as before, so older files-only deliveries still decode and match.
2. **Review shows the preview in place.** A Drive, Docs, Figma, YouTube or Loom link, or an image link, gets a preview frame in Review (and under the link field in Submit). The frame loads only after the client presses **Load preview**, is sandboxed and sends no referrer. Any other link opens in a new tab. The Workspace CSP allows exactly these frame origins (`PREVIEW_FRAME_HOSTS`) and https images.
3. **Review no longer compares files.** The drop zone and file comparison are removed from Review; the listed files show name, size and a short fingerprint only. After release, **Final files** keeps its own check against the committed fingerprints, unchanged.
4. **Request changes without done-when points.** When the brief has no done-when points for the milestone (older briefs), the client cannot pick points, so the reason carries the request: 10–500 characters, "Say what is missing and what would make it acceptable." With points, the rule of section 1 is unchanged.
5. **New briefs need done-when points.** A new contract or job draft needs at least one done-when point per milestone ("Add at least one done-when point, so the work can be checked."). Briefs already on Solana with an empty list still decode. The Privacy notice says that **Load preview** connects the browser to the site that hosts the link.

