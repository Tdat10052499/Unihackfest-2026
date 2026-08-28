import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import processPolyfill from 'process/browser';

global.Buffer = Buffer;

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
