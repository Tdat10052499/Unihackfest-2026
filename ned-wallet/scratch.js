const privy = require('./node_modules/.pnpm/@privy-io+js-sdk-core@0.72.0_viem@2.55.15_bufferutil@4.1.0_typescript@5.9.3_utf-8-validate@6.0.6_zod@3.25.76_/node_modules/@privy-io/js-sdk-core');

const msg = "ned.wallet wants you to sign in with your Solana account";
console.log("Wrapped bytes:");
console.log(privy.buildSolanaOffchainMessage(msg));
