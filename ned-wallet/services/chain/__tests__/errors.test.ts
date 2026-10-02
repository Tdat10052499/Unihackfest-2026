import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeTxError, PROGRAM_ERRORS, TxFailedError, UserFacingError } from '../errors.ts';

test('program error code from a preflight message maps through the IDL', () => {
  assert.equal(PROGRAM_ERRORS[6001], 'UsernameTaken');
  const err = new Error('Simulation failed. Message: Transaction simulation failed: Error processing Instruction 0: custom program error: 0x1771.');
  assert.equal(describeTxError(err, 'profile'), 'That username was just taken. Please pick another one.');
});

test('program error code from a confirmed value.err maps through the IDL', () => {
  const err = new TxFailedError('sig', { InstructionError: [0, { Custom: 6005 }] });
  assert.match(describeTxError(err, 'profile'), /already linked to another N\.E\.D account/);
});

test('an IDL error without an app sentence uses the program message', () => {
  assert.equal(describeTxError(new Error('custom program error: 0x1778'), 'transfer'), 'Token amount must be greater than 0.');
});

test('a failed transaction without a program code keeps its own sentence', () => {
  const err = new TxFailedError('sig', { InstructionError: [0, 'InvalidAccountData'] });
  assert.equal(describeTxError(err, 'contract'), 'The transaction failed on-chain. Check its status before retrying.');
});

test('user-facing errors pass through', () => {
  assert.equal(describeTxError(new UserFacingError('Not enough devnet SOL for network fee and account rent.'), 'contract'),
    'Not enough devnet SOL for network fee and account rent.');
});

test('common causes and context fallbacks', () => {
  assert.match(describeTxError(new Error('Attempt to debit an account but found no record of a prior credit.'), 'profile'), /Not enough devnet SOL to pay for setup/);
  assert.match(describeTxError(new Error('insufficient lamports 10, need 20'), 'contract'), /Not enough devnet SOL for the network fee/);
  assert.equal(describeTxError(new Error('User rejected the request'), 'transfer'), 'The request was cancelled. Please try again.');
  assert.equal(describeTxError(new Error('boom'), 'profile'), 'Something went wrong while creating your profile. Please try again.');
  assert.equal(describeTxError(new Error('boom'), 'contract'), 'The contract action did not go through. Please try again.');
  assert.equal(describeTxError(new Error('boom'), 'transfer'), 'Transfer failed. Please retry.');
  assert.equal(describeTxError('boom'), 'Something went wrong while creating your profile. Please try again.');
});
