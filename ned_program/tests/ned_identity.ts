import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import * as crypto from "crypto";
import * as assert from "assert";
import { NedProgram } from "../target/types/ned_program";

/**
 * Helper function: Băm chuỗi đầu vào (Username hoặc SĐT) thành Buffer 32 bytes chuẩn SHA-256
 * @param input Chuỗi định danh thô (ví dụ: "alex.ned" hoặc "+84938992410")
 * @returns Buffer 32 bytes của chuỗi băm
 */
export function hashIdentifier(input: string): Buffer {
  const normalized = input.trim().toLowerCase();
  return crypto.createHash("sha256").update(normalized).digest();
}

describe("N.E.D Identity Smart Contract - TDD Test Suite", () => {
  // 1. Khởi tạo Provider & Program instance
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.NedProgram as Program<NedProgram>;
  const connection = provider.connection;

  // 2. Tạo sẵn các Keypair giả lập cho các vai trò trong kịch bản kiểm thử
  const payer = Keypair.generate();             // N.E.D Hub Relayer / Người tài trợ phí Gas & Rent
  const authority = Keypair.generate();         // Chủ sở hữu định danh (User)
  const targetWallet = Keypair.generate();      // Ví nhận tiền thực tế ban đầu
  const newTargetWallet = Keypair.generate();   // Ví nhận tiền mới khi cập nhật
  const unauthorizedUser = Keypair.generate();  // Hacker / Người dùng lạ cố tình tấn công thay đổi dữ liệu

  // Hạt giống định danh PDA chuẩn on-chain
  const IDENTITY_SEED = Buffer.from("identity");

  /**
   * Helper tìm địa chỉ PDA dựa trên hash 32 bytes
   */
  const getIdentityPda = (hashedId: Buffer): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
      [IDENTITY_SEED, hashedId],
      program.programId
    );
  };

  before(async () => {
    console.log("🚀 [Setup] Bơm SOL (Airdrop) cho các tài khoản kiểm thử...");

    // Airdrop SOL cho payer, authority và unauthorizedUser để thực hiện giao dịch
    const airdropPayer = await connection.requestAirdrop(
      payer.publicKey,
      5 * LAMPORTS_PER_SOL
    );
    const airdropAuthority = await connection.requestAirdrop(
      authority.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    const airdropUnauthorized = await connection.requestAirdrop(
      unauthorizedUser.publicKey,
      2 * LAMPORTS_PER_SOL
    );

    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature: airdropPayer,
      ...latestBlockhash,
    });
    await connection.confirmTransaction({
      signature: airdropAuthority,
      ...latestBlockhash,
    });
    await connection.confirmTransaction({
      signature: airdropUnauthorized,
      ...latestBlockhash,
    });

    console.log("✅ [Setup] Airdrop hoàn tất. Bắt đầu chạy Test Suite.");
  });

  // =========================================================================
  // TEST CASE 1: KHỞI TẠO ĐỊNH DANH THÀNH CÔNG (Happy Path)
  // =========================================================================
  it("Test Case 1 - Khởi tạo thành công: Đăng ký username 'alex.ned' và trỏ về ví đích", async () => {
    const username = "alex.ned";
    const hashedId = hashIdentifier(username);
    const [identityPda, bump] = getIdentityPda(hashedId);

    console.log(`📝 [Test 1] Đăng ký định danh: "${username}"`);
    console.log(`🔑 [Test 1] Hashed ID (Hex): ${hashedId.toString("hex")}`);
    console.log(`📍 [Test 1] PDA Address: ${identityPda.toBase58()} (Bump: ${bump})`);

    // Gọi instruction register_identity
    // Gửi tham số hashed_identifier dưới dạng mảng số bytes [u8; 32]
    const tx = await (program.methods as any)
      .registerIdentity(Array.from(hashedId), 0) // identity_type = 0 (Username)
      .accounts({
        identityAccount: identityPda,
        targetWallet: targetWallet.publicKey,
        authority: authority.publicKey,
        payer: payer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([payer, authority])
      .rpc();

    console.log("✅ [Test 1] Transaction Signature:", tx);

    // Fetch dữ liệu từ PDA trên chuỗi
    const account = await (program.account as any).identityAccount.fetch(identityPda);

    // Kiểm tra tính toàn vẹn của dữ liệu on-chain
    assert.equal(
      account.wallet.toBase58(),
      targetWallet.publicKey.toBase58(),
      "Địa chỉ ví đích (wallet) trên PDA phải khớp hoàn toàn với targetWallet ban đầu"
    );
    assert.equal(
      account.authority.toBase58(),
      authority.publicKey.toBase58(),
      "Quyền quản trị (authority) trên PDA phải khớp với authority Keypair"
    );
    assert.equal(
      account.identityType,
      0,
      "Loại định danh (identity_type) phải là 0 (Username)"
    );
    assert.equal(
      account.bump,
      bump,
      "Bump lưu trên PDA phải khớp với canonical bump seed"
    );
    assert.ok(
      account.createdAt.toNumber() > 0,
      "Thời gian khởi tạo created_at phải lớn hơn 0"
    );

    console.log("🎉 [Test 1] Dữ liệu PDA được xác thực thành công 100%!");
  });

  // =========================================================================
  // TEST CASE 2: NGĂN CHẶN TRÙNG LẶP (Duplicate Identity Protection)
  // =========================================================================
  it("Test Case 2 - Ngăn chặn trùng lặp: Từ chối đăng ký lại cùng username 'alex.ned'", async () => {
    const username = "alex.ned";
    const hashedId = hashIdentifier(username);
    const [identityPda] = getIdentityPda(hashedId);
    const duplicateAttacker = Keypair.generate();

    console.log(`🛡️ [Test 2] Thử đăng ký đè lên username "${username}" đã tồn tại...`);

    let errorThrown = false;

    try {
      await (program.methods as any)
        .registerIdentity(Array.from(hashedId), 0)
        .accounts({
          identityAccount: identityPda,
          targetWallet: duplicateAttacker.publicKey,
          authority: duplicateAttacker.publicKey,
          payer: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([payer, duplicateAttacker])
        .rpc();
    } catch (err: any) {
      errorThrown = true;
      console.log("✅ [Test 2] Hệ thống đã chặn thành công với mã lỗi:", err.message || err);
      // Kỳ vọng lỗi: Account đã được khởi tạo trước đó (init collision)
      const errStr = JSON.stringify(err) + " " + (err.message || "") + " " + (err.logs?.join(" ") || "") + " " + err.toString();
      assert.ok(
        errStr.includes("already in use") ||
        errStr.includes("0x0") ||
        errStr.includes("Allocate") ||
        errStr.includes("custom program error"),
        "Lỗi trả về phải chứng minh tài khoản PDA đã tồn tại và không thể init đè"
      );
    }

    assert.ok(
      errorThrown,
      "Giao dịch đăng ký trùng lặp BẮT BUỘC phải thất bại và quăng lỗi."
    );
  });

  // =========================================================================
  // TEST CASE 3: BẢO MẬT CẬP NHẬT (Unauthorized Update Protection)
  // =========================================================================
  it("Test Case 3 - Bảo mật cập nhật: Kẻ lạ (unauthorizedUser) không thể đổi ví nhận của 'alex.ned'", async () => {
    const username = "alex.ned";
    const hashedId = hashIdentifier(username);
    const [identityPda] = getIdentityPda(hashedId);
    const hackerWallet = Keypair.generate();

    console.log(`🚨 [Test 3] unauthorizedUser cố tình gọi update_wallet để chiếm đoạt ví nhận...`);

    let unauthorizedBlocked = false;

    try {
      await (program.methods as any)
        .updateWallet(hackerWallet.publicKey)
        .accounts({
          identityAccount: identityPda,
          authority: unauthorizedUser.publicKey,
        })
        .signers([unauthorizedUser])
        .rpc();
    } catch (err: any) {
      unauthorizedBlocked = true;
      console.log("✅ [Test 3] Hệ thống từ chối cập nhật trái phép:", err.message || err);
      // Kỳ vọng lỗi vi phạm ràng buộc has_one = authority hoặc ConstraintRaw / Unauthorized
      assert.ok(
        err.toString().includes("ConstraintHasOne") ||
        err.toString().includes("ConstraintRaw") ||
        err.toString().includes("Unauthorized") ||
        err.toString().includes("2001") || // Mã lỗi Anchor ConstraintHasOne
        err.logs?.some((l: string) => l.includes("ConstraintHasOne")),
        "Lỗi trả về phải là vi phạm quyền sở hữu authority"
      );
    }

    assert.ok(
      unauthorizedBlocked,
      "Kẻ lạ (unauthorizedUser) không được phép sửa ví nhận của người khác!"
    );

    // Xác nhận lại: Địa chỉ ví đích trên on-chain vẫn giữ nguyên giá trị ban đầu
    const account = await (program.account as any).identityAccount.fetch(identityPda);
    assert.equal(
      account.wallet.toBase58(),
      targetWallet.publicKey.toBase58(),
      "Ví nhận vẫn phải là targetWallet gốc của Alex, không bị hacker can thiệp"
    );
  });

  // =========================================================================
  // TEST CASE 4 (BONUS): CẬP NHẬT HỢP LỆ BỞI CHÍNH CHỦ (Authorized Update)
  // =========================================================================
  it("Test Case 4 - Cập nhật chính chủ: Authority đổi thành công sang newTargetWallet", async () => {
    const username = "alex.ned";
    const hashedId = hashIdentifier(username);
    const [identityPda] = getIdentityPda(hashedId);

    console.log(`🔄 [Test 4] Authority thực sự đổi ví nhận sang: ${newTargetWallet.publicKey.toBase58()}`);

    const tx = await (program.methods as any)
      .updateWallet(newTargetWallet.publicKey)
      .accounts({
        identityAccount: identityPda,
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();

    console.log("✅ [Test 4] Cập nhật thành công! TX:", tx);

    // Fetch lại dữ liệu để xác nhận đã thay đổi
    const account = await (program.account as any).identityAccount.fetch(identityPda);
    assert.equal(
      account.wallet.toBase58(),
      newTargetWallet.publicKey.toBase58(),
      "Ví nhận trên PDA phải được cập nhật chính xác sang newTargetWallet"
    );
  });

  // =========================================================================
  // TEST CASE 5 (BONUS): ĐÓNG PDA VÀ HOÀN TRẢ TIỀN RENT CHO SPONSOR
  // =========================================================================
  it("Test Case 5 - Đóng định danh: Authority đóng PDA và hoàn trả Rent về cho Payer (Sponsor)", async () => {
    const username = "alex.ned";
    const hashedId = hashIdentifier(username);
    const [identityPda] = getIdentityPda(hashedId);

    const payerBalanceBefore = await connection.getBalance(payer.publicKey);

    console.log(`🗑️ [Test 5] Đóng định danh và hoàn lại SOL ký quỹ cho payer...`);

    const tx = await (program.methods as any)
      .closeIdentity()
      .accounts({
        identityAccount: identityPda,
        authority: authority.publicKey,
        recipient: payer.publicKey,
      })
      .signers([authority])
      .rpc();

    console.log("✅ [Test 5] Đóng Account thành công! TX:", tx);

    // Kiểm tra tài khoản PDA đã bị xóa hoàn toàn khỏi blockchain
    const closedAccountInfo = await connection.getAccountInfo(identityPda);
    assert.equal(
      closedAccountInfo,
      null,
      "Tài khoản PDA phải bị đóng hoàn toàn (accountInfo = null)"
    );

    const payerBalanceAfter = await connection.getBalance(payer.publicKey);
    assert.ok(
      payerBalanceAfter > payerBalanceBefore,
      "Số dư của Payer (Relayer) phải tăng lên do nhận lại Rent lamports hoàn trả"
    );

    console.log("🎉 [Test 5] Rent đã được hoàn trả thành công về ví Sponsor!");
  });
});
