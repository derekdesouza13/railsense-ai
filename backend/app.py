import pickle
import sqlite3
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
def init_db():
    conn = sqlite3.connect('predictions.db')
    c = conn.cursor()
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            station TEXT,
            hour INTEGER,
            prediction INTEGER,
            confidence REAL
        )
    ''')
    
    conn.commit()
    conn.close()

init_db()
# Load model and data
model = pickle.load(open("model.pkl", "rb"))
df = pd.read_csv("throughput.csv")

@app.route('/')
def home():
    return "Backend is running"

@app.route('/predict')
def predict():
    X = df[['station_code', 'hour']]
    predictions = model.predict(X)

    response_df = df.copy()
    response_df['prediction'] = predictions
    return jsonify(response_df.head(20).to_dict(orient='records'))

@app.route('/predict_input', methods=['POST'])
def predict_input():
    data = request.get_json(silent=True) or {}

    if 'station_code' not in data or 'hour' not in data:
        return jsonify({"error": "station_code and hour are required"}), 400

    try:
        station = int(data['station_code'])
        hour = int(data['hour'])
    except (TypeError, ValueError):
        return jsonify({"error": "station_code and hour must be integers"}), 400

    # Build input with feature names expected by sklearn model.
    input_df = pd.DataFrame([{
        "station_code": station,
        "hour": hour
    }])

    prediction = model.predict(input_df)[0]
    probabilities = model.predict_proba(input_df)[0]
    confidence = max(probabilities) * 100
    
    return jsonify({
        "prediction": int(prediction),
        "confidence": round(confidence, 2)
        
    })

@app.route('/station_data')
def station_data():
    grouped = df.groupby('station_code').size().reset_index(name='count')
    return grouped.head(10).to_json(orient='records')
@app.route('/chart_data')
def chart_data():
    grouped = df.groupby('hour').size().reset_index(name='count')
    return jsonify(grouped.to_dict(orient='records'))
@app.route('/live_metrics')
def live_metrics():
    total_trains = len(df)
    peak_hour = df.groupby('hour').size().idxmax()
    busiest_station = df['station_code'].value_counts().idxmax()

    return {
        "total_trains": total_trains,
        "peak_hour": int(peak_hour),
        "busiest_station": int(busiest_station)
    }
    
def save_prediction(station, hour, prediction, confidence):
    conn = sqlite3.connect('predictions.db')
    c = conn.cursor()

    c.execute('''
        INSERT INTO history (station, hour, prediction, confidence)
        VALUES (?, ?, ?, ?)
    ''', (station, hour, prediction, confidence))

    conn.commit()
    conn.close()
@app.route('/history')
def get_history():
    conn = sqlite3.connect('predictions.db')
    c = conn.cursor()

    c.execute('SELECT station, hour, prediction, confidence FROM history ORDER BY id DESC LIMIT 10')
    rows = c.fetchall()

    conn.close()

    history = []
    for row in rows:
        history.append({
            "station": row[0],
            "hour": row[1],
            "prediction": row[2],
            "confidence": row[3]
        })

    return {"history": history}
if __name__ == '__main__':
    app.run(debug=True)
