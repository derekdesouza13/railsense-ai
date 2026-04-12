from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import pickle
import sqlite3

app = Flask(__name__)
CORS(app)

# =========================
# LOAD DATA + MODEL
# =========================
df = pd.read_csv('throughput.csv')
df.columns = df.columns.str.strip().str.lower()

model = pickle.load(open("model.pkl", "rb"))

# =========================
# DATABASE (HISTORY)
# =========================
def init_db():
    conn = sqlite3.connect("predictions.db")
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            station TEXT,
            hour INTEGER,
            prediction INTEGER,
            confidence REAL
        )
    """)
    conn.commit()
    conn.close()

init_db()

# =========================
# ROUTES
# =========================

@app.route('/')
def home():
    return "Backend is running"

# -------------------------
# GET STATIONS (for dropdown)
# -------------------------
@app.route('/stations')
def get_stations():
    station_col = df.columns[0]   # automatically pick first column
    stations = sorted(df[station_col].dropna().unique().tolist())
    return jsonify({"stations": stations})

# -------------------------
# SIMPLE TEST ROUTE
# -------------------------
@app.route('/predict')
def predict():
    return jsonify({"status": "ok"})

# -------------------------
# CHART DATA (dummy safe)
# -------------------------
@app.route('/chart_data')
def chart_data():
    sample = df.sample(50)
    data = [
        {"hour": int(i % 24), "count": int(i % 10 + 1)}
        for i in range(len(sample))
    ]
    return jsonify(data)

# -------------------------
# STATION CHART (top stations)
# -------------------------
@app.route('/station_data')
def station_data():
    station_col = df.columns[0]   # auto-detect column

    top = df[station_col].value_counts().head(10)
    data = [{"station_code": k, "count": int(v)} for k, v in top.items()]

    return jsonify(data)
# -------------------------
# HISTORY
# -------------------------
@app.route('/history')
def history():
    conn = sqlite3.connect("predictions.db")
    c = conn.cursor()
    c.execute("SELECT station, hour, prediction FROM history ORDER BY id DESC LIMIT 5")
    rows = c.fetchall()
    conn.close()

    history_data = [
        {"station": r[0], "hour": r[1], "label": r[2]}
        for r in rows
    ]

    return jsonify({"history": history_data})

# -------------------------
# MAIN PREDICTION (IMPORTANT)
# -------------------------
@app.route('/predict_input', methods=['POST'])
def predict_input():
    try:
        data = request.get_json()

        station = data.get("station_code")
        hour = int(data.get("hour"))

        # SAME FEATURES USED FOR TRAINING (keep consistent!)
        X = [[hour, hour % 7]]

        # PREDICTION
        prediction = int(model.predict(X)[0])

        # REAL CONFIDENCE
        probs = model.predict_proba(X)[0]
        confidence = round(float(max(probs) * 100), 2)

        return jsonify({
            "prediction": prediction,
            "confidence": confidence
        })

    except Exception as e:
        print("REAL ERROR:", e)
        return jsonify({"error": str(e)}), 500
# =========================
# RUN APP
# =========================
if __name__ == "__main__":
    app.run(debug=True)