const web3 = require('@solana/web3.js');
const kp = web3.Keypair.generate();
const tx = new web3.Transaction({recentBlockhash: kp.publicKey.toBase58(), feePayer: kp.publicKey}).add(
  web3.SystemProgram.transfer({
    fromPubkey: kp.publicKey,
    toPubkey: kp.publicKey,
    lamports: 100
  })
);
const buf = tx.serialize({requireAllSignatures: false});
try {
  web3.Transaction.from(buf);
  console.log("Success");
} catch (e) {
  console.log("Error:", e.message);
}
