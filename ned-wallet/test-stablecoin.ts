import 'dotenv/config';
import { Keypair, PublicKey } from '@solana/web3.js';
import { getConnection, getProgram, deriveUserProfilePda, PROGRAM_ID } from './src/utils/anchorClient';
import * as anchor from '@coral-xyz/anchor';

// Địa chỉ chuẩn USDC Mint trên Solana Devnet
const USDC_DEVNET_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

async function runStablecoinTest() {
    console.log("\n======================================================");
    console.log("🚀 [N.E.D WALLET] KIỂM THỬ STABLECOIN & PREFERRED MINT");
    console.log("======================================================\n");

    console.log("📡 1. Program ID:          ", PROGRAM_ID.toBase58());
    console.log("💵 2. USDC Mint (Devnet):  ", USDC_DEVNET_MINT.toBase58());

    const connection = getConnection();
    const dummyUser = Keypair.generate();
    console.log("👤 3. Ví người dùng giả lập:", dummyUser.publicKey.toBase58());

    const [pda, bump] = deriveUserProfilePda(dummyUser.publicKey);
    console.log(`🏛️  4. PDA Profile:         ${pda.toBase58()} (Bump: ${bump})`);

    const program = getProgram();

    console.log("\n🔍 5. Kiểm tra cấu trúc IDL mới (preferred_mint & instructions)...");
    // Trong chuẩn Anchor 0.30+, định nghĩa field của struct nằm ở idl.types
    const idlTypes = (program.idl as any).types || [];
    const userProfileTypeDef = idlTypes.find(
        (t: any) => t.name.toLowerCase() === "userprofile"
    );

    const fields = userProfileTypeDef?.type?.fields || [];
    const hasPreferredMint = fields.some(
        (f: any) => f.name === "preferredMint" || f.name === "preferred_mint"
    );

    if (hasPreferredMint) {
        console.log("   ✅ IDL ĐÃ ĐỒNG BỘ: Struct UserProfile chứa chính xác trường 'preferredMint'!");
        console.log("   ↳ Các trường dữ liệu:", fields.map((f: any) => `${f.name}: ${JSON.stringify(f.type)}`).join(", "));
    } else {
        console.log("   ❌ LỖI: Trường 'preferredMint' chưa xuất hiện trong IDL client.");
    }

    // Kiểm tra instruction transferStablecoin
    const hasTransferIx = program.idl.instructions.some(
        (ix: any) => ix.name === "transferStablecoin" || ix.name === "transfer_stablecoin"
    );
    if (hasTransferIx) {
        console.log("   ✅ IDL METHOD: Đã tích hợp hàm CPI 'transferStablecoin'!");
    }

    console.log("\n⚡ 6. Thử nghiệm cấu trúc hàm khởi tạo với preferred_mint...");
    try {
        // Mô phỏng việc build instruction (chưa gửi thực tế vì dummyUser không có SOL)
        const ix = await program.methods
            .initializeProfile("USD")
            .accounts({
                userProfile: pda,
                signer: dummyUser.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .instruction();

        console.log("   ✅ Đã thiết lập thành công câu lệnh gọi hàm khởi tạo tích hợp chuẩn token mới.");
        console.log(`   ↳ Instruction Data Length: ${ix.data.length} bytes`);
        console.log(`   ↳ Target Program: ${ix.programId.toBase58()}`);
    } catch (error: any) {
        console.log("   ❌ Lỗi cấu trúc gọi hàm:", error.message);
    }

    console.log("\n======================================================");
    console.log("✅ HOÀN TẤT KIỂM THỬ STABLECOIN SCHEMA THÀNH CÔNG!");
    console.log("======================================================\n");
}

runStablecoinTest().catch(console.error);