// web3.js and Anchor expect Node's Buffer as a global. Imported first by main.tsx, before any Solana code loads.
import { Buffer } from 'buffer';

const g = globalThis as unknown as { Buffer?: typeof Buffer };
if (!g.Buffer) g.Buffer = Buffer;
