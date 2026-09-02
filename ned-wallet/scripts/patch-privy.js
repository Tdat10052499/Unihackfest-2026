const fs = require('fs');
const path = require('path');

function patchFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) return false;
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const { from, to } of replacements) {
    if (content.includes(from)) {
      content = content.replaceAll(from, to);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Patched: ${filePath}`);
    return true;
  }
  return false;
}

function findAndPatch(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === '@privy-io' ||
        entry.name.includes('@privy-io') ||
        entry.name === 'dist' ||
        entry.name === 'cjs' ||
        entry.name === 'esm' ||
        entry.name === 'node_modules' ||
        entry.name.startsWith('@privy-io+')
      ) {
        findAndPatch(fullPath);
      }
    } else if (entry.isFile()) {
      // 1. Patch @privy-io/expo WebView 0x0 container & fix CAIP-122 SIWS Chain ID: devnet
      if (entry.name.includes('chunk-77II74GH') && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
        patchFile(fullPath, [
          {
            from: 'style:{width:0,height:0,overflow:"hidden"}',
            to: 'style:{position:"absolute",top:-9999,left:-9999,width:50,height:50,opacity:0.01}',
          },
          {
            from: 'style: { width: 0, height: 0, overflow: "hidden" }',
            to: 'style: { position: "absolute", top: -9999, left: -9999, width: 50, height: 50, opacity: 0.01 }',
          },
          // Force devnet in SIWS message template so Privy nonce and signed message are consistent
          {
            from: 'Chain ID: mainnet',
            to: 'Chain ID: devnet',
          },
        ]);
      }

      // 2. Patch @privy-io/js-sdk-core signWithUserSigner timeout to 60s, clearMfa to 30s
      //    AND fix CAIP-122 SIWS createSiwsMessage to emit Chain ID: devnet
      //    This ensures the Privy backend nonce is registered with devnet, matching what we sign
      if (
        (fullPath.includes('@privy-io') || fullPath.includes('js-sdk-core')) &&
        (entry.name === 'index.mjs' || entry.name === 'index.js')
      ) {
        patchFile(fullPath, [
          {
            from: 'signWithUserSigner(e){return this.invokeWithMfa(t=>this.invoke(`privy:user-signer:sign`,{...t,...e}),{timeoutMsg:`Operation reached timeout: user-signer:sign`})}',
            to: 'signWithUserSigner(e){return this.invokeWithMfa(t=>this.invoke(`privy:user-signer:sign`,{...t,...e}),{timeoutMsg:`Operation reached timeout: user-signer:sign`,timeoutMs:6e4})}',
          },
          {
            from: 'signWithUserSigner(e){return this.invokeWithMfa(t=>this.invoke("privy:user-signer:sign",{...t,...e}),{timeoutMsg:"Operation reached timeout: user-signer:sign"})}',
            to: 'signWithUserSigner(e){return this.invokeWithMfa(t=>this.invoke("privy:user-signer:sign",{...t,...e}),{timeoutMsg:"Operation reached timeout: user-signer:sign",timeoutMs:6e4})}',
          },
          {
            from: 'clearMfa(e){return L(this.waitForReady().then(()=>this.invoke(`privy:mfa:clear`,e)),{msg:`Operation reached timeout: mfa:clear`})}',
            to: 'clearMfa(e){return L(this.waitForReady().then(()=>this.invoke(`privy:mfa:clear`,e)),{msg:`Operation reached timeout: mfa:clear`,ms:3e4})}',
          },
          // CRITICAL: Force devnet in the createSiwsMessage template literal.
          // The nonce Privy stores server-side is tied to the exact message text.
          // Replacing the string in the SDK source ensures the backend stores "devnet"
          // so the signed message we send back matches exactly.
          {
            from: 'Chain ID: mainnet\nNonce: ${t}',
            to: 'Chain ID: devnet\nNonce: ${t}',
          },
        ]);
      }
    }
  }
}

// CRITICAL: Direct patch for js-sdk-core createSiwsMessage template literal.
// This patches "Chain ID: mainnet" → "Chain ID: devnet" so Privy backend
// stores the nonce tied to devnet, making signed message consistent.
function patchJsSdkCoreChainId(baseDir) {
  if (!fs.existsSync(baseDir)) return;
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(baseDir, entry.name);
    if (entry.isDirectory()) {
      patchJsSdkCoreChainId(fullPath);
    } else if (
      entry.isFile() &&
      (entry.name === 'index.js' || entry.name === 'index.mjs') &&
      fullPath.includes('js-sdk-core')
    ) {
      patchFile(fullPath, [
        {
          from: 'Chain ID: mainnet',
          to: 'Chain ID: devnet',
        },
        // Timeout patches (idempotent if already applied)
        {
          from: 'signWithUserSigner(e){return this.invokeWithMfa(t=>this.invoke(`privy:user-signer:sign`,{...t,...e}),{timeoutMsg:`Operation reached timeout: user-signer:sign`})}',
          to: 'signWithUserSigner(e){return this.invokeWithMfa(t=>this.invoke(`privy:user-signer:sign`,{...t,...e}),{timeoutMsg:`Operation reached timeout: user-signer:sign`,timeoutMs:6e4})}',
        },
        {
          from: 'clearMfa(e){return L(this.waitForReady().then(()=>this.invoke(`privy:mfa:clear`,e)),{msg:`Operation reached timeout: mfa:clear`})}',
          to: 'clearMfa(e){return L(this.waitForReady().then(()=>this.invoke(`privy:mfa:clear`,e)),{msg:`Operation reached timeout: mfa:clear`,ms:3e4})}',
        },
      ]);
    }
  }
}

console.log('🚀 Running Privy patch: devnet SIWS Chain ID + WebView + Timeouts...');
const nodeModules = path.join(__dirname, '..', 'node_modules');
findAndPatch(path.join(nodeModules, '@privy-io'));
findAndPatch(path.join(nodeModules, '.pnpm'));
// Also run the targeted js-sdk-core Chain ID patch across .pnpm
patchJsSdkCoreChainId(path.join(nodeModules, '.pnpm'));
patchJsSdkCoreChainId(path.join(nodeModules, '@privy-io'));
console.log('✨ Privy patch complete!');
