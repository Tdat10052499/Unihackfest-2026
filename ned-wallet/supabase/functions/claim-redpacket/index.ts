// =========================================================================
// SUPABASE EDGE FUNCTION: claim-redpacket
// Backend Signer: Xác thực GPS và Ký giao dịch giải ngân SOL On-chain
// =========================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from 'https://esm.sh/@solana/web3.js@1.95.8';
import bs58 from 'https://esm.sh/bs58@6.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Công thức Haversine tính khoảng cách GPS giữa 2 tọa độ (mét)
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Bán kính Trái Đất theo mét
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Khởi tạo Treasury Keypair từ biến môi trường bí mật (Secrets)
function getTreasuryKeypair(): Keypair {
  const secretKeyEnv =
    Deno.env.get('TREASURY_SECRET_KEY') ||
    Deno.env.get('TREASURY_PRIVATE_KEY');

  if (!secretKeyEnv) {
    console.warn(
      '⚠️ [Treasury] TREASURY_SECRET_KEY chưa được cấu hình trong Supabase Secrets, khởi tạo keypair ngẫu nhiên cho môi trường test.'
    );
    return Keypair.generate();
  }

  try {
    const trimmed = secretKeyEnv.trim();
    // Trường hợp 1: JSON Array [12, 34, 56...]
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const parsedBytes = JSON.parse(trimmed);
      return Keypair.fromSecretKey(Uint8Array.from(parsedBytes));
    }
    // Trường hợp 2: Base58 string
    const decoded = bs58.decode(trimmed);
    return Keypair.fromSecretKey(decoded);
  } catch (err: any) {
    console.error('❌ [Treasury] Lỗi giải mã TREASURY_SECRET_KEY:', err);
    throw new Error('Cấu hình TREASURY_SECRET_KEY trên server không hợp lệ.');
  }
}

serve(async (req) => {
  // 1. Xử lý CORS Preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { packet_id, user_wallet, user_lat, user_lng } = body;

    // 2. Validate đầu vào
    if (!packet_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Thiếu thông tin packet_id.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!user_wallet) {
      return new Response(
        JSON.stringify({ success: false, error: 'Thiếu địa chỉ ví nhận SOL.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (user_lat === undefined || user_lng === undefined) {
      return new Response(
        JSON.stringify({ success: false, error: 'Thiếu tọa độ GPS của thiết bị.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let recipientPubkey: PublicKey;
    try {
      recipientPubkey = new PublicKey(user_wallet);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Địa chỉ ví người nhận không hợp lệ trên Solana.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Khởi tạo Supabase Client với Service Role Key (Bypass RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Server chưa cấu hình SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Lấy dữ liệu bao lì xì từ DB bằng quyền Admin
    const { data: packet, error: fetchErr } = await supabaseAdmin
      .from('geo_red_packets')
      .select('*')
      .eq('id', packet_id)
      .single();

    if (fetchErr || !packet) {
      return new Response(
        JSON.stringify({ success: false, error: 'Bao lì xì không tồn tại hoặc đã bị xóa.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Kiểm tra trạng thái bao lì xì
    if (packet.status !== 'active') {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            packet.status === 'claimed'
              ? 'Rất tiếc! Bao lì xì này đã có người khác nhận mất rồi.'
              : 'Bao lì xì này đã hết hạn hiệu lực.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Chặn người tạo tự nhận lại bao lì xì của chính mình (Anti-Self-Farming)
    if (packet.creator_wallet.toLowerCase() === user_wallet.toLowerCase()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Bạn không thể tự nhặt bao lì xì do chính mình tạo ra.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Backend-side Haversine GPS Validation (Kiểm tra khoảng cách thực tế)
    const distanceMeters = calculateHaversineDistance(
      packet.lat,
      packet.lng,
      user_lat,
      user_lng
    );

    const allowedRadiusWithBuffer = (packet.radius || 50) + 10; // Cho phép sai số GPS 10m trên di động
    if (distanceMeters > allowedRadiusWithBuffer) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Bạn đang cách bao lì xì ${Math.round(distanceMeters)}m (vượt quá bán kính cho phép ${packet.radius}m). Hãy di chuyển lại gần hơn để mở!`,
          distanceMeters: Math.round(distanceMeters),
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 8. Khởi tạo Backend Signer & Ký giao dịch On-chain chuyển SOL từ Treasury về user_wallet
    const treasuryKeypair = getTreasuryKeypair();
    const solanaRpc = Deno.env.get('SOLANA_RPC_URL') || 'https://api.devnet.solana.com';
    const connection = new Connection(solanaRpc, 'confirmed');

    const payoutLamports = Math.round(packet.amount * LAMPORTS_PER_SOL);
    const { blockhash } = await connection.getLatestBlockhash('confirmed');

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: treasuryKeypair.publicKey,
        toPubkey: recipientPubkey,
        lamports: payoutLamports,
      })
    );
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = treasuryKeypair.publicKey;

    console.log(
      `💸 [Backend Signer] Đang ký và giải ngân ${packet.amount} SOL từ Treasury (${treasuryKeypair.publicKey.toBase58()}) đến ${user_wallet}...`
    );

    let txSignature: string;
    try {
      txSignature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [treasuryKeypair],
        { commitment: 'confirmed' }
      );
      console.log(`✅ [Solana On-chain] Giải ngân thành công! Chữ ký: ${txSignature}`);
    } catch (onchainErr: any) {
      console.error('❌ [Solana On-chain] Lỗi ký giao dịch Treasury:', onchainErr);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Lỗi giải ngân on-chain từ Treasury: ${onchainErr?.message || 'Giao dịch bị từ chối'}`,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 9. ATOMIC DATABASE UPDATE: Chỉ cập nhật trạng thái khi On-chain đã xác nhận
    const { error: updateErr } = await supabaseAdmin
      .from('geo_red_packets')
      .update({
        status: 'claimed',
        claimed_by: user_wallet,
        claimed_at: new Date().toISOString(),
        claim_tx_signature: txSignature,
      })
      .eq('id', packet_id)
      .eq('status', 'active'); // Điều kiện kép tránh Race Condition / Double Claim

    if (updateErr) {
      console.error('⚠️ [Supabase] Lỗi cập nhật trạng thái sau khi chuyển tiền:', updateErr);
    }

    // 10. Phản hồi thành công về App
    return new Response(
      JSON.stringify({
        success: true,
        message: packet.message,
        amount: packet.amount,
        creator_wallet: packet.creator_wallet,
        txSignature,
        distanceMeters: Math.round(distanceMeters),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('❌ [claim-redpacket] Server Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Lỗi xử lý server.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
