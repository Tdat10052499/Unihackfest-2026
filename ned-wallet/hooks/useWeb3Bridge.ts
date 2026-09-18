import { useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';

export interface Web3BridgeMessage {
  type: 'connect' | 'disconnect' | 'signTransaction' | 'signAllTransactions' | 'signMessage';
  id: number;
  payload?: any;
}

export function useWeb3Bridge(publicKey: string | null) {
  // Đoạn script được tiêm (inject) vào mỗi trang web khi vừa load xong document
  // Giả lập đối tượng window.solana chuẩn của Phantom
  const injectedJavaScript = useMemo(() => {
    return `
      (function() {
        if (window.solana) return; // Đã có provider

        window.solana = {
          isPhantom: true, // Nhiều dApp kiểm tra flag này
          publicKey: ${publicKey ? `"${publicKey}"` : 'null'},
          isConnected: ${!!publicKey},
          
          connect: function(args) {
            return new Promise((resolve, reject) => {
              const id = Date.now();
              window._solanaPromises = window._solanaPromises || {};
              window._solanaPromises[id] = { resolve, reject };
              
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'connect',
                id: id,
                payload: args
              }));
            });
          },
          
          disconnect: function() {
            return new Promise((resolve, reject) => {
              this.publicKey = null;
              this.isConnected = false;
              
              const id = Date.now();
              window._solanaPromises = window._solanaPromises || {};
              window._solanaPromises[id] = { resolve, reject };
              
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'disconnect',
                id: id
              }));
            });
          },
          
          signTransaction: function(transaction) {
            return new Promise((resolve, reject) => {
              const id = Date.now();
              window._solanaPromises = window._solanaPromises || {};
              window._solanaPromises[id] = { resolve, reject };
              
              let serializedTx;
              if (transaction.serialize) {
                serializedTx = transaction.serialize({ requireAllSignatures: false });
              } else {
                serializedTx = transaction;
              }
              const u8 = new Uint8Array(serializedTx);
              let binary = '';
              for (let i = 0; i < u8.length; i++) {
                binary += String.fromCharCode(u8[i]);
              }
              const base64Tx = btoa(binary);
              
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'signTransaction',
                id: id,
                payload: { transactionBase64: base64Tx }
              }));
            });
          },
          
          signAllTransactions: function(transactions) {
            return new Promise((resolve, reject) => {
              const id = Date.now();
              window._solanaPromises = window._solanaPromises || {};
              window._solanaPromises[id] = { resolve, reject };
              
              const txsArray = transactions.map(t => Array.from(t.serialize ? t.serialize({ requireAllSignatures: false }) : t));
              
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'signAllTransactions',
                id: id,
                payload: { transactions: txsArray }
              }));
            });
          },
          
          signMessage: function(message, encoding) {
            return new Promise((resolve, reject) => {
              const id = Date.now();
              window._solanaPromises = window._solanaPromises || {};
              window._solanaPromises[id] = { resolve, reject };
              
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'signMessage',
                id: id,
                payload: { message: Array.from(message), encoding }
              }));
            });
          }
        };

        // Gửi event để báo hiệu Provider đã ready
        window.dispatchEvent(new Event('solana#initialized'));
        
        // Polyfill cho publicKey object (DApps thường gọi publicKey.toBase58())
        if (window.solana.publicKey) {
          const originalKey = window.solana.publicKey;
          window.solana.publicKey = {
            toString: () => originalKey,
            toBase58: () => originalKey,
            toBytes: () => { /* Not fully polyfilled */ return []; }
          };
        }
      })();
      true; // Required by React Native WebView
    `;
  }, [publicKey]);

  // Helper function sinh mã JS để gọi callback về cho DApp
  const generateResolveScript = (id: number, data: any) => {
    const hasPublicKey = data && typeof data === 'object' && data.publicKey ? true : false;
    const hasSignedTx = data && typeof data === 'object' && data.signedTx ? true : false;

    return `
      if (window._solanaPromises && window._solanaPromises[${id}]) {
        if (${hasPublicKey}) {
          // Xử lý connect
          window.solana.publicKey = {
            toString: () => "${data?.publicKey}",
            toBase58: () => "${data?.publicKey}"
          };
          window.solana.isConnected = true;
          window._solanaPromises[${id}].resolve({ publicKey: window.solana.publicKey });
        } else if (${hasSignedTx}) {
          // Xử lý signTransaction (Data là Uint8Array hoặc Array)
          const txData = new Uint8Array([${data?.signedTx}]);
          window._solanaPromises[${id}].resolve({ serialize: () => txData });
        } else {
          window._solanaPromises[${id}].resolve(${JSON.stringify(data)});
        }
        delete window._solanaPromises[${id}];
      }
      true;
    `;
  };

  const generateRejectScript = (id: number, errorMsg: string) => {
    return `
      if (window._solanaPromises && window._solanaPromises[${id}]) {
        window._solanaPromises[${id}].reject(new Error("${errorMsg}"));
        delete window._solanaPromises[${id}];
      }
      true;
    `;
  };

  return {
    injectedJavaScript,
    generateResolveScript,
    generateRejectScript
  };
}
