import sqlite3
import json

con = sqlite3.connect('database/database')
cur = con.cursor()
print('Tables:', [t[0] for t in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()])
items = cur.execute('SELECT * FROM items').fetchall()
col = [d[0] for d in cur.description]
print('Columns in items:', col)
print('Total items count:', len(items))

from collections import Counter
status_counter = Counter([r[col.index('status')] for r in items])
partner_counter = Counter([r[col.index('partner')] if 'partner' in col else (r[col.index('mitra')] if 'mitra' in col else None) for r in items])
loc_counter = Counter([r[col.index('storage_location')] if 'storage_location' in col else None for r in items])
print("Statuses in DB:", status_counter)
print("Partners/Mitras in DB:", partner_counter)
print("Locations in DB:", loc_counter)

print("\n--- SAMPLE ITEMS ---")
for r in items[:10]:
    d = dict(zip(col, r))
    print(f"sn={d.get('serial_number')} status={d.get('status')} loc={d.get('storage_location')} partner={d.get('partner') or d.get('mitra')}")
