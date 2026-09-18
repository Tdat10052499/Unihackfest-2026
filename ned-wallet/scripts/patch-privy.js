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
        entry.name.startsWith('@privy-io+') ||
        entry.name === 'expo-secure-store' ||
        entry.name.startsWith('expo-secure-store+') ||
        entry.name.startsWith('expo-secure-store@') ||
        entry.name === 'build'
      ) {
        findAndPatch(fullPath);
      }
    } else if (entry.isFile()) {
      // 1. Patch @privy-io/expo WebView 0x0 container
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
          // Restore Chain ID: mainnet if previously patched to devnet
          {
            from: 'Chain ID: devnet',
            to: 'Chain ID: mainnet',
          },
        ]);
      }

      // 2. Patch @privy-io/expo Application ID error on Web and Secure Store Web Fallback
      if (entry.name.includes('chunk-') && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
        patchFile(fullPath, [
          {
            from: 'if(typeof A!="string")throw new T({error:"Cannot determine native application ID. Please make sure `expo-application` is installed as a dependency and that `ios.bundleId` or `android.package` is set.",code:"invalid_native_app_id"})',
            to: 'if(typeof A!="string")return"com.anonymous.nedwallet"'
          },
          {
            from: 'if(typeof _expoapplication.applicationId!="string")throw new (0, _jssdkcore.PrivyClientError)({error:"Cannot determine native application ID. Please make sure `expo-application` is installed as a dependency and that `ios.bundleId` or `android.package` is set.",code:"invalid_native_app_id"})',
            to: 'if(typeof _expoapplication.applicationId!="string")return"com.anonymous.nedwallet"'
          },
          {
            from: 'return a.getItemAsync(e,{keychainAccessible:a.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY})',
            to: 'if(typeof localStorage!=="undefined"){return Promise.resolve(localStorage.getItem(e))}return a.getItemAsync(e,{keychainAccessible:a.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY})'
          },
          {
            from: 'return a.setItemAsync(e,r,{keychainAccessible:a.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY})',
            to: 'if(typeof localStorage!=="undefined"){localStorage.setItem(e,r);return Promise.resolve()}return a.setItemAsync(e,r,{keychainAccessible:a.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY})'
          },
          {
            from: 'return a.deleteItemAsync(e,{keychainAccessible:a.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY})',
            to: 'if(typeof localStorage!=="undefined"){localStorage.removeItem(e);return Promise.resolve()}return a.deleteItemAsync(e,{keychainAccessible:a.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY})'
          }
        ]);
      }

      // 3. Patch @privy-io/js-sdk-core signWithUserSigner timeout to 60s, clearMfa to 30s
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
          // Restore Chain ID: mainnet if previously patched to devnet
          {
            from: 'Chain ID: devnet\nNonce: ${t}',
            to: 'Chain ID: mainnet\nNonce: ${t}',
          },
        ]);
      }

      // 4. Patch expo-secure-store for Web Fallback
      if (entry.name === 'SecureStore.js' && fullPath.includes('expo-secure-store')) {
        patchFile(fullPath, [
          {
            from: 'return await ExpoSecureStore.getValueWithKeyAsync(key, options);',
            to: 'if(typeof localStorage !== "undefined") { return localStorage.getItem(key); } return await ExpoSecureStore.getValueWithKeyAsync(key, options);'
          },
          {
            from: 'await ExpoSecureStore.setValueWithKeyAsync(value, key, options);',
            to: 'if(typeof localStorage !== "undefined") { localStorage.setItem(key, value); return; } await ExpoSecureStore.setValueWithKeyAsync(value, key, options);'
          },
          {
            from: 'await ExpoSecureStore.deleteValueWithKeyAsync(key, options);',
            to: 'if(typeof localStorage !== "undefined") { localStorage.removeItem(key); return; } await ExpoSecureStore.deleteValueWithKeyAsync(key, options);'
          }
        ]);
      }
    }
  }
}

function restoreChainId(baseDir) {
  if (!fs.existsSync(baseDir)) return;
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(baseDir, entry.name);
    if (entry.isDirectory()) {
      restoreChainId(fullPath);
    } else if (
      entry.isFile() &&
      (entry.name === 'index.js' || entry.name === 'index.mjs') &&
      fullPath.includes('js-sdk-core')
    ) {
      patchFile(fullPath, [
        {
          from: 'Chain ID: devnet',
          to: 'Chain ID: mainnet',
        },
      ]);
    }
  }
}

console.log('🚀 Running Privy patch: standard SIWS Chain ID + WebView + Timeouts...');
const nodeModules = path.join(__dirname, '..', 'node_modules');
findAndPatch(path.join(nodeModules, '@privy-io'));
findAndPatch(path.join(nodeModules, 'expo-secure-store'));
findAndPatch(path.join(nodeModules, '.pnpm'));
restoreChainId(path.join(nodeModules, '.pnpm'));
restoreChainId(path.join(nodeModules, '@privy-io'));
console.log('✨ Privy patch complete!');
