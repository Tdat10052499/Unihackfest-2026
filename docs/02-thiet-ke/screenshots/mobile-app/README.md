# Phone screens for the main README

**Source (8 Oct 2026):** rendered from the design boards in `docs/02-thiet-ke/canvas-v2/` at 390 × 844, device scale 2, with the boards' sample data (devnet, simulated VND payout). They are **designs, not captures of the running app**. The main README says so under the gallery. Prompt M1 (`docs/09-milestone-lock/prompts-readme-mobile.md`) replaces them with captures from the app, keeping the same file names.

| File | Board | View |
| --- | --- | --- |
| `01-welcome.png` | `OnbWelcome` | signed out |
| `02-home-vn.png` | `HomeVN` | Vietnam (freelancer) |
| `03-accept-vn.png` | `ContractAccept` | Vietnam (freelancer) |
| `04-locked-vn.png` | `ContractLockedVN` | Vietnam (freelancer) |
| `05-contract-vn.png` | `ContractDetailVinhLocked` | Vietnam (freelancer) |
| `06-released-vn.png` | `MilestoneReleasedVN` | Vietnam (freelancer) |
| `07-records-vn.png` | `Records` | Vietnam (freelancer) |
| `08-lock-client.png` | `ContractLock` | USDC wallet (client) |

How they were made:

- **Rendering:** Chromium through Playwright.
  - Fonts: Inter, Space Grotesk and Space Mono, served locally from fontsource.
  - Teddy images: `/_blob/<id>` mapped to `docs/02-thiet-ke/assets/mascot/` (table in `docs/archive/02-thiet-ke-v1/README.md`).
  - The boards need the canvas runtime `support.js`, which is not in the repository.
- **Rule A4:** in `06-released-vn.png` the board's footer line "Network fee ~0.000005 SOL" was hidden, so that no Vietnam-view screen shows a SOL amount. The board itself still has this line (see the CL note in `docs/05-legal/pre-pitch-check-7oct.md` §13, D2).
- **Frame:** `python3 frame.py raw.png out.png …`. It adds a 12 px #16161C bezel and an outer radius of 48 on a transparent background, at a width of 780 px.
