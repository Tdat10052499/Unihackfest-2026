import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import processPolyfill from 'process/browser';
import { randomUUID } from 'expo-crypto';
import { DYNAMIC_UNIVERSAL_LINK } from './services/auth/constants';

global.Buffer = Buffer;

if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}

if (typeof global.process === 'undefined') {
  global.process = processPolyfill;
} else {
  try {
    if (!global.process.version) {
      Object.defineProperty(global.process, 'version', {
        value: 'v18.0.0',
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
  } catch (e) {}

  try {
    if (!global.process.versions) {
      Object.defineProperty(global.process, 'versions', {
        value: { node: '18.0.0' },
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
  } catch (e) {}

  try {
    if (global.process.browser === undefined) {
      global.process.browser = true;
    }
    if (!global.process.nextTick) {
      global.process.nextTick = processPolyfill.nextTick || setImmediate;
    }
    if (!global.process.cwd) {
      global.process.cwd = () => '/';
    }
  } catch (e) {}
}

if (typeof window !== 'undefined') {
  window.process = window.process || { env: processPolyfill.env || {} };
  window.process.browser = true;
  if (!window.process.version) {
    window.process.version = 'v18.0.0';
  }
}

// Dynamic SDK (PoC T0.4): crypto.randomUUID + globalThis.location (origin phải trùng metadata.universalLink)
// https://www.dynamic.xyz/docs/javascript/react-native/expo
if (global.crypto && !global.crypto.randomUUID) {
  global.crypto.randomUUID = randomUUID;
}

if (!globalThis.location) {
  globalThis.location = { origin: DYNAMIC_UNIVERSAL_LINK };
}
