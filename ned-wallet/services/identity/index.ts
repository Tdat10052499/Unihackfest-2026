// Identity — tra cứu danh tính on-chain (Phương án C, T1.5).
// Sẽ gồm:
//   - dualPda.ts : Name [b"name", username], Reverse [b"reverse", wallet], Phone [b"phone_v1", scrypt(SĐT)] của ned_program
//   - sns.ts     : tên .sol qua SNS (Bonfida), chỉ đọc, luôn gọi Mainnet
//   - phoneKey.ts: chuẩn hoá SĐT E.164 + scrypt (N=2^15/2^16, r=8, p=1, dkLen=32 — xem docs/poc-dynamic.md)
// Hiện re-export logic cũ (PDA identity + helper hiển thị) để các màn không đổi import.
// TODO(T1.5): thay legacy.ts bằng các module trên.
export * from './legacy';
