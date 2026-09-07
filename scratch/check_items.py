import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

try:
    token = open('token.txt').read().strip()
    headers = {'Authorization': token, 'Content-Type': 'application/json'}
    req = urllib.request.Request('https://api-taslim.duckdns.org/items', headers=headers)
    with urllib.request.urlopen(req, context=ctx, timeout=10) as res:
        data = json.loads(res.read().decode())
        items = data.get('data', data) if isinstance(data, dict) else data
        print('TOTAL ITEMS:', len(items))
        for i, it in enumerate(items):
            sn = it.get('serialNumber') or it.get('serial_number')
            st = it.get('status')
            loc = it.get('lokasiPenyimpanan') or it.get('lokasi_penyimpanan')
            m = it.get('mitra') or it.get('partner')
            pa = it.get('paNumber') or it.get('pa_number')
            print(f"{i+1:2d}. id={it.get('id')} sn={sn} status={st} loc={loc} mitra={m} pa={pa}")
except Exception as e:
    print("Error:", e)
