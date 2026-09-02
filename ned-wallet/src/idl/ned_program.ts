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
      name: 'initializeProfile';
      discriminator: [32, 145, 77, 213, 58, 39, 251, 234];
      accounts: [
        {
          name: 'userProfile';
          writable: true;
        },
        {
          name: 'signer';
          writable: true;
          signer: true;
        },
        {
          name: 'systemProgram';
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
  ];
  accounts: [
    {
      name: 'userProfile';
      discriminator: [32, 37, 119, 205, 179, 180, 13, 194];
    },
  ];
  events: [
    {
      name: 'ProfileInitialized';
      discriminator: [1, 31, 122, 19, 193, 205, 23, 27];
    },
    {
      name: 'ProfileUpdated';
      discriminator: [186, 248, 62, 98, 112, 98, 161, 252];
    },
    {
      name: 'StablecoinTransferred';
      discriminator: [89, 52, 51, 248, 38, 227, 168, 70, 112];
    },
  ];
  errors: [
    {
      code: 6000;
      name: 'FiatCurrencyTooLong';
      msg: 'Chuỗi active_fiat vượt quá độ dài tối đa cho phép (10 ký tự).';
    },
    {
      code: 6001;
      name: 'InvalidAmount';
      msg: 'Số lượng token giao dịch phải lớn hơn 0.';
    },
    {
      code: 6002;
      name: 'Unauthorized';
      msg: 'Bạn không có quyền thực hiện hành động này trên hồ sơ.';
    },
  ];
  types: [
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
    {
      name: 'ProfileInitialized';
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
            name: 'pda';
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'ProfileUpdated';
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
        ];
      };
    },
    {
      name: 'StablecoinTransferred';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'from';
            type: 'pubkey';
          },
          {
            name: 'fromTokenAccount';
            type: 'pubkey';
          },
          {
            name: 'toTokenAccount';
            type: 'pubkey';
          },
          {
            name: 'mint';
            type: 'pubkey';
          },
          {
            name: 'amount';
            type: 'u64';
          },
          {
            name: 'decimals';
            type: 'u8';
          },
        ];
      };
    },
  ];
};

export const IDL: NedProgram = {
  address: '8tTSP75q3ggaxQiZdeC4LShcyjHN5yWJY4NnZeE3JaEi',
  metadata: {
    name: 'ned_program',
    version: '0.1.0',
    spec: '0.1.0',
    description: 'Created with Anchor',
  },
  instructions: [
    {
      name: 'initializeProfile',
      discriminator: [32, 145, 77, 213, 58, 39, 251, 234],
      accounts: [
        {
          name: 'userProfile',
          writable: true,
        },
        {
          name: 'signer',
          writable: true,
          signer: true,
        },
        {
          name: 'systemProgram',
        },
      ],
      args: [
        {
          name: 'defaultFiat',
          type: 'string',
        },
      ],
    },
    {
      name: 'transferStablecoin',
      discriminator: [63, 40, 136, 145, 78, 236, 197, 210],
      accounts: [
        {
          name: 'fromTokenAccount',
          writable: true,
        },
        {
          name: 'toTokenAccount',
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
          name: 'tokenProgram',
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
      name: 'updateProfile',
      discriminator: [98, 67, 99, 206, 86, 115, 175, 1],
      accounts: [
        {
          name: 'userProfile',
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
          relations: ['userProfile'],
        },
      ],
      args: [
        {
          name: 'newFiat',
          type: {
            option: 'string',
          },
        },
        {
          name: 'newMint',
          type: {
            option: 'pubkey',
          },
        },
      ],
    },
  ],
  accounts: [
    {
      name: 'userProfile',
      discriminator: [32, 37, 119, 205, 179, 180, 13, 194],
    },
  ],
  events: [
    {
      name: 'ProfileInitialized',
      discriminator: [1, 31, 122, 19, 193, 205, 23, 27],
    },
    {
      name: 'ProfileUpdated',
      discriminator: [186, 248, 62, 98, 112, 98, 161, 252],
    },
    {
      name: 'StablecoinTransferred',
      discriminator: [89, 52, 51, 248, 38, 227, 168, 70, 112],
    },
  ],
  errors: [
    {
      code: 6000,
      name: 'FiatCurrencyTooLong',
      msg: 'Chuỗi active_fiat vượt quá độ dài tối đa cho phép (10 ký tự).',
    },
    {
      code: 6001,
      name: 'InvalidAmount',
      msg: 'Số lượng token giao dịch phải lớn hơn 0.',
    },
    {
      code: 6002,
      name: 'Unauthorized',
      msg: 'Bạn không có quyền thực hiện hành động này trên hồ sơ.',
    },
  ],
  types: [
    {
      name: 'userProfile',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'owner',
            type: 'pubkey',
          },
          {
            name: 'activeFiat',
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
    {
      name: 'ProfileInitialized',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'owner',
            type: 'pubkey',
          },
          {
            name: 'activeFiat',
            type: 'string',
          },
          {
            name: 'pda',
            type: 'pubkey',
          },
        ],
      },
    },
    {
      name: 'ProfileUpdated',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'owner',
            type: 'pubkey',
          },
          {
            name: 'activeFiat',
            type: 'string',
          },
          {
            name: 'preferredMint',
            type: 'pubkey',
          },
        ],
      },
    },
    {
      name: 'StablecoinTransferred',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'from',
            type: 'pubkey',
          },
          {
            name: 'fromTokenAccount',
            type: 'pubkey',
          },
          {
            name: 'toTokenAccount',
            type: 'pubkey',
          },
          {
            name: 'mint',
            type: 'pubkey',
          },
          {
            name: 'amount',
            type: 'u64',
          },
          {
            name: 'decimals',
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

export default IDL;
