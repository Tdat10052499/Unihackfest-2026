const { Connection, Keypair, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');


async function main() {
  const connection = new Connection('https://devnet.helius-rpc.com/?api-key=a62bd298-968d-44dc-be17-ba3a784735ce', 'confirmed');
  
  // 1. Sender (Mock user wallet)
  const sender = Keypair.generate();
  console.log('Sender:', sender.publicKey.toBase58());
  


  const relayerPubkey = new PublicKey('b7TFMuVZzZneuHSMuoWiV3d52yRF7pLTLVF7HDKNWqz');
  
  const { blockhash } = await connection.getLatestBlockhash();
  
  // 2. Create Transaction
  const tx = new Transaction({
    recentBlockhash: blockhash,
    feePayer: relayerPubkey
  }).add(
    SystemProgram.transfer({
      fromPubkey: sender.publicKey,
      toPubkey: Keypair.generate().publicKey,
      lamports: 100
    })
  );
  
  // 3. Sender signs the transaction
  tx.sign(sender); // Sender signs, relayer has not signed yet.
  
  // 4. Serialize to base64
  const rawTxBase64 = tx.serialize({ requireAllSignatures: false }).toString('base64');
  
  // 5. Send to Relayer
  console.log('Sending to relayer...');
  const relayerUrl = 'http://localhost:3001/api/transactions/sponsor';
  
  const res = await fetch(relayerUrl, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test_token'
    },
    body: JSON.stringify({ transaction: rawTxBase64, userId: 'test-user-123' })
  });
  
  const data = await res.json();
  console.log('Response status:', res.status);
  console.log('Response data:', data);
}

main();
