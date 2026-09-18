import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Custom root HTML cho Expo Router Static Web Output (PWA)
 * Đảm bảo:
 * 1. Tắt cache cứng (no-cache, no-store, must-revalidate) để phục vụ cập nhật nhanh tại sự kiện.
 * 2. Cấu hình thẻ meta PWA chuẩn standalone và phong cách Neo-brutalism.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="vi">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />

        {/* Chống cache cứng để mỗi lần đẩy code mới là web tự làm mới ngay */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />

        {/* Cấu hình PWA Standalone */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#FDF8F5" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Reset cuộn màn hình trên Web */}
        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #FDF8F5;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}
`;
