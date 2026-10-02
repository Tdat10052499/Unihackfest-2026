# So sánh đối thủ: Phantom, Solflare, Binance Wallet

Nghiên cứu ngày 2/10/2026 · Người thực hiện: Nguyễn Minh Chính (Compliance Lead) · Thông tin về N.E.D lấy từ code trên nhánh main (commit e490c50).

## Tóm tắt

**N.E.D không thắng được về quy mô, nhưng có thể thắng ở 3 điểm mà cả 3 đối thủ đều bỏ trống với freelancer Việt Nam:** gửi USDC tới số điện thoại Việt Nam mà người nhận không cần tài khoản sàn, cho người chưa có ví nhận tiền sau (claim later), và sao kê thu nhập ngay trong app. Phantom và Solflare không gửi được tới số điện thoại; Binance Pay thì gửi được nhưng chỉ giữa các tài khoản Binance đã KYC, và đã tắt tính năng gửi cho người không dùng Binance.

**Vì sao chọn 3 đối thủ này:**

- **Phantom:** ví Solana lớn nhất (20M+ người dùng), là chuẩn mà giám khảo Solana Foundation sẽ so sánh.
- **Solflare:** ví Solana-only lâu đời thứ hai (4M+ người dùng), vừa thêm đăng nhập Google như N.E.D.
- **Binance Wallet + Binance Pay:** thứ freelancer Việt thực sự dùng hôm nay để nhận USDT và đổi sang VND qua P2P.

**Lưu ý trung thực:** N.E.D hiện chỉ chạy trên devnet. Ở mọi bảng bên dưới, cột N.E.D ghi rõ **Đã có (devnet)**, **Dự kiến** hoặc **Chưa có**. Chỗ nào chưa xác nhận được ghi [chưa xác nhận].

## Bảng so sánh chính

Khác biệt lớn nhất nằm ở cách gửi tiền, sao kê và vị thế pháp lý tại Việt Nam; về đăng nhập bằng Google thì N.E.D chỉ ngang bằng, không hơn.

| Tiêu chí | Phantom | Solflare | Binance Wallet + Pay | N.E.D |
| --- | --- | --- | --- | --- |
| Quy mô | 20M+ người dùng; 15M MAU (1/2025) | 4M+ người dùng | 300M+ tài khoản Binance; 20M+ người dùng Wallet | Chưa có người dùng thật (devnet) |
| Blockchain | Solana, Ethereum, Bitcoin, Base, Polygon… | Chỉ Solana | Nhiều chain, có Solana | Chỉ Solana |
| Đăng nhập | Google/Apple + PIN, hoặc seed phrase | Seed phrase; mới có Quick Login bằng Google/Apple | Bắt buộc tài khoản Binance đã KYC; ví MPC, Binance giữ 1/3 mảnh khóa | Google, ví MPC qua Dynamic, không cần KYC (Đã có, devnet) |
| Gửi tới số điện thoại | Không | Không | Có, nhưng chỉ giữa tài khoản Binance đã KYC | Có, tới ví tự quản, số Việt Nam (Đã có, devnet; chưa có OTP) |
| Gửi tới username | Có (@username, tự chọn bật) | Chỉ tên .sol | Binance ID | @username on-chain (Đã có, devnet) |
| Người nhận chưa có ví (claim later) | Không | Không | Đã tắt ("no longer supported") | Dự kiến (USP 2) |
| Tiếng Việt trong app | Có từ 2021 [chưa xác nhận hiện tại] | Không | Trang web có tiếng Việt; trong Wallet [chưa xác nhận] | Có file dịch nhưng app đang khóa tiếng Anh (Chưa có) |
| Đổi sang VND | Qua MoonPay… [chưa xác nhận cho VN]; tài khoản Cash chỉ Mỹ/EU | Không; khuyên dùng sàn | P2P có escrow, ngân hàng và MoMo, nhưng là nền tảng chưa được cấp phép tại VN | Không (chờ đối tác được cấp phép) |
| Phí swap | 0,85% | ~0,5% [chưa xác nhận] | [chưa xác nhận]; P2P 0,05 USDT/lệnh | 0,25% (chỉ hiển thị, chưa thu; demo) |
| Phí mạng | Swap gasless (chỉ mobile, tối thiểu $75) | Gasless send/swap, trừ phí vào token | Pay miễn phí giữa tài khoản Binance | Người dùng tự trả (chưa có sponsorship) |
| Cảnh báo lừa đảo | Mô phỏng giao dịch, cảnh báo address poisoning, địa chỉ mới | Guards: mô phỏng, chặn drainer | Cảnh báo P2P; giao dịch Pay không hoàn lại được | Nhãn "số chưa xác minh" (Đã có); kiểm tra người nhận (Dự kiến, USP 3) |
| Sao kê / xuất lịch sử | Không có sẵn; chỉ sang explorer, tool thuế | Không; chỉ sang tool thuế | Có cho tài khoản sàn (link hết hạn sau 7 ngày); ví on-chain [chưa xác nhận] | Dự kiến: sao kê USD + VND (USP 4) |
| Yêu cầu thanh toán / escrow | Không (chỉ có hướng dẫn cho dev) | Không | Link nhận tiền Pay (30 ngày, phải dùng app Binance); escrow chỉ cho P2P | Escrow: dự kiến, rủi ro pháp lý cao (USP 1) |
| Vị thế pháp lý tại VN | Ví tự quản nước ngoài | Ví tự quản nước ngoài | Sàn nước ngoài chưa cấp phép; Nghị định 284/2026 có hiệu lực từ 1/9/2026 | Thiết kế theo luật VN ngay từ đầu: không thanh toán, không giao dịch, chờ đối tác |

## Điểm yếu của từng đối thủ

Người dùng phàn nàn nhiều nhất về mất tiền do lừa đảo, hỗ trợ chậm và tính năng chỉ dành cho Mỹ/châu Âu.

| Đối thủ | Điểm yếu đã kiểm chứng | Nguồn |
| --- | --- | --- |
| Phantom | Trustpilot 1,5★ (102 đánh giá): bị rút cạn tiền, khó chuyển sang điện thoại mới, hỗ trợ chậm, phí cao | [Trustpilot](https://www.trustpilot.com/review/phantom.app) |
| Phantom | Một người mất $264K vì address poisoning (2/2026) | [crypto.jobs](https://crypto.jobs/news/phantom-wallet-faces-security-questions-after-264k-address-poisoning-attack) |
| Phantom | Sự cố ngày 6/4/2026 khoảng 2 giờ, hiển thị sai số dư và giá | [The Block](https://www.theblock.co/post/396479/phantom-reports-service-outage) |
| Phantom | Cash, thẻ Visa và chuyển về ngân hàng chỉ cho Mỹ/EU; người Việt không dùng được | [Phantom Help](https://help.phantom.com/hc/en-us/articles/44799497237395) |
| Solflare | Thẻ Mastercard ngừng hoạt động từ 28/7/2026 khi đơn vị phát hành Kulipa đóng cửa, không báo trước | [The Defiant](https://thedefiant.io/converge/cefi/ready-shuts-card-program-after-issuer-winds-down) |
| Solflare | Không có tiếng Việt; chỉ Solana; không có sổ địa chỉ (theo đánh giá App Store) | [App Store](https://apps.apple.com/us/app/solflare-solana-wallet/id1580902717) |
| Solflare | Mua $300 SOL qua bên thứ ba tốn khoảng 4,89% so với giá thị trường | [Cryptonews](https://cryptonews.com/reviews/solflare-wallet-review/) |
| Binance | Trustpilot tạm khóa điểm; 82% trong 6.199 đánh giá là 1★: giữ tiền rút hàng tháng, KYC chậm | [Trustpilot](https://uk.trustpilot.com/review/binance.com) |
| Binance | Người bán P2P bị phong tỏa tài khoản ngân hàng vì nhận tiền lừa đảo; công an cảnh báo giả danh nhân viên P2P | [Stockbiz](https://stockbiz.vn/tin-tuc/nhieu-nha-dau-tu-crypto-viet-dinh-rua-tien-khi-giao-dich-p2p/30625451) |
| Binance | Chưa được cấp phép tại VN; Nghị định 284/2026 phạt 30–50 triệu đồng người giao dịch qua nền tảng chưa cấp phép, áp dụng 6 tháng sau giấy phép đầu tiên | [VietnamNet](https://vietnamnet.vn/en/vietnam-tightens-crypto-trading-rules-from-september-1-2539366.html) |
| Binance | Pay chỉ giữa tài khoản Binance đã KYC; gửi sai là mất, không hoàn lại | [Binance FAQ](https://www.binance.com/en/support/faq/how-to-send-cryptocurrency-to-an-individual-with-binance-pay-b3fa3ae045b9429084203c3a4ff1362f) |

## N.E.D có gì họ không có

| # | Vấn đề đối thủ chưa giải quyết | Cách N.E.D giải quyết | Tình trạng N.E.D |
| --- | --- | --- | --- |
| 1 | Muốn gửi USDC tới số điện thoại thì phải dùng Binance Pay, cả hai bên phải có tài khoản Binance đã KYC | Gửi tới số điện thoại Việt Nam, tiền vào ví tự quản của người nhận; số điện thoại chỉ lưu dạng mã băm on-chain | Đã có (devnet) |
| 2 | Người nhận chưa có ví thì không nhận được; Binance đã tắt tính năng này | Gửi trước, người nhận đăng nhập Google + OTP rồi nhận sau; không nhận thì tự hoàn | Dự kiến (USP 2) |
| 3 | Không ví nào xuất sao kê ngay trong app; freelancer phải tự ghép dữ liệu từ explorer | Sao kê hàng tháng bằng USD và VND, mỗi dòng có link biên nhận on-chain | Dự kiến (USP 4), chủ yếu là việc của app |
| 4 | Cảnh báo chỉ nói "địa chỉ mới" hay "có thể độc hại", không cho biết người nhận là ai | Trước khi gửi, hiển thị @username, tuổi tài khoản, số điện thoại đã xác minh hay chưa, số lần đã chuyển với nhau | Dự kiến (USP 3); nhãn "chưa xác minh" đã có |
| 5 | Binance là sàn chưa cấp phép tại VN; Phantom, Solflare không thiết kế cho luật VN | Thiết kế tuân thủ từ đầu: không thanh toán bằng crypto, không giao dịch cho người dùng VN, chờ đối tác được cấp phép | Đã có (thiết kế + Compliance Hub) |
| 6 | Không ví nào được làm riêng cho freelancer Việt | Giao diện tiếng Việt, số +84, VND làm đơn vị hiển thị | Chưa có tiếng Việt (file dịch đã sẵn) |

## N.E.D cần cải thiện gì

| # | Đối thủ làm tốt | N.E.D thiếu gì | Việc cần làm | Trước 9/10? |
| --- | --- | --- | --- | --- |
| 1 | Phantom, Solflare: mô phỏng giao dịch, chặn drainer, cảnh báo address poisoning | Không có mô phỏng hay cảnh báo lừa đảo | Làm USP 3; trên roadmap: mô phỏng giao dịch | USP 3: có thể |
| 2 | Solflare, Phantom: trả phí mạng bằng token (gasless) | Người dùng phải có SOL | Gas sponsorship cần gói Dynamic Enterprise; đưa vào roadmap | Không |
| 3 | Binance Pay: xác minh danh tính qua KYC | Số điện thoại chưa xác thực OTP, ai cũng liên kết được số của người khác | Thêm OTP; trước đó nói rõ giới hạn này | Tùy ước tính của dev |
| 4 | Binance P2P: đổi ra VND (dù chưa cấp phép) | Không có cách đổi ra VND | Tìm đối tác được cấp phép sau thí điểm | Không, là roadmap |
| 5 | Cả 3: đã chạy mainnet với tiền thật, hàng triệu người dùng | Chỉ devnet, chưa audit | Audit smart contract trước mainnet | Không |
| 6 | Phantom: đa chain; Solflare: ví cứng (Ledger, Shield) | Chỉ Solana, không có ví cứng | Không ưu tiên: freelancer cần USDC trên Solana là đủ | Không cần |
| 7 | Phantom: có tiếng Việt [chưa xác nhận] | App khóa tiếng Anh | Bật lại tiếng Việt (file dịch đã có); khi thi vẫn demo bằng tiếng Anh | Có thể |
| 8 | Cả 3: hiển thị số dư chính xác | Bug: khi không có USDC, app cộng nhầm token khác thành "USDC" | Sửa bug trong services/solana.ts | Nên sửa |

**Lưu ý pháp lý:** escrow (USP 1) cũng là thứ không đối thủ nào có cho công việc freelance, nhưng theo legal brief nó có thể bị coi là thanh toán bằng crypto. Vì vậy không đưa escrow vào bảng so sánh trước giám khảo.

## Bảng tiếng Anh cho slide

Chỉ gồm điều đã kiểm chứng; cột N.E.D ghi rõ cái nào đã có trên devnet, cái nào là roadmap. Không có dòng escrow vì rủi ro pháp lý.

**Title:** Built for Vietnamese freelancers, where big wallets stop

| Feature | Phantom | Solflare | Binance Wallet + Pay | N.E.D |
| --- | --- | --- | --- | --- |
| Sign in with Google, no seed phrase | Yes | Yes (new) | Needs Binance account + KYC | Yes (devnet) |
| Send USDC to a Vietnamese phone number | No | No | Binance users only | Yes, to a self-custody wallet (devnet) |
| Recipient without a wallet can claim later | No | No | Turned off | Roadmap |
| See who you're sending to before you send | New-address warning | Scam guards | Not shown | Roadmap |
| Monthly income statement in USD + VND | No native export | No native export | Exchange account only | Roadmap |
| Designed for Vietnam's crypto rules | Not specific | Not specific | Unlicensed in Vietnam | Yes: no crypto payments, no trading for VN users |

**Footer:** Sources: Phantom, Solflare and Binance help centres; VietnamNet; checked 2 Oct 2026. N.E.D runs on Solana devnet.

**Cách nói khi thuyết trình:** "Phantom and Solflare are great wallets, but neither can send to a phone number. Binance can, only between Binance accounts. N.E.D sends dollars to a Vietnamese phone number, straight into the receiver's own wallet." Không nói xấu đối thủ, không dùng logo của họ (theo Tab 03 Do & Don't).

## Nguồn

Mở và kiểm tra ngày 2/10/2026.

- Phantom: [homepage](https://phantom.com/) · [The Block: Series C, 15M MAU](https://www.theblock.co/post/335305/phantom-wallet-raises-150-million-at-3-billion-valuation) · [Google/Apple login](https://help.phantom.com/hc/en-us/articles/32775281256851) · [gửi tiền](https://help.phantom.com/hc/en-us/articles/5530158379539) · [usernames](https://phantom.com/learn/blog/phantom-username) · [Cash](https://help.phantom.com/hc/en-us/articles/44799497237395) · [phí swap 0,85%](https://phantom.com/learn/crypto-101/phantom-vs-moonshot) · [tiếng Việt 2021](https://phantom.com/learn/blog/nft-collections-localization-moonpay-and-more) · [cảnh báo lừa đảo](https://phantom.com/learn/crypto-101/common-crypto-scams) · [lịch sử giao dịch](https://help.phantom.com/hc/en-us/articles/38384705854483)
- Solflare: [homepage](https://www.solflare.com/) · [Quick Login](https://help.solflare.com/en/articles/16943999-what-is-quick-login) · [FAQ](https://www.solflare.com/faq/) · [phí mạng, gasless](https://help.solflare.com/en/articles/9271735-understanding-transaction-fees-on-solana) · [lịch sử cho thuế](https://help.solflare.com/en/articles/6364436-how-to-obtain-transaction-history-for-tax-purposes) · [Cryptonews review](https://cryptonews.com/reviews/solflare-wallet-review/) · [Coin Bureau](https://coinbureau.com/analysis/is-solflare-safe)
- Binance: [Web3 Wallet MPC](https://www.binance.com/en/blog/markets/binances-web3-wallet-a-selfcustody-wallet-1766499366797531127) · [FAQ Web3 Wallet](https://www.binance.com/en/support/faq/frequently-asked-questions-on-binance-web3-wallet-5a3fc86a702b43e1a4a398ebd8853b77) · [gửi người không dùng Binance: đã ngừng](https://www.binance.com/en/support/announcement/sending-crypto-to-non-binance-users-is-now-supported-via-binance-pay-9145ae18264548a3aa10cbc9d2d67447) · [phí Pay](https://www.binance.com/en/support/faq/binance-pay-fees-6ff1944867e54b9a9576bce3109c7f7a) · [xuất sao kê](https://www.binance.com/en/support/faq/990afa0a0a9341f78e7a9298a9575163) · [link nhận tiền Pay](https://www.binance.com/en/support/faq/how-to-create-binance-pay-payment-links-to-receive-crypto-b37b163d4d724c879979372a8fcc617e)
- Việt Nam: [VietnamNet: Nghị định 284 từ 1/9/2026](https://vietnamnet.vn/en/vietnam-tightens-crypto-trading-rules-from-september-1-2539366.html) · [VietnamNet: sàn quốc tế sau Nghị định 284](https://vietnamnet.vn/en/what-will-happen-to-int-l-crypto-exchanges-after-decree-284-takes-effect-2539754.html) · [Coin Edition: thời điểm áp dụng phạt](https://coinedition.com/vietnam-introduces-crypto-fines-on-sept-1-but-retail-enforcement-is-delayed/)
