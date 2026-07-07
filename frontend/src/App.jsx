import Login from "./pages/Login";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from "recharts";


function App() {
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedX, setSelectedX] = useState("");
const [selectedY, setSelectedY] = useState("");
const [chartType, setChartType] = useState("Bar");
const [aggregation, setAggregation] = useState("Sum");
  const [darkMode, setDarkMode] = useState(false);
  const user = auth.currentUser;
  // Chat Sidebar States
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { role: "assistant", text: "Hello! Upload a data file and ask me anything about your metrics." }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const uploadFile = async () => {
    if (!file) {
      alert("Please select a file first!");
      return;
    }
    const formData = new FormData();

formData.append("file", file);
formData.append("x_axis", selectedX);
formData.append("y_axis", selectedY);
formData.append("aggregation", aggregation);
    setLoading(true);

    try {
      const response = await axios.post("http://127.0.0.1:8000/upload", formData);
      setData(response.data);
      setSelectedX(response.data.x_key);
setSelectedY(response.data.y_key);
      setChatHistory([
        { role: "assistant", text: `Successfully indexed ${response.data.filename}! Ask me any questions about these fields.` }
      ]);
    } catch (error) {
      console.error(error);
      alert("Upload Failed");
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate();

const handleLogout = async () => {
  try {
    await signOut(auth);

    navigate("/");

  } catch (error) {
    console.log(error);
  }
};

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage = query;
    setChatHistory((prev) => [...prev, { role: "user", text: userMessage }]);
    setQuery("");
    setChatLoading(true);

    const chatFormData = new FormData();
    chatFormData.append("message", userMessage);

    try {
      const response = await axios.post("http://127.0.0.1:8000/chat", chatFormData);
      setChatHistory((prev) => [...prev, { role: "assistant", text: response.data.reply }]);
    } catch (error) {
      console.error(error);
      setChatHistory((prev) => [...prev, { role: "assistant", text: "Failed to connect to the AI router." }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className={`min-h-screen p-6 md:p-10 transition-all duration-300 ${
  darkMode
    ? "bg-gray-900 text-white"
    : "bg-gray-50 text-gray-800"
}`}>
  {/* Header Banner */}
<div className="max-w-7xl mx-auto mb-8 flex justify-between items-start">

  {/* Left Side */}
  <div>
    <h1
      className={`text-4xl font-extrabold tracking-tight ${
        darkMode ? "text-white" : "text-gray-900"
      }`}
    >
      📊 Data Analysis Platform
    </h1>

    <p
      className={`mt-2 ${
        darkMode ? "text-gray-300" : "text-gray-500"
      }`}
    >
      Interactive Analytics Dashboard & AI-Powered Data Visualization
    </p>

    <button
      onClick={() => setDarkMode(!darkMode)}
      className="mt-4 px-4 py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-gray-800 transition"
    >
      {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
    </button>
  </div>

  {/* Right Side */}
 <div
  className={`rounded-2xl p-5 shadow-lg border ${
    darkMode
      ? "bg-gray-800 border-gray-700"
      : "bg-white border-gray-200"
  } w-72`}
>
  <div className="flex items-center gap-4">

    <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-md">
      {(user?.displayName || user?.email)
        ?.charAt(0)
        .toUpperCase()}
    </div>

    <div className="overflow-hidden">
      <h3 className="font-bold text-lg truncate">
        {user?.displayName || user?.email?.split("@")[0]}
      </h3>

      <p className="text-sm text-gray-500 truncate">
        {user?.email}
      </p>
    </div>
  </div>

  <button
    onClick={handleLogout}
    className="mt-5 w-full bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-medium transition-all"
  >
    Logout
  </button>
</div> 
</div>
      {/* Upload Panel */}
      <div className="max-w-7xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-black hover:file:bg-gray-200 cursor-pointer text-gray-500 w-full"
          />
          <button
            onClick={uploadFile}
            disabled={loading}
            className="bg-black hover:bg-gray-800 text-white font-medium px-6 py-2.5 rounded-xl transition duration-200 shadow-sm disabled:bg-gray-400 shrink-0"
          >
            {loading ? "Processing..." : "Generate Dashboard"}
          </button>
        </div>
      </div>

   {data && (
<div
  className={`max-w-7xl mx-auto rounded-2xl shadow-sm border p-6 mb-8 ${
    darkMode
      ? "bg-gray-800 border-gray-700 text-white"
      : "bg-white border-gray-100 text-gray-900"
  }`}
>

    <h2 className="text-xl font-bold mb-5">
      Visualization Settings
    </h2>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

      {/* X Axis */}
      <div>
        <label className="block mb-2 font-medium">
          X Axis
        </label>

        <select
          value={selectedX}
          onChange={(e) => setSelectedX(e.target.value)}
          className="w-full border rounded-lg p-2"
        >
          {data.columns.map((col) => (
            <option key={col} value={col}>
              {col}
            </option>
          ))}
        </select>
      </div>

      {/* Y Axis */}
      <div>
        <label className="block mb-2 font-medium">
          Y Axis
        </label>

        <select
          value={selectedY}
          onChange={(e) => setSelectedY(e.target.value)}
          className="w-full border rounded-lg p-2"
        >
          {data.columns.map((col) => (
            <option key={col} value={col}>
              {col}
            </option>
          ))}
        </select>
      </div>

      {/* Aggregation */}
      <div>
        <label className="block mb-2 font-medium">
          Aggregation
        </label>

        <select
          value={aggregation}
          onChange={(e) => setAggregation(e.target.value)}
          className="w-full border rounded-lg p-2"
        >
          <option value="sum">Sum</option>
          <option value="mean">Average</option>
          <option value="max">Maximum</option>
          <option value="min">Minimum</option>
        </select>
      </div>

    </div>

  </div>
)}   

      {data && (
        <div className="max-w-7xl mx-auto space-y-8">

{/* 📈 EXECUTIVE SUMMARY KPI CARDS */}
<div>
  <h2
  className={`text-xl font-bold mb-4 ${
    darkMode ? "text-white" : "text-gray-900"
  }`}
>
  Executive Summary
</h2>

  {/* Overview KPIs */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
      <p className="text-sm font-medium text-gray-400 uppercase">
        Total Records
      </p>
      <p className="text-2xl font-bold text-gray-900 mt-1">
        {data.overview_kpis?.total_rows}
      </p>
    </div>

    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
      <p className="text-sm font-medium text-gray-400 uppercase">
        Total Columns
      </p>
      <p className="text-2xl font-bold text-blue-600 mt-1">
        {data.overview_kpis?.total_columns}
      </p>
    </div>

    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
      <p className="text-sm font-medium text-gray-400 uppercase">
        Numeric Columns
      </p>
      <p className="text-2xl font-bold text-green-600 mt-1">
        {data.overview_kpis?.numeric_columns}
      </p>
    </div>

    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
      <p className="text-sm font-medium text-gray-400 uppercase">
        Missing Values
      </p>
      <p className="text-2xl font-bold text-red-600 mt-1">
        {data.overview_kpis?.missing_values}
      </p>
    </div>
  </div>

  {/* Column KPIs */}
  {data.column_kpis &&
    Object.entries(data.column_kpis).map(([column, stats]) => (
      <div key={column} className="mb-6">
        <h3 className="text-lg font-semibold mb-3">
          {column} Analytics
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-400 uppercase">Sum</p>
            <p className="text-xl font-bold text-emerald-600">
              {stats.sum.toLocaleString()}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-400 uppercase">Average</p>
            <p className="text-xl font-bold text-blue-600">
              {stats.average.toLocaleString()}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-400 uppercase">Maximum</p>
            <p className="text-xl font-bold text-purple-600">
              {stats.max.toLocaleString()}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-400 uppercase">Minimum</p>
            <p className="text-xl font-bold text-orange-600">
              {stats.min.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    ))}
</div>
          {/* 💬 LAYOUT WORKSPACE: CHARTS (LEFT) + CHATBOX (RIGHT) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT 2 COLUMNS: VISUAL CHARTS */}
            <div className="lg:col-span-2 space-y-8">
              {data.chart_data && data.chart_data.length > 0 && (
                <>
                  {/* BAR CHART */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Automated Data Distribution</h3>
                    <p className="text-sm text-gray-400 mb-6">Visualizing total {data.y_key} grouped by {data.x_key}</p>
                    <div className="w-full h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.chart_data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey={data.x_key} tickLine={false} stroke="#9ca3af" />
                          <YAxis tickLine={false} stroke="#9ca3af" />
                          <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                          <Bar dataKey={data.y_key} fill="#000000" radius={[6, 6, 0, 0]} maxBarSize={50} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* PIE CHART */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Category Composition Matrix</h3>
                    <div className="w-full h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.chart_data}
                            dataKey={data.y_key}
                            nameKey={data.x_key}
                            outerRadius={100}
                            label
                          >
                            {data.chart_data.map((entry, index) => {
                              const sliceColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];
                              return <Cell key={`cell-${index}`} fill={sliceColors[index % sliceColors.length]} />;
                            })}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                          <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" align="center" />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}
            </div>
          
            {/* RIGHT 1 COLUMN: INTERACTIVE SIDEBAR CHATBOX PANEL */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[680px] overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">✨ AI Data Copilot</h3>
                <p className="text-xs text-gray-400">Contextual natural language analysis</p>
              </div>

              {/* Chat Message Logs */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === "user" 
                        ? "bg-black text-white rounded-tr-none" 
                        : "bg-gray-100 text-gray-700 rounded-tl-none border border-gray-200/50"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-400 text-xs rounded-2xl px-4 py-2.5 animate-pulse">
                      Analyzing parameters...
                    </div>
                  </div>
                )}
              </div>

              {/* Input Control Input Form */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 bg-white flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask about columns, dynamic summary..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                />
                <button 
                  type="submit"
                  className="bg-black hover:bg-gray-800 text-white font-medium px-4 py-2 rounded-xl text-sm transition shrink-0"
                >
                  Send
                </button>
              </form>
            </div>

          </div>
            {/* LINE CHART */}
<div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
  <h3 className="text-xl font-bold text-gray-900 mb-2">
    Analytics Trend Overview
  </h3>

  <p className="text-sm text-gray-400 mb-6">
    Trend visualization across grouped dataset values
  </p>

  <div className="w-full h-72">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data.chart_data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />

        <XAxis
          dataKey={data.x_key}
          tickLine={false}
          stroke="#9ca3af"
        />

        <YAxis
          tickLine={false}
          stroke="#9ca3af"
        />

        <Tooltip
          contentStyle={{
            borderRadius: "12px",
            border: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
          }}
        />

        <Legend />

        <Line
          type="monotone"
          dataKey={data.y_key}
          stroke="#3b82f6"
          strokeWidth={3}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
</div>


          {/* SCHEMA MAP & EXPLORER */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-3">Schema Map ({data.columns.length} Fields)</h3>
            <div className="flex flex-wrap gap-2">
              {data.columns.map((col, index) => (
                <span key={index} className="bg-gray-100 text-gray-600 text-sm font-medium px-3 py-1.5 rounded-xl border border-gray-200/50">
                  {col} {col === data.y_key ? "🔢" : ""}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Structured Data Explorer</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {data.columns.map((col, index) => (
                      <th key={index} className="text-xs uppercase font-semibold text-gray-400 tracking-wider px-6 py-4">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.preview.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50/50 transition">
                      {data.columns.map((col, i) => (
                        <td key={i} className="px-6 py-4 text-sm text-gray-600 font-medium">
                          {row[col] !== null && row[col] !== undefined ? row[col].toString() : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default App;