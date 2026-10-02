"""N.E.D Wallet — strategy v3 ("Shared Money") unit-economics model.

Beachhead used here: Vietnamese workers in Japan (segment A).
Every input is an ASSUMPTION unless marked SOURCED. Edit the values and run
`python3 unit_economics.py`. Standard library only.
"""

# ---- Market (SOURCED, see strategy-v3.en.md section 8) ----
VN_WORKERS_JAPAN = 605_906          # MHLW via nippon.com, Oct 2025
CONTRACT_WORKER_REMIT_USD = 6.5e9   # VnExpress Intl, low end of USD 6.5-7 bn/yr, all countries

# ---- Behaviour (ASSUMPTIONS) ----
JPY_PER_USD = 150                   # assumed FX rate; update before use
SEND_HOME_JPY_PER_MONTH = 100_000   # typical trainee remittance (nippon.com, 2024), used as an assumption
ROTATING_PARTICIPATION = 0.50       # share of active users in at least one Rotating Fund
ROTATING_CONTRIBUTION_USD_PER_MONTH = 200
MILESTONE_PARTICIPATION = 0.0       # share of active users who lock client money (0 for segment A; set >0 for segment B)
MILESTONE_LOCKED_USD_PER_MONTH = 500

# ---- Pricing & costs (ASSUMPTIONS) ----
SEND_FEE, SEND_COST = 0.015, 0.010          # Japan->VN market average: 3.70% @ $200, 2.05% @ $500 (World Bank Q3 2025)
ROTATING_FEE, ROTATING_COST = 0.010, 0.001  # service fee on contributions; network + infra cost
MILESTONE_FEE, MILESTONE_COST = 0.010, 0.001

ADOPTION = {"conservative": 0.005, "base": 0.02, "ambitious": 0.05}


def per_user_year(send_fee=SEND_FEE, send_cost=SEND_COST):
    send = SEND_HOME_JPY_PER_MONTH / JPY_PER_USD * 12
    rotating = ROTATING_PARTICIPATION * ROTATING_CONTRIBUTION_USD_PER_MONTH * 12
    milestone = MILESTONE_PARTICIPATION * MILESTONE_LOCKED_USD_PER_MONTH * 12
    revenue = send * send_fee + rotating * ROTATING_FEE + milestone * MILESTONE_FEE
    gross = (send * (send_fee - send_cost)
             + rotating * (ROTATING_FEE - ROTATING_COST)
             + milestone * (MILESTONE_FEE - MILESTONE_COST))
    return send, rotating, milestone, revenue, gross


def main():
    send, rot, mil, rev, gp = per_user_year()
    print(f"Per active user / year: send-home ${send:,.0f}, rotating-fund ${rot:,.0f}, milestone-lock ${mil:,.0f}")
    print(f"  revenue ${rev:,.2f}  gross profit ${gp:,.2f}\n")
    print(f"{'scenario':<13}{'users':>9}{'send volume':>15}{'vs flows':>10}{'revenue':>13}{'gross profit':>15}")
    for name, a in ADOPTION.items():
        users = round(VN_WORKERS_JAPAN * a)
        vol = users * send
        print(f"{name:<13}{users:>9,}{vol:>15,.0f}{vol / CONTRACT_WORKER_REMIT_USD:>10.2%}"
              f"{users * rev:>13,.0f}{users * gp:>15,.0f}")
    users = round(VN_WORKERS_JAPAN * ADOPTION["base"])
    costs = (0.007, 0.010, 0.013)
    print("\nSensitivity (base adoption): gross profit by send-home fee (rows) x send-home cost (columns)")
    print(f"{'':<8}" + "".join(f"{c:>11.1%}" for c in costs))
    for fee in (0.010, 0.015, 0.020):
        print(f"{fee:<8.1%}" + "".join(f"{users * per_user_year(fee, c)[4]:>11,.0f}" for c in costs))


if __name__ == "__main__":
    main()
