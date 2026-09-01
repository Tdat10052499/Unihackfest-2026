import i18n from 'i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';

export const LANGUAGE_STORAGE_KEY = '@app_language';

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  available: boolean;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', available: true },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', available: true },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', available: false },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', available: false },
  { code: 'zh', name: 'Chinese', nativeName: '简体中文', flag: '🇨🇳', available: false },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', available: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', available: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', available: false },
];

export const resources = {
  vi: {
    translation: {
      tabs: {
        home: 'Trang chủ',
        card: 'Thẻ',
        transfer: 'Chuyển tiền',
        miniapps: 'Tiện ích',
        cardInDev: 'Đang phát triển',
        cardInDevMsg: 'Tính năng quản lý Thẻ N.E.D sẽ ra mắt trong bản cập nhật tới. Cùng đón chờ nhé!',
      },
      home: {
        scan: 'Quét mã',
        receive: 'Nhận',
        send: 'Chuyển',
        buy: 'Mua',
        activities: 'Hoạt động gần đây',
        seeAll: 'Xem tất cả',
        noActivities: 'Chưa có giao dịch nào',
        totalBalance: 'Tổng số dư ví',
        solanaDevnet: 'Solana Devnet',
        newDeviceTitle: 'Thiết bị mới phát hiện ⚠️',
        newDeviceDesc: 'Cần khôi phục ví bảo mật để tiếp tục giao dịch.',
        recover: 'Khôi phục',
        nextSteps: 'Các bước tiếp theo',
        stepCount: '{{current}} trên {{total}}',
        connectAccount: 'Kết nối tài khoản',
        linkedPhoneTapToManage: 'Đã liên kết: {{phone}} (Chạm để quản lý)',
        signedInTapToAddPhone: 'Đã đăng nhập an toàn (Chạm để thêm SĐT)',
        makeDeposit: 'Nạp tiền vào ví',
        readyHint: 'Sau đó bạn đã sẵn sàng',
      },
      activities: {
        title: 'Lịch sử giao dịch',
        all: 'Tất cả',
        received: 'Nhận tiền',
        sent: 'Chuyển tiền',
        reward: 'Thưởng Lì Xì',
        contract: 'Tương tác hợp đồng',
        searchPlaceholder: 'Tìm theo số tiền, chữ ký tx...',
        empty: 'Không có giao dịch nào',
        emptyDesc: 'Chưa có biến động giao dịch on-chain nào trong danh mục này.',
        emptySearchDesc: 'Không tìm thấy giao dịch khớp với từ khóa tìm kiếm.',
        loading: 'Đang tải lịch sử giao dịch...',
        confirmed: 'Đã xác nhận',
        copied: 'Đã sao chép Transaction Signature!',
        justNow: 'Vừa xong',
        minutesAgo: '{{count}} phút trước',
        hoursAgo: '{{count}} giờ trước',
        daysAgo: '{{count}} ngày trước',
        monthsAgo: '{{count}} tháng trước',
      },
      transferHub: {
        title: 'Trung Tâm Chuyển Tiền',
        subtitle: 'Chọn phương thức thanh toán tức thì trên Solana',
        shakeSplitTitle: 'Lắc Điện Thoại Chia Tiền (Shake & Split)',
        shakeSplitSubtitle: 'Lắc máy cùng bạn bè xung quanh để tự động nhận diện và chia đều hóa đơn on-chain.',
        phoneTransferTitle: 'Chuyển Tiền Bằng Số Điện Thoại',
        phoneTransferSubtitle: 'Chuyển SOL trực tiếp tới người nhận qua số điện thoại đã liên kết.',
        coinTossTitle: 'Phòng Lì Xì Tung Đồng Xu',
        coinTossSubtitle: 'Khởi tạo phòng chơi, mời bạn bè xung quanh và vuốt tung đồng xu may mắn để chọn người nhận SOL trực tiếp on-chain.',
        ready: 'Sẵn sàng',
        readyToUse: 'Sẵn sàng sử dụng',
        interactNow: 'Bắt đầu tương tác ngay',
        learnMore: 'Tìm hiểu thêm tính năng',
      },
      miniapps: {
        title: 'N.E.D MiniApps Hub',
        subtitle: 'Hệ sinh thái ứng dụng phi tập trung Web3 trên Solana',
        bannerTitle: 'Web3 DApps Không Giới Hạn',
        bannerSubtitle: 'Trải nghiệm DeFi, Gaming, Thanh toán thương mại điện tử với tốc độ tức thì của mạng Solana.',
        featuredSection: 'ỨNG DỤNG NỔI BẬT',
        comingSoon: 'Sắp ra mắt',
        inDevNotice: 'Ứng dụng này đang trong quá trình phát triển trên hệ sinh thái N.E.D MiniApps!',
        solanaPayTitle: 'Solana Pay Merchant',
        solanaPayCategory: 'Thanh Toán & Cửa Hàng',
        solanaPayDesc: 'Tạo hóa đơn QR Code cho quán cafe, cửa hàng bán lẻ và nhận thanh toán USDC/VND tức thì.',
        jupiterSwapTitle: 'Jupiter Swap Lite',
        jupiterSwapCategory: 'DeFi & Hoán Đổi Token',
        jupiterSwapDesc: 'Hoán đổi token nhanh chóng với tỷ giá tốt nhất từ giao thức Jupiter Aggregator.',
        microSavingsTitle: 'Micro Savings (Tích Lũy Nhỏ)',
        microSavingsCategory: 'Tài Chính Cá Nhân',
        microSavingsDesc: 'Tự động làm tròn số tiền chi tiêu lẻ để tích lũy SOL sinh lời mỗi ngày.',
        giftCardsTitle: 'Web3 Gift Cards',
        giftCardsCategory: 'Thẻ Quà Tặng & Voucher',
        giftCardsDesc: 'Mua và tặng thẻ quà điện tử (Grab, Shopee, Starbucks) thanh toán bằng số dư N.E.D.',
      },
      deposit: {
        title: 'Nạp Tiền Vào Tài Khoản',
        vnpayTitle: 'Cổng Nạp VNPAY',
        solanaTitle: 'Nhận Tiền Qua Tài Khoản N.E.D',
        selectMethod: 'Chọn phương thức nạp tiền phù hợp',
        vnpaySubtitle: 'Nạp tức thì từ tài khoản ngân hàng nội địa',
        solanaSubtitle: 'Nhận tiền tức thì qua số điện thoại hoặc mã định danh',
        vnpayCardTitle: 'VNPAY (VND to USDC)',
        instantTag: 'Tức thì',
        vnpayCardDesc: 'Nạp tiền tức thì qua cổng ngân hàng nội địa',
        solanaCardTitle: 'Tài Khoản N.E.D',
        solanaCardDesc: 'Nhận tiền từ các tài khoản N.E.D khác tức thì',
        amountLabel: 'Số tiền nạp (VND):',
        continueVnpay: 'Tiếp tục qua VNPAY',
        copyAddress: 'Sao chép Mã Tài Khoản',
        noAddress: 'Chưa phát hiện tài khoản N.E.D.',
        copiedAlert: 'Đã sao chép vào bộ nhớ tạm!',
        vnpayDialogTitle: 'Cổng Thanh Toán VNPAY',
        vnpayDialogDesc: 'Mô phỏng khởi tạo giao dịch nạp {{amount}} VND qua VNPAY-QR.\nQuy đổi ước tính: ~{{usdc}} USDC',
        vnpayConfirmBtn: 'Xác Nhận Giả Lập Nạp',
        vnpaySuccessTitle: 'Thành Công! 🎉',
        vnpaySuccessMsg: 'Đã ghi nhận giao dịch nạp tiền qua VNPAY.',
        close: 'Đóng',
      },
      send: {
        title: 'Chuyển Tiền',
        subtitle: 'Chuyển tiền nhanh chóng & Miễn phí giao dịch',
        recipientLabel: 'Người nhận (SĐT hoặc Tài khoản):',
        recipientPlaceholder: 'Nhập số điện thoại người nhận...',
        phoneMatched: 'Đã tìm thấy tài khoản: {{address}}',
        solanaMatched: 'Đã xác thực tài khoản N.E.D',
        cannotSendToSelf: 'Bạn không thể chuyển tiền đến tài khoản của chính mình',
        phoneNotLinked: 'Số điện thoại này chưa liên kết tài khoản N.E.D',
        lookupError: 'Lỗi tra cứu thông tin tài khoản.',
        amountLabel: 'Số tiền chuyển:',
        availableBalance: 'Số dư khả dụng: {{balance}}',
        max: 'Tối đa',
        networkFeeLabel: 'Phí chuyển tiền:',
        speedLabel: 'Tốc độ xử lý:',
        speedValue: 'Tức thì (Miễn phí)',
        sendButton: 'Xác Nhận Chuyển Tiền',
        sendingButton: 'Đang thực hiện chuyển tiền...',
        lookupButton: 'Đang tra cứu tài khoản...',
        noRecipientButton: 'Chưa tìm thấy người nhận',
        invalidAmount: 'Vui lòng nhập số tiền hợp lệ (> 0)',
        insufficientBalance: 'Số dư tài khoản không đủ để thực hiện chuyển tiền',
        invalidRecipient: 'Vui lòng nhập số điện thoại hoặc tài khoản hợp lệ',
        successTitle: 'Chuyển tiền thành công! 🎉',
        successMsg: 'Đã chuyển thành công ${{amount}} đến {{recipient}}.',
        failedTitle: 'Chuyển tiền thất bại',
        failedMsg: 'Không thể thực hiện chuyển tiền. Lỗi: {{error}}',
        viewExplorer: 'Chi tiết giao dịch',
        newTransfer: 'Chuyển tiếp',
        enterAmount: 'Nhập số tiền chuyển',
      },
      recovery: {
        title: 'Thiết bị mới phát hiện',
        desc: 'Thiết bị của bạn vừa được cài đặt lại hoặc đăng nhập trên môi trường mới. Vui lòng khôi phục khóa bảo mật ví để tiếp tục ký các giao dịch on-chain.',
        autoCloud: 'Khôi phục tự động (Cloud)',
        googleDrive: 'Khôi phục từ Google Drive',
        usePasscode: 'Sử dụng Mật khẩu / Passcode ví',
        passcodeLabel: 'Nhập Mật Mã Khôi Phục (Passcode):',
        passcodePlaceholder: 'Nhập mật mã ví của bạn...',
        confirmPasscode: 'Xác Nhận Khôi Phục',
        back: 'Quay lại',
        close: 'Đóng',
        successTitle: 'Khôi phục thành công! 🎉',
        successDesc: 'Khóa bảo mật ví đã được đồng bộ lại. Bạn có thể tiếp tục thực hiện các giao dịch on-chain.',
        continue: 'Tiếp tục',
        passcodeEmpty: 'Vui lòng nhập mật mã khôi phục của bạn',
      },
      coinToss: {
        members: 'Người Trong Phòng',
        inviteFriends: 'Mời bạn bè',
        amountLabel: 'Số lượng SOL Lì Xì:',
        waitingHost: '🎁 Chờ Host Tung Đồng Xu',
        waitingHostDesc: 'Khi Host vuốt tung đồng xu, hệ thống sẽ chọn ngẫu nhiên 1 người trong phòng để nhận lì xì SOL trực tiếp on-chain!',
        swipeHint: 'Vuốt lên để tung đồng xu',
        tossNow: 'Tung Ngay',
        you: 'Bạn',
        host: 'Host',
        guest: 'Guest',
        inviteTitle: 'Mời Bạn Bè Vào Phòng',
        inviteSubtitle: 'Phát hiện qua Supabase Realtime Presence',
        alreadyIn: 'Đã vào phòng',
        invite: 'Mời vào',
        invited: 'Đã gửi',
        noNearby: 'Chưa phát hiện thiết bị nào khác đang mở app quanh đây.',
      },
      settings: {
        title: 'Cài đặt',
        language: 'Ngôn ngữ',
        languageSubtitle: 'Chọn ngôn ngữ hiển thị',
        selectLanguage: 'Chọn Ngôn Ngữ',
        selectLanguageDesc: 'Chọn ngôn ngữ hiển thị giao diện cho ứng dụng N.E.D',
        comingSoonLang: 'Ngôn ngữ này sẽ sớm được hỗ trợ trong bản cập nhật tới.',
        vietnamese: 'Tiếng Việt',
        english: 'English',
        networkEnv: 'Môi trường mạng',
        networkSubtitle: 'Chọn cụm mạng kết nối Helius RPC',
        devnet: 'Devnet (Thử nghiệm)',
        mainnet: 'Mainnet-Beta (Chính thức)',
        devnetBadge: 'Thử nghiệm',
        mainnetBadge: 'Chính thức',
        networkSwitchConfirm: 'Chuyển đổi mạng lưới',
        networkSwitchDesc: 'Ứng dụng sẽ kết nối Helius RPC tới cụm mạng {{network}}.',
        localCurrency: 'Tiền tệ hiển thị',
        transactionHistory: 'Lịch sử giao dịch',
        viewTxDetails: 'Xem chi tiết các giao dịch',
        stealthMode: 'Chế độ ẩn danh',
        showEmptyPockets: 'Hiện ví trống',
        inviteFriends: 'Mời bạn bè',
        faq: 'Câu hỏi thường gặp',
        contactSupport: 'Liên hệ hỗ trợ',
        about: 'Về N.E.D',
        resetSession: 'Reset phiên ví & Dọn dẹp',
        resetDesc: 'Giải phóng WebView và xóa session bị treo',
        signOut: 'Đăng xuất',
        unlinked: 'Chưa liên kết',
        copied: 'Đã sao chép địa chỉ ví Solana!',
        signOutConfirmTitle: 'Đăng xuất',
        signOutConfirmMsg: 'Bạn có chắc chắn muốn đăng xuất khỏi ví N.E.D?',
        cancel: 'Hủy',
        confirmReset: 'Xác nhận Reset',
        resetTitle: 'Khôi Phục & Dọn Dẹp Phiên ⚠️',
        resetMsg:
          'Thao tác này sẽ dọn dẹp sạch sẽ toàn bộ phiên làm việc của ví, giải phóng tiến trình WebView bị treo và ép Privy cấp lại phiên kết nối mới.',
        resetSuccess: 'Đã Dọn Dẹp 🎉',
        resetSuccessMsg: 'Dữ liệu phiên đã được làm mới. Vui lòng đăng nhập lại.',
        currencyInfo: 'N.E.D hiện hỗ trợ Việt Nam Đồng (VND) và Đô la Mỹ (USD).',
        shareInfo: 'Chia sẻ N.E.D với bạn bè để cùng trải nghiệm thanh toán Web3 tức thì!',
        faqInfo: 'Trung tâm trợ giúp N.E.D sẽ sớm được cập nhật.',
        supportInfo: 'Vui lòng liên hệ support@ned.finance để được trợ giúp 24/7.',
        aboutInfo:
          'N.E.D (NorthAxis Electronic Dollars)\nPhiên bản: 1.0.0 (Solana Pay & MiniPay Native)',
        googleBackedUp: 'Đã sao lưu Google',
      },
    },
  },
  en: {
    translation: {
      tabs: {
        home: 'Home',
        card: 'Card',
        transfer: 'Transfer',
        miniapps: 'MiniApps',
        cardInDev: 'In Development',
        cardInDevMsg: 'N.E.D Card feature will be available in the upcoming update. Stay tuned!',
      },
      home: {
        scan: 'Scan',
        receive: 'Receive',
        send: 'Send',
        buy: 'Buy',
        activities: 'Recent Activities',
        seeAll: 'See all',
        noActivities: 'No activities yet',
        totalBalance: 'Total Wallet Balance',
        solanaDevnet: 'Solana Devnet',
        newDeviceTitle: 'New device detected ⚠️',
        newDeviceDesc: 'Recover secure wallet to continue transactions.',
        recover: 'Recover',
        nextSteps: 'Next steps',
        stepCount: '{{current}} of {{total}}',
        connectAccount: 'Connect Account',
        linkedPhoneTapToManage: 'Linked: {{phone}} (Tap to manage)',
        signedInTapToAddPhone: 'Signed in securely (Tap to add phone)',
        makeDeposit: 'Make a deposit',
        readyHint: "Then you're ready",
      },
      activities: {
        title: 'Transaction History',
        all: 'All',
        received: 'Received',
        sent: 'Sent',
        reward: 'Lucky Reward',
        contract: 'Smart Contract',
        searchPlaceholder: 'Search by amount, tx signature...',
        empty: 'No transactions found',
        emptyDesc: 'No on-chain transaction activity in this category yet.',
        emptySearchDesc: 'No transactions found matching the search query.',
        loading: 'Loading transaction history...',
        confirmed: 'Confirmed',
        copied: 'Transaction Signature copied!',
        justNow: 'Just now',
        minutesAgo: '{{count}}m ago',
        hoursAgo: '{{count}}h ago',
        daysAgo: '{{count}}d ago',
        monthsAgo: '{{count}}mo ago',
      },
      transferHub: {
        title: 'Transfer Hub',
        subtitle: 'Select instant payment method on Solana',
        shakeSplitTitle: 'Shake & Split Bill',
        shakeSplitSubtitle: 'Shake phones with nearby friends to auto-discover and split bills on-chain.',
        phoneTransferTitle: 'Transfer by Phone Number',
        phoneTransferSubtitle: 'Send SOL directly to recipient via linked phone number.',
        coinTossTitle: 'Coin Toss Lì Xì Room',
        coinTossSubtitle: 'Create a room, invite nearby friends, and swipe to toss the lucky coin to pick a winner for on-chain SOL.',
        ready: 'Ready',
        readyToUse: 'Ready to use',
        interactNow: 'Interact now',
        learnMore: 'Learn more features',
      },
      miniapps: {
        title: 'N.E.D MiniApps Hub',
        subtitle: 'Web3 decentralized application ecosystem on Solana',
        bannerTitle: 'Limitless Web3 DApps',
        bannerSubtitle: 'Experience DeFi, Gaming, E-commerce payments with Solana instant speed.',
        featuredSection: 'FEATURED APPS',
        comingSoon: 'Coming Soon',
        inDevNotice: 'This application is currently in development on the N.E.D MiniApps ecosystem!',
        solanaPayTitle: 'Solana Pay Merchant',
        solanaPayCategory: 'Payments & Merchants',
        solanaPayDesc: 'Generate QR Code invoices for cafes, retail shops and receive instant USDC/VND payments.',
        jupiterSwapTitle: 'Jupiter Swap Lite',
        jupiterSwapCategory: 'DeFi & Token Swap',
        jupiterSwapDesc: 'Swap tokens swiftly with optimal rates routed by Jupiter Aggregator.',
        microSavingsTitle: 'Micro Savings',
        microSavingsCategory: 'Personal Finance',
        microSavingsDesc: 'Auto-round up spare change to accumulate SOL and earn daily yield.',
        giftCardsTitle: 'Web3 Gift Cards',
        giftCardsCategory: 'Gift Cards & Vouchers',
        giftCardsDesc: 'Purchase and gift digital cards (Grab, Shopee, Starbucks) using N.E.D balance.',
      },
      deposit: {
        title: 'Deposit to Account',
        vnpayTitle: 'VNPAY Gateway',
        solanaTitle: 'Receive via N.E.D Account',
        selectMethod: 'Choose a suitable deposit method',
        vnpaySubtitle: 'Instant deposit from local bank account',
        solanaSubtitle: 'Instant receive via phone number or identifier',
        vnpayCardTitle: 'VNPAY (VND to USDC)',
        instantTag: 'Instant',
        vnpayCardDesc: 'Instant deposit via domestic bank gateway',
        solanaCardTitle: 'N.E.D Account',
        solanaCardDesc: 'Instant transfers from other N.E.D accounts',
        amountLabel: 'Deposit amount (VND):',
        continueVnpay: 'Continue with VNPAY',
        copyAddress: 'Copy Account Code',
        noAddress: 'No N.E.D account detected.',
        copiedAlert: 'Copied to clipboard!',
        vnpayDialogTitle: 'VNPAY Payment Gateway',
        vnpayDialogDesc: 'Simulating deposit of {{amount}} VND via VNPAY-QR.\nEstimated conversion: ~{{usdc}} USDC',
        vnpayConfirmBtn: 'Confirm Simulated Deposit',
        vnpaySuccessTitle: 'Success! 🎉',
        vnpaySuccessMsg: 'Recorded deposit transaction via VNPAY.',
        close: 'Close',
      },
      send: {
        title: 'Transfer Money',
        subtitle: 'Instant & Free transfers',
        recipientLabel: 'Recipient (Phone or Account):',
        recipientPlaceholder: 'Enter recipient phone number...',
        phoneMatched: 'Found account: {{address}}',
        solanaMatched: 'Verified N.E.D account',
        cannotSendToSelf: 'You cannot send money to your own account',
        phoneNotLinked: 'This phone number is not linked to N.E.D',
        lookupError: 'Error looking up account info.',
        amountLabel: 'Transfer amount:',
        availableBalance: 'Available balance: {{balance}}',
        max: 'Max',
        networkFeeLabel: 'Transfer fee:',
        speedLabel: 'Processing speed:',
        speedValue: 'Instant (Free)',
        sendButton: 'Confirm Transfer',
        sendingButton: 'Processing transfer...',
        lookupButton: 'Looking up account...',
        noRecipientButton: 'Recipient not found',
        invalidAmount: 'Please enter a valid amount (> 0)',
        insufficientBalance: 'Insufficient balance for this transfer',
        invalidRecipient: 'Please enter a valid phone number or account',
        successTitle: 'Transfer Successful! 🎉',
        successMsg: 'Successfully transferred ${{amount}} to {{recipient}}.',
        failedTitle: 'Transfer Failed',
        failedMsg: 'Unable to execute transfer. Error: {{error}}',
        viewExplorer: 'Transaction Details',
        newTransfer: 'New Transfer',
        enterAmount: 'Enter transfer amount',
      },
      recovery: {
        title: 'New Device Detected',
        desc: 'Your device was recently reinstalled or logged in on a new environment. Please recover your secure wallet key to continue signing on-chain transactions.',
        autoCloud: 'Automatic Cloud Recovery',
        googleDrive: 'Recover from Google Drive',
        usePasscode: 'Use Wallet Passcode',
        passcodeLabel: 'Enter Recovery Passcode:',
        passcodePlaceholder: 'Enter your wallet passcode...',
        confirmPasscode: 'Confirm Recovery',
        back: 'Back',
        close: 'Close',
        successTitle: 'Recovery Successful! 🎉',
        successDesc: 'Wallet security keys have been synchronized. You can continue making on-chain transactions.',
        continue: 'Continue',
        passcodeEmpty: 'Please enter your recovery passcode',
      },
      coinToss: {
        members: 'In Room',
        inviteFriends: 'Invite friends',
        amountLabel: 'Lì Xì SOL Amount:',
        waitingHost: '🎁 Waiting for Host to Toss Coin',
        waitingHostDesc: 'When Host tosses the coin, the system will randomly pick 1 member in the room to receive SOL directly on-chain!',
        swipeHint: 'Swipe up to toss coin',
        tossNow: 'Toss Now',
        you: 'You',
        host: 'Host',
        guest: 'Guest',
        inviteTitle: 'Invite Friends to Room',
        inviteSubtitle: 'Discovered via Supabase Realtime Presence',
        alreadyIn: 'Already in room',
        invite: 'Invite',
        invited: 'Sent',
        noNearby: 'No other devices discovered nearby yet.',
      },
      settings: {
        title: 'Settings',
        language: 'Language',
        languageSubtitle: 'Select display language',
        selectLanguage: 'Select Language',
        selectLanguageDesc: 'Choose display language for N.E.D wallet interface',
        comingSoonLang: 'This language will be supported in upcoming updates.',
        vietnamese: 'Tiếng Việt',
        english: 'English',
        networkEnv: 'Network Environment',
        networkSubtitle: 'Select Helius RPC network cluster',
        devnet: 'Devnet (Testnet)',
        mainnet: 'Mainnet-Beta (Production)',
        devnetBadge: 'Testnet',
        mainnetBadge: 'Mainnet',
        networkSwitchConfirm: 'Switch Network',
        networkSwitchDesc: 'The app will connect Helius RPC to {{network}} cluster.',
        localCurrency: 'Local currency',
        transactionHistory: 'Transaction history',
        viewTxDetails: 'View transaction details',
        stealthMode: 'Stealth mode',
        showEmptyPockets: 'Show empty pockets',
        inviteFriends: 'Invite friends',
        faq: 'Frequently asked questions',
        contactSupport: 'Contact support',
        about: 'About N.E.D',
        resetSession: 'Reset wallet session & Clean up',
        resetDesc: 'Free WebView and clear frozen sessions',
        signOut: 'Sign out',
        unlinked: 'Unlinked',
        copied: 'Solana wallet address copied!',
        signOutConfirmTitle: 'Sign out',
        signOutConfirmMsg: 'Are you sure you want to sign out of N.E.D wallet?',
        cancel: 'Cancel',
        confirmReset: 'Confirm Reset',
        resetTitle: 'Restore & Clean Session ⚠️',
        resetMsg:
          'This action will clean up the entire wallet session, free frozen WebViews and force Privy to issue a new connection session.',
        resetSuccess: 'Cleaned Up 🎉',
        resetSuccessMsg: 'Session data has been refreshed. Please log in again.',
        currencyInfo: 'N.E.D currently supports Vietnamese Dong (VND) and US Dollar (USD).',
        shareInfo: 'Share N.E.D with friends to experience instant Web3 payments!',
        faqInfo: 'N.E.D Help Center will be updated soon.',
        supportInfo: 'Please contact support@ned.finance for 24/7 assistance.',
        aboutInfo:
          'N.E.D (NorthAxis Electronic Dollars)\nVersion: 1.0.0 (Solana Pay & MiniPay Native)',
        googleBackedUp: 'Google Backed up',
      },
    },
  },
};

// Khởi tạo cấu hình i18next trực tiếp với tài nguyên
i18n.init({
  compatibilityJSON: 'v3',
  resources,
  lng: 'vi',
  fallbackLng: 'vi',
  interpolation: {
    escapeValue: false,
  },
});

// Tải ngôn ngữ đã lưu từ AsyncStorage khi ứng dụng khởi động
export const initLanguageFromStorage = async () => {
  if (Platform.OS === 'web' && typeof window === 'undefined') return;
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage && (savedLanguage === 'vi' || savedLanguage === 'en')) {
      await i18n.changeLanguage(savedLanguage);
      console.log(`🌐 [i18n] Đã nạp ngôn ngữ từ bộ nhớ: ${savedLanguage}`);
    } else {
      console.log('🌐 [i18n] Sử dụng ngôn ngữ mặc định: vi');
    }
  } catch (error) {
    console.error('Lỗi khi đọc ngôn ngữ từ AsyncStorage:', error);
  }
};

// Tự động nạp khi module khởi động (trên client / native)
if (Platform.OS !== 'web' || typeof window !== 'undefined') {
  initLanguageFromStorage();
}

/**
 * Hàm thay đổi ngôn ngữ đồng thời lưu vào AsyncStorage
 */
export const changeAppLanguage = async (newLang: string) => {
  try {
    await i18n.changeLanguage(newLang);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
    console.log(`🌐 [i18n] Đã chuyển ngôn ngữ sang: ${newLang}`);
  } catch (error) {
    console.error('Lỗi khi lưu ngôn ngữ vào AsyncStorage:', error);
  }
};

/**
 * React Hook useTranslation siêu nhẹ, phản hồi tức thì khi đổi ngôn ngữ
 */
export function useTranslation() {
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'vi');

  useEffect(() => {
    const handleLanguageChanged = (newLang: string) => {
      setCurrentLanguage(newLang);
    };

    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  const t = useCallback(
    (key: string, options?: any) => {
      const activeLang = (currentLanguage?.startsWith('en') ? 'en' : 'vi') as 'vi' | 'en';
      const dict = (resources[activeLang]?.translation as any) || (resources.vi?.translation as any);

      // Tra cứu trực tiếp theo đường dẫn dot-notation (vd: 'miniapps.bannerTitle')
      let val: any = dict;
      const parts = key.split('.');
      for (const part of parts) {
        if (val && typeof val === 'object' && part in val) {
          val = val[part];
        } else {
          val = null;
          break;
        }
      }

      let result = (typeof val === 'string' ? val : null) || (options?.defaultValue ?? key);

      // Interpolate any {{variable}} template string if present in options
      if (options && typeof result === 'string') {
        for (const [k, v] of Object.entries(options)) {
          if (k !== 'defaultValue') {
            result = result.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
          }
        }
      }
      return result;
    },
    [currentLanguage]
  );

  return {
    t,
    i18n,
    currentLanguage,
  };
}

export default i18n;
