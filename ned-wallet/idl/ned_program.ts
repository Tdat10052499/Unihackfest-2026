import { PublicKey } from '@solana/web3.js';
import { Idl } from '@coral-xyz/anchor';

export type NedProgram = {
  address: string;
  metadata: {
    name: 'ned_program';
    version: '0.1.0';
    spec: '0.1.0';
    description: 'Created with Anchor';
  };
  instructions: [
    {
      name: 'closeIdentity';
      discriminator: [158, 183, 97, 254, 215, 179, 139, 12];
      accounts: [
        {
          name: 'identityAccount';
          writable: true;
        },
        {
          name: 'authority';
          signer: true;
          relations: ['identityAccount'];
        },
        {
          name: 'recipient';
          writable: true;
        },
      ];
      args: [];
    },
    {
      name: 'initializeProfile';
      discriminator: [32, 145, 77, 213, 58, 39, 251, 234];
      accounts: [
        {
          name: 'userProfile';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [112, 114, 111, 102, 105, 108, 101];
              },
              {
                kind: 'account';
                path: 'signer';
              },
            ];
          };
        },
        {
          name: 'signer';
          writable: true;
          signer: true;
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'defaultFiat';
          type: 'string';
        },
      ];
    },
    {
      name: 'registerIdentity';
      discriminator: [164, 118, 227, 177, 47, 176, 187, 248];
      accounts: [
        {
          name: 'identityAccount';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [105, 100, 101, 110, 116, 105, 116, 121];
              },
              {
                kind: 'arg';
                path: 'hashedIdentifier';
              },
            ];
          };
        },
        {
          name: 'targetWallet';
        },
        {
          name: 'authority';
          signer: true;
        },
        {
          name: 'payer';
          writable: true;
          signer: true;
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: '_hashedIdentifier';
          type: {
            array: ['u8', 32];
          };
        },
        {
          name: 'identityType';
          type: 'u8';
        },
      ];
    },
    {
      name: 'transferStablecoin';
      discriminator: [63, 40, 136, 145, 78, 236, 197, 210];
      accounts: [
        {
          name: 'fromTokenAccount';
          writable: true;
        },
        {
          name: 'toTokenAccount';
          writable: true;
        },
        {
          name: 'mint';
        },
        {
          name: 'signer';
          writable: true;
          signer: true;
        },
        {
          name: 'tokenProgram';
        },
      ];
      args: [
        {
          name: 'amount';
          type: 'u64';
        },
      ];
    },
    {
      name: 'updateProfile';
      discriminator: [98, 67, 99, 206, 86, 115, 175, 1];
      accounts: [
        {
          name: 'userProfile';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [112, 114, 111, 102, 105, 108, 101];
              },
              {
                kind: 'account';
                path: 'signer';
              },
            ];
          };
        },
        {
          name: 'signer';
          signer: true;
        },
        {
          name: 'owner';
          relations: ['userProfile'];
        },
      ];
      args: [
        {
          name: 'newFiat';
          type: {
            option: 'string';
          };
        },
        {
          name: 'newMint';
          type: {
            option: 'pubkey';
          };
        },
      ];
    },
    {
      name: 'updateWallet';
      discriminator: [30, 233, 126, 238, 58, 16, 215, 184];
      accounts: [
        {
          name: 'identityAccount';
          writable: true;
        },
        {
          name: 'authority';
          signer: true;
          relations: ['identityAccount'];
        },
      ];
      args: [
        {
          name: 'newWallet';
          type: 'pubkey';
        },
      ];
    },
  ];
  accounts: [
    {
      name: 'identityAccount';
      discriminator: [194, 90, 181, 160, 182, 206, 116, 158];
    },
    {
      name: 'userProfile';
      discriminator: [32, 37, 119, 205, 179, 180, 13, 194];
    },
  ];
  types: [
    {
      name: 'identityAccount';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'wallet';
            type: 'pubkey';
          },
          {
            name: 'authority';
            type: 'pubkey';
          },
          {
            name: 'identityType';
            type: 'u8';
          },
          {
            name: 'bump';
            type: 'u8';
          },
          {
            name: 'createdAt';
            type: 'i64';
          },
        ];
      };
    },
    {
      name: 'userProfile';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'owner';
            type: 'pubkey';
          },
          {
            name: 'activeFiat';
            type: 'string';
          },
          {
            name: 'preferredMint';
            type: 'pubkey';
          },
          {
            name: 'bump';
            type: 'u8';
          },
        ];
      };
    },
  ];
};

export const IDL: Idl = {
  address: '8tTSP75q3ggaxQiZdeC4LShcyjHN5yWJY4NnZeE3JaEi',
  metadata: {
    name: 'ned_program',
    version: '0.1.0',
    spec: '0.1.0',
    description: 'Created with Anchor',
  },
  instructions: [
    {
      name: 'close_identity',
      discriminator: [158, 183, 97, 254, 215, 179, 139, 12],
      accounts: [
        {
          name: 'identity_account',
          writable: true,
        },
        {
          name: 'authority',
          signer: true,
          relations: ['identity_account'],
        },
        {
          name: 'recipient',
          writable: true,
        },
      ],
      args: [],
    },
    {
      name: 'initialize_profile',
      discriminator: [32, 145, 77, 213, 58, 39, 251, 234],
      accounts: [
        {
          name: 'user_profile',
          writable: true,
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [112, 114, 111, 102, 105, 108, 101],
              },
              {
                kind: 'account',
                path: 'signer',
              },
            ],
          },
        },
        {
          name: 'signer',
          writable: true,
          signer: true,
        },
        {
          name: 'system_program',
          address: '11111111111111111111111111111111',
        },
      ],
      args: [
        {
          name: 'default_fiat',
          type: 'string',
        },
      ],
    },
    {
      name: 'register_identity',
      discriminator: [164, 118, 227, 177, 47, 176, 187, 248],
      accounts: [
        {
          name: 'identity_account',
          writable: true,
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [105, 100, 101, 110, 116, 105, 116, 121],
              },
              {
                kind: 'arg',
                path: 'hashed_identifier',
              },
            ],
          },
        },
        {
          name: 'target_wallet',
        },
        {
          name: 'authority',
          signer: true,
        },
        {
          name: 'payer',
          writable: true,
          signer: true,
        },
        {
          name: 'system_program',
          address: '11111111111111111111111111111111',
        },
      ],
      args: [
        {
          name: '_hashed_identifier',
          type: {
            array: ['u8', 32],
          },
        },
        {
          name: 'identity_type',
          type: 'u8',
        },
      ],
    },
    {
      name: 'transfer_stablecoin',
      discriminator: [63, 40, 136, 145, 78, 236, 197, 210],
      accounts: [
        {
          name: 'from_token_account',
          writable: true,
        },
        {
          name: 'to_token_account',
          writable: true,
        },
        {
          name: 'mint',
        },
        {
          name: 'signer',
          writable: true,
          signer: true,
        },
        {
          name: 'token_program',
        },
      ],
      args: [
        {
          name: 'amount',
          type: 'u64',
        },
      ],
    },
    {
      name: 'update_profile',
      discriminator: [98, 67, 99, 206, 86, 115, 175, 1],
      accounts: [
        {
          name: 'user_profile',
          writable: true,
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [112, 114, 111, 102, 105, 108, 101],
              },
              {
                kind: 'account',
                path: 'signer',
              },
            ],
          },
        },
        {
          name: 'signer',
          signer: true,
        },
        {
          name: 'owner',
          relations: ['user_profile'],
        },
      ],
      args: [
        {
          name: 'new_fiat',
          type: {
            option: 'string',
          },
        },
        {
          name: 'new_mint',
          type: {
            option: 'pubkey',
          },
        },
      ],
    },
    {
      name: 'update_wallet',
      discriminator: [30, 233, 126, 238, 58, 16, 215, 184],
      accounts: [
        {
          name: 'identity_account',
          writable: true,
        },
        {
          name: 'authority',
          signer: true,
          relations: ['identity_account'],
        },
      ],
      args: [
        {
          name: 'new_wallet',
          type: 'pubkey',
        },
      ],
    },
  ],
  accounts: [
    {
      name: 'IdentityAccount',
      discriminator: [194, 90, 181, 160, 182, 206, 116, 158],
    },
    {
      name: 'UserProfile',
      discriminator: [32, 37, 119, 205, 179, 180, 13, 194],
    },
  ],
  types: [
    {
      name: 'IdentityAccount',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'wallet',
            type: 'pubkey',
          },
          {
            name: 'authority',
            type: 'pubkey',
          },
          {
            name: 'identity_type',
            type: 'u8',
          },
          {
            name: 'bump',
            type: 'u8',
          },
          {
            name: 'created_at',
            type: 'i64',
          },
        ],
      },
    },
    {
      name: 'UserProfile',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'owner',
            type: 'pubkey',
          },
          {
            name: 'active_fiat',
            type: 'string',
          },
          {
            name: 'preferredMint',
            type: 'pubkey',
          },
          {
            name: 'bump',
            type: 'u8',
          },
        ],
      },
    },
  ],
};

export interface UserProfileData {
  owner: PublicKey;
  activeFiat: string;
  preferredMint?: PublicKey;
  bump?: number;
}

export interface IdentityAccountData {
  wallet: PublicKey;
  authority: PublicKey;
  identityType: number;
  bump: number;
  createdAt: number;
}

export default IDL;
