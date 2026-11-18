#!/usr/bin/env python3
"""
Seed script — populates one owner account with realistic sari-sari store products.
Run from the backend/ directory:
    python3 seed_products.py

Edit OWNER_ID and PIN below to match the account you want to populate.
"""

import requests, json, uuid, sys
from datetime import date, timedelta

# ── Config ────────────────────────────────────────────────────────────────────
BASE   = "http://192.168.254.103:8000"
OWNER_ID = "TH-MA-0001"   # ← change to your actual Owner ID
PIN      = "1234"          # ← change to your actual PIN

# ── Auth ──────────────────────────────────────────────────────────────────────
print(f"Logging in as {OWNER_ID}…")
r = requests.post(f"{BASE}/auth/owner/login", json={"owner_id": OWNER_ID, "pin": PIN})
if r.status_code != 200:
    print(f"Login failed ({r.status_code}): {r.text}")
    sys.exit(1)
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
print("Login OK.\n")

today      = date.today().isoformat()
in_30_days = (date.today() + timedelta(days=30)).isoformat()
in_60_days = (date.today() + timedelta(days=60)).isoformat()
in_7_days  = (date.today() + timedelta(days=7)).isoformat()

# ── Products ─────────────────────────────────────────────────────────────────
# (name, category, unitPriceCentavos, costCentavos, batches)
# batches: list of (quantity, noExpiry, expirationDate|None)
PRODUCTS = [
    # ── Drinks ────────────────────────────────────────────────────────────────
    ("Coca-Cola 330ml",           "drinks",      2500,  1800, [(30, True, None)]),
    ("Royal TRU-Orange 330ml",    "drinks",      2500,  1800, [(24, True, None)]),
    ("Sprite 330ml",              "drinks",      2500,  1800, [(24, True, None)]),
    ("Nestea Iced Tea 500ml",     "drinks",      2000,  1400, [(36, True, None)]),
    ("Zesto Orange Juice 250ml",  "drinks",      1000,   700, [(48, False, in_60_days)]),
    ("Milo 22g sachet",           "drinks",       800,   550, [(60, False, in_60_days)]),
    ("Nescafé 3-in-1 (pack of 10)","drinks",    5000,  3800, [(20, False, in_60_days)]),
    ("Bear Brand Powdered Milk",  "drinks",      1500,  1100, [(30, False, in_60_days)]),

    # ── Canned Goods ──────────────────────────────────────────────────────────
    ("555 Sardines in Tomato Sauce", "canned",   2000,  1400, [(30, False, in_60_days)]),
    ("Argentina Corned Beef 150g",   "canned",   4500,  3300, [(24, False, in_60_days)]),
    ("Ligo Sardines in Corn Oil",    "canned",   2000,  1400, [(30, False, in_60_days)]),
    ("Century Tuna Flakes in Oil",   "canned",   4500,  3200, [(20, False, in_60_days)]),
    ("Purefoods Vienna Sausage",     "canned",   3500,  2600, [(20, False, in_60_days)]),
    ("Del Monte Tomato Sauce 250g",  "canned",   1800,  1200, [(24, False, in_60_days)]),

    # ── Snacks ────────────────────────────────────────────────────────────────
    ("Oishi Prawn Crackers",         "snacks",   1500,  1000, [(40, False, in_30_days)]),
    ("Jack 'n Jill Piattos Cheese",  "snacks",   1500,  1000, [(40, False, in_30_days)]),
    ("Rebisco Crackers",             "snacks",   1000,   700, [(50, False, in_30_days)]),
    ("Cloudkist Choco Crème",        "snacks",    500,   350, [(60, False, in_30_days)]),
    ("Sky Flakes (1 pack)",          "snacks",    700,   500, [(60, False, in_30_days)]),
    ("Nova Country Cheddar",         "snacks",   1500,  1000, [(40, False, in_30_days)]),
    ("Choc Nut (1 pc)",              "snacks",    300,   200, [(100,False, in_30_days)]),
    ("White Rabbit Candy (1 pc)",    "snacks",    200,   130, [(100,False, in_30_days)]),

    # ── Cold Cuts ─────────────────────────────────────────────────────────────
    ("CDO Chicken Hotdog 1kg",       "coldCuts", 18500, 14000, [(5, False, in_7_days)]),
    ("Purefoods Tender Juicy Hotdog","coldCuts", 18000, 13500, [(5, False, in_7_days)]),
    ("CDO Karne Norte 1kg",          "coldCuts", 22000, 17000, [(4, False, in_7_days)]),
    ("Virginia Tocino Sweet Style",  "coldCuts", 17500, 13000, [(4, False, in_7_days)]),

    # ── Groceries ─────────────────────────────────────────────────────────────
    ("Ganador All-Purpose Flour 1kg","groceries", 8000,  6000, [(10, False, in_60_days)]),
    ("Magnolia All-Purpose Cream",   "groceries", 5500,  4000, [(15, False, in_30_days)]),
    ("Datu Puti Vinegar 1L",         "groceries", 4500,  3200, [(12, True, None)]),
    ("Silver Swan Soy Sauce 1L",     "groceries", 5000,  3600, [(12, True, None)]),
    ("Ajinomoto Seasoning 11g",      "groceries",  700,   480, [(50, True, None)]),
    ("UFC Banana Ketchup 320g",      "groceries", 5500,  4000, [(12, False, in_60_days)]),
    ("NFA Rice (timbang, per 1kg)",  "groceries", 4200,  3800, [(50, True, None)]),
    ("Sugar (per 1kg)",              "groceries", 8000,  7000, [(20, True, None)]),
    ("Cooking Oil (per 1L)",         "groceries",18000, 15000, [(10, True, None)]),
    ("Garlic (per 100g)",            "groceries", 1500,  1000, [(30, False, in_7_days)]),
    ("Onion (per 100g)",             "groceries", 1200,   800, [(30, False, in_7_days)]),
    ("Tomato (per 100g)",            "groceries",  800,   500, [(40, False, in_7_days)]),

    # ── Household ─────────────────────────────────────────────────────────────
    ("Ariel Powder Detergent 60g",   "household", 1500,  1000, [(40, True, None)]),
    ("Tide Bar Soap 100g",           "household", 2000,  1400, [(30, True, None)]),
    ("Surf Liquid Detergent 90ml",   "household", 1500,  1000, [(30, True, None)]),
    ("Joy Dishwashing Liquid 250ml", "household", 6500,  4800, [(15, True, None)]),
    ("Baygon Cockroach Killer 50g",  "household", 4500,  3200, [(10, True, None)]),
    ("Candles (pack of 10)",         "household", 2500,  1800, [(20, True, None)]),
    ("Scotch Tape (small roll)",     "household", 1500,  1000, [(20, True, None)]),
    ("Ziplock Bag (pack of 10)",     "household", 2000,  1400, [(20, True, None)]),

    # ── Personal Care ─────────────────────────────────────────────────────────
    ("Head & Shoulders Shampoo 10ml","personalCare",1000, 700, [(50, True, None)]),
    ("Palmolive Shampoo 10ml",       "personalCare",1000, 700, [(50, True, None)]),
    ("Safeguard Bar Soap 55g",       "personalCare",2500,1800, [(30, True, None)]),
    ("Colgate Toothpaste 50ml",      "personalCare",4000,2900, [(20, False, in_60_days)]),
    ("Soft & Beautiful Deodorant",   "personalCare",8500,6200, [(10, True, None)]),
    ("Kotex Thin Maxi Pads (8pcs)",  "personalCare",8000,5800, [(15, False, in_60_days)]),
    ("Generics Paracetamol 500mg",   "personalCare",1000, 700, [(30, False, in_30_days)]),
    ("Efficascent Oil 50ml",         "personalCare",8000,5800, [(10, True, None)]),
]

# ── Create ────────────────────────────────────────────────────────────────────
ok = 0
fail = 0
for name, category, price, cost, batches in PRODUCTS:
    batch_list = [
        {"quantity": qty, "noExpiry": no_exp, "expirationDate": exp}
        for qty, no_exp, exp in batches
    ]
    payload = {
        "name": name,
        "category": category,
        "unitPriceCentavos": price,
        "costCentavos": cost,
        "batches": batch_list,
    }
    r = requests.post(f"{BASE}/inventory/products", headers=headers, json=payload)
    if r.status_code == 201:
        print(f"  ✓  {name}")
        ok += 1
    else:
        print(f"  ✗  {name} → {r.status_code}: {r.text[:120]}")
        fail += 1

print(f"\nDone. {ok} created, {fail} failed.")
