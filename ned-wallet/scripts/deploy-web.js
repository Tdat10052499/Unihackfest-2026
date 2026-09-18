const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 [Deploy Web] Bước 1: Xuất bản Web qua Expo...');
execSync('npx expo export --platform web', { stdio: 'inherit' });

console.log('📝 [Deploy Web] Bước 2: Tạo vercel.json SPA rewrites trong thư mục dist...');
const distDir = path.resolve(__dirname, '../dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const vercelConfig = {
  cleanUrls: true,
  rewrites: [
    {
      source: '/(.*)',
      destination: '/index.html'
    }
  ]
};

const vercelConfigPath = path.join(distDir, 'vercel.json');
fs.writeFileSync(vercelConfigPath, JSON.stringify(vercelConfig, null, 2), 'utf-8');
console.log('✅ [Deploy Web] Đã ghi cấu hình SPA rewrites vào:', vercelConfigPath);

console.log('☁️ [Deploy Web] Bước 3: Deploy lên Vercel Production...');
execSync('npx vercel --prod ./dist --archive=tgz', { stdio: 'inherit' });
console.log('🎉 [Deploy Web] Hoàn tất triển khai!');
