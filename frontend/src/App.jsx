import Login from "./pages/Login";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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
  const [dashboardStats, setDashboardStats] = useState({
    totalRows: 0,
    totalColumns: 0,
    totalCharts: 0,
    totalUploads: 0
  });
  const [recentUploads, setRecentUploads] = useState([]);
  const [showUploads, setShowUploads] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedX, setSelectedX] = useState("");
  const [selectedY, setSelectedY] = useState("");
  const [chartType, setChartType] = useState("Bar");
  const [aggregation, setAggregation] = useState("Sum");
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
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
    if (selectedX) formData.append("x_axis", selectedX);
    if (selectedY) formData.append("y_axis", selectedY);
    formData.append("aggregation", aggregation);
    setLoading(true);

    try {
      const response = await axios.post("http://127.0.0.1:8000/upload", formData);
      console.log(response.data);
      setData(response.data);

      setDashboardStats({
        totalRows: response.data.total_rows,
        totalColumns: response.data.columns.length,
        totalCharts: response.data.chart_data.length,
        totalUploads: recentUploads.length
      });
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

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/recent-uploads")
      .then((res) => {
        setRecentUploads(res.data);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  // Reusable nav item so all 5 sidebar buttons stay in sync automatically
  const NavItem = ({ id, label, icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full text-left p-3 rounded-xl transition ${
        activeTab === id
          ? "bg-blue-500 text-white"
          : darkMode
          ? "hover:bg-gray-700"
          : "hover:bg-gray-200"
      }`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div
      className={`min-h-screen flex transition-all duration-300 ${
        darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-800"
      }`}
    >
      {/* Sidebar */}
      <div
        className={`w-64 min-h-screen border-r p-6 ${
          darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}
      >
        <h2 className="text-2xl font-bold mb-10">🚀 BI Platform</h2>

        <div className="space-y-4">
          <NavItem id="dashboard" label="Dashboard" icon="🏠" />
          <NavItem id="reports" label="Reports" icon="📁" />
          <NavItem id="visualizations" label="Visualizations" icon="📈" />
          <NavItem id="ai" label="AI Assistant" icon="🤖" />
          <NavItem id="explorer" label="Explorer" icon="🔍" />
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto">

        {/* ================= DASHBOARD TAB ================= */}
        {activeTab === "dashboard" && (
          <div className="max-w-7xl mx-auto space-y-8">

            {/* Header Banner + User Card */}
            <div className="flex justify-between items-start">
              <div>
                <h1 className={`text-4xl font-extrabold tracking-tight ${darkMode ? "text-white" : "text-gray-900"}`}>
                  📊 Data Analysis Platform
                </h1>
                <p className={`mt-2 ${darkMode ? "text-gray-300" : "text-gray-500"}`}>
                  Interactive Analytics Dashboard & AI-Powered Data Visualization
                </p>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="mt-4 px-4 py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-gray-800 transition"
                >
                  {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
                </button>
              </div>

              <div
                className={`rounded-2xl p-5 shadow-lg border ${
                  darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                } w-72`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-md">
                    {(user?.displayName || user?.email)?.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-lg truncate">
                      {user?.displayName || user?.email?.split("@")[0]}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">{user?.email}</p>
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

            {/* Recent Uploads */}
            <div
              className={`rounded-2xl shadow-lg p-5 border ${
                darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
              }`}
            >
              <button onClick={() => setShowUploads(!showUploads)} className="w-full flex justify-between items-center">
                <h2 className="text-xl font-bold">📂 Recent Uploads</h2>
                <span className="text-2xl">{showUploads ? "▲" : "▼"}</span>
              </button>

              {showUploads && (
                <div className="mt-5">
                  {recentUploads.length === 0 ? (
                    <p>No uploads found.</p>
                  ) : (
                    recentUploads.map((upload) => (
                      <div
                        key={upload.id}
                        className={`rounded-xl p-4 mb-3 border transition-all ${
                          darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <p className="font-semibold text-lg">📄 {upload.filename}</p>
                        <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-500"}`}>
                          Rows: {upload.total_rows} {" | "} Columns: {upload.total_columns}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* KPI Cards */}
            {data && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <div className={`p-5 rounded-2xl shadow-lg border transition-all duration-300 hover:scale-105 hover:shadow-2xl ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                  <p className="text-gray-500 text-sm">Total Rows</p>
                  <h2 className="text-3xl font-bold mt-2">{dashboardStats.totalRows}</h2>
                </div>
                <div className={`p-5 rounded-2xl shadow-lg border transition-all duration-300 hover:scale-105 hover:shadow-2xl ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                  <p className="text-gray-500 text-sm">Columns</p>
                  <h2 className="text-3xl font-bold mt-2">{dashboardStats.totalColumns}</h2>
                </div>
                <div className={`p-5 rounded-2xl shadow-lg border transition-all duration-300 hover:scale-105 hover:shadow-2xl ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                  <p className="text-gray-500 text-sm">Charts</p>
                  <h2 className="text-3xl font-bold mt-2">{dashboardStats.totalCharts}</h2>
                </div>
                <div className={`p-5 rounded-2xl shadow-lg border transition-all duration-300 hover:scale-105 hover:shadow-2xl ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                  <p className="text-gray-500 text-sm">Uploads</p>
                  <h2 className="text-3xl font-bold mt-2">{dashboardStats.totalUploads}</h2>
                </div>
              </div>
            )}

            {/* Executive Summary + Column KPIs */}
            {data && (
              <div>
                <h2 className={`text-xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>
                  Executive Summary
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className={`p-5 rounded-2xl shadow-sm border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
                    <p className="text-sm font-medium text-gray-400 uppercase">Total Records</p>
                    <p className={`text-2xl font-bold mt-1 ${darkMode ? "text-white" : "text-gray-900"}`}>
                      {data.overview_kpis?.total_rows}
                    </p>
                  </div>
                  <div className={`p-5 rounded-2xl shadow-sm border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
                    <p className="text-sm font-medium text-gray-400 uppercase">Total Columns</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{data.overview_kpis?.total_columns}</p>
                  </div>
                  <div className={`p-5 rounded-2xl shadow-sm border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
                    <p className="text-sm font-medium text-gray-400 uppercase">Numeric Columns</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{data.overview_kpis?.numeric_columns}</p>
                  </div>
                  <div className={`p-5 rounded-2xl shadow-sm border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
                    <p className="text-sm font-medium text-gray-400 uppercase">Missing Values</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{data.overview_kpis?.missing_values}</p>
                  </div>
                </div>

                {data.column_kpis &&
                  Object.entries(data.column_kpis).map(([column, stats]) => (
                    <div key={column} className="mb-6">
                      <h3 className="text-lg font-semibold mb-3">{column} Analytics</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className={`p-5 rounded-2xl shadow-sm border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
                          <p className="text-sm text-gray-400 uppercase">Sum</p>
                          <p className="text-xl font-bold text-emerald-600">{stats.sum.toLocaleString()}</p>
                        </div>
                        <div className={`p-5 rounded-2xl shadow-sm border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
                          <p className="text-sm text-gray-400 uppercase">Average</p>
                          <p className="text-xl font-bold text-blue-600">{stats.average.toLocaleString()}</p>
                        </div>
                        <div className={`p-5 rounded-2xl shadow-sm border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
                          <p className="text-sm text-gray-400 uppercase">Maximum</p>
                          <p className="text-xl font-bold text-purple-600">{stats.max.toLocaleString()}</p>
                        </div>
                        <div className={`p-5 rounded-2xl shadow-sm border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
                          <p className="text-sm text-gray-400 uppercase">Minimum</p>
                          <p className="text-xl font-bold text-orange-600">{stats.min.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {!data && (
              <p className={darkMode ? "text-gray-400" : "text-gray-500"}>
                Upload a file from the Reports tab to see your dashboard.
              </p>
            )}
          </div>
        )}

        {/* ================= REPORTS TAB ================= */}
        {activeTab === "reports" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <h1 className={`text-3xl font-extrabold ${darkMode ? "text-white" : "text-gray-900"}`}>
              📁 Reports
            </h1>

            <div className={`p-6 rounded-2xl shadow-sm border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap">
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

                <button
                  onClick={uploadFile}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl shrink-0"
                >
                  Update Visualization
                </button>

                <a
                  href="http://127.0.0.1:8000/export-csv"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-center shrink-0"
                >
                  Download CSV Report
                </a>

                <a
                  href="http://127.0.0.1:8000/export-pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-center shrink-0"
                >
                  Download PDF Report
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ================= VISUALIZATIONS TAB ================= */}
        {activeTab === "visualizations" && (
          <div className="max-w-7xl mx-auto space-y-8">
            <h1 className={`text-3xl font-extrabold ${darkMode ? "text-white" : "text-gray-900"}`}>
              📈 Visualizations
            </h1>

            {!data && (
              <p className={darkMode ? "text-gray-400" : "text-gray-500"}>
                Upload a file from the Reports tab first to generate charts.
              </p>
            )}

            {data && (
              <>
                {/* Visualization Settings */}
                <div className={`rounded-2xl shadow-sm border p-6 ${darkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-100 text-gray-900"}`}>
                  <h2 className="text-xl font-bold mb-5">Visualization Settings</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block mb-2 font-medium">X Axis</label>
                      <select
                        value={selectedX}
                        onChange={(e) => setSelectedX(e.target.value)}
                        className="w-full border rounded-lg p-2 text-gray-900"
                      >
                        {data.columns.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block mb-2 font-medium">Y Axis</label>
                      <select
                        value={selectedY}
                        onChange={(e) => setSelectedY(e.target.value)}
                        className="w-full border rounded-lg p-2 text-gray-900"
                      >
                        {data.columns.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block mb-2 font-medium">Aggregation</label>
                      <select
                        value={aggregation}
                        onChange={(e) => setAggregation(e.target.value)}
                        className="w-full border rounded-lg p-2 text-gray-900"
                      >
                        <option value="sum">Sum</option>
                        <option value="mean">Average</option>
                        <option value="max">Maximum</option>
                        <option value="min">Minimum</option>
                      </select>
                    </div>
                  </div>
                </div>

                {data.chart_data && data.chart_data.length > 0 && (
                  <>
                    <div className="bg-red-100 p-4 rounded text-black">
                      <p>X Key: {data.x_key}</p>
                      <p>Y Key: {data.y_key}</p>
                      <p>Chart Length: {data.chart_data.length}</p>
                    </div>

                    {/* BAR CHART */}
                    <div className={`p-6 rounded-2xl shadow-sm border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
                      <h3 className="text-xl font-bold mb-2">Automated Data Distribution</h3>
                      <p className="text-sm text-gray-400 mb-6">
                        Visualizing total {data.y_key} grouped by {data.x_key}
                      </p>
                      <div className="w-full h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data.chart_data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey={data.x_key} tickLine={false} stroke="#9ca3af" />
                            <YAxis tickLine={false} stroke="#9ca3af" />
                            <Tooltip cursor={{ fill: "#f9fafb" }} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }} />
                            <Bar dataKey={data.y_key} fill="#000000" radius={[6, 6, 0, 0]} maxBarSize={50} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* PIE CHART */}
                    <div className={`p-6 rounded-2xl shadow-sm border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
                      <h3 className="text-xl font-bold mb-4">Category Composition Matrix</h3>
                      <div className="w-full h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={data.chart_data} dataKey={data.y_key} nameKey={data.x_key} outerRadius={100} label>
                              {data.chart_data.map((entry, index) => {
                                const sliceColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];
                                return <Cell key={`cell-${index}`} fill={sliceColors[index % sliceColors.length]} />;
                              })}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }} />
                            <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" align="center" />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* LINE CHART */}
                    <div className={`p-6 rounded-2xl shadow-sm border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
                      <h3 className="text-xl font-bold mb-2">Analytics Trend Overview</h3>
                      <p className="text-sm text-gray-400 mb-6">Trend visualization across grouped dataset values</p>
                      <div className="w-full h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={data.chart_data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey={data.x_key} tickLine={false} stroke="#9ca3af" />
                            <YAxis tickLine={false} stroke="#9ca3af" />
                            <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }} />
                            <Legend />
                            <Line type="monotone" dataKey={data.y_key} stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ================= AI ASSISTANT TAB ================= */}
        {activeTab === "ai" && (
          <div className="max-w-3xl mx-auto">
            <h1 className={`text-3xl font-extrabold mb-6 ${darkMode ? "text-white" : "text-gray-900"}`}>
              🤖 AI Assistant
            </h1>

            <div className={`rounded-2xl shadow-sm border flex flex-col h-[680px] overflow-hidden ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
              <div className={`p-4 border-b ${darkMode ? "border-gray-700 bg-gray-800/50" : "border-gray-100 bg-gray-50/50"}`}>
                <h3 className="text-lg font-bold flex items-center gap-2">✨ AI Data Copilot</h3>
                <p className="text-xs text-gray-400">Contextual natural language analysis</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.role === "user"
                          ? "bg-black text-white rounded-tr-none"
                          : darkMode
                          ? "bg-gray-700 text-gray-100 rounded-tl-none border border-gray-600"
                          : "bg-gray-100 text-gray-700 rounded-tl-none border border-gray-200/50"
                      }`}
                    >
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

              <form
                onSubmit={handleSendMessage}
                className={`p-4 border-t flex gap-2 ${darkMode ? "border-gray-700 bg-gray-800" : "border-gray-100 bg-white"}`}
              >
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask about columns, dynamic summary..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-black"
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
        )}

        {/* ================= EXPLORER TAB ================= */}
        {activeTab === "explorer" && (
          <div className="max-w-7xl mx-auto space-y-8">
            <h1 className={`text-3xl font-extrabold ${darkMode ? "text-white" : "text-gray-900"}`}>
              🔍 Explorer
            </h1>

            {!data && (
              <p className={darkMode ? "text-gray-400" : "text-gray-500"}>
                Upload a file from the Reports tab to explore your data.
              </p>
            )}

            {data && (
              <>
                {/* Schema Map */}
                <div className={`p-6 rounded-2xl shadow-sm border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
                  <h3 className="text-xl font-bold mb-3">Schema Map ({data.columns.length} Fields)</h3>
                  <div className="flex flex-wrap gap-2">
                    {data.columns.map((col, index) => (
                      <span
                        key={index}
                        className={`text-sm font-medium px-3 py-1.5 rounded-xl border ${darkMode ? "bg-gray-700 text-gray-200 border-gray-600" : "bg-gray-100 text-gray-600 border-gray-200/50"}`}
                      >
                        {col} {col === data.y_key ? "🔢" : ""}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Structured Data Explorer Table */}
                <div className={`rounded-2xl shadow-sm border overflow-hidden ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
                  <div className={`p-6 border-b ${darkMode ? "border-gray-700" : "border-gray-100"}`}>
                    <h3 className="text-xl font-bold">Structured Data Explorer</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className={darkMode ? "bg-gray-900 border-b border-gray-700" : "bg-gray-50 border-b border-gray-100"}>
                          {data.columns.map((col, index) => (
                            <th key={index} className="text-xs uppercase font-semibold text-gray-400 tracking-wider px-6 py-4">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/20">
                        {data.preview.map((row, index) => (
                          <tr key={index} className={darkMode ? "hover:bg-gray-700/40 transition" : "hover:bg-gray-50/50 transition"}>
                            {data.columns.map((col, i) => (
                              <td key={i} className="px-6 py-4 text-sm font-medium">
                                {row[col] !== null && row[col] !== undefined ? row[col].toString() : "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
