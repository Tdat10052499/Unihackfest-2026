import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';
import { colors } from '@/constants/design';

/**
 * Custom root HTML cho Expo Router Static Web Output (PWA)
 * Makes sure that:
 * 1. Hard caching is off (no-cache, no-store, must-revalidate) so updates reach the event quickly.
 * 2. The PWA meta tags are standalone and the background follows the DesignKit.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />

        {/* No hard caching, so every code push refreshes the web app right away */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />

        {/* PWA standalone settings */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content={colors.background} />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Reset scrolling on the web */}
        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: ${colors.background};
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  height: 100vh;
  max-height: -webkit-fill-available;
  overflow: hidden;
  display: flex;
  flex: 1;
}

html, #root {
  height: 100vh;
  max-height: -webkit-fill-available;
  display: flex;
  flex: 1;
}

@media (hover: hover) {
  /* Button bounce on hover on desktop */
  [role="button"]:hover, button:hover, a:hover {
    transform: translateY(-1px);
    transition: transform 0.1s ease-in-out;
  }
  
  [role="button"]:active, button:active, a:active {
    transform: translateY(2px);
  }
}

`;
