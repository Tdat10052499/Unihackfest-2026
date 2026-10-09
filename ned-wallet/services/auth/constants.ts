// Auth constants shared by polyfill.js and services/auth/client.ts

// HTTPS origin of the app (GitHub Pages) — must be listed in Dynamic Console › Security › CORS Origins
export const DYNAMIC_UNIVERSAL_LINK = 'https://tdat10052499.github.io';

// Deep link that receives the OAuth result on native — must be listed in Dynamic Console › Security › Mobile Deeplink URLs.
// The "login" path makes expo-router return to the sign-in screen when Android hands the deep link back.
export const DYNAMIC_NATIVE_LINK = 'nedwallet://login';
