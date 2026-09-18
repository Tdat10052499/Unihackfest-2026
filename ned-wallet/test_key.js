const web3 = require('@solana/web3.js');
const bs58 = require('bs58').default || require('bs58');
const key = '29rNUKf19UV5rg5LAmWNtEFeky1ewNhho7ABDGS6XN8oPvjLaZAzGeHSX4FkyM4SWAQSsTEQQhEAtkTaiM3qrE9A';
try {
  const decoded = bs58.decode(key);
  const kp = web3.Keypair.fromSecretKey(decoded);
  console.log('Public Key:', kp.publicKey.toBase58());
} catch(e) {
  console.log('Error:', e);
}
