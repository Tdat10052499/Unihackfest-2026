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
      "name": "accept",
      "docs": [
        "Freelancer accepts the brief (by its hash) and fixes where the earnings go: own wallet, or an allowlisted payout partner + reference"
      ],
      "discriminator": [
        65,
        150,
        70,
        216,
        133,
        6,
        107,
        4
      ],
      "accounts": [
        {
          "name": "fund",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "fund.creator",
                "account": "sharedFund"
              },
              {
                "kind": "account",
                "path": "fund.fundId",
                "account": "sharedFund"
              }
            ]
          }
        },
        {
          "name": "freelancer",
          "signer": true,
          "relations": [
            "fund"
          ]
        }
      ],
      "args": [
        {
          "name": "payoutKind",
          "type": {
            "defined": {
              "name": "payoutKind"
            }
          }
        },
        {
          "name": "payoutDestination",
          "type": "pubkey"
        },
        {
          "name": "payoutReference",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "expectedBriefHash",
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
      "name": "acceptCancel",
      "docs": [
        "The other party accepts the split; the expected values must match the current proposal"
      ],
      "discriminator": [
        132,
        234,
        253,
        101,
        254,
        237,
        181,
        117
      ],
      "accounts": [
        {
          "name": "fund",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "fund.creator",
                "account": "sharedFund"
              },
              {
                "kind": "account",
                "path": "fund.fundId",
                "account": "sharedFund"
              }
            ]
          }
        },
        {
          "name": "signer",
          "docs": [
            "The party that did not propose (checked in the handler)"
          ],
          "signer": true
        },
        {
          "name": "destination"
        },
        {
          "name": "destinationToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "destination"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "client"
        },
        {
          "name": "clientToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "client"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "fund"
              }
            ]
          }
        },
        {
          "name": "mint",
          "address": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
          "relations": [
            "fund"
          ]
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "expectedFreelancerAmount",
          "type": "u64"
        },
        {
          "name": "expectedUnsettled",
          "type": "u64"
        }
      ]
    },
    {
      "name": "addDeviceKey",
      "docs": [
        "Registers one device key (no change if it is already registered)"
      ],
      "discriminator": [
        194,
        39,
        116,
        250,
        95,
        158,
        187,
        9
      ],
      "accounts": [
        {
          "name": "wallet",
          "signer": true,
          "relations": [
            "deviceKeys"
          ]
        },
        {
          "name": "deviceKeys",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  118,
                  105,
                  99,
                  101,
                  95,
                  107,
                  101,
                  121,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "wallet"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "key",
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
      "name": "applyJob",
      "docs": [
        "Applies to an open job with a public pitch (one application per person)"
      ],
      "discriminator": [
        10,
        21,
        107,
        176,
        41,
        146,
        33,
        64
      ],
      "accounts": [
        {
          "name": "job",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98
                ]
              },
              {
                "kind": "account",
                "path": "job.business",
                "account": "jobListing"
              },
              {
                "kind": "account",
                "path": "job.jobId",
                "account": "jobListing"
              }
            ]
          }
        },
        {
          "name": "application",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98,
                  95,
                  97,
                  112,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "job"
              },
              {
                "kind": "account",
                "path": "freelancer"
              }
            ]
          }
        },
        {
          "name": "freelancer",
          "docs": [
            "Pays the rent of the application"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "pitch",
          "type": "string"
        }
      ]
    },
    {
      "name": "approve",
      "docs": [
        "Client approves a submitted (or disputed) milestone: release to the destination"
      ],
      "discriminator": [
        69,
        74,
        217,
        36,
        115,
        117,
        97,
        76
      ],
      "accounts": [
        {
          "name": "fund",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "fund.creator",
                "account": "sharedFund"
              },
              {
                "kind": "account",
                "path": "fund.fundId",
                "account": "sharedFund"
              }
            ]
          }
        },
        {
          "name": "client",
          "signer": true,
          "relations": [
            "fund"
          ]
        },
        {
          "name": "destination"
        },
        {
          "name": "destinationToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "destination"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "fund"
              }
            ]
          }
        },
        {
          "name": "mint",
          "address": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
          "relations": [
            "fund"
          ]
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "index",
          "type": "u8"
        }
      ]
    },
    {
      "name": "close",
      "docs": [
        "Creator closes a never-funded or settled contract; leftover → client, rent → rent_payer"
      ],
      "discriminator": [
        98,
        165,
        201,
        177,
        108,
        65,
        206,
        96
      ],
      "accounts": [
        {
          "name": "fund",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "fund.creator",
                "account": "sharedFund"
              },
              {
                "kind": "account",
                "path": "fund.fundId",
                "account": "sharedFund"
              }
            ]
          }
        },
        {
          "name": "creator",
          "signer": true,
          "relations": [
            "fund"
          ]
        },
        {
          "name": "rentPayer",
          "writable": true
        },
        {
          "name": "client"
        },
        {
          "name": "clientToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "client"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "fund"
              }
            ]
          }
        },
        {
          "name": "mint",
          "address": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
          "relations": [
            "fund"
          ]
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "concede",
      "docs": [
        "Freelancer concedes a disputed milestone: refund to the client"
      ],
      "discriminator": [
        19,
        182,
        3,
        3,
        43,
        35,
        60,
        202
      ],
      "accounts": [
        {
          "name": "fund",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "fund.creator",
                "account": "sharedFund"
              },
              {
                "kind": "account",
                "path": "fund.fundId",
                "account": "sharedFund"
              }
            ]
          }
        },
        {
          "name": "freelancer",
          "signer": true,
          "relations": [
            "fund"
          ]
        },
        {
          "name": "client"
        },
        {
          "name": "clientToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "client"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "fund"
              }
            ]
          }
        },
        {
          "name": "mint",
          "address": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
          "relations": [
            "fund"
          ]
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "index",
          "type": "u8"
        }
      ]
    },
    {
      "name": "createFund",
      "docs": [
        "Client creates a contract: 1–5 milestones, each with an amount, a submission deadline and a review deadline"
      ],
      "discriminator": [
        38,
        128,
        18,
        11,
        203,
        0,
        153,
        21
      ],
      "accounts": [
        {
          "name": "client",
          "signer": true
        },
        {
          "name": "payer",
          "docs": [
            "Pays the rent of the fund and the vault (may be the client)"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "fund",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "client"
              },
              {
                "kind": "arg",
                "path": "fundId"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "fund"
              }
            ]
          }
        },
        {
          "name": "mint",
          "address": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "fundId",
          "type": "u64"
        },
        {
          "name": "freelancer",
          "type": "pubkey"
        },
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "milestones",
          "type": {
            "vec": {
              "defined": {
                "name": "milestoneInput"
              }
            }
          }
        },
        {
          "name": "briefHash",
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
      "name": "dispute",
      "docs": [
        "Client disputes a submitted milestone before its review deadline (blocks auto-release)"
      ],
      "discriminator": [
        216,
        92,
        128,
        146,
        202,
        85,
        135,
        73
      ],
      "accounts": [
        {
          "name": "fund",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "fund.creator",
                "account": "sharedFund"
              },
              {
                "kind": "account",
                "path": "fund.fundId",
                "account": "sharedFund"
              }
            ]
          }
        },
        {
          "name": "client",
          "signer": true,
          "relations": [
            "fund"
          ]
        }
      ],
      "args": [
        {
          "name": "index",
          "type": "u8"
        }
      ]
    },
    {
      "name": "fundJob",
      "docs": [
        "v1.4 (D29): locks the budget of a \"locks when hired\" job (same transaction as create_fund + select_job)"
      ],
      "discriminator": [
        244,
        198,
        4,
        15,
        41,
        178,
        169,
        187
      ],
      "accounts": [
        {
          "name": "job",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98
                ]
              },
              {
                "kind": "account",
                "path": "job.business",
                "account": "jobListing"
              },
              {
                "kind": "account",
                "path": "job.jobId",
                "account": "jobListing"
              }
            ]
          }
        },
        {
          "name": "business",
          "signer": true,
          "relations": [
            "job"
          ]
        },
        {
          "name": "jobVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "job"
              }
            ]
          }
        },
        {
          "name": "businessToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "business"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mint",
          "address": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
          "relations": [
            "job"
          ]
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "initDeviceKeys",
      "docs": [
        "Creates the wallet's empty device-key list (sent with the first add_device_key)"
      ],
      "discriminator": [
        32,
        10,
        25,
        117,
        236,
        104,
        211,
        238
      ],
      "accounts": [
        {
          "name": "wallet",
          "writable": true,
          "signer": true
        },
        {
          "name": "deviceKeys",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  118,
                  105,
                  99,
                  101,
                  95,
                  107,
                  101,
                  121,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "wallet"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
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
      "name": "lock",
      "docs": [
        "Client locks the full contract amount in the vault"
      ],
      "discriminator": [
        21,
        19,
        208,
        43,
        237,
        62,
        255,
        87
      ],
      "accounts": [
        {
          "name": "fund",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "fund.creator",
                "account": "sharedFund"
              },
              {
                "kind": "account",
                "path": "fund.fundId",
                "account": "sharedFund"
              }
            ]
          }
        },
        {
          "name": "client",
          "signer": true,
          "relations": [
            "fund"
          ]
        },
        {
          "name": "clientToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "client"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "fund"
              }
            ]
          }
        },
        {
          "name": "mint",
          "address": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
          "relations": [
            "fund"
          ]
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "lockFromJob",
      "docs": [
        "Moves the job budget into the accepted contract (same transaction, after accept)"
      ],
      "discriminator": [
        162,
        207,
        102,
        181,
        220,
        17,
        10,
        42
      ],
      "accounts": [
        {
          "name": "job",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98
                ]
              },
              {
                "kind": "account",
                "path": "job.business",
                "account": "jobListing"
              },
              {
                "kind": "account",
                "path": "job.jobId",
                "account": "jobListing"
              }
            ]
          }
        },
        {
          "name": "fund",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "fund.creator",
                "account": "sharedFund"
              },
              {
                "kind": "account",
                "path": "fund.fundId",
                "account": "sharedFund"
              }
            ]
          }
        },
        {
          "name": "jobVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "job"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "fund"
              }
            ]
          }
        },
        {
          "name": "business",
          "writable": true,
          "relations": [
            "job"
          ]
        },
        {
          "name": "businessToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "business"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "caller",
          "docs": [
            "Anyone (the freelancer in practice)"
          ],
          "signer": true
        },
        {
          "name": "mint",
          "address": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
          "relations": [
            "job",
            "fund"
          ]
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "postJob",
      "docs": [
        "Publishes a job and locks its whole budget in the job vault"
      ],
      "discriminator": [
        34,
        208,
        58,
        248,
        129,
        234,
        179,
        211
      ],
      "accounts": [
        {
          "name": "business",
          "signer": true
        },
        {
          "name": "payer",
          "docs": [
            "Pays the rent of the listing and the job vault (may be the business)"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "job",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98
                ]
              },
              {
                "kind": "account",
                "path": "business"
              },
              {
                "kind": "arg",
                "path": "jobId"
              }
            ]
          }
        },
        {
          "name": "jobVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "job"
              }
            ]
          }
        },
        {
          "name": "businessToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "business"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mint",
          "address": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "jobId",
          "type": "u64"
        },
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "summary",
          "type": "string"
        },
        {
          "name": "category",
          "type": "u8"
        },
        {
          "name": "skills",
          "type": "u64"
        },
        {
          "name": "milestones",
          "type": {
            "vec": {
              "defined": {
                "name": "jobMilestoneInput"
              }
            }
          }
        },
        {
          "name": "briefHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "applyBy",
          "type": "i64"
        },
        {
          "name": "selectBy",
          "type": "i64"
        }
      ]
    },
    {
      "name": "postJobBrief",
      "docs": [
        "One part of the job's plain-text brief (no state change), while the job is Open"
      ],
      "discriminator": [
        70,
        181,
        108,
        250,
        44,
        60,
        41,
        67
      ],
      "accounts": [
        {
          "name": "job",
          "docs": [
            "Read-only: listed so the brief can be found with getSignaturesForAddress(job)"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98
                ]
              },
              {
                "kind": "account",
                "path": "job.business",
                "account": "jobListing"
              },
              {
                "kind": "account",
                "path": "job.jobId",
                "account": "jobListing"
              }
            ]
          }
        },
        {
          "name": "business",
          "signer": true,
          "relations": [
            "job"
          ]
        }
      ],
      "args": [
        {
          "name": "part",
          "type": "u8"
        },
        {
          "name": "parts",
          "type": "u8"
        },
        {
          "name": "data",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "postJobOpen",
      "docs": [
        "v1.4 (D29): publishes a job that locks its budget when the business selects someone (nothing locked now)"
      ],
      "discriminator": [
        116,
        180,
        113,
        39,
        6,
        218,
        83,
        4
      ],
      "accounts": [
        {
          "name": "business",
          "signer": true
        },
        {
          "name": "payer",
          "docs": [
            "Pays the rent of the listing and the job vault (may be the business)"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "job",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98
                ]
              },
              {
                "kind": "account",
                "path": "business"
              },
              {
                "kind": "arg",
                "path": "jobId"
              }
            ]
          }
        },
        {
          "name": "jobVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "job"
              }
            ]
          }
        },
        {
          "name": "businessToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "business"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mint",
          "address": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "jobId",
          "type": "u64"
        },
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "summary",
          "type": "string"
        },
        {
          "name": "category",
          "type": "u8"
        },
        {
          "name": "skills",
          "type": "u64"
        },
        {
          "name": "milestones",
          "type": {
            "vec": {
              "defined": {
                "name": "jobMilestoneInput"
              }
            }
          }
        },
        {
          "name": "briefHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "applyBy",
          "type": "i64"
        },
        {
          "name": "selectBy",
          "type": "i64"
        }
      ]
    },
    {
      "name": "postNote",
      "docs": [
        "Posts one part of an encrypted brief (client, while Created), delivery (freelancer, Submitted milestone) or,",
        "from v1.2, key note (either party, wraps of the contract key for registered devices).",
        "No state change; the app reads it back from the transaction (v1.1)"
      ],
      "discriminator": [
        112,
        125,
        26,
        8,
        89,
        113,
        72,
        38
      ],
      "accounts": [
        {
          "name": "fund",
          "docs": [
            "Read-only: listed so notes can be found with getSignaturesForAddress(fund)"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "fund.creator",
                "account": "sharedFund"
              },
              {
                "kind": "account",
                "path": "fund.fundId",
                "account": "sharedFund"
              }
            ]
          }
        },
        {
          "name": "author",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "kind",
          "type": "u8"
        },
        {
          "name": "milestone",
          "type": "u8"
        },
        {
          "name": "part",
          "type": "u8"
        },
        {
          "name": "parts",
          "type": "u8"
        },
        {
          "name": "data",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "proposeCancel",
      "docs": [
        "Client or freelancer proposes a split of what is still locked"
      ],
      "discriminator": [
        85,
        167,
        149,
        7,
        201,
        252,
        226,
        227
      ],
      "accounts": [
        {
          "name": "fund",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "fund.creator",
                "account": "sharedFund"
              },
              {
                "kind": "account",
                "path": "fund.fundId",
                "account": "sharedFund"
              }
            ]
          }
        },
        {
          "name": "signer",
          "docs": [
            "Must be the fund's client or freelancer (checked in the handler: NotAParty)"
          ],
          "signer": true
        }
      ],
      "args": [
        {
          "name": "freelancerAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "refund",
      "docs": [
        "Anyone refunds a milestone not submitted by its submission deadline"
      ],
      "discriminator": [
        2,
        96,
        183,
        251,
        63,
        208,
        46,
        46
      ],
      "accounts": [
        {
          "name": "fund",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "fund.creator",
                "account": "sharedFund"
              },
              {
                "kind": "account",
                "path": "fund.fundId",
                "account": "sharedFund"
              }
            ]
          }
        },
        {
          "name": "caller",
          "signer": true
        },
        {
          "name": "client"
        },
        {
          "name": "clientToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "client"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "fund"
              }
            ]
          }
        },
        {
          "name": "mint",
          "address": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
          "relations": [
            "fund"
          ]
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "index",
          "type": "u8"
        }
      ]
    },
    {
      "name": "releaseAfterReview",
      "docs": [
        "Anyone releases a submitted milestone after its review deadline"
      ],
      "discriminator": [
        166,
        250,
        3,
        104,
        87,
        93,
        133,
        142
      ],
      "accounts": [
        {
          "name": "fund",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "fund.creator",
                "account": "sharedFund"
              },
              {
                "kind": "account",
                "path": "fund.fundId",
                "account": "sharedFund"
              }
            ]
          }
        },
        {
          "name": "caller",
          "signer": true
        },
        {
          "name": "destination"
        },
        {
          "name": "destinationToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "destination"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "fund"
              }
            ]
          }
        },
        {
          "name": "mint",
          "address": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
          "relations": [
            "fund"
          ]
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "index",
          "type": "u8"
        }
      ]
    },
    {
      "name": "removeDeviceKey",
      "docs": [
        "Removes one device key"
      ],
      "discriminator": [
        202,
        207,
        22,
        63,
        122,
        138,
        66,
        62
      ],
      "accounts": [
        {
          "name": "wallet",
          "signer": true,
          "relations": [
            "deviceKeys"
          ]
        },
        {
          "name": "deviceKeys",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  118,
                  105,
                  99,
                  101,
                  95,
                  107,
                  101,
                  121,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "wallet"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "key",
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
      "name": "selectJob",
      "docs": [
        "Binds the job to the contract just created for one applicant (same transaction, after create_fund)"
      ],
      "discriminator": [
        45,
        235,
        61,
        40,
        98,
        181,
        176,
        87
      ],
      "accounts": [
        {
          "name": "job",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98
                ]
              },
              {
                "kind": "account",
                "path": "job.business",
                "account": "jobListing"
              },
              {
                "kind": "account",
                "path": "job.jobId",
                "account": "jobListing"
              }
            ]
          }
        },
        {
          "name": "business",
          "signer": true,
          "relations": [
            "job"
          ]
        },
        {
          "name": "fund",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "fund.creator",
                "account": "sharedFund"
              },
              {
                "kind": "account",
                "path": "fund.fundId",
                "account": "sharedFund"
              }
            ]
          }
        },
        {
          "name": "application",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98,
                  95,
                  97,
                  112,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "job"
              },
              {
                "kind": "account",
                "path": "fund.freelancer",
                "account": "sharedFund"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "submit",
      "docs": [
        "Freelancer marks a milestone delivered; `evidence` = SHA-256 of the canonical delivery JSON (never all zero)"
      ],
      "discriminator": [
        88,
        166,
        102,
        181,
        162,
        127,
        170,
        48
      ],
      "accounts": [
        {
          "name": "fund",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "fund.creator",
                "account": "sharedFund"
              },
              {
                "kind": "account",
                "path": "fund.fundId",
                "account": "sharedFund"
              }
            ]
          }
        },
        {
          "name": "freelancer",
          "signer": true,
          "relations": [
            "fund"
          ]
        }
      ],
      "args": [
        {
          "name": "index",
          "type": "u8"
        },
        {
          "name": "evidence",
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
    },
    {
      "name": "withdrawJob",
      "docs": [
        "Returns the budget to the business when no one was hired"
      ],
      "discriminator": [
        98,
        181,
        227,
        136,
        207,
        104,
        184,
        235
      ],
      "accounts": [
        {
          "name": "job",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98
                ]
              },
              {
                "kind": "account",
                "path": "job.business",
                "account": "jobListing"
              },
              {
                "kind": "account",
                "path": "job.jobId",
                "account": "jobListing"
              }
            ]
          }
        },
        {
          "name": "business",
          "writable": true,
          "signer": true,
          "relations": [
            "job"
          ]
        },
        {
          "name": "jobVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "job"
              }
            ]
          }
        },
        {
          "name": "businessToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "business"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mint",
          "address": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
          "relations": [
            "job"
          ]
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "deviceKeys",
      "discriminator": [
        21,
        109,
        123,
        236,
        228,
        152,
        47,
        126
      ]
    },
    {
      "name": "jobApplication",
      "discriminator": [
        114,
        250,
        212,
        242,
        162,
        108,
        58,
        20
      ]
    },
    {
      "name": "jobListing",
      "discriminator": [
        231,
        56,
        185,
        45,
        167,
        183,
        167,
        150
      ]
    },
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
    },
    {
      "name": "sharedFund",
      "discriminator": [
        184,
        140,
        222,
        47,
        54,
        97,
        207,
        134
      ]
    }
  ],
  "events": [
    {
      "name": "cancelProposed",
      "discriminator": [
        72,
        24,
        221,
        107,
        89,
        143,
        148,
        174
      ]
    },
    {
      "name": "deviceKeyAdded",
      "discriminator": [
        101,
        124,
        212,
        99,
        90,
        160,
        208,
        152
      ]
    },
    {
      "name": "deviceKeyRemoved",
      "discriminator": [
        26,
        241,
        137,
        74,
        147,
        94,
        244,
        106
      ]
    },
    {
      "name": "fundAccepted",
      "discriminator": [
        164,
        70,
        200,
        11,
        111,
        255,
        21,
        47
      ]
    },
    {
      "name": "fundCancelled",
      "discriminator": [
        47,
        153,
        7,
        241,
        63,
        253,
        242,
        244
      ]
    },
    {
      "name": "fundClosed",
      "discriminator": [
        28,
        14,
        30,
        198,
        251,
        98,
        180,
        85
      ]
    },
    {
      "name": "fundCreated",
      "discriminator": [
        31,
        8,
        73,
        167,
        79,
        82,
        191,
        82
      ]
    },
    {
      "name": "fundLocked",
      "discriminator": [
        64,
        125,
        19,
        161,
        128,
        92,
        62,
        82
      ]
    },
    {
      "name": "jobApplied",
      "discriminator": [
        98,
        51,
        246,
        33,
        85,
        196,
        124,
        246
      ]
    },
    {
      "name": "jobBriefPosted",
      "discriminator": [
        41,
        241,
        121,
        68,
        66,
        21,
        255,
        230
      ]
    },
    {
      "name": "jobFilled",
      "discriminator": [
        102,
        38,
        182,
        222,
        58,
        203,
        28,
        179
      ]
    },
    {
      "name": "jobFunded",
      "discriminator": [
        109,
        177,
        206,
        113,
        255,
        142,
        11,
        19
      ]
    },
    {
      "name": "jobPosted",
      "discriminator": [
        18,
        171,
        12,
        141,
        212,
        169,
        183,
        52
      ]
    },
    {
      "name": "jobPostedOpen",
      "discriminator": [
        123,
        176,
        17,
        52,
        0,
        144,
        62,
        178
      ]
    },
    {
      "name": "jobSelected",
      "discriminator": [
        26,
        227,
        180,
        210,
        10,
        251,
        184,
        64
      ]
    },
    {
      "name": "jobWithdrawn",
      "discriminator": [
        114,
        138,
        114,
        231,
        67,
        107,
        180,
        51
      ]
    },
    {
      "name": "milestoneDisputed",
      "discriminator": [
        83,
        106,
        229,
        228,
        159,
        61,
        122,
        16
      ]
    },
    {
      "name": "milestoneRefunded",
      "discriminator": [
        44,
        160,
        228,
        6,
        82,
        43,
        123,
        85
      ]
    },
    {
      "name": "milestoneReleased",
      "discriminator": [
        49,
        225,
        91,
        223,
        34,
        165,
        109,
        181
      ]
    },
    {
      "name": "milestoneSubmitted",
      "discriminator": [
        242,
        19,
        75,
        99,
        12,
        28,
        19,
        33
      ]
    },
    {
      "name": "notePosted",
      "discriminator": [
        60,
        196,
        200,
        230,
        85,
        56,
        50,
        8
      ]
    },
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
    },
    {
      "code": 6009,
      "name": "invalidMilestoneCount",
      "msg": "A contract needs 1 to 5 milestones."
    },
    {
      "code": 6010,
      "name": "amountTooLarge",
      "msg": "The contract total is above the maximum amount."
    },
    {
      "code": 6011,
      "name": "invalidDeadline",
      "msg": "A deadline is not valid."
    },
    {
      "code": 6012,
      "name": "reviewWindowTooShort",
      "msg": "The review deadline must be at least the minimum review window after the submission deadline."
    },
    {
      "code": 6013,
      "name": "workWindowTooShort",
      "msg": "Too little time is left before the first submission deadline."
    },
    {
      "code": 6014,
      "name": "sameParty",
      "msg": "The client and the freelancer must be different wallets."
    },
    {
      "code": 6015,
      "name": "invalidFreelancer",
      "msg": "The freelancer address is not valid."
    },
    {
      "code": 6016,
      "name": "titleTooLong",
      "msg": "The title is longer than 32 bytes."
    },
    {
      "code": 6017,
      "name": "invalidMint",
      "msg": "Only devnet USDC is accepted."
    },
    {
      "code": 6018,
      "name": "invalidFundState",
      "msg": "The contract is not in the right state for this action."
    },
    {
      "code": 6019,
      "name": "invalidPayoutKind",
      "msg": "Choose where the earnings go."
    },
    {
      "code": 6020,
      "name": "invalidPayoutDestination",
      "msg": "This payout destination is not allowed for this choice."
    },
    {
      "code": 6021,
      "name": "payoutPartnerNotAllowed",
      "msg": "This payout partner is not on the allowlist."
    },
    {
      "code": 6022,
      "name": "invalidPayoutReference",
      "msg": "The payout reference is missing or not allowed for this choice."
    },
    {
      "code": 6023,
      "name": "milestoneIndexOutOfRange",
      "msg": "This milestone does not exist in the contract."
    },
    {
      "code": 6024,
      "name": "invalidMilestoneStatus",
      "msg": "The milestone is not in the right state for this action."
    },
    {
      "code": 6025,
      "name": "deadlinePassed",
      "msg": "The deadline for this action has passed."
    },
    {
      "code": 6026,
      "name": "deadlineNotReached",
      "msg": "The deadline has not passed yet."
    },
    {
      "code": 6027,
      "name": "notAParty",
      "msg": "Only the client or the freelancer can do this."
    },
    {
      "code": 6028,
      "name": "noCancelProposal",
      "msg": "There is no cancel proposal."
    },
    {
      "code": 6029,
      "name": "cannotAcceptOwnProposal",
      "msg": "The other party must accept the proposal."
    },
    {
      "code": 6030,
      "name": "cancelAmountTooLarge",
      "msg": "The proposed amount is larger than what is still locked."
    },
    {
      "code": 6031,
      "name": "cancelProposalChanged",
      "msg": "The cancel proposal changed. Review it again."
    },
    {
      "code": 6032,
      "name": "fundNotClosable",
      "msg": "This contract cannot be closed now."
    },
    {
      "code": 6033,
      "name": "mathOverflow",
      "msg": "Arithmetic overflow."
    },
    {
      "code": 6034,
      "name": "invalidBriefHash",
      "msg": "The brief fingerprint is missing."
    },
    {
      "code": 6035,
      "name": "briefMismatch",
      "msg": "The brief changed. Read the brief again before accepting."
    },
    {
      "code": 6036,
      "name": "invalidEvidence",
      "msg": "The delivery fingerprint is missing."
    },
    {
      "code": 6037,
      "name": "invalidNote",
      "msg": "The note is empty, too long or has wrong part numbers."
    },
    {
      "code": 6038,
      "name": "noteNotAllowed",
      "msg": "This note cannot be added now."
    },
    {
      "code": 6039,
      "name": "deviceKeysFull",
      "msg": "This wallet already has the maximum number of devices. Remove one first."
    },
    {
      "code": 6040,
      "name": "deviceKeyNotFound",
      "msg": "This device is not registered for this wallet."
    },
    {
      "code": 6041,
      "name": "invalidDeviceKey",
      "msg": "The device key is not valid."
    },
    {
      "code": 6042,
      "name": "jobNotOpen",
      "msg": "This job is not open."
    },
    {
      "code": 6043,
      "name": "applyClosed",
      "msg": "Applications for this job are closed."
    },
    {
      "code": 6044,
      "name": "selectClosed",
      "msg": "The time to select an applicant has passed."
    },
    {
      "code": 6045,
      "name": "acceptWindowOpen",
      "msg": "The selected freelancer can still accept. Try again after the accept window."
    },
    {
      "code": 6046,
      "name": "jobFundMismatch",
      "msg": "This contract does not match the job."
    },
    {
      "code": 6047,
      "name": "notSelected",
      "msg": "No applicant is selected for this job, or this is not the selected contract."
    },
    {
      "code": 6048,
      "name": "withdrawTooEarly",
      "msg": "The budget cannot be withdrawn yet."
    },
    {
      "code": 6049,
      "name": "pitchTooLong",
      "msg": "The pitch is longer than 280 bytes."
    },
    {
      "code": 6050,
      "name": "invalidJobDeadlines",
      "msg": "The job deadlines are not valid."
    },
    {
      "code": 6051,
      "name": "invalidCategory",
      "msg": "The job category is not valid."
    },
    {
      "code": 6052,
      "name": "summaryTooLong",
      "msg": "The job summary must be 1 to 160 bytes."
    },
    {
      "code": 6053,
      "name": "jobNotFunded",
      "msg": "The budget of this job is not locked yet. Lock it in the same step as selecting."
    },
    {
      "code": 6054,
      "name": "jobAlreadyFunded",
      "msg": "The budget of this job is already locked."
    }
  ],
  "types": [
    {
      "name": "cancelProposed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "fund",
            "type": "pubkey"
          },
          {
            "name": "proposer",
            "type": "pubkey"
          },
          {
            "name": "freelancerAmount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "deviceKeyAdded",
      "docs": [
        "v1.2: a device key was registered for `wallet`"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "key",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "count",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "deviceKeyRemoved",
      "docs": [
        "v1.2: a device key was removed from `wallet`"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "key",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "count",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "deviceKeys",
      "docs": [
        "[b\"device_keys\", wallet] → X25519 public keys of the wallet's devices (v1.2, key-sync Plan C).",
        "A contract's key is wrapped for each of these keys in a `post_note` of kind 2; the private keys never leave",
        "the devices. `keys[..count]` are in use; the rest are zero."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "count",
            "type": "u8"
          },
          {
            "name": "keys",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    32
                  ]
                },
                5
              ]
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "fundAccepted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "fund",
            "type": "pubkey"
          },
          {
            "name": "payoutKind",
            "type": {
              "defined": {
                "name": "payoutKind"
              }
            }
          },
          {
            "name": "payoutDestination",
            "type": "pubkey"
          },
          {
            "name": "payoutReference",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "fundCancelled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "fund",
            "type": "pubkey"
          },
          {
            "name": "toDestination",
            "type": "u64"
          },
          {
            "name": "toClient",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "fundClosed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "fund",
            "type": "pubkey"
          },
          {
            "name": "leftoverToClient",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "fundCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "fund",
            "type": "pubkey"
          },
          {
            "name": "client",
            "type": "pubkey"
          },
          {
            "name": "freelancer",
            "type": "pubkey"
          },
          {
            "name": "total",
            "type": "u64"
          },
          {
            "name": "milestoneCount",
            "type": "u8"
          },
          {
            "name": "briefHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "fundKind",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "milestone"
          }
        ]
      }
    },
    {
      "name": "fundLocked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "fund",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "fundState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "created"
          },
          {
            "name": "accepted"
          },
          {
            "name": "funded"
          },
          {
            "name": "settled"
          }
        ]
      }
    },
    {
      "name": "jobApplication",
      "docs": [
        "PDA [JOB_APP_SEED, job, freelancer]; 364 bytes with the discriminator. One per person per job."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "job",
            "docs": [
              "memcmp \"applicants of a job\" (offset 9)"
            ],
            "type": "pubkey"
          },
          {
            "name": "freelancer",
            "docs": [
              "memcmp \"my applications\" (offset 41)"
            ],
            "type": "pubkey"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "pitchLen",
            "type": "u16"
          },
          {
            "name": "pitch",
            "docs": [
              "UTF-8, zero-padded; public"
            ],
            "type": {
              "array": [
                "u8",
                280
              ]
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "jobApplied",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "job",
            "type": "pubkey"
          },
          {
            "name": "freelancer",
            "type": "pubkey"
          },
          {
            "name": "applicationCount",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "jobBriefPosted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "job",
            "type": "pubkey"
          },
          {
            "name": "part",
            "type": "u8"
          },
          {
            "name": "parts",
            "type": "u8"
          },
          {
            "name": "len",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "jobFilled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "job",
            "type": "pubkey"
          },
          {
            "name": "fund",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "jobFunded",
      "docs": [
        "v1.4 (D29): the budget of a \"locks when hired\" listing moved into its job vault (sent with create_fund + select_job)"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "job",
            "type": "pubkey"
          },
          {
            "name": "total",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "jobListing",
      "docs": [
        "PDA [JOB_SEED, business, job_id.to_le_bytes()]; 576 bytes with the discriminator"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "state",
            "docs": [
              "memcmp \"open jobs\" (offset 9)"
            ],
            "type": {
              "defined": {
                "name": "jobState"
              }
            }
          },
          {
            "name": "business",
            "docs": [
              "memcmp \"my listings\" (offset 10)"
            ],
            "type": "pubkey"
          },
          {
            "name": "category",
            "docs": [
              "Index into the @ned/core taxonomy (< JOB_CATEGORY_COUNT); memcmp \"jobs in this category\" (offset 42)"
            ],
            "type": "u8"
          },
          {
            "name": "skills",
            "docs": [
              "Bitmask of up to 64 skills from the same taxonomy (filtered in the browser)"
            ],
            "type": "u64"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "jobId",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "applyBy",
            "docs": [
              "Last time to apply"
            ],
            "type": "i64"
          },
          {
            "name": "selectBy",
            "docs": [
              "Last time to select; withdraw opens after it"
            ],
            "type": "i64"
          },
          {
            "name": "total",
            "docs": [
              "Sum of the template amounts; the job vault holds exactly this (plus any donation)"
            ],
            "type": "u64"
          },
          {
            "name": "milestoneCount",
            "type": "u8"
          },
          {
            "name": "milestones",
            "docs": [
              "MAX_MILESTONES slots (literal so the IDL gets a plain array length); slots >= milestone_count stay zeroed"
            ],
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "jobMilestone"
                  }
                },
                5
              ]
            }
          },
          {
            "name": "title",
            "docs": [
              "UTF-8, zero-padded; searched"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "summary",
            "docs": [
              "UTF-8, zero-padded; the card text; not part of the brief hash"
            ],
            "type": {
              "array": [
                "u8",
                160
              ]
            }
          },
          {
            "name": "briefHash",
            "docs": [
              "SHA-256 of the canonical brief JSON (same canonicalBrief as contracts); never all zero"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "selected",
            "docs": [
              "Default until select_job"
            ],
            "type": "pubkey"
          },
          {
            "name": "selectedAt",
            "type": "i64"
          },
          {
            "name": "fund",
            "docs": [
              "The contract created at select; memcmp \"job of this contract\" (offset 508)"
            ],
            "type": "pubkey"
          },
          {
            "name": "applicationCount",
            "type": "u16"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "vaultBump",
            "type": "u8"
          },
          {
            "name": "unfunded",
            "docs": [
              "v1.4 (D29, lock-at-hire-plan.md): 1 = \"locks when hired\" (post_job_open; nothing locked yet), 0 = the budget is",
              "in the job vault (post_job, or after fund_job). Every v1.3 listing reads 0. memcmp \"funded only\" (offset 544)"
            ],
            "type": "u8"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                31
              ]
            }
          }
        ]
      }
    },
    {
      "name": "jobMilestone",
      "docs": [
        "One milestone of the job template (24 bytes). The contract's absolute deadlines are set at select time."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "workSecs",
            "docs": [
              "The submission deadline is this long after select"
            ],
            "type": "i64"
          },
          {
            "name": "reviewSecs",
            "docs": [
              "review_by − submit_by of the contract milestone"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "jobMilestoneInput",
      "docs": [
        "`post_job` argument (24 bytes)"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "workSecs",
            "type": "i64"
          },
          {
            "name": "reviewSecs",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "jobPosted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "job",
            "type": "pubkey"
          },
          {
            "name": "business",
            "type": "pubkey"
          },
          {
            "name": "jobId",
            "type": "u64"
          },
          {
            "name": "category",
            "type": "u8"
          },
          {
            "name": "total",
            "type": "u64"
          },
          {
            "name": "applyBy",
            "type": "i64"
          },
          {
            "name": "selectBy",
            "type": "i64"
          },
          {
            "name": "briefHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "jobPostedOpen",
      "docs": [
        "v1.4 (D29): a listing that locks its budget when the business selects someone. `total` is the planned budget;",
        "nothing is locked yet."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "job",
            "type": "pubkey"
          },
          {
            "name": "business",
            "type": "pubkey"
          },
          {
            "name": "jobId",
            "type": "u64"
          },
          {
            "name": "category",
            "type": "u8"
          },
          {
            "name": "total",
            "type": "u64"
          },
          {
            "name": "applyBy",
            "type": "i64"
          },
          {
            "name": "selectBy",
            "type": "i64"
          },
          {
            "name": "briefHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "jobSelected",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "job",
            "type": "pubkey"
          },
          {
            "name": "fund",
            "type": "pubkey"
          },
          {
            "name": "freelancer",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "jobState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "open"
          },
          {
            "name": "selected"
          },
          {
            "name": "filled"
          },
          {
            "name": "withdrawn"
          }
        ]
      }
    },
    {
      "name": "jobWithdrawn",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "job",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "milestone",
      "docs": [
        "One milestone slot (65 bytes)"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "submitBy",
            "type": "i64"
          },
          {
            "name": "reviewBy",
            "type": "i64"
          },
          {
            "name": "submittedAt",
            "docs": [
              "0 until submitted"
            ],
            "type": "i64"
          },
          {
            "name": "evidence",
            "docs": [
              "SHA-256 of the canonical delivery JSON (links, file fingerprints, note), computed by the app; never all zero"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "milestoneStatus"
              }
            }
          }
        ]
      }
    },
    {
      "name": "milestoneDisputed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "fund",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "milestoneInput",
      "docs": [
        "`create_fund` argument (24 bytes)"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "submitBy",
            "type": "i64"
          },
          {
            "name": "reviewBy",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "milestoneRefunded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "fund",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u8"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "caller",
            "type": "pubkey"
          },
          {
            "name": "conceded",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "milestoneReleased",
      "docs": [
        "The payout partner matches a deposit to a recipient by this event (`payout_reference`)"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "fund",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u8"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "destination",
            "type": "pubkey"
          },
          {
            "name": "payoutReference",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "byTimeout",
            "type": "bool"
          },
          {
            "name": "caller",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "milestoneStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "submitted"
          },
          {
            "name": "disputed"
          },
          {
            "name": "released"
          },
          {
            "name": "refunded"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    },
    {
      "name": "milestoneSubmitted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "fund",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u8"
          },
          {
            "name": "evidence",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
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
      "name": "notePosted",
      "docs": [
        "An encrypted brief or delivery note was posted (v1.1); the ciphertext is in the instruction data only"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "fund",
            "type": "pubkey"
          },
          {
            "name": "author",
            "type": "pubkey"
          },
          {
            "name": "kind",
            "type": "u8"
          },
          {
            "name": "milestone",
            "type": "u8"
          },
          {
            "name": "part",
            "type": "u8"
          },
          {
            "name": "parts",
            "type": "u8"
          },
          {
            "name": "len",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "payoutKind",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "unset"
          },
          {
            "name": "ownWallet"
          },
          {
            "name": "payoutPartner"
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
      "name": "sharedFund",
      "docs": [
        "PDA [FUND_SEED, creator, fund_id.to_le_bytes()]; 740 bytes with the discriminator"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "kind",
            "type": {
              "defined": {
                "name": "fundKind"
              }
            }
          },
          {
            "name": "state",
            "type": {
              "defined": {
                "name": "fundState"
              }
            }
          },
          {
            "name": "payoutKind",
            "type": {
              "defined": {
                "name": "payoutKind"
              }
            }
          },
          {
            "name": "client",
            "docs": [
              "memcmp filter \"as client\" (offset 12)"
            ],
            "type": "pubkey"
          },
          {
            "name": "freelancer",
            "docs": [
              "memcmp filter \"as freelancer\" (offset 44)"
            ],
            "type": "pubkey"
          },
          {
            "name": "creator",
            "docs": [
              "PDA seed; equals `client` in v1"
            ],
            "type": "pubkey"
          },
          {
            "name": "rentPayer",
            "docs": [
              "Receives the rent of the fund and the vault on `close`"
            ],
            "type": "pubkey"
          },
          {
            "name": "payoutDestination",
            "docs": [
              "A wallet (ATA owner), never a token account; default until `accept`"
            ],
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "fundId",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "total",
            "docs": [
              "Sum of milestone amounts"
            ],
            "type": "u64"
          },
          {
            "name": "released",
            "type": "u64"
          },
          {
            "name": "refunded",
            "type": "u64"
          },
          {
            "name": "milestoneCount",
            "type": "u8"
          },
          {
            "name": "milestones",
            "docs": [
              "MAX_MILESTONES slots (literal so the IDL gets a plain array length); slots >= milestone_count stay zeroed and are ignored"
            ],
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "milestone"
                  }
                },
                5
              ]
            }
          },
          {
            "name": "cancelProposer",
            "docs": [
              "default = no proposal"
            ],
            "type": "pubkey"
          },
          {
            "name": "cancelFreelancerAmount",
            "type": "u64"
          },
          {
            "name": "title",
            "docs": [
              "UTF-8, zero-padded"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "vaultBump",
            "type": "u8"
          },
          {
            "name": "payoutReference",
            "docs": [
              "PayoutPartner only: hash of the partner's recipient ID; zero for OwnWallet"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "briefHash",
            "docs": [
              "SHA-256 of the canonical brief JSON (offset 676), computed by the app; never all zero (v1.1)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
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
