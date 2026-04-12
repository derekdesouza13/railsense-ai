import React, { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar
} from "recharts";
import { motion } from "framer-motion";

function App() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [stationChart, setStationChart] = useState([]);
  const [result, setResult] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [history, setHistory] = useState([]);
  const [dark, setDark] = useState(false);

  const [station, setStation] = useState("");
  const [hour, setHour] = useState("");

  // 🔹 Placeholder Stats
  const [totalRows] = useState(417080);
  const [activeTrains] = useState(1200);
  const [totalStations] = useState(8000);

  const loadChartData = useCallback(async () => {
    const res = await fetch("http://127.0.0.1:5000/chart_data");
    setChartData(await res.json());
  }, []);

  const loadStationChart = async () => {
    const res = await fetch("http://127.0.0.1:5000/station_data");
    setStationChart(await res.json());
  };

  useEffect(() => {
    fetch("http://127.0.0.1:5000/predict")
      .then(res => res.json())
      .then(setData);

    loadChartData();
    loadStationChart();
  }, [loadChartData]);
    useEffect(() => {
  fetch("http://127.0.0.1:5000/history")
    .then(res => res.json())
    .then(data => setHistory(data.history));
}, []);
  const runPrediction = async () => {
  try {
    if (!station || !hour) return alert("Enter inputs");

    setLoading(true);

    const res = await fetch("http://127.0.0.1:5000/predict_input", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ station_code: station, hour })
    });

    const json = await res.json();

    if (!json.prediction) throw new Error();

    setConfidence(json.confidence);

    let label =
      json.prediction === 2 ? "🚨 High" :
      json.prediction === 1 ? "⚠️ Medium" :
      "✅ Low";

    setResult(label);

    setHistory(prev => [
      { station, hour, label },
      ...prev.slice(0, 4)
    ]);

  } catch {
    alert("Server error. Try again.");
  } finally {
    setLoading(false);
  }
};

  const getColor = () => {
    if (confidence > 70) return "bg-green-500";
    if (confidence > 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  const topHour = chartData.reduce(
    (max, item) => item.count > max.count ? item : max,
    { count: 0 }
  );

  return (
    <div className={dark 
      ? "bg-gray-900 text-white min-h-screen transition-all duration-300" 
      : "bg-gray-100 text-gray-900 min-h-screen transition-all duration-300"}>

      {/* NAVBAR */}
      <div className={`flex justify-between items-center px-8 py-4 shadow-md ${
        dark ? "bg-gray-800" : "bg-white"
      }`}>
        <h1 className="text-xl font-bold text-blue-600">RailSense AI</h1>
        <button 
          onClick={()=>setDark(!dark)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {dark ? "Light Mode" : "Dark Mode"}
        </button>
      </div>

      <div className="p-6">

        {/* STAT TILES */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {[ 
            {title:"Total Data Rows", value: totalRows},
            {title:"Active Trains", value: activeTrains},
            {title:"Total Stations", value: totalStations}
          ].map((item,i)=>(
            <motion.div key={i} whileHover={{scale:1.05}}
              className={`p-6 rounded-xl shadow-md ${
                dark ? "bg-gray-800" : "bg-white"
              }`}>
              <p className="text-sm opacity-70">{item.title}</p>
              <h2 className="text-2xl font-bold text-blue-600">{item.value}</h2>
            </motion.div>
          ))}
        </div>

        {/* INPUT + RESULT */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">

          <motion.div whileHover={{scale:1.02}}
            className={`p-6 rounded-xl shadow ${
              dark ? "bg-gray-800" : "bg-white"
            }`}>
            <h2 className="mb-4 font-semibold">Run Prediction</h2>

            <input
              value={station}
              onChange={e=>setStation(e.target.value)}
              placeholder="Station Code"
              className={`w-full mb-3 p-2 rounded border ${
                dark ? "bg-gray-700 border-gray-600" : ""
              }`}
            />

            <input
              value={hour}
              onChange={e=>setHour(e.target.value)}
              placeholder="Hour"
              className={`w-full mb-3 p-2 rounded border ${
                dark ? "bg-gray-700 border-gray-600" : ""
              }`}
            />

          <button
  onClick={runPrediction}
  className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
>
  {loading ? "Predicting..." : "Run Prediction"}
</button>
          </motion.div>

          <motion.div initial={{opacity:0}} animate={{opacity:1}}
            className={`p-6 rounded-xl shadow ${
              dark ? "bg-gray-800" : "bg-white"
            }`}>
            <h2 className="mb-4 font-semibold">Prediction Result</h2>

            {result && <>
              <h3 className="text-xl font-bold text-blue-500">{result}</h3>

              <div className="mt-4">
                <div className="bg-gray-300 h-3 rounded">
                  <div
                    className={`${getColor()} h-3 rounded`}
                    style={{width:`${confidence}%`}}
                  ></div>
                </div>
                <p className="text-sm mt-1">Confidence: {confidence}%</p>
              </div>
            </>}
          </motion.div>
        </div>

        {/* TOP HOUR */}
        <div className="text-center mb-6">
          <h2 className="font-semibold text-lg">
            🔥 Top Congested Hour: {topHour.hour || "--"}
          </h2>
        </div>

        {/* LINE CHART */}
        <div className={`p-6 rounded-xl shadow mb-6 ${
          dark ? "bg-gray-800" : "bg-white"
        }`}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <XAxis dataKey="hour" stroke={dark?"#fff":"#000"} />
              <YAxis stroke={dark?"#fff":"#000"} />
              <Tooltip />
              <Line dataKey="count" stroke="#2563eb"/>
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* BAR CHART */}
        <div className={`p-6 rounded-xl shadow mb-6 ${
          dark ? "bg-gray-800" : "bg-white"
        }`}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stationChart}>
              <XAxis dataKey="station_code" stroke={dark?"#fff":"#000"} />
              <YAxis stroke={dark?"#fff":"#000"} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb"/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* HISTORY */}
        <div className={`p-6 rounded-xl shadow mb-6 ${
          dark ? "bg-gray-800" : "bg-white"
        }`}>
          <h2 className="mb-3 font-semibold">Prediction History</h2>
          {history.map((h,i)=>(
            <p key={i}>{h.station} | {h.hour} → {h.label}</p>
          ))}
        </div>

        {/* FOOTER */}
        <div className="text-center mt-10 text-sm opacity-60">
          Railsense AI @2026 | Built by Derek Dsouza, Suryansh Desai, Mayank Raut, Anish Bandal
        </div>

      </div>
    </div>
  );

}
export default App;