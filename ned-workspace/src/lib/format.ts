/** "4Fq8…Lw2c" */
export const shortAddress = (address: string) => (address.length > 10 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address);

/** Mobile app route on the phone host (D16). The mobile origin may carry a base path (GitHub Pages) */
export const mobileHref = (origin: string, path = '') => `${origin}${path}`;
