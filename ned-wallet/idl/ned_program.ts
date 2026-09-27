// Sinh từ ned_program/target/types/ned_program.ts sau `anchor build` — đừng sửa tay.
// Cập nhật: chạy anchor build rồi chép lại target/idl/ned_program.json + phần type bên dưới.
import idlJson from './ned_program.json';

export type NedProgram = {
  "address": "8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh",
  "metadata": {
    "name": "nedProgram",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createProfile",
      "docs": [
        "Tạo hồ sơ: NameRecord [b\"name\", username] + ReverseRecord [b\"reverse\", wallet]"
      ],
      "discriminator": [
        225,
        205,
        234,
        143,
        17,
        186,
        50,
        220
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "nameRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  110,
                  97,
                  109,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "username"
              }
            ]
          }
        },
        {
          "name": "reverseRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  118,
                  101,
                  114,
                  115,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "username",
          "type": "string"
        }
      ]
    },
    {
      "name": "linkPhone",
      "docs": [
        "Liên kết SĐT: PhoneRecord [b\"phone_v1\", phone_key]. phone_key = scrypt(SĐT E.164) tính trong app —",
        "program không bao giờ nhận hay lưu SĐT dạng rõ."
      ],
      "discriminator": [
        141,
        200,
        85,
        181,
        8,
        220,
        116,
        223
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "reverseRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  118,
                  101,
                  114,
                  115,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              }
            ]
          }
        },
        {
          "name": "phoneRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  104,
                  111,
                  110,
                  101,
                  95,
                  118,
                  49
                ]
              },
              {
                "kind": "arg",
                "path": "phoneKey"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "phoneKey",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "transferStablecoin",
      "docs": [
        "Chuyển Stablecoin (SPL Token / Token 2022) an toàn qua CPI TransferChecked"
      ],
      "discriminator": [
        63,
        40,
        136,
        145,
        78,
        236,
        197,
        210
      ],
      "accounts": [
        {
          "name": "fromTokenAccount",
          "writable": true
        },
        {
          "name": "toTokenAccount",
          "writable": true
        },
        {
          "name": "mint"
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "unlinkPhone",
      "docs": [
        "Huỷ liên kết SĐT: đóng PhoneRecord của chính mình (hoàn rent về signer)"
      ],
      "discriminator": [
        170,
        180,
        135,
        191,
        84,
        38,
        245,
        109
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "reverseRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  118,
                  101,
                  114,
                  115,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              }
            ]
          }
        },
        {
          "name": "phoneRecord",
          "docs": [
            "PhoneRecord của chính signer (Account<> kiểm tra owner = program + discriminator)"
          ],
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "updateUsername",
      "docs": [
        "Đổi username: đóng NameRecord cũ (hoàn rent), tạo NameRecord mới, cập nhật ReverseRecord"
      ],
      "discriminator": [
        233,
        103,
        45,
        8,
        250,
        100,
        216,
        251
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "reverseRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  118,
                  101,
                  114,
                  115,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              }
            ]
          }
        },
        {
          "name": "oldNameRecord",
          "docs": [
            "NameRecord hiện tại — đóng và hoàn rent về signer"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  110,
                  97,
                  109,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "reverseRecord.username",
                "account": "reverseRecord"
              }
            ]
          }
        },
        {
          "name": "newNameRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  110,
                  97,
                  109,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "newUsername"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "newUsername",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "nameRecord",
      "discriminator": [
        254,
        22,
        17,
        161,
        229,
        49,
        238,
        105
      ]
    },
    {
      "name": "phoneRecord",
      "discriminator": [
        205,
        203,
        36,
        37,
        113,
        49,
        104,
        155
      ]
    },
    {
      "name": "reverseRecord",
      "discriminator": [
        125,
        98,
        59,
        20,
        159,
        18,
        85,
        123
      ]
    }
  ],
  "events": [
    {
      "name": "phoneLinked",
      "discriminator": [
        122,
        60,
        183,
        235,
        4,
        74,
        79,
        238
      ]
    },
    {
      "name": "phoneUnlinked",
      "discriminator": [
        88,
        28,
        234,
        184,
        125,
        140,
        54,
        18
      ]
    },
    {
      "name": "profileCreated",
      "discriminator": [
        134,
        233,
        199,
        153,
        77,
        206,
        128,
        94
      ]
    },
    {
      "name": "stablecoinTransferred",
      "discriminator": [
        89,
        52,
        51,
        248,
        38,
        168,
        70,
        112
      ]
    },
    {
      "name": "usernameUpdated",
      "discriminator": [
        26,
        162,
        87,
        43,
        208,
        39,
        65,
        115
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidUsername",
      "msg": "Username must be 3-20 characters: lowercase letters, digits or underscore."
    },
    {
      "code": 6001,
      "name": "usernameTaken",
      "msg": "This username is already taken."
    },
    {
      "code": 6002,
      "name": "profileAlreadyExists",
      "msg": "This wallet already has a profile."
    },
    {
      "code": 6003,
      "name": "sameUsername",
      "msg": "The new username is the same as the current one."
    },
    {
      "code": 6004,
      "name": "notNameOwner",
      "msg": "Only the owner of this username can change it."
    },
    {
      "code": 6005,
      "name": "phoneTaken",
      "msg": "This phone number is already linked to another N.E.D account."
    },
    {
      "code": 6006,
      "name": "phoneAlreadyLinked",
      "msg": "This wallet already has a linked phone number. Unlink it first."
    },
    {
      "code": 6007,
      "name": "notPhoneOwner",
      "msg": "Only the wallet that linked this phone number can unlink it."
    },
    {
      "code": 6008,
      "name": "invalidAmount",
      "msg": "Token amount must be greater than 0."
    }
  ],
  "types": [
    {
      "name": "nameRecord",
      "docs": [
        "[b\"name\", username] → ví sở hữu username"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "phoneLinked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "phoneRecord",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "phoneRecord",
      "docs": [
        "[b\"phone_v1\", scrypt(SĐT)] → ví đã liên kết SĐT (chưa xác minh OTP)"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "phoneUnlinked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "phoneRecord",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "profileCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "username",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "reverseRecord",
      "docs": [
        "[b\"reverse\", wallet] → hồ sơ công khai của ví (người quay lại = có ReverseRecord)"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "username",
            "type": "string"
          },
          {
            "name": "hasPhone",
            "type": "bool"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "stablecoinTransferred",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "from",
            "type": "pubkey"
          },
          {
            "name": "fromTokenAccount",
            "type": "pubkey"
          },
          {
            "name": "toTokenAccount",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "decimals",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "usernameUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "oldUsername",
            "type": "string"
          },
          {
            "name": "newUsername",
            "type": "string"
          }
        ]
      }
    }
  ]
};

/** IDL runtime (JSON) — dùng với new Program<NedProgram>(IDL, provider) */
export const IDL = idlJson as unknown as NedProgram;

export default IDL;
