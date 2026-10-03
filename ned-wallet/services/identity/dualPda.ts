// Identity on-chain (Phương án C, T1.5) — ned_program:
//   NameRecord    [b"name", username]        → wallet
//   ReverseRecord [b"reverse", wallet]       → username, has_phone
//   PhoneRecord   [b"phone_v1", phone_key]   → wallet   (phone_key = scrypt(SĐT) — xem phoneKey.ts)
// Đọc: decode thủ công theo layout Borsh (không cần Anchor client). Ghi: builder trả Transaction để ký bằng
// useAuth().signAndSendTransaction (ví người dùng là signer và trả phí + rent).
import { Buffer } from 'buffer';
import { PublicKey, Transaction, TransactionInstruction, type Connection } from '@solana/web3.js';
import idl from '../../idl/ned_program.json';
import { PROGRAM_ID } from '../../constants/chain';

/** Same program as Milestone Lock; resolved once in constants/chain.ts (IDL address, EXPO_PUBLIC_ANCHOR_PROGRAM_ID override) */
export const IDENTITY_PROGRAM_ID = PROGRAM_ID;

const NAME_SEED = Buffer.from('name');
const REVERSE_SEED = Buffer.from('reverse');
const PHONE_SEED = Buffer.from('phone_v1');

export const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;
export const isValidUsername = (username: string) => USERNAME_REGEX.test(username);

export interface NameRecord {
  address: PublicKey;
  wallet: PublicKey;
  createdAt: number;
}
export interface ReverseRecord {
  address: PublicKey;
  username: string;
  hasPhone: boolean;
  createdAt: number;
}
export interface PhoneRecord {
  address: PublicKey;
  wallet: PublicKey;
  createdAt: number;
}

// -----------------------------------------------------------------------------
// PDA
// -----------------------------------------------------------------------------

export function deriveNamePda(username: string, programId = IDENTITY_PROGRAM_ID): PublicKey {
  return PublicKey.findProgramAddressSync([NAME_SEED, Buffer.from(username, 'utf8')], programId)[0];
}

export function deriveReversePda(wallet: PublicKey, programId = IDENTITY_PROGRAM_ID): PublicKey {
  return PublicKey.findProgramAddressSync([REVERSE_SEED, wallet.toBuffer()], programId)[0];
}

export function derivePhonePda(phoneKey: Uint8Array, programId = IDENTITY_PROGRAM_ID): PublicKey {
  if (phoneKey.length !== 32) throw new Error('phone_key must be 32 bytes');
  return PublicKey.findProgramAddressSync([PHONE_SEED, Buffer.from(phoneKey)], programId)[0];
}

// -----------------------------------------------------------------------------
// Decode (layout Borsh: discriminator 8 byte + fields)
// -----------------------------------------------------------------------------

type AccountName = 'NameRecord' | 'ReverseRecord' | 'PhoneRecord';

function discriminatorOf(name: AccountName): Buffer {
  const account = idl.accounts.find((a) => a.name === name);
  if (!account) throw new Error(`IDL has no account ${name}`);
  return Buffer.from(account.discriminator);
}

function hasDiscriminator(data: Buffer, name: AccountName): boolean {
  return data.length >= 8 && data.subarray(0, 8).equals(discriminatorOf(name));
}

function decodeWalletRecord(address: PublicKey, data: Buffer, name: 'NameRecord' | 'PhoneRecord') {
  if (data.length < 49 || !hasDiscriminator(data, name)) return null;
  return {
    address,
    wallet: new PublicKey(data.subarray(8, 40)),
    createdAt: Number(data.readBigInt64LE(40)),
  };
}

function decodeReverseRecord(address: PublicKey, data: Buffer): ReverseRecord | null {
  if (data.length < 22 || !hasDiscriminator(data, 'ReverseRecord')) return null;
  const len = data.readUInt32LE(8);
  if (len < 3 || len > 20 || data.length < 22 + len) return null;
  const username = data.subarray(12, 12 + len).toString('utf8');
  if (!isValidUsername(username)) return null;
  let offset = 12 + len;
  const hasPhone = data[offset] === 1;
  offset += 1;
  return { address, username, hasPhone, createdAt: Number(data.readBigInt64LE(offset)) };
}

// -----------------------------------------------------------------------------
// Đọc
// -----------------------------------------------------------------------------

/** Ai sở hữu @username? null nếu tên còn trống */
export async function fetchNameRecord(connection: Connection, username: string): Promise<NameRecord | null> {
  const address = deriveNamePda(username);
  const info = await connection.getAccountInfo(address, 'confirmed');
  return info?.owner.equals(IDENTITY_PROGRAM_ID) ? decodeWalletRecord(address, Buffer.from(info.data), 'NameRecord') : null;
}

/** Hồ sơ của ví (người quay lại = có ReverseRecord) */
export async function fetchReverseRecord(connection: Connection, wallet: PublicKey): Promise<ReverseRecord | null> {
  const address = deriveReversePda(wallet);
  const info = await connection.getAccountInfo(address, 'confirmed');
  return info?.owner.equals(IDENTITY_PROGRAM_ID) ? decodeReverseRecord(address, Buffer.from(info.data)) : null;
}

/** Ví đã liên kết SĐT này (chưa xác minh OTP) */
export async function fetchPhoneRecord(connection: Connection, phoneKey: Uint8Array): Promise<PhoneRecord | null> {
  const address = derivePhonePda(phoneKey);
  const info = await connection.getAccountInfo(address, 'confirmed');
  return info?.owner.equals(IDENTITY_PROGRAM_ID) ? decodeWalletRecord(address, Buffer.from(info.data), 'PhoneRecord') : null;
}

/** Tra nhiều username một lượt (1 RPC / 100 tên) — kết quả theo đúng thứ tự đầu vào */
export async function fetchNameRecords(connection: Connection, usernames: string[]): Promise<(NameRecord | null)[]> {
  const addresses = usernames.map((u) => deriveNamePda(u));
  const infos = await getMultiple(connection, addresses);
  return infos.map((info, i) => (info ? decodeWalletRecord(addresses[i], info, 'NameRecord') : null));
}

/** Tra nhiều ví một lượt (vd. hiển thị @username trong lịch sử giao dịch) */
export async function fetchReverseRecords(connection: Connection, wallets: PublicKey[]): Promise<(ReverseRecord | null)[]> {
  const addresses = wallets.map((w) => deriveReversePda(w));
  const infos = await getMultiple(connection, addresses);
  return infos.map((info, i) => (info ? decodeReverseRecord(addresses[i], info) : null));
}

/** Tra nhiều phone_key một lượt (vd. danh bạ đã băm) */
export async function fetchPhoneRecords(connection: Connection, phoneKeys: Uint8Array[]): Promise<(PhoneRecord | null)[]> {
  const addresses = phoneKeys.map((k) => derivePhonePda(k));
  const infos = await getMultiple(connection, addresses);
  return infos.map((info, i) => (info ? decodeWalletRecord(addresses[i], info, 'PhoneRecord') : null));
}

async function getMultiple(connection: Connection, addresses: PublicKey[]): Promise<(Buffer | null)[]> {
  const out: (Buffer | null)[] = [];
  for (let i = 0; i < addresses.length; i += 100) {
    const infos = await connection.getMultipleAccountsInfo(addresses.slice(i, i + 100), 'confirmed');
    out.push(...infos.map((info) => (info?.owner.equals(IDENTITY_PROGRAM_ID) ? Buffer.from(info.data) : null)));
  }
  return out;
}

// -----------------------------------------------------------------------------
// Ghi — builder instruction (discriminator + thứ tự account lấy từ IDL)
// -----------------------------------------------------------------------------

type InstructionName = 'create_profile' | 'link_phone' | 'unlink_phone' | 'update_username';

function buildInstruction(
  name: InstructionName,
  accounts: Record<string, PublicKey>,
  args: Buffer = Buffer.alloc(0)
): TransactionInstruction {
  const ix = idl.instructions.find((i) => i.name === name);
  if (!ix) throw new Error(`IDL has no instruction ${name}`);
  const keys = ix.accounts.map((meta) => {
    const fixed = 'address' in meta && typeof meta.address === 'string' ? new PublicKey(meta.address) : null;
    const pubkey = accounts[meta.name] ?? fixed;
    if (!pubkey) throw new Error(`Missing account ${meta.name} for ${name}`);
    return {
      pubkey,
      isSigner: 'signer' in meta && meta.signer === true,
      isWritable: 'writable' in meta && meta.writable === true,
    };
  });
  return new TransactionInstruction({
    programId: IDENTITY_PROGRAM_ID,
    keys,
    data: Buffer.concat([Buffer.from(ix.discriminator), args]),
  });
}

function borshString(value: string): Buffer {
  const bytes = Buffer.from(value, 'utf8');
  const len = Buffer.alloc(4);
  len.writeUInt32LE(bytes.length, 0);
  return Buffer.concat([len, bytes]);
}

function assertUsername(username: string) {
  if (!isValidUsername(username)) {
    throw new Error('Username must be 3-20 characters: lowercase letters, digits or underscore.');
  }
}

/** create_profile(username): tạo NameRecord + ReverseRecord */
export function buildCreateProfileTx(wallet: PublicKey, username: string): Transaction {
  assertUsername(username);
  return new Transaction().add(
    buildInstruction(
      'create_profile',
      { signer: wallet, name_record: deriveNamePda(username), reverse_record: deriveReversePda(wallet) },
      borshString(username)
    )
  );
}

/** link_phone(phone_key): tạo PhoneRecord, đặt has_phone = true */
export function buildLinkPhoneTx(wallet: PublicKey, phoneKey: Uint8Array): Transaction {
  return new Transaction().add(
    buildInstruction(
      'link_phone',
      { signer: wallet, reverse_record: deriveReversePda(wallet), phone_record: derivePhonePda(phoneKey) },
      Buffer.from(phoneKey)
    )
  );
}

/** unlink_phone(): đóng PhoneRecord của chính mình (hoàn rent) */
export function buildUnlinkPhoneTx(wallet: PublicKey, phoneKey: Uint8Array): Transaction {
  return new Transaction().add(
    buildInstruction('unlink_phone', {
      signer: wallet,
      reverse_record: deriveReversePda(wallet),
      phone_record: derivePhonePda(phoneKey),
    })
  );
}

/** update_username(new): đóng NameRecord cũ, tạo NameRecord mới, cập nhật ReverseRecord */
export function buildUpdateUsernameTx(wallet: PublicKey, oldUsername: string, newUsername: string): Transaction {
  assertUsername(newUsername);
  return new Transaction().add(
    buildInstruction(
      'update_username',
      {
        signer: wallet,
        reverse_record: deriveReversePda(wallet),
        old_name_record: deriveNamePda(oldUsername),
        new_name_record: deriveNamePda(newUsername),
      },
      borshString(newUsername)
    )
  );
}

/** Mã lỗi program (IDL) → tên, để màn hình hiện thông báo phù hợp */
export const IDENTITY_ERRORS: Record<number, string> = Object.fromEntries(
  (idl.errors ?? []).map((e) => [e.code, e.name])
);
