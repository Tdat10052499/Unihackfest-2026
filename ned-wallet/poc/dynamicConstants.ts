// Hằng số dùng chung giữa polyfill.js và dynamicClient.ts (PoC T0.4)

// Origin HTTPS của app (GitHub Pages) — phải có trong Dynamic Console › Security › Allowed Origins
export const DYNAMIC_UNIVERSAL_LINK = 'https://tdat10052499.github.io';

// Deep link nhận kết quả OAuth — phải có trong Dynamic Console › Security › Mobile Deeplink URLs.
// Dùng path poc-dynamic để expo-router quay về đúng màn PoC khi Android giao lại deep link.
export const DYNAMIC_NATIVE_LINK = 'nedwallet://poc-dynamic';
