import { VercelRequest, VercelResponse } from '@vercel/node';
import { Connection, Keypair, VersionedTransaction, Transaction } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';
import bs58 from 'bs58';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY || '';
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const connection = new Connection(RPC_URL, 'confirmed');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    const { transaction, userId } = req.body;

    if (!transaction) {
      return res.status(400).json({ error: 'Bad Request: Missing transaction payload' });
    }

    if (!RELAYER_PRIVATE_KEY) {
      return res.status(500).json({ error: 'Internal Server Error: Relayer key not configured' });
    }

    // Rate Limit check if userId is provided
    if (userId) {
      const today = new Date().toISOString().split('T')[0];
      const { data: userLimit } = await supabase
        .from('user_limits')
        .select('daily_tx_count, last_tx_date')
        .eq('user_id', userId)
        .single();

      if (userLimit && userLimit.last_tx_date === today && userLimit.daily_tx_count >= 5) {
        return res.status(429).json({ error: 'Bạn đã hết 5 lượt giao dịch miễn phí hôm nay. Vui lòng quay lại vào ngày mai.' });
      }

      await supabase
        .from('user_limits')
        .upsert({
          user_id: userId,
          daily_tx_count: (userLimit?.last_tx_date === today ? userLimit.daily_tx_count : 0) + 1,
          last_tx_date: today,
        }, { onConflict: 'user_id' });
    }

    // Ký phần còn lại bằng Relayer Keypair
    const relayerKeypair = Keypair.fromSecretKey(bs58.decode(RELAYER_PRIVATE_KEY));
    const txBuffer = Buffer.from(transaction, 'base64');
    let signedTxBase64 = '';

    try {
      // Thử VersionedTransaction
      const tx = VersionedTransaction.deserialize(txBuffer);
      tx.sign([relayerKeypair]);
      signedTxBase64 = Buffer.from(tx.serialize()).toString('base64');
    } catch {
      // Fallback Transaction thường (Legacy)
      const tx = Transaction.from(txBuffer);
      tx.partialSign(relayerKeypair);
      signedTxBase64 = Buffer.from(tx.serialize({ requireAllSignatures: false })).toString('base64');
    }

    return res.status(200).json({
      success: true,
      signedTransaction: signedTxBase64,
      transaction: signedTxBase64,
    });
  } catch (err: any) {
    console.error('Relayer sign error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
