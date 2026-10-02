"""Milestone Lock revenue model (illustration, not a forecast).

Replaces docs/07-strategy-v3/unit_economics.py (Shared Money, segment A).
Every number below is an [Assumption] unless a source is named. Change the
numbers here, not only in prose. Run: python3 unit_economics.py
Standard library only.
"""

# --- Assumptions -------------------------------------------------------------
# N.E.D fee, paid by the client at release. Not charged during the competition
# or before a lawyer's opinion (docs/09-milestone-lock/README.md, decision D2).
CLIENT_FEE_RATES = (0.01, 0.02)               # [Assumption]
MONTHLY_VOLUME_PER_FREELANCER = (300, 500, 1_000)  # USD through Milestone Lock [Assumption]
ACTIVE_FREELANCERS = (100, 1_000, 5_000)      # [Assumption]; no verified market count exists
SOLANA_FEE_PER_CONTRACT = 0.01                # USD, upper bound [Inference]

# Reference cost of one payout to Vietnam (pass-through, not N.E.D revenue).
# Stripe Global Payouts, US sender, local currency outside USD/EUR/GBP:
# US$1.50 + 1.00% cross-border (Vietnam) + 1% FX [Verified 2 Oct 2026,
# https://docs.stripe.com/global-payouts/pricing]. Due and Nium prices are not
# public; replace when quotes arrive.
PARTNER_FIXED, PARTNER_CROSS_BORDER, PARTNER_FX = 1.50, 0.01, 0.01

# What a client pays on a US$1,000 milestone elsewhere [Verified, sources in
# docs/08-research/ned-research-and-compliance.md, business model section].
COMPETITOR_CLIENT_COST_ON_1000 = {
    "Upwork (5% + contract fee from US$0.99)": 50 + 0.99,
    "Fiverr (5.5%)": 55.0,
    "Escrow.com (2.6%, US$50 minimum)": max(26.0, 50.0),
    "Contra (per project, low end)": 2.0,
}


def partner_fee(amount: float) -> float:
    return PARTNER_FIXED + amount * (PARTNER_CROSS_BORDER + PARTNER_FX)


def annual_revenue(freelancers: int, monthly_volume: float, fee: float) -> float:
    return freelancers * monthly_volume * 12 * fee


def main() -> None:
    print("Client cost on a US$1,000 milestone")
    for name, cost in COMPETITOR_CLIENT_COST_ON_1000.items():
        print(f"  {name:<42} US${cost:>7.2f}")
    for fee in CLIENT_FEE_RATES:
        print(f"  {'N.E.D at ' + format(fee, '.0%') + ' (planned)':<42} US${1000 * fee:>7.2f}")
    print(f"  Partner payout to Vietnam (Stripe reference, pass-through): US${partner_fee(1000):.2f}")
    print()
    print("Annual N.E.D revenue before costs (USD) [Assumption]")
    header = "freelancers  volume/month" + "".join(f"  fee {f:.0%}".rjust(12) for f in CLIENT_FEE_RATES)
    print(header)
    for n in ACTIVE_FREELANCERS:
        for v in MONTHLY_VOLUME_PER_FREELANCER:
            row = "".join(f"{annual_revenue(n, v, f):>12,.0f}" for f in CLIENT_FEE_RATES)
            print(f"{n:>11,}  {v:>12,}{row}")
    print()
    print("Costs not yet known: partner fees above pass-through, wallet screening,")
    print("security audit, legal opinion, fee payer for Vietnam users, support.")


if __name__ == "__main__":
    main()
