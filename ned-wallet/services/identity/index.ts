// Identity — tra cứu danh tính on-chain (Phương án C).
//   - dualPda.ts : Name [b"name", username], Reverse [b"reverse", wallet], Phone [b"phone_v1", phone_key] của ned_program
//                  (đọc record + builder instruction create_profile / link_phone / unlink_phone / update_username)
//   - phoneKey.ts: chuẩn hoá SĐT VN về E.164 + phone_key = scrypt(N=2^15, r=8, p=1, dkLen=32)
//   - legacy.ts  : logic cũ các màn còn dùng tới T1.3 (PDA identity cũ, helper hiển thị SĐT)
// TODO(T1.3): chuyển màn onboarding/send sang dualPda + phoneKey, rồi gỡ phần PDA cũ trong legacy.ts.
// TODO(T1.5+): sns.ts — tên .sol qua SNS (Bonfida), chỉ đọc, luôn gọi Mainnet.
export * from './legacy';
export * from './dualPda';
export * from './phoneKey';
