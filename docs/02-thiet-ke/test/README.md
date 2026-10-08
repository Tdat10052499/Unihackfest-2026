# Test D30: vai trò, quốc gia, business, N.E.D Agreement (8/10/2026)

**Kết quả: 55/55 kịch bản PASS**, chạy tự động trên hai app thật (ví `ned-wallet` ở 390 × 844, Workspace và N.E.D Jobs ở 1280 × 800, ảnh @2x) với cả hai cờ D30 bật (`EXPO_PUBLIC_FEATURE_ACCOUNT_ROLES=true`, `VITE_FEATURE_ACCOUNT_ROLES=true`), trên `main` tại `ea92659`.

## Cách test

- Mỗi kịch bản mở màn hình thật, làm các thao tác (bấm, gõ chữ), rồi **kiểm tra tự động**: những câu phải có trên màn hình, những câu không được có (ví dụ "I live in Vietnam", "illegal", số tiền USDC ở chế độ Việt Nam), và với W27 là dữ liệu ghi xuống máy (consent v3, profile, agreement, region). Ảnh chụp là trạng thái sau cùng.
- **Không phải đăng nhập Google thật.** Ví chạy trong chế độ xem trước (preview, không ký được giao dịch) qua một trang dev tạm (không commit); Workspace dùng chế độ `?previewWallet=`. Trạng thái tài khoản (vai trò, quốc gia, agreement) được đặt sẵn trên máy cho từng kịch bản. Dữ liệu hợp đồng, listing và lịch sử là dữ liệu thật trên Solana devnet (ví test `BT9c…RT7B`).
- Thông báo đỏ ở đáy ảnh điện thoại là SDK đăng nhập (Dynamic) không kết nối được từ máy chạy test, không phải lỗi của app.

## Kết quả từng kịch bản


### Ví · Bước 1: vai trò (role)

| ID | Kịch bản | Kết quả | Ảnh |
| --- | --- | --- | --- |
| W01 | Role: nothing chosen, Continue disabled with caption | ✅ PASS | [`W01-role-empty.png`](W01-role-empty.png) |
| W02 | Role: tap "I do the work" | ✅ PASS | [`W02-role-pick-freelancer.png`](W02-role-pick-freelancer.png) |
| W03 | Role: tap "I hire for a business" (5-step bar) | ✅ PASS | [`W03-role-pick-business.png`](W03-role-pick-business.png) |
| W04 | Update flow, Vietnam view: notice, freelancer preselected, no Back | ✅ PASS | [`W04-role-update-vn.png`](W04-role-update-vn.png) |
| W05 | Update flow, international view: roles preselected from chain history of the wallet | ✅ PASS | [`W05-role-update-intl-history.png`](W05-role-update-intl-history.png) |

### Ví · Bước 2: quốc gia (country)

| ID | Kịch bản | Kết quả | Ảnh |
| --- | --- | --- | --- |
| W06 | Country: nothing chosen yet | ✅ PASS | [`W06-country-empty.png`](W06-country-empty.png) |
| W07 | Country search "viet" | ✅ PASS | [`W07-country-search-viet.png`](W07-country-search-viet.png) |
| W08 | Country search with accents "việt" | ✅ PASS | [`W08-country-search-accent.png`](W08-country-search-accent.png) |
| W09 | Country search by code "sg" | ✅ PASS | [`W09-country-search-code.png`](W09-country-search-code.png) |
| W10 | Country search with no match | ✅ PASS | [`W10-country-no-result.png`](W10-country-no-result.png) |
| W11 | Freelancer picks Singapore: USDC note | ✅ PASS | [`W11-country-singapore.png`](W11-country-singapore.png) |
| W12 | Freelancer picks Vietnam: VND note, no crypto balance | ✅ PASS | [`W12-country-vietnam-freelancer.png`](W12-country-vietnam-freelancer.png) |
| W13 | Client taps Vietnam: "Join as a freelancer?" sheet | ✅ PASS | [`W13-country-vietnam-client-sheet.png`](W13-country-vietnam-client-sheet.png) |
| W14 | Sheet → Continue as a freelancer: Vietnam saved, role becomes freelancer | ✅ PASS | [`W14-country-vietnam-client-continue.png`](W14-country-vietnam-client-continue.png) |
| W15 | Sheet → Choose another country: Vietnam not saved | ✅ PASS | [`W15-country-vietnam-client-other.png`](W15-country-vietnam-client-other.png) |

### Ví · Bước 3: thông tin business

| ID | Kịch bản | Kết quả | Ảnh |
| --- | --- | --- | --- |
| W16 | Business form: Continue with empty fields shows errors | ✅ PASS | [`W16-business-empty-continue.png`](W16-business-empty-continue.png) |
| W17 | Business registered in Vietnam is refused | ✅ PASS | [`W17-business-registered-vn.png`](W17-business-registered-vn.png) |
| W18 | Website without https:// is refused | ✅ PASS | [`W18-business-website-error.png`](W18-business-website-error.png) |
| W19 | Registration number is marked device-only; optional labels | ✅ PASS | [`W19-business-device-only.png`](W19-business-device-only.png) |
| W20 | Settings → Business: edit form with the saved details, no step bar | ✅ PASS | [`W20-business-edit-mode.png`](W20-business-edit-mode.png) |

### Ví · Bước cuối: The N.E.D Agreement

| ID | Kịch bản | Kết quả | Ảnh |
| --- | --- | --- | --- |
| W21 | Agreement, freelancer in Vietnam: cards, 3 unticked boxes, button disabled | ✅ PASS | [`W21-agreement-freelancer.png`](W21-agreement-freelancer.png) |
| W22 | Two boxes ticked: still disabled | ✅ PASS | [`W22-agreement-two-ticked.png`](W22-agreement-two-ticked.png) |
| W23 | All three ticked: button enabled | ✅ PASS | [`W23-agreement-all-ticked.png`](W23-agreement-all-ticked.png) |
| W24 | "Read all": the 8 N.E.D items in a sheet | ✅ PASS | [`W24-agreement-read-all.png`](W24-agreement-read-all.png) |
| W25 | Agreement, individual client in Singapore: client card + Job posting rules link | ✅ PASS | [`W25-agreement-client.png`](W25-agreement-client.png) |
| W26 | Agreement, business client: client + business cards | ✅ PASS | [`W26-agreement-business.png`](W26-agreement-business.png) |
| W27 | "Agree and continue" writes consent v3, profile, agreement and region on the device | ✅ PASS | [`W27-agreement-agree-writes.png`](W27-agreement-agree-writes.png) |
| W28 | A Vietnam draft with a client role never reaches the agreement | ✅ PASS | [`W28-agreement-vn-client-blocked.png`](W28-agreement-vn-client-blocked.png) |

### Ví · Settings → Your account, đổi quốc gia

| ID | Kịch bản | Kết quả | Ảnh |
| --- | --- | --- | --- |
| W29 | Settings → Your account, business client in Singapore | ✅ PASS | [`W29-settings-business.png`](W29-settings-business.png) |
| W30 | Settings, freelancer in Vietnam: Also hire locked | ✅ PASS | [`W30-settings-vietnam.png`](W30-settings-vietnam.png) |
| W31 | Settings, freelancer in Singapore: last role locked on | ✅ PASS | [`W31-settings-freelancer-sg.png`](W31-settings-freelancer-sg.png) |
| W32 | Switch on Also hire: both roles on | ✅ PASS | [`W32-settings-add-client.png`](W32-settings-add-client.png) |
| W33 | Agreement row: version, view, withdraw | ✅ PASS | [`W33-settings-agreement-sheet.png`](W33-settings-agreement-sheet.png) |
| W34 | View what you agreed to: the text, with the declaration | ✅ PASS | [`W34-settings-agreement-text.png`](W34-settings-agreement-text.png) |
| W35 | Settings → Where you live → Vietnam: confirm sheet or blocked sheet (reads the wallet's open contracts on devnet) (thấy: Finish your client contracts first) | ✅ PASS | [`W35-country-edit-to-vietnam.png`](W35-country-edit-to-vietnam.png) |
| W36 | Settings → Where you live → Germany: confirm sheet | ✅ PASS | [`W36-country-edit-to-germany.png`](W36-country-edit-to-germany.png) |

### Ví · Chặn theo vai trò (New contract)

| ID | Kịch bản | Kết quả | Ảnh |
| --- | --- | --- | --- |
| W37 | New contract opened by a freelancer outside Vietnam | ✅ PASS | [`W37-new-contract-freelancer.png`](W37-new-contract-freelancer.png) |
| W38 | New contract in the Vietnam view: today's blocked view | ✅ PASS | [`W38-new-contract-vietnam.png`](W38-new-contract-vietnam.png) |
| W39 | New contract for a client: the form | ✅ PASS | [`W39-new-contract-client.png`](W39-new-contract-client.png) |

### Workspace · Lời nhắc "Finish setting up your account"

| ID | Kịch bản | Kết quả | Ảnh |
| --- | --- | --- | --- |
| S01 | Workspace: "Finish setting up your account" for a wallet with no account | ✅ PASS | [`S01-prompt-new-account.png`](S01-prompt-new-account.png) |
| S02 | Workspace: update copy for a wallet from before D30 | ✅ PASS | [`S02-prompt-update.png`](S02-prompt-update.png) |
| S03 | "Later": prompt closes, note stays as a banner | ✅ PASS | [`S03-prompt-later.png`](S03-prompt-later.png) |

### Workspace + N.E.D Jobs · Chặn theo vai trò

| ID | Kịch bản | Kết quả | Ảnh |
| --- | --- | --- | --- |
| S04 | Workspace Overview, freelancer: no New contract | ✅ PASS | [`S04-overview-freelancer.png`](S04-overview-freelancer.png) |
| S05 | Workspace Overview, business client: New contract | ✅ PASS | [`S05-overview-business.png`](S05-overview-business.png) |
| S06 | /new by URL, freelancer in Singapore: gate card with Open settings | ✅ PASS | [`S06-new-freelancer.png`](S06-new-freelancer.png) |
| S07 | /new by URL, Vietnam: Vietnam line, no Open settings | ✅ PASS | [`S07-new-vietnam.png`](S07-new-vietnam.png) |
| S08 | /new for a client: the editor | ✅ PASS | [`S08-new-client.png`](S08-new-client.png) |
| S09 | /jobs/new by URL, freelancer: gate card | ✅ PASS | [`S09-jobs-new-freelancer.png`](S09-jobs-new-freelancer.png) |
| S10 | /jobs/new by URL, Vietnam: Vietnam line | ✅ PASS | [`S10-jobs-new-vietnam.png`](S10-jobs-new-vietnam.png) |
| S11 | /jobs/new, business: form, preview card shows the self-declared business | ✅ PASS | [`S11-jobs-new-business.png`](S11-jobs-new-business.png) |

### N.E.D Jobs · Overview và Job detail

| ID | Kịch bản | Kết quả | Ảnh |
| --- | --- | --- | --- |
| S12 | N.E.D Jobs Overview, freelancer in Singapore: no Post a job | ✅ PASS | [`S12-jobs-overview-freelancer.png`](S12-jobs-overview-freelancer.png) |
| S13 | N.E.D Jobs Overview, business: Post a job | ✅ PASS | [`S13-jobs-overview-business.png`](S13-jobs-overview-business.png) |
| S14 | N.E.D Jobs Overview, Vietnam: no Post a job, VND copy | ✅ PASS | [`S14-jobs-overview-vietnam.png`](S14-jobs-overview-vietnam.png) |
| S15 | Job detail, client-only account: "Also work" instead of the pitch form | ✅ PASS | [`S15-job-detail-client-only.png`](S15-job-detail-client-only.png) |
| S16 | Job detail, freelancer: the pitch form | ✅ PASS | [`S16-job-detail-freelancer.png`](S16-job-detail-freelancer.png) |

## Ghi chú

- **W35** dùng dữ liệu thật: ví `BT9c…RT7B` còn 1 hợp đồng client đang mở trên devnet, nên chuyển sang Vietnam bị chặn đúng luật (sheet "Finish your client contracts first", câu số ít/nhiều theo CL 8/10).
- **W05** đọc lịch sử thật trên chain: ví từng tạo hợp đồng nên luồng update chọn sẵn "I hire, for myself".
- **Lượt đầu** có 7 kịch bản FAIL do cách test (Metro còn đang build lúc mở trang đầu tiên; ô chọn quốc gia đăng ký không có nhãn như script đoán; danh sách job tải chậm vì RPC devnet giới hạn). Đã sửa script và chạy lại: cả 7 PASS. Không có lỗi nào của app.
- **Không test được ở đây:** nút "Change" trong panel ví của Workspace mở ví nhúng `/wallet`, chỉ có trong bản build (Vercel), không có trên server dev. Đăng nhập Google, ký giao dịch (tạo hợp đồng, khoá tiền, nộp bài, release) cần người thật: xem danh sách ở cuối `../demo/README.md`.
- Test tự động trong code (unit/Vitest) cũng qua ở cả cờ tắt và bật: core 220/220, ví 67/67, Workspace 22/22 + 141/141.
- **Phát hiện (không thuộc D30):** khi RPC devnet trả lỗi 429 (giới hạn tốc độ), trang job của N.E.D Jobs báo nhầm "This job does not exist", vì `useJob` (`ned-workspace/src/jobs/hooks.ts:77`) coi mọi lỗi là "không có job". Tải lại sau vài giây thì đúng. Chi tiết ở `../demo/README.md`.
