// HTML nguồn của DApp Test Bridge được nhúng trực tiếp, hoạt động 100% offline/local không cần phụ thuộc server Vercel bên ngoài
export const MOCK_DAPP_HTML = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>DApp Test Bridge - N.E.D Wallet</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #FDF8F5;
      padding: 16px;
      margin: 0;
      color: #111;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .badge {
      display: inline-block;
      background: #00E5FF;
      border: 2px solid #000;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 900;
      box-shadow: 2px 2px 0px #000;
      margin-bottom: 8px;
    }
    h2 {
      margin: 0;
      font-size: 22px;
      font-weight: 900;
    }
    p.subtitle {
      margin: 4px 0 0;
      font-size: 13px;
      color: #666;
    }
    .card {
      background: #FFFFFF;
      border: 3px solid #000;
      border-radius: 12px;
      padding: 18px;
      box-shadow: 4px 4px 0px #000;
      margin-bottom: 20px;
    }
    button {
      width: 100%;
      padding: 14px;
      font-size: 15px;
      font-weight: 900;
      border: 2px solid #000;
      border-radius: 8px;
      background-color: #E6F4FE;
      cursor: pointer;
      margin-bottom: 12px;
      box-shadow: 2px 2px 0px #000;
      transition: transform 0.1s;
    }
    button:active {
      transform: translate(2px, 2px);
      box-shadow: 0px 0px 0px #000;
    }
    button.sign-btn {
      background-color: #35165E;
      color: #FFF;
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background-color: #E5E7EB;
      color: #9CA3AF;
    }
    .console-title {
      font-size: 13px;
      font-weight: 800;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .console {
      background: #18181B;
      color: #4ADE80;
      padding: 14px;
      border-radius: 10px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      height: 260px;
      overflow-y: auto;
      border: 3px solid #000;
      box-shadow: 3px 3px 0px #000;
    }
    .log-line {
      margin-bottom: 6px;
      word-break: break-all;
      line-height: 1.4;
    }
    .error { color: #F87171; }
    .success { color: #38BDF8; font-weight: bold; }
  </style>
</head>
<body>

  <div class="header">
    <div class="badge">TEST ENVIRONMENT</div>
    <h2>DApp Test Bridge</h2>
    <p class="subtitle">Kiểm thử kết nối ví Web3 & ký giao dịch an toàn</p>
  </div>

  <div class="card">
    <button id="connectBtn">🔌 Connect Wallet</button>
    <button id="signBtn" class="sign-btn" disabled>✍️ Sign Dummy Transaction</button>
  </div>

  <div class="console-title">🖥️ Console Logs</div>
  <div class="console" id="consoleOutput">
    <div class="log-line">Khởi tạo môi trường DApp Test...</div>
  </div>

  <script src="https://unpkg.com/@solana/web3.js@1.87.0/lib/index.iife.js"></script>

  <script>
    const connectBtn = document.getElementById('connectBtn');
    const signBtn = document.getElementById('signBtn');
    const consoleOutput = document.getElementById('consoleOutput');

    function log(message, type = '') {
      const div = document.createElement('div');
      div.className = 'log-line ' + type;
      div.textContent = '> ' + message;
      consoleOutput.appendChild(div);
      consoleOutput.scrollTop = consoleOutput.scrollHeight;
      console.log(message);
    }

    // Lắng nghe sự kiện Provider từ useWeb3Bridge
    window.addEventListener('solana#initialized', () => {
      log('N.E.D Provider đã sẵn sàng! (window.solana ready)', 'success');
    });

    if (window.solana) {
      log('window.solana đã được tích hợp sẵn.', 'success');
    }

    connectBtn.addEventListener('click', async () => {
      if (!window.solana) {
        log('Lỗi: Không tìm thấy window.solana bridge.', 'error');
        return;
      }
      
      try {
        log('Đang gọi window.solana.connect()...');
        const resp = await window.solana.connect();
        const pk = resp && resp.publicKey ? resp.publicKey.toString() : (window.solana.publicKey ? window.solana.publicKey.toString() : 'Unknown');
        log('Kết nối thành công! Public Key: ' + pk, 'success');
        signBtn.removeAttribute('disabled');
        connectBtn.textContent = '✅ Connected: ' + pk.slice(0, 4) + '...' + pk.slice(-4);
      } catch (err) {
        log('Kết nối thất bại: ' + (err.message || err), 'error');
      }
    });

    signBtn.addEventListener('click', async () => {
      if (!window.solana || !window.solana.isConnected) {
        log('Lỗi: Vui lòng kết nối ví trước!', 'error');
        return;
      }

      try {
        log('Đang tạo và gửi yêu cầu signTransaction...');
        
        let userPk = window.solana.publicKey;
        if (typeof userPk.toBase58 === 'function') {
          userPk = userPk.toBase58();
        } else {
          userPk = userPk.toString();
        }

        const connection = new solanaWeb3.Connection('https://api.devnet.solana.com', 'confirmed');
        const dummyKeypair = solanaWeb3.Keypair.generate();
        
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        
        const dummyTransaction = new solanaWeb3.Transaction({
          recentBlockhash: blockhash,
          feePayer: new solanaWeb3.PublicKey(userPk)
        }).add(
          solanaWeb3.SystemProgram.transfer({
            fromPubkey: new solanaWeb3.PublicKey(userPk),
            toPubkey: dummyKeypair.publicKey,
            lamports: 100
          })
        );

        const signedTx = await window.solana.signTransaction(dummyTransaction);
        
        log('Ký giao dịch thành công!', 'success');
        const serialized = signedTx.serialize ? signedTx.serialize() : signedTx;
        log('Dữ liệu chữ ký trả về: ' + (serialized.length || 'OK') + ' bytes', 'success');
      } catch (err) {
        log('Từ chối hoặc lỗi ký: ' + (err.message || err), 'error');
      }
    });
  </script>
</body>
</html>`;
