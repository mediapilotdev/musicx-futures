use anchor_lang::prelude::*;

declare_id!("Mus1cX1111111111111111111111111111111111111");

#[program]
pub mod musicx_predictions {
    use super::*;

    /// Initialize a new prediction market PDA with an onchain vault
    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        market_id: String,
        settlement_timestamp: i64,
        initial_yes_lamports: u64,
        initial_no_lamports: u64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        market.authority = ctx.accounts.authority.key();
        market.market_id = market_id;
        market.settlement_timestamp = settlement_timestamp;
        market.yes_pool_lamports = initial_yes_lamports;
        market.no_pool_lamports = initial_no_lamports;
        market.total_volume_lamports = initial_yes_lamports + initial_no_lamports;
        market.status = MarketStatus::Open;
        market.vault_bump = ctx.bumps.vault;
        Ok(())
    }

    /// Place a prediction by depositing native SOL directly into the market PDA vault
    pub fn buy_shares(
        ctx: Context<BuyShares>,
        prediction: PredictionType,
        lamports_amount: u64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(market.status == MarketStatus::Open, PredictionError::MarketClosed);

        // Transfer SOL from bettor to onchain market vault
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, lamports_amount)?;

        // Update pools
        match prediction {
            PredictionType::Yes => {
                market.yes_pool_lamports = market.yes_pool_lamports.checked_add(lamports_amount).unwrap();
            }
            PredictionType::No => {
                market.no_pool_lamports = market.no_pool_lamports.checked_add(lamports_amount).unwrap();
            }
        }
        market.total_volume_lamports = market.total_volume_lamports.checked_add(lamports_amount).unwrap();

        // Record onchain position
        let position = &mut ctx.accounts.position;
        position.owner = ctx.accounts.user.key();
        position.market = market.key();
        position.prediction = prediction;
        position.lamports_staked = position.lamports_staked.checked_add(lamports_amount).unwrap();
        position.claimed = false;

        Ok(())
    }

    /// Oracle / Authority resolves the market with verified Spotify chart outcome
    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        outcome: Outcome,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(ctx.accounts.authority.key() == market.authority, PredictionError::Unauthorized);
        require!(market.status == MarketStatus::Open, PredictionError::MarketAlreadyResolved);

        market.status = match outcome {
            Outcome::Yes => MarketStatus::ResolvedYes,
            Outcome::No => MarketStatus::ResolvedNo,
        };

        Ok(())
    }

    /// Backers claim proportional winnings from the onchain vault PDA
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        let market = &ctx.accounts.market;
        let position = &mut ctx.accounts.position;

        require!(!position.claimed, PredictionError::AlreadyClaimed);

        let won = match (&market.status, &position.prediction) {
            (MarketStatus::ResolvedYes, PredictionType::Yes) => true,
            (MarketStatus::ResolvedNo, PredictionType::No) => true,
            _ => false,
        };

        require!(won, PredictionError::DidNotWin);

        // Calculate payout: user's share of total losing + winning pool
        let total_pool = market.yes_pool_lamports.checked_add(market.no_pool_lamports).unwrap();
        let winning_pool = match market.status {
            MarketStatus::ResolvedYes => market.yes_pool_lamports,
            MarketStatus::ResolvedNo => market.no_pool_lamports,
            _ => return Err(PredictionError::MarketClosed.into()),
        };

        let payout = ((position.lamports_staked as u128)
            .checked_mul(total_pool as u128)
            .unwrap()
            .checked_div(winning_pool as u128)
            .unwrap()) as u64;

        position.claimed = true;

        // Transfer funds from PDA vault to user
        **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= payout;
        **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += payout;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(market_id: String)]
pub struct InitializeMarket<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 64 + 8 + 8 + 8 + 8 + 1 + 1,
        seeds = [b"market", market_id.as_bytes()],
        bump
    )]
    pub market: Account<'info, MarketAccount>,

    /// CHECK: PDA escrow vault holding staked SOL
    #[account(
        mut,
        seeds = [b"vault", market.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyShares<'info> {
    #[account(mut)]
    pub market: Account<'info, MarketAccount>,

    /// CHECK: PDA escrow vault
    #[account(
        mut,
        seeds = [b"vault", market.key().as_ref()],
        bump = market.vault_bump
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 32 + 1 + 8 + 1,
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub position: Account<'info, PositionAccount>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub market: Account<'info, MarketAccount>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(mut)]
    pub market: Account<'info, MarketAccount>,

    /// CHECK: PDA escrow vault
    #[account(
        mut,
        seeds = [b"vault", market.key().as_ref()],
        bump = market.vault_bump
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
        bump,
        has_one = market
    )]
    pub position: Account<'info, PositionAccount>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct MarketAccount {
    pub authority: Pubkey,
    pub market_id: String,
    pub settlement_timestamp: i64,
    pub yes_pool_lamports: u64,
    pub no_pool_lamports: u64,
    pub total_volume_lamports: u64,
    pub status: MarketStatus,
    pub vault_bump: u8,
}

#[account]
pub struct PositionAccount {
    pub owner: Pubkey,
    pub market: Pubkey,
    pub prediction: PredictionType,
    pub lamports_staked: u64,
    pub claimed: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PredictionType {
    Yes,
    No,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Outcome {
    Yes,
    No,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MarketStatus {
    Open,
    ResolvedYes,
    ResolvedNo,
}

#[error_code]
pub enum PredictionError {
    #[msg("Market is closed for trading")]
    MarketClosed,
    #[msg("Market is already resolved")]
    MarketAlreadyResolved,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("This position did not win")]
    DidNotWin,
    #[msg("Winnings already claimed")]
    AlreadyClaimed,
}
