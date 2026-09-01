-- =========================================================================
-- MIGRATION: KHÓA CHẶT BẢO MẬT BẢNG GEO_RED_PACKETS (BACKEND SIGNER MODEL)
-- =========================================================================

-- 1. Đảm bảo cấu trúc bảng geo_red_packets có đầy đủ các trường cần thiết
CREATE TABLE IF NOT EXISTS public.geo_red_packets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_wallet TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    radius NUMERIC NOT NULL DEFAULT 50, -- Bán kính hợp lệ (mét)
    message TEXT DEFAULT 'Chúc bạn vạn sự như ý, phát tài phát lộc! 🧧',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'claimed', 'expired')),
    tx_signature TEXT,              -- Chữ ký on-chain người tạo nạp tiền vào Escrow
    claimed_by TEXT,                -- Địa chỉ ví người nhận lì xì
    claimed_at TIMESTAMPTZ,         -- Thời gian nhận
    claim_tx_signature TEXT,        -- Chữ ký on-chain Backend Signer giải ngân SOL cho người nhận
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bổ sung cột claim_tx_signature nếu bảng đã tồn tại từ trước
ALTER TABLE public.geo_red_packets ADD COLUMN IF NOT EXISTS claim_tx_signature TEXT;

-- 2. Đánh chỉ mục Index tối ưu hóa truy vấn
CREATE INDEX IF NOT EXISTS idx_geo_red_packets_status ON public.geo_red_packets(status);
CREATE INDEX IF NOT EXISTS idx_geo_red_packets_coords ON public.geo_red_packets(lat, lng);
CREATE INDEX IF NOT EXISTS idx_geo_red_packets_creator ON public.geo_red_packets(creator_wallet);

-- 3. Kích hoạt Supabase Realtime cho bảng
ALTER PUBLICATION supabase_realtime ADD TABLE public.geo_red_packets;

-- 4. THIẾT LẬP ROW LEVEL SECURITY (RLS) - KHÓA CHẶT QUYỀN UPDATE/DELETE
ALTER TABLE public.geo_red_packets ENABLE ROW LEVEL SECURITY;

-- Hủy bỏ tất cả các policy cũ nếu có để tránh hở quyền
DROP POLICY IF EXISTS "Cho phép cập nhật khi nhận lì xì" ON public.geo_red_packets;
DROP POLICY IF EXISTS "Allow update red packets" ON public.geo_red_packets;
DROP POLICY IF EXISTS "Cho phép đọc danh sách lì xì" ON public.geo_red_packets;
DROP POLICY IF EXISTS "Allow public read active red packets" ON public.geo_red_packets;
DROP POLICY IF EXISTS "Cho phép tạo bao lì xì" ON public.geo_red_packets;
DROP POLICY IF EXISTS "Allow authenticated/anon insert red packets" ON public.geo_red_packets;

-- A. Quyền ĐỌC (SELECT): Cho phép mọi người xem danh sách bao lì xì
CREATE POLICY "Allow public read red packets"
ON public.geo_red_packets FOR SELECT
USING (true);

-- B. Quyền TẠO MỚI (INSERT): Cho phép người dùng thả bao lì xì (với trạng thái ban đầu bắt buộc là 'active')
CREATE POLICY "Allow insert active red packets"
ON public.geo_red_packets FOR INSERT
WITH CHECK (status = 'active' AND tx_signature IS NOT NULL);

-- C. Quyền CẬP NHẬT & XÓA (UPDATE & DELETE):
-- TUYỆT ĐỐI KHÔNG TẠO POLICY UPDATE/DELETE CHO ANON HOẶC AUTHENTICATED USERS!
-- Mọi thao tác UPDATE trạng thái 'claimed' chỉ được thực thi duy nhất bởi Service Role Key trong Supabase Edge Function.
