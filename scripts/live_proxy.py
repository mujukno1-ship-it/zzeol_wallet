from flask import Flask, jsonify, request
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

UPBIT_API_TICKER = "https://api.upbit.com/v1/ticker"
UPBIT_API_MARKET = "https://api.upbit.com/v1/market/all"

@app.route("/prices")
def get_prices():
    symbols_param = request.args.get("symbols", "")
    if not symbols_param:
        return jsonify({"error": "no symbols"}), 400

    symbols = [s.strip().upper() for s in symbols_param.split(",") if s.strip()]
    results = []

    for sym in symbols:
        try:
            url = f"{UPBIT_API_TICKER}?markets=KRW-{sym}"
            r = requests.get(url, timeout=5)
            if r.status_code == 200:
                data = r.json()
                if isinstance(data, list) and len(data) > 0:
              if isinstance(data, list):
    info = data[0]
else:
    info = data

results.append({
    "symbol": sym,
    "price": info.get("trade_price", 0)
})

                else:
                    print(f"[WARN] No data for {sym}")
            else:
                print(f"[ERROR] {sym} returned status {r.status_code}")
        except Exception as e:
            print(f"[EXCEPTION] {sym}: {e}")

    return jsonify(results)

@app.route("/markets")
def get_markets():
    try:
        r = requests.get(UPBIT_API_MARKET, timeout=5)
        if r.status_code == 200:
            return jsonify(r.json())
        else:
            return jsonify({"error": "Upbit market list error"}), 500
    except Exception as e:
        print(f"[MARKET ERROR] {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8081)
