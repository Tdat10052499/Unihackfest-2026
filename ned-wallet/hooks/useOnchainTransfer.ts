import { useState, useCallback } from 'react';
import { InteractionManager } from 'react-native';
import { usePrivy, useEmbeddedSolanaWallet, useEmbeddedWallet } from '@privy-io/expo';
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import bs58 from 'bs58';
import { Buffer } from 'buffer';
import { lookupWalletByPhone, resolveIdentityOnchain, resolveActiveSolanaAddress } from '../services/identity';
import {
  solanaConnection,
  USDC_DEVNET_MINT,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createSplTokenTransferInstruction,
  getUsdcTokenBalance,
  getSolanaBalance,
  TOKEN_PROGRAM_ID,
} from '../services/solana';
import { useUserStore } from '../stores/useUserStore';
import { useExternalWallet } from '../src/providers/WalletProvider';

export interface OnchainTransferParams {
  recipientAddressOrPhone: string;
  amountUsd?: number;
  amountSol?: number;
  fromAddress?: string;
}

export interface OnchainTransferResult {
  success: boolean;
  transactionHash?: string;
  recipientAddress?: string;
  error?: string;
}

export interface UseOnchainTransferReturn {
  isTransferring: boolean;
  error: string | null;
  transactionHash: string | null;
  statusMessage: string;
  isWalletReady: boolean;
  needsRecovery: boolean;
  walletStatus: string;
  senderAddress: string | null;
  transfer: (params: OnchainTransferParams) => Promise<OnchainTransferResult>;
}

/**
 * Custom Hook Giao Dịch Core 100% On-chain:
 * - Tự động phát hiện tài sản (USDC SPL Token hoặc SOL Devnet)
 * - Tự động tra cứu tài khoản nhận từ Username/SĐT qua Anchor Identity PDA trên Solana
 * - Tự động khởi tạo Associated Token Account (ATA) cho người nhận nếu chưa có
 * - Ký xác nhận bảo mật và phát sóng trực tiếp lên Solana Devnet
 * - Bọc InteractionManager bảo vệ Main Thread và WebView trên thiết bị
 */
export function useOnchainTransfer(): UseOnchainTransferReturn {
  const { isReady, user, getAccessToken, logout } = usePrivy();
  const externalWallet = useExternalWallet();
  const solanaWalletState = useEmbeddedSolanaWallet();
  const embeddedWalletState = useEmbeddedWallet();

  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const status = solanaWalletState?.status || 'disconnected';
  const wallets = solanaWalletState?.wallets || [];
  const needsRecovery = Boolean(
    status === 'needs-recovery' ||
    embeddedWalletState?.status === 'needs-recovery' ||
    (solanaWalletState as any)?.needsRecovery === true ||
    (embeddedWalletState as any)?.needsRecovery === true
  );

  const getSenderAddress = useCallback((): string | null => {
    return resolveActiveSolanaAddress(
      user,
      externalWallet,
      solanaWalletState,
      useUserStore.getState().walletAddress
    );
  }, [user, externalWallet, solanaWalletState]);

  const senderAddr = getSenderAddress();

  const isWalletReady = Boolean(
    (externalWallet?.connected && Boolean(externalWallet?.publicKey)) ||
    (isReady &&
      user &&
      !needsRecovery &&
      (status === 'connected' || wallets.length > 0 || Boolean(senderAddr)))
  );

  const transfer = useCallback(
    async (params: OnchainTransferParams): Promise<OnchainTransferResult> => {
      setError(null);
      setTransactionHash(null);

      const from = params.fromAddress || getSenderAddress();

      // 1. Kiểm tra tính sẵn sàng của phiên người dùng
      const isExternalSender = Boolean(
        externalWallet?.connected &&
        externalWallet?.publicKey &&
        (from === externalWallet.publicKey.toBase58() || !user)
      );

      if (!isReady && !externalWallet?.connected) {
        const err = 'Tài khoản chưa sẵn sàng. Vui lòng kết nối ví hoặc đăng nhập.';
        setError(err);
        return { success: false, error: err };
      }

      // 2. Nếu dùng ví Privy Embedded, kiểm tra Access Token hợp lệ trước khi ký
      if (!isExternalSender && user) {
        try {
          const token =
            typeof getAccessToken === 'function' ? await getAccessToken() : null;
          if (!token) {
            console.warn('⚠️ [useOnchainTransfer] Missing access token, calling logout...');
            if (typeof logout === 'function') {
              await logout().catch((e) => console.log('Logout error ignored:', e));
            }
            const err = 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại';
            setError(err);
            return { success: false, error: err };
          }
        } catch (tokenErr: any) {
          console.error('⚠️ [useOnchainTransfer] Token check failed:', tokenErr);
          if (typeof logout === 'function') {
            await logout().catch((e) => console.log('Logout error ignored:', e));
          }
          const err = 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại';
          setError(err);
          return { success: false, error: err };
        }
      }

      if (!from) {
        const err = 'Không tìm thấy địa chỉ tài khoản nguồn.';
        setError(err);
        return { success: false, error: err };
      }

      let createdProvider: any = null;
      // Nếu wallets rỗng, thử gọi create / connect embedded wallet
      if (wallets.length === 0) {
        if (typeof (solanaWalletState as any)?.create === 'function') {
          try {
            console.log('🔄 Đang khởi tạo/kết nối embedded solana wallet...');
            createdProvider = await (solanaWalletState as any).create();
            if (createdProvider) {
              console.log('✅ Khởi tạo provider thành công từ create()');
            }
          } catch (createErr) {
            console.log('create wallet fallback warning:', createErr);
          }
        }
      }

      const inputRecipient = params.recipientAddressOrPhone.trim();
      if (!inputRecipient) {
        const err = 'Vui lòng nhập định danh hoặc tài khoản người nhận.';
        setError(err);
        return { success: false, error: err };
      }

      const rawAmount = params.amountUsd ?? params.amountSol ?? 0;
      if (isNaN(rawAmount) || rawAmount <= 0) {
        const err = 'Số tiền chuyển phải lớn hơn 0.';
        setError(err);
        return { success: false, error: err };
      }

      setIsTransferring(true);
      setStatusMessage('Đang phân giải danh tính người nhận on-chain...');

      try {
        // 3. Phân giải Username/SĐT -> Địa chỉ ví từ Solana PDA on-chain
        let finalToAddress = inputRecipient;
        const isSolanaBase58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(inputRecipient);

        if (!isSolanaBase58) {
          setStatusMessage('Đang tra cứu danh tính on-chain...');
          const resolved = await resolveIdentityOnchain(inputRecipient);
          if (!resolved.success || !resolved.walletAddress) {
            setIsTransferring(false);
            setStatusMessage('');
            const err = resolved.error || `Không tìm thấy người dùng định danh này (${inputRecipient}).`;
            setError(err);
            return { success: false, error: err };
          }
          finalToAddress = resolved.walletAddress;
        }

        // 4. Validate PublicKeys
        let fromPubkey: PublicKey;
        let toPubkey: PublicKey;
        try {
          fromPubkey = new PublicKey(from);
          toPubkey = new PublicKey(finalToAddress);
        } catch (e: any) {
          setIsTransferring(false);
          setStatusMessage('');
          const err = 'Địa chỉ tài khoản nhận không hợp lệ.';
          setError(err);
          return { success: false, error: err };
        }

        // Chặn tự chuyển tiền cho chính mình
        if (from === finalToAddress || fromPubkey.equals(toPubkey)) {
          setIsTransferring(false);
          setStatusMessage('');
          const err = 'Bạn không thể chuyển tiền đến tài khoản của chính mình.';
          setError(err);
          return { success: false, error: err };
        }

        setStatusMessage('Đang chuẩn bị lệnh chuyển On-chain...');

        // 5. Kiểm tra số dư on-chain của người gửi (USDC token vs SOL)
        let [senderUsdcBal, senderSolBal] = await Promise.all([
          getUsdcTokenBalance(from).catch(() => 0),
          getSolanaBalance(from).catch(() => 0),
        ]);

        console.log(`💰 [useOnchainTransfer] Sender: ${from} | USDC Bal: ${senderUsdcBal} | SOL Bal: ${senderSolBal}`);

        const { blockhash } = await solanaConnection.getLatestBlockhash('confirmed');
        const transaction = new Transaction();

        if (senderUsdcBal < rawAmount) {
          setIsTransferring(false);
          setStatusMessage('');
          const err = `Số dư khả dụng không đủ (Hiện có: $${senderUsdcBal.toFixed(2)}, Cần: $${rawAmount.toFixed(2)}).`;
          setError(err);
          return { success: false, error: err };
        }

        // Thực hiện chuyển SPL Token (USDC / USDT)
        let mintPubkey = USDC_DEVNET_MINT;
        let fromATA = getAssociatedTokenAddress(USDC_DEVNET_MINT, fromPubkey);
        let tokenProgramId = TOKEN_PROGRAM_ID;
        let decimals = 6;

        try {
          const [splAccounts, spl2022Accounts] = await Promise.all([
            solanaConnection.getParsedTokenAccountsByOwner(
              fromPubkey,
              { programId: TOKEN_PROGRAM_ID },
              'confirmed'
            ).catch(() => ({ value: [] })),
            solanaConnection.getParsedTokenAccountsByOwner(
              fromPubkey,
              { programId: new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb') },
              'confirmed'
            ).catch(() => ({ value: [] })),
          ]);

          const allParsed = [
            ...(splAccounts.value || []).map((v) => ({ ...v, programId: TOKEN_PROGRAM_ID })),
            ...(spl2022Accounts.value || []).map((v) => ({ ...v, programId: new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb') })),
          ];

          const matched = allParsed.find((acc) => {
            const uiAmt = acc.account?.data?.parsed?.info?.tokenAmount?.uiAmount;
            return typeof uiAmt === 'number' && uiAmt >= rawAmount;
          }) || allParsed.find((acc) => {
            const uiAmt = acc.account?.data?.parsed?.info?.tokenAmount?.uiAmount;
            return typeof uiAmt === 'number' && uiAmt > 0;
          });

          if (matched) {
            const info = matched.account?.data?.parsed?.info;
            if (info?.mint) {
              mintPubkey = new PublicKey(info.mint);
            }
            if (matched.pubkey) {
              fromATA = matched.pubkey;
            }
            if (typeof info?.tokenAmount?.decimals === 'number') {
              decimals = info.tokenAmount.decimals;
            }
            if (matched.programId) {
              tokenProgramId = matched.programId;
            }
          }
        } catch (scanErr) {
          console.warn('⚠️ Lỗi scan token accounts, dùng USDC Devnet mặc định:', scanErr);
        }

        const sendUnits = Math.round(rawAmount * Math.pow(10, decimals));
        const toATA = getAssociatedTokenAddress(mintPubkey, toPubkey, false, tokenProgramId);

        // 2. Cấu hình Relayer cục bộ (Client-side Relayer): Đọc khóa bí mật từ EXPO_PUBLIC_ADMIN_SECRET_KEY
        const adminSecretKeyStr = process.env.EXPO_PUBLIC_ADMIN_SECRET_KEY || '';
        let relayerKeypair: Keypair | null = null;
        if (adminSecretKeyStr) {
          try {
            relayerKeypair = Keypair.fromSecretKey(bs58.decode(adminSecretKeyStr));
          } catch (keyErr) {
            console.warn('⚠️ Lỗi decode EXPO_PUBLIC_ADMIN_SECRET_KEY:', keyErr);
          }
        }

        const relayerPubkey = relayerKeypair
          ? relayerKeypair.publicKey
          : (process.env.EXPO_PUBLIC_RELAYER_FEE_PAYER ? new PublicKey(process.env.EXPO_PUBLIC_RELAYER_FEE_PAYER) : fromPubkey);

        // Chịu phí mở ví (Rent Exemption): Relayer chịu 100% phí tạo ATA người nhận
        const toAtaInfo = await solanaConnection.getAccountInfo(toATA, 'confirmed');
        if (!toAtaInfo) {
          console.log('ℹ️ [ATA] Khởi tạo Associated Token Account cho người nhận (Phí do Relayer chịu):', toATA.toBase58());
          transaction.add(
            createAssociatedTokenAccountInstruction(
              relayerPubkey, // payer
              toATA,
              toPubkey,
              mintPubkey,
              tokenProgramId
            )
          );
        }

        // Bảo toàn số dư: sendUnits chính xác theo rawAmount người dùng nhập, không cộng phí gas
        transaction.add(
          createSplTokenTransferInstruction(
            fromATA,
            toATA,
            fromPubkey,
            sendUnits,
            tokenProgramId
          )
        );

        // Chịu phí mạng (Base Fee): relayer chịu 100%
        transaction.feePayer = relayerPubkey;
        transaction.recentBlockhash = blockhash;

        setStatusMessage('Đang chuẩn bị xác nhận...');

        // 6. QUY TẮC SINH TỬ CHO ANDROID: Bọc trong InteractionManager + 1000ms delay giải phóng Main Thread
        await new Promise<void>((resolve) => {
          InteractionManager.runAfterInteractions(() => {
            setTimeout(resolve, 1000);
          });
        });

        setStatusMessage('Đang xác nhận trên thiết bị...');
        let activeProvider: any = createdProvider || null;

        // Ưu tiên 1: Lấy provider từ ví embedded kết nối hiện tại
        if (!activeProvider) {
          const currentWallets = solanaWalletState?.wallets || [];
          if (currentWallets.length > 0 && typeof currentWallets[0]?.getProvider === 'function') {
            try {
              activeProvider = await currentWallets[0].getProvider();
            } catch (e) {
              console.log('currentWallets[0].getProvider error:', e);
            }
          }
        }

        // Ưu tiên 2: Gọi getProvider() trực tiếp từ hook solanaWalletState
        if (!activeProvider && typeof (solanaWalletState as any)?.getProvider === 'function') {
          try {
            activeProvider = await (solanaWalletState as any).getProvider();
          } catch (e) {
            console.log('solanaWalletState.getProvider error:', e);
          }
        }

        // Ưu tiên 3: Tự động khởi tạo embedded wallet nếu chưa có
        if (!activeProvider && typeof (solanaWalletState as any)?.create === 'function') {
          try {
            console.log('🔄 Đang tạo embedded wallet on-the-fly...');
            activeProvider = await (solanaWalletState as any).create();
          } catch (e) {
            console.log('solanaWalletState.create fallback error:', e);
          }
        }

        // Fallback: Nếu không có Privy session và người dùng dùng ví ngoài (Phantom)
        if (
          !activeProvider &&
          externalWallet?.connected &&
          externalWallet?.publicKey &&
          from === externalWallet.publicKey.toBase58()
        ) {
          activeProvider = externalWallet;
        }

        if (!activeProvider || (typeof activeProvider.request !== 'function' && typeof activeProvider.signTransaction !== 'function')) {
          throw new Error('Không thể khởi tạo provider để xác nhận giao dịch.');
        }

        // 3. Triển khai luồng ký kép (Dual-Signature) trực tiếp:
        // Bước 1: userWallet.signTransaction(transaction) - Gọi ví người dùng ký xác nhận chuyển tài sản
        let signResult: any = null;
        try {
          if (typeof activeProvider.request === 'function') {
            signResult = await activeProvider.request({
              method: 'signTransaction',
              params: { transaction },
            });
          } else if (typeof activeProvider.signTransaction === 'function') {
            signResult = await activeProvider.signTransaction(transaction);
          }
        } catch (signErr: any) {
          console.warn('⚠️ Lần xác nhận thứ nhất gặp sự cố, thử lại:', signErr?.message);
          if (
            signErr?.message?.includes('timeout') ||
            signErr?.message?.includes('user-signer') ||
            signErr?.message?.includes('WebView') ||
            signErr?.message?.includes('ready')
          ) {
            await new Promise((r) => setTimeout(r, 1200));
            if (typeof (solanaWalletState as any)?.getProvider === 'function') {
              try {
                activeProvider = await (solanaWalletState as any).getProvider();
              } catch (_) {}
            }
            const freshBlock = await solanaConnection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = freshBlock.blockhash;
            if (typeof activeProvider.request === 'function') {
              signResult = await activeProvider.request({
                method: 'signTransaction',
                params: { transaction },
              });
            } else if (typeof activeProvider.signTransaction === 'function') {
              signResult = await activeProvider.signTransaction(transaction);
            }
          } else {
            throw signErr;
          }
        }

        const signedTransaction = signResult?.signedTransaction || signResult;
        if (!signedTransaction || typeof signedTransaction.serialize !== 'function') {
          throw new Error('Không nhận được chữ ký xác nhận từ tài khoản.');
        }

        setStatusMessage('Đang phát sóng lên mạng lưới...');

        // Bước 2: transaction.partialSign(relayerKeypair) - Sử dụng ví Relayer ký xác nhận trả mọi chi phí
        let fullySignedTx = signedTransaction;
        if (relayerKeypair) {
          try {
            // Nếu signedTransaction trả về từ provider là Transaction instance
            if (typeof (signedTransaction as any).partialSign === 'function') {
              (signedTransaction as any).partialSign(relayerKeypair);
              fullySignedTx = signedTransaction;
            } else {
              // Hoặc khôi phục lại Transaction từ bytes để partialSign
              const txBytes = signedTransaction.serialize({ requireAllSignatures: false, verifySignatures: false });
              const reconstructedTx = Transaction.from(txBytes);
              reconstructedTx.partialSign(relayerKeypair);
              fullySignedTx = reconstructedTx;
            }
          } catch (relayerSignErr: any) {
            console.error('⚠️ Lỗi relayer partialSign:', relayerSignErr);
            throw new Error(`Lỗi ký bảo lãnh Relayer: ${relayerSignErr?.message || relayerSignErr}`);
          }
        } else {
          console.warn('⚠️ Không tìm thấy relayerKeypair để ký bảo trợ gasless');
        }

        // Bước 3: Gửi giao dịch lên mạng qua connection.sendRawTransaction(transaction.serialize())
        const rawBroadcastBytes = fullySignedTx.serialize();
        const txSignature = await solanaConnection.sendRawTransaction(rawBroadcastBytes, {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 3,
        });

        console.log('⚡ [On-chain Broadcasted Direct via Client Relayer] TxSignature:', txSignature);

        setStatusMessage('Đang chờ xác nhận giao dịch...');
        await solanaConnection.confirmTransaction(txSignature, 'confirmed');
        console.log('✅ [On-chain Confirmed] TxSignature:', txSignature);

        setTransactionHash(txSignature);
        setIsTransferring(false);
        setStatusMessage('');

        return {
          success: true,
          transactionHash: txSignature,
          recipientAddress: finalToAddress,
        };
      } catch (err: any) {
        console.error('❌ [useOnchainTransfer Error]:', err);
        setIsTransferring(false);
        setStatusMessage('');
        const errStr = err?.message || 'Chuyển tiền không thành công.';
        setError(errStr);
        return {
          success: false,
          error: errStr,
        };
      }
    },
    [isReady, user, wallets, status, getSenderAddress, getAccessToken, logout, externalWallet, solanaWalletState]
  );

  return {
    isTransferring,
    error,
    transactionHash,
    statusMessage,
    isWalletReady,
    needsRecovery,
    walletStatus: status,
    senderAddress: getSenderAddress(),
    transfer,
  };
}
