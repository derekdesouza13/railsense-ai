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
print(df.columns)
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
    try:
        # Group by hour
        hourly = df.groupby('hour').size().reset_index(name='count')

        data = [
            {"hour": int(row['hour']), "count": int(row['count'])}
            for _, row in hourly.iterrows()
        ]

        return jsonify(data)

    except Exception as e:
        print("chart_data error:", e)
        return jsonify([])

# -------------------------
# STATION CHART (top stations)
# -------------------------
@app.route('/station_data')
def station_data():
    try:
        station_col = df.columns[0]  # station column

        # Create traffic score (combine multiple features)
        df['traffic_score'] = (
            df.index % 10 +  # variation
            (df['hour'] if 'hour' in df.columns else 0)
        )

        # Aggregate traffic per station
        station_traffic = df.groupby(station_col)['traffic_score'].sum()

        top = station_traffic.sort_values(ascending=False).head(10)

        data = [
            {"station_code": str(k), "count": int(v)}
            for k, v in top.items()
        ]

        return jsonify(data)

    except Exception as e:
        print("station_data error:", e)
        return jsonify([])
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
        
        # Encode station into number
        station_encoded = abs(hash(station)) % 1000
        
        # SAME FEATURES USED FOR TRAINING (keep consistent!)
        X = [[station_encoded, hour]]

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