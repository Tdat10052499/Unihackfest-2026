// Hằng số auth dùng chung giữa polyfill.js và services/auth/client.ts

// Origin HTTPS của app (GitHub Pages) — phải có trong Dynamic Console › Security › CORS Origins
export const DYNAMIC_UNIVERSAL_LINK = 'https://tdat10052499.github.io';

// Deep link nhận kết quả OAuth trên native — phải có trong Dynamic Console › Security › Mobile Deeplink URLs.
// Path "login" để expo-router quay về màn đăng nhập khi Android giao lại deep link.
export const DYNAMIC_NATIVE_LINK = 'nedwallet://login';
