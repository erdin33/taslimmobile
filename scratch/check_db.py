import sqlite3
import json

con = sqlite3.connect('database/database')
cur = con.cursor()

print("--- ITEMS WITH STATUS Rusak OR Digunakan ---")
rows = cur.execute("SELECT * FROM items WHERE status IN ('Rusak', 'Digunakan') LIMIT 5").fetchall()
col = [d[0] for d in cur.description]
print(json.dumps([dict(zip(col, r)) for r in rows], indent=2, default=str))

print("\n--- ALL TRANSACTIONS WITH category Rusak OR note LIKE '%PA%' ---")
rows2 = cur.execute("SELECT * FROM transactions WHERE category='Rusak' OR note LIKE '%PA%' OR note IS NOT NULL LIMIT 10").fetchall()
col2 = [d[0] for d in cur.description]
print(json.dumps([dict(zip(col2, r)) for r in rows2], indent=2, default=str))
