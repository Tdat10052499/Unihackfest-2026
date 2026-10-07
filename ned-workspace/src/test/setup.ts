// Vitest + jsdom: jsdom installs its own Uint8Array / ArrayBuffer, so Node's Buffer (and web3.js) fail the
// `instanceof Uint8Array` checks of @noble/hashes ("Uint8Array expected") and PDAs cannot be derived. Put Node's back.
const NodeUint8Array = Object.getPrototypeOf(Buffer.prototype).constructor as Uint8ArrayConstructor;
const NodeArrayBuffer = Buffer.alloc(1).buffer.constructor as ArrayBufferConstructor;
Object.assign(globalThis, { Uint8Array: NodeUint8Array, ArrayBuffer: NodeArrayBuffer });
