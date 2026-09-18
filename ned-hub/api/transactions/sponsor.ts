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
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid Bearer token' });
    }

    const { transaction, userId } = req.body; 
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Missing userId in request body' });
    }

    if (!transaction) {
      return res.status(400).json({ error: 'Bad Request: Missing transaction payload' });
    }

    if (!RELAYER_PRIVATE_KEY) {
      return res.status(500).json({ error: 'Internal Server Error: Relayer key not configured' });
    }

    // 1. Check Rate Limit in Supabase
    const { data: userLimit, error: fetchError } = await supabase
      .from('user_limits')
      .select('daily_tx_count, last_tx_date')
      .eq('user_id', userId)
      .single();

    const today = new Date().toISOString().split('T')[0];
    let txCount = 0;
    
    if (userLimit) {
      const lastTxDate = userLimit.last_tx_date;
      if (lastTxDate === today) {
        if (userLimit.daily_tx_count >= 5) {
          // Trả về HTTP 429 theo yêu cầu của user
          return res.status(429).json({ error: 'Bạn đã hết 5 lượt giao dịch miễn phí hôm nay. Vui lòng quay lại vào ngày mai.' });
        }
        txCount = userLimit.daily_tx_count;
      }
    }

    // 2. Add Relayer Signature
    const relayerKeypair = Keypair.fromSecretKey(bs58.decode(RELAYER_PRIVATE_KEY));
    
    // Deserialize transaction
    const txBuffer = Buffer.from(transaction, 'base64');
    let tx;
    try {
      // Try VersionedTransaction first
      tx = VersionedTransaction.deserialize(txBuffer);
      tx.sign([relayerKeypair]);
    } catch {
      // Fallback to legacy Transaction
      tx = Transaction.from(txBuffer);
      tx.partialSign(relayerKeypair);
    }

    // 3. Broadcast to Solana
    const rawTx = tx.serialize();
    const txHash = await connection.sendRawTransaction(rawTx, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 3, // Thêm cấu hình maxRetries theo nhắc nhở từ user
    });

    // 4. Update Limit in Supabase
    const { error: upsertError } = await supabase
      .from('user_limits')
      .upsert({
        user_id: userId,
        daily_tx_count: txCount + 1,
        last_tx_date: today,
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('Failed to update user limits:', upsertError);
    }

    return res.status(200).json({ success: true, txHash });

  } catch (err: any) {
    console.error('Relayer error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
