// =========================================================================
// SUPABASE EDGE FUNCTION: sponsor-transfer
// Gasless Fee Payer Relayer: Ký bù Fee Payer & Phát sóng Giao Dịch On-chain
// =========================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  Connection,
  Keypair,
  Transaction,
} from 'https://esm.sh/@solana/web3.js@1.95.8';
import bs58 from 'https://esm.sh/bs58@6.0.0';
import { Buffer } from 'https://deno.land/std@0.168.0/node/buffer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function getTreasuryKeypair(): Keypair {
  const secretKeyEnv =
    Deno.env.get('TREASURY_SECRET_KEY') ||
    Deno.env.get('TREASURY_PRIVATE_KEY');

  if (!secretKeyEnv) {
    console.warn(
      '⚠️ [Treasury] TREASURY_SECRET_KEY chưa cấu hình trong Supabase Secrets, tạo ngẫu nhiên cho test.'
    );
    return Keypair.generate();
  }

  try {
    if (secretKeyEnv.startsWith('[') && secretKeyEnv.endsWith(']')) {
      const secretArray = JSON.parse(secretKeyEnv);
      return Keypair.fromSecretKey(Uint8Array.from(secretArray));
    }
    const decoded = bs58.decode(secretKeyEnv);
    return Keypair.fromSecretKey(decoded);
  } catch (err) {
    console.error('❌ [Treasury] Lỗi giải mã TREASURY_SECRET_KEY:', err);
    throw new Error('Cấu hình TREASURY_SECRET_KEY trên server không hợp lệ.');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { transaction_base64 } = await req.json();

    if (!transaction_base64) {
      return new Response(
        JSON.stringify({ success: false, error: 'Thiếu transaction_base64 trong payload.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const solanaRpc =
      Deno.env.get('SOLANA_DEVNET_RPC') || 'https://api.devnet.solana.com';
    const connection = new Connection(solanaRpc, 'confirmed');

    // 1. Deserialize partial-signed transaction from client
    const txBuffer = Buffer.from(transaction_base64, 'base64');
    const transaction = Transaction.from(txBuffer);

    // 2. Ký bổ sung với tư cách Fee Payer
    const treasuryKeypair = getTreasuryKeypair();
    transaction.partialSign(treasuryKeypair);

    // 3. Phát sóng lên mạng Solana Devnet
    const rawTx = transaction.serialize();
    const txSignature = await connection.sendRawTransaction(rawTx, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    console.log(`⚡ [Sponsor Transfer] Broadcasted signature: ${txSignature}`);

    // 4. Chờ xác nhận on-chain
    await connection.confirmTransaction(txSignature, 'confirmed');
    console.log(`✅ [Sponsor Transfer] Confirmed on-chain: ${txSignature}`);

    return new Response(
      JSON.stringify({
        success: true,
        txSignature,
        feePayer: treasuryKeypair.publicKey.toBase58(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('❌ [sponsor-transfer] Exception:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Lỗi server khi tài trợ phí giao dịch.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
