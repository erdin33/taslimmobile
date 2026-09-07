import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

token = open("token.txt").read().strip()
headers = {
    "Authorization": token,
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0"
}

try:
    req = urllib.request.Request("https://api-taslim.duckdns.org/items", headers=headers)
    with urllib.request.urlopen(req, context=ctx, timeout=10) as res:
        data = json.loads(res.read().decode())
        items = data.get("data", data) if isinstance(data, dict) else data
        print("TOTAL ITEMS:", len(items))
        
        # Cari item dengan status Rusak atau Digunakan
        for item in items:
            st = str(item.get("status")).lower()
            loc = str(item.get("lokasiPenyimpanan") or item.get("lokasi_penyimpanan")).lower()
            if "rusak" in st or "digunakan" in st or "keluar" in st:
                print(f"\nITEM MATCH: ID={item.get('id')}, SN={item.get('serialNumber') or item.get('serial_number')}, Status={item.get('status')}, Loc={item.get('lokasiPenyimpanan')}, PA={item.get('paNumber')}")
                h_req = urllib.request.Request(f"https://api-taslim.duckdns.org/items/{item.get('id')}/history", headers=headers)
                try:
                    with urllib.request.urlopen(h_req, context=ctx, timeout=10) as h_res:
                        h_data = json.loads(h_res.read().decode())
                        print("  RAW HISTORY:", json.dumps(h_data, indent=2))
                except Exception as e:
                    print("  HISTORY ERROR:", e)
                break
except Exception as e:
    print("SERVER ERROR:", e)
