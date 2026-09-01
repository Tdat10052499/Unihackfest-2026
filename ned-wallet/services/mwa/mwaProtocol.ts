import { SolanaNetwork } from '../../stores/useNetworkStore';

export interface MwaAppIdentity {
  name: string;
  uri?: string;
  icon?: string;
}

export type MwaRequestType =
  | 'authorize'
  | 'deauthorize'
  | 'reauthorize'
  | 'sign_messages'
  | 'sign_transactions'
  | 'sign_and_send_transactions';

export interface MwaBaseRequest {
  id: string;
  type: MwaRequestType;
  identity: MwaAppIdentity;
  cluster?: string; // 'devnet' | 'mainnet-beta' | 'testnet'
  timestamp: number;
}

export interface MwaAuthorizeRequest extends MwaBaseRequest {
  type: 'authorize';
  cluster: string;
}

export interface MwaSignTransactionsRequest extends MwaBaseRequest {
  type: 'sign_transactions';
  cluster: string;
  payloads: string[]; // Base64 encoded serialized transactions
}

export interface MwaSignAndSendTransactionsRequest extends MwaBaseRequest {
  type: 'sign_and_send_transactions';
  cluster: string;
  payloads: string[]; // Base64 encoded serialized transactions
  minContextSlot?: number;
}

export interface MwaSignMessagesRequest extends MwaBaseRequest {
  type: 'sign_messages';
  payloads: string[]; // Base64 encoded message byte arrays
  addresses: string[];
}

export type MwaRequest =
  | MwaAuthorizeRequest
  | MwaSignTransactionsRequest
  | MwaSignAndSendTransactionsRequest
  | MwaSignMessagesRequest;

export const MWA_ERROR_CODES = {
  ERROR_CLUSTER_NOT_SUPPORTED: -1,
  ERROR_CLUSTER_MISMATCH: -2,
  ERROR_AUTHORIZATION_FAILED: -3,
  ERROR_INVALID_PAYLOAD: -4,
  ERROR_NOT_SUBMITTED: -5,
  ERROR_USER_REJECTED: -6,
  ERROR_TIMEOUT: -7,
} as const;

export interface MwaError {
  code: number;
  message: string;
  cluster?: string;
  activeNetwork?: SolanaNetwork;
}

export interface MwaAuthorizeResponse {
  auth_token: string;
  accounts: Array<{
    address: string;
    label?: string;
  }>;
  wallet_icon?: string;
}

export interface MwaSignTransactionsResponse {
  signed_payloads: string[];
}

export interface MwaSignAndSendTransactionsResponse {
  signatures: string[];
}

export interface MwaSignMessagesResponse {
  signed_payloads: string[];
}

export interface MwaResponse<T = any> {
  id: string;
  success: boolean;
  result?: T;
  error?: MwaError;
}
