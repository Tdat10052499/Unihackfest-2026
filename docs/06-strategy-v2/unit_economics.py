"""N.E.D Wallet — strategy v2 unit-economics model (Japan -> Vietnam corridor).

Every input below is an ASSUMPTION unless marked SOURCED. Change the values and
re-run `python3 unit_economics.py` to see how the scenarios move.
No third-party packages needed.
"""

# ---- Market (SOURCED, see strategy-v2 docs, section "Market data") ----
VN_WORKERS_JAPAN = 605_906          # MHLW via nippon.com, Oct 2025
CONTRACT_WORKER_REMIT_USD = 6.5e9   # VnExpress Intl, low end of USD 6.5-7 bn/yr (all countries)

# ---- Behaviour (ASSUMPTIONS) ----
JPY_PER_USD = 150                   # assumed FX rate, check before use
SEND_HOME_JPY_PER_MONTH = 100_000   # typical trainee remittance (nippon.com, 2024) -> used as assumption
HUI_PARTICIPATION = 0.50            # share of active users who join at least one hui circle
HUI_CONTRIBUTION_USD_PER_MONTH = 200
SWAP_REVENUE_USD_PER_YEAR = 0       # ignored in base case

# ---- Pricing & costs (ASSUMPTIONS) ----
SEND_FEE = 0.015                    # fee charged on send-home (market avg Japan->VN: 3.70% @ $200, 2.05% @ $500)
SEND_COST = 0.010                   # on/off-ramp + VN payout + KYC per transfer, needs partner quotes
HUI_FEE = 0.01                      # service fee on hui contributions
HUI_COST = 0.001                    # network + infra cost on hui contributions

ADOPTION = {"conservative": 0.005, "base": 0.02, "ambitious": 0.05}


def per_user_year():
    send_usd_year = SEND_HOME_JPY_PER_MONTH / JPY_PER_USD * 12
    hui_usd_year = HUI_PARTICIPATION * HUI_CONTRIBUTION_USD_PER_MONTH * 12
    revenue = send_usd_year * SEND_FEE + hui_usd_year * HUI_FEE + SWAP_REVENUE_USD_PER_YEAR
    gross_profit = (send_usd_year * (SEND_FEE - SEND_COST)
                    + hui_usd_year * (HUI_FEE - HUI_COST)
                    + SWAP_REVENUE_USD_PER_YEAR)
    return send_usd_year, hui_usd_year, revenue, gross_profit


def main():
    send_y, hui_y, rev_u, gp_u = per_user_year()
    print(f"Per active user / year: send-home volume ${send_y:,.0f}, hui volume ${hui_y:,.0f}")
    print(f"  revenue ${rev_u:,.2f}  gross profit ${gp_u:,.2f}\n")
    print(f"{'scenario':<13}{'users':>9}{'send volume':>15}{'share of flows':>16}{'revenue':>13}{'gross profit':>15}")
    for name, a in ADOPTION.items():
        users = round(VN_WORKERS_JAPAN * a)
        vol = users * send_y
        print(f"{name:<13}{users:>9,}{vol:>15,.0f}{vol / CONTRACT_WORKER_REMIT_USD:>15.2%}"
              f"{users * rev_u:>13,.0f}{users * gp_u:>15,.0f}")
    print("\nSensitivity (base adoption): gross profit by send fee x send cost")
    users = round(VN_WORKERS_JAPAN * ADOPTION["base"])
    print(f"{'fee / cost':<12}" + "".join(f"{c:>10.1%}" for c in (0.007, 0.010, 0.013)))
    for fee in (0.010, 0.015, 0.020):
        row = []
        for cost in (0.007, 0.010, 0.013):
            gp = users * (send_y * (fee - cost) + hui_y * (HUI_FEE - HUI_COST))
            row.append(f"{gp:>10,.0f}")
        print(f"{fee:<12.1%}" + "".join(row))


if __name__ == "__main__":
    main()
