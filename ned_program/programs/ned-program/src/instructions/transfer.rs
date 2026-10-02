use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

use crate::errors::NedError;
use crate::events::*;

pub fn transfer_stablecoin_handler(ctx: Context<TransferStablecoin>, amount: u64) -> Result<()> {
    require!(amount > 0, NedError::InvalidAmount);

    let cpi_accounts = TransferChecked {
        from: ctx.accounts.from_token_account.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.to_token_account.to_account_info(),
        authority: ctx.accounts.signer.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.key(), cpi_accounts);
    token_interface::transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;

    emit!(StablecoinTransferred {
        from: ctx.accounts.signer.key(),
        from_token_account: ctx.accounts.from_token_account.key(),
        to_token_account: ctx.accounts.to_token_account.key(),
        mint: ctx.accounts.mint.key(),
        amount,
        decimals: ctx.accounts.mint.decimals,
    });
    Ok(())
}

#[derive(Accounts)]
pub struct TransferStablecoin<'info> {
    #[account(
        mut,
        token::mint = mint,
        token::authority = signer,
        token::token_program = token_program
    )]
    pub from_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = mint,
        token::token_program = token_program
    )]
    pub to_token_account: InterfaceAccount<'info, TokenAccount>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
}
