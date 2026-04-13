import React, { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar
} from "recharts";
import { motion } from "framer-motion";

function App() {
  const [loading, setLoading] = useState(false);
  const [stations, setStations] = useState([]);
  const [data, setData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [stationChart, setStationChart] = useState([]);
  const [result, setResult] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [history, setHistory] = useState([]);
  const [dark, setDark] = useState(false);

  const [station, setStation] = useState("");
  const [hour, setHour] = useState("");

  const [totalRows] = useState(417080);
  const [activeTrains] = useState(1200);
  const [totalStations] = useState(8000);

  // =========================
  // API FUNCTIONS
  // =========================

  const loadChartData = useCallback(async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/chart_data");
      const data = await res.json();
      setChartData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("chart error:", err);
    }
  }, []);

  const loadStationChart = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/station_data");
      const data = await res.json();
      setStationChart(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("station chart error:", err);
    }
  };

  // =========================
  // MAIN LOAD
  // =========================

  useEffect(() => {
    fetch("http://127.0.0.1:5000/predict")
      .then(res => res.json())
      .then(setData)
      .catch(err => console.error("predict error:", err));

    loadChartData();
    loadStationChart();

   fetch("http://127.0.0.1:5000/stations")
  .then(res => res.json())
  .then(data => {
    console.log("stations API:", data);
    setStations(data.stations || data || []);
  })
  .catch(err => console.error("stations error:", err));

  }, [loadChartData]);

  // =========================
  // HISTORY
  // =========================

  useEffect(() => {
    fetch("http://127.0.0.1:5000/history")
      .then(res => res.json())
      .then(data => setHistory(data.history))
      .catch(err => console.error("history error:", err));
  }, []);

  // =========================
  // PREDICTION
  // =========================

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

      if (!json.prediction && json.prediction !== 0) throw new Error();

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

    } catch (err) {
      console.error(err);
      alert("Server error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // UI HELPERS
  // =========================

  const getColor = () => {
    if (confidence > 70) return "bg-green-500";
    if (confidence > 40) return "bg-yellow-500";
    return "bg-red-500";
  };

 const topHour = chartData.length
  ? chartData.reduce(
      (max, item) => item.count > max.count ? item : max,
      { count: 0 }
    )
  : {};
  // =========================
  // UI
  // =========================

  return (
    <div className={`min-h-screen transition-all duration-500 ${
  dark
    ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white"
    : "bg-gradient-to-br from-blue-50 via-white to-blue-100 text-gray-900"
}`}>
      {/* NAVBAR */}
     <div className={`flex justify-between items-center px-8 py-4 backdrop-blur-lg border-b ${
  dark 
    ? "bg-gray-900/70 border-gray-700" 
    : "bg-white/70 border-gray-200"
}`}>
<h1 className="text-xl font-bold tracking-wide bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
  🚆 RailSense AI
</h1>
<p className="text-sm opacity-60 mb-4">
  Select a station and time to predict congestion levels
</p>        <button 
          onClick={()=>setDark(!dark)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {dark ? "Light Mode" : "Dark Mode"}
        </button>
      </div>

      <div className="p-6">

        {/* STATS */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {[ 
            {title:"Total Data Rows", value: totalRows},
            {title:"Active Trains", value: activeTrains},
            {title:"Total Stations", value: totalStations}
          ].map((item,i)=>(
            <motion.div 
  key={i} 
  whileHover={{scale:1.05}}
  whileTap={{scale:0.98}}
              className={`p-6 rounded-xl shadow-md ${
                dark ? "bg-gray-800" : "bg-white"
              }`}>
              <p className="text-sm opacity-70">{item.title}</p>
              <h2 className="text-2xl font-bold text-blue-600">{item.value}</h2>
            </motion.div>
          ))}
        </div>

        {/* INPUT */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">

          <motion.div whileHover={{scale:1.02}}
            className={`p-6 rounded-xl shadow ${
              dark ? "bg-gray-800" : "bg-white"
            }`}>
            <h2 className="mb-4 font-semibold">Run Prediction</h2>

            {/* DROPDOWN */}
           <select
  value={station}
  onChange={e => setStation(e.target.value)}
  className={`w-full mb-3 p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    dark ? "bg-gray-700 border-gray-600 text-white" : "bg-white"
  }`}

            >
              <option value="">Select Station</option>
{(stations || []).map((s, i) => (
                <option key={i} value={s}>{s}</option>
              ))}
            </select>

            <input
  type="number"
  min="0"
  max="23"
  value={hour}
  onChange={e=>setHour(e.target.value)}
  placeholder="Enter hour (0–23)"
  className={`w-full mb-3 p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    dark ? "bg-gray-700 border-gray-600 text-white" : ""
  }`}
/>

           {loading && (
  <p className="text-sm text-blue-500 mb-2 text-center">
    ⏳ Running prediction...
  </p>
)}

<button
  onClick={runPrediction}
className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-3 rounded-lg hover:scale-[1.03] hover:shadow-lg transition-all font-semibold">
  {loading ? "Predicting..." : "🚀 Run Prediction"}
</button>
          </motion.div>

          {/* RESULT */}
          <motion.div 
  initial={{opacity:0, y:20}}
  animate={{opacity:1, y:0}}
  transition={{duration:0.4}}
  className={`p-6 rounded-2xl backdrop-blur-lg border shadow-lg ${
    dark 
      ? "bg-white/10 border-white/20" 
      : "bg-white/70 border-gray-200"
  }`}
>
            <h2 className="mb-4 font-semibold">Prediction Result</h2>

            {result && (
  <div className="space-y-4">

    <div className="text-center">
      <h3 className="text-2xl font-bold text-blue-500">{result}</h3>
      <p className="text-sm opacity-60">Congestion Level</p>
    </div>

    <div>
      <div className="bg-gray-300 h-4 rounded-full overflow-hidden">
        <div
          className={`${getColor()} h-4 rounded-full transition-all duration-500`}
          style={{width:`${confidence}%`}}
        ></div>
      </div>

      <p className="text-sm mt-2 text-center">
        Confidence: <span className="font-semibold">{confidence}%</span>
      </p>
    </div>

  </div>
)}
          </motion.div>
        </div>

        {/* CHARTS */}
        <div className="mb-6 text-center">
          <h2 className="font-semibold text-lg">
            🔥 Top Congested Hour: {topHour.hour || "--"}
          </h2>
        </div>

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
<div key={i} className="p-2 border-b text-sm flex justify-between">
  <span>{h.station}</span>
  <span>{h.hour}:00</span>
  <span className="font-semibold">{h.label}</span>
</div>          ))}
        </div>

      </div>
    </div>
  );
}

export default App;