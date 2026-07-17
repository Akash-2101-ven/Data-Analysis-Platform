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

  const uploadFile = async (redirectTab) => {
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
      if (redirectTab) setActiveTab(redirectTab);
    } catch (error) {
      console.error(error);
      alert("Upload Failed");
    } finally {
      setLoading(false);
    }
  };

  const clearData = () => {
    setFile(null);
    setData(null);
    setDashboardStats({
      totalRows: 0,
      totalColumns: 0,
      totalCharts: 0,
      totalUploads: recentUploads.length
    });
    setSelectedX("");
    setSelectedY("");
    setAggregation("sum");
    setChatHistory([
      { role: "assistant", text: "Data cleared. Upload a new file whenever you're ready." }
    ]);
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
      className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
        activeTab === id
          ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/30"
          : darkMode
          ? "text-gray-300 hover:bg-gray-700/60 hover:text-white"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </button>
  );

  // Reusable empty-state card shown when no dataset has been uploaded yet
  const EmptyState = ({ icon, title, subtitle }) => (
    <div
      className={`flex flex-col items-center text-center gap-3 rounded-2xl border border-dashed p-12 ${
        darkMode ? "border-gray-700 bg-gray-800/40" : "border-gray-300 bg-white/60"
      }`}
    >
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-2xl shadow-md shadow-indigo-500/30">
        {icon}
      </div>
      <div>
        <p className={`font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>{title}</p>
        <p className={`text-sm mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{subtitle}</p>
      </div>
      <button
        onClick={() => setActiveTab("reports")}
        className="mt-2 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white text-sm font-medium px-5 py-2 rounded-xl transition shadow-sm shadow-indigo-500/30"
      >
        📁 Go to Reports
      </button>
    </div>
  );

  // Reusable logo badge used before page titles for consistent branding
  const PageIcon = ({ icon }) => (
    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-2xl shadow-md shadow-indigo-500/30 shrink-0">
      {icon}
    </div>
  );

  return (
    <div
      className={`min-h-screen flex relative overflow-hidden transition-all duration-300 ${
        darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-800"
      }`}
    >
      <style>{`
        @keyframes tabFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .tab-fade { animation: tabFadeIn 0.35s ease-out; }
        @keyframes softPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .pulse-dot { animation: softPulse 2s ease-in-out infinite; }
      `}</style>

      {/* Ambient background blobs — purely decorative */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-0">
        <div className={`absolute -top-32 -left-20 w-96 h-96 rounded-full blur-3xl ${darkMode ? "bg-indigo-500/10" : "bg-indigo-300/25"}`} />
        <div className={`absolute top-1/3 -right-24 w-[28rem] h-[28rem] rounded-full blur-3xl ${darkMode ? "bg-violet-500/10" : "bg-violet-300/20"}`} />
        <div className={`absolute bottom-0 left-1/3 w-80 h-80 rounded-full blur-3xl ${darkMode ? "bg-emerald-500/5" : "bg-emerald-200/20"}`} />
      </div>

      {/* Floating AI Assistant launcher */}
      {activeTab !== "ai" && (
        <button
          onClick={() => setActiveTab("ai")}
          title="Open AI Assistant"
          className="group fixed right-6 bottom-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/40 flex items-center justify-center text-2xl hover:scale-110 active:scale-95 transition-transform duration-200"
        >
          <span className="pulse-dot absolute inset-0 rounded-full bg-indigo-500/40 -z-10" />
          🤖
          <span
            className={`pointer-events-none absolute right-16 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
              darkMode ? "bg-gray-800 text-white" : "bg-gray-900 text-white"
            }`}
          >
            Ask AI Assistant
          </span>
        </button>
      )}

      {/* Sidebar */}
      <div
        className={`w-64 min-h-screen border-r p-6 flex flex-col relative z-10 backdrop-blur-xl ${
          darkMode ? "bg-gray-800/60 border-gray-700" : "bg-white/80 border-gray-200"
        }`}
      >
        <div className="flex items-center gap-2 mb-10 px-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-lg shadow-md shadow-indigo-500/30">
            🚀
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">BI Platform</h2>
        </div>

        <div className="space-y-2 flex-1">
          <NavItem id="dashboard" label="Dashboard" icon="🏠" />
          <NavItem id="reports" label="Reports" icon="📁" />
          <NavItem id="visualizations" label="Visualizations" icon="📈" />
          <NavItem id="ai" label="AI Assistant" icon="🤖" />
          <NavItem id="explorer" label="Explorer" icon="🔍" />
        </div>

        <div className="space-y-2 pt-4 mt-4 border-t border-dashed border-gray-500/20">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
              darkMode
                ? "bg-gray-700/60 text-gray-200 hover:bg-gray-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <span className="text-lg">{darkMode ? "☀️" : "🌙"}</span>
            <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
          </button>

          <button
            onClick={() => {
              if (data && window.confirm("Clear the currently uploaded data? This can't be undone.")) {
                clearData();
              }
            }}
            disabled={!data}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
              darkMode
                ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                : "bg-rose-50 text-rose-600 hover:bg-rose-100"
            }`}
          >
            <span className="text-lg">🗑️</span>
            <span>Clear Data</span>
          </button>
        </div>

        <div className={`flex items-center gap-2 text-xs mt-6 px-1 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
          <span className="relative flex h-2 w-2">
            <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-emerald-500" />
          </span>
          v1.0 · Data Analysis Suite
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto relative z-10">

        {/* ================= DASHBOARD TAB ================= */}
        {activeTab === "dashboard" && (
          <div key="dashboard" className="tab-fade max-w-7xl mx-auto space-y-8">

            {/* Header Banner + User Card */}
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-4">
                <PageIcon icon="📊" />
                <div>
                  <h1 className={`text-4xl font-extrabold tracking-tight bg-gradient-to-r ${darkMode ? "from-white to-gray-300" : "from-gray-900 to-gray-600"} bg-clip-text text-transparent`}>
                    Data Analysis Platform
                  </h1>
                  <p className={`mt-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Interactive Analytics Dashboard & AI-Powered Data Visualization
                  </p>
                </div>
              </div>

              <div
                className={`rounded-2xl p-5 shadow-lg border ${
                  darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                } w-72`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xl font-bold shadow-md shadow-indigo-500/30">
                    {(user?.displayName || user?.email)?.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-lg truncate">
                      {user?.displayName || user?.email?.split("@")[0]}
                    </h3>
                    <p className={`text-sm truncate ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{user?.email}</p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="mt-5 w-full bg-rose-500 hover:bg-rose-600 text-white py-2.5 rounded-xl font-medium transition-all shadow-sm"
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
                {[
                  { label: "Total Rows", value: dashboardStats.totalRows, icon: "📐", accent: "from-indigo-500 to-violet-500" },
                  { label: "Columns", value: dashboardStats.totalColumns, icon: "🧬", accent: "from-emerald-500 to-teal-500" },
                  { label: "Charts", value: dashboardStats.totalCharts, icon: "📊", accent: "from-amber-500 to-orange-500" },
                  { label: "Uploads", value: dashboardStats.totalUploads, icon: "📤", accent: "from-rose-500 to-pink-500" },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className={`relative overflow-hidden p-5 rounded-2xl shadow-lg border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                      darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                    }`}
                  >
                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${kpi.accent}`} />
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{kpi.label}</p>
                      <span className="text-lg">{kpi.icon}</span>
                    </div>
                    <h2 className={`text-3xl font-bold mt-2 ${darkMode ? "text-white" : "text-gray-900"}`}>{kpi.value}</h2>
                  </div>
                ))}
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
              <EmptyState
                icon="📊"
                title="No dataset loaded yet"
                subtitle="Upload a file from the Reports tab to unlock your dashboard."
              />
            )}
          </div>
        )}

        {/* ================= REPORTS TAB ================= */}
        {activeTab === "reports" && (
          <div key="reports" className="tab-fade max-w-4xl mx-auto space-y-6">
            <div className="flex items-start gap-4">
              <PageIcon icon="📁" />
              <div>
                <h1 className={`text-3xl font-extrabold ${darkMode ? "text-white" : "text-gray-900"}`}>
                  Reports
                </h1>
                <p className={`mt-1 text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Upload a dataset, generate the dashboard, and export your results.
                </p>
              </div>
            </div>

            <div className={`p-6 rounded-2xl shadow-sm border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
              <label className={`block mb-2 text-sm font-semibold ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                Upload dataset
              </label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                className={`w-full text-sm cursor-pointer file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-500 file:text-white hover:file:bg-indigo-600 ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}
              />

              <div className="h-px my-6 bg-gradient-to-r from-transparent via-current to-transparent opacity-10" />

              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
                <button
                  onClick={() => uploadFile("dashboard")}
                  disabled={loading}
                  className="flex-1 sm:flex-none bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-medium px-6 py-2.5 rounded-xl transition duration-200 shadow-sm shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Processing…" : "⚡ Generate Dashboard"}
                </button>

                <a
                  href="http://127.0.0.1:8000/export-csv"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-4 py-2.5 rounded-xl text-center transition shadow-sm shadow-emerald-500/20"
                >
                  ⬇️ Download CSV
                </a>

                <a
                  href="http://127.0.0.1:8000/export-pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none bg-rose-500 hover:bg-rose-600 text-white font-medium px-4 py-2.5 rounded-xl text-center transition shadow-sm shadow-rose-500/20"
                >
                  ⬇️ Download PDF
                </a>
              </div>

              <p className={`text-xs mt-3 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                💡 "Generate Dashboard" processes your file and takes you straight to the Dashboard tab.
              </p>
            </div>
          </div>
        )}

        {/* ================= VISUALIZATIONS TAB ================= */}
        {activeTab === "visualizations" && (
          <div key="visualizations" className="tab-fade max-w-7xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
              <PageIcon icon="📈" />
              <h1 className={`text-3xl font-extrabold ${darkMode ? "text-white" : "text-gray-900"}`}>
                Visualizations
              </h1>
            </div>

            {!data && (
              <EmptyState
                icon="📈"
                title="Nothing to visualize yet"
                subtitle="Upload a file from the Reports tab first to generate charts."
              />
            )}

            {data && (
              <>
                {/* Visualization Settings */}
                <div className={`rounded-2xl shadow-sm border p-6 ${darkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-100 text-gray-900"}`}>
                  <div className="flex items-center gap-2 mb-5">
                    <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500" />
                    <h2 className="text-xl font-bold">Visualization Settings</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={`block mb-2 text-sm font-semibold ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        X Axis
                      </label>
                      <select
                        value={selectedX}
                        onChange={(e) => setSelectedX(e.target.value)}
                        className={`w-full rounded-lg p-2.5 border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                          darkMode
                            ? "bg-gray-900 border-gray-600 text-white"
                            : "bg-white border-gray-300 text-gray-900"
                        }`}
                      >
                        {data.columns.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={`block mb-2 text-sm font-semibold ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Y Axis
                      </label>
                      <select
                        value={selectedY}
                        onChange={(e) => setSelectedY(e.target.value)}
                        className={`w-full rounded-lg p-2.5 border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                          darkMode
                            ? "bg-gray-900 border-gray-600 text-white"
                            : "bg-white border-gray-300 text-gray-900"
                        }`}
                      >
                        {data.columns.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={`block mb-2 text-sm font-semibold ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Aggregation
                      </label>
                      <select
                        value={aggregation}
                        onChange={(e) => setAggregation(e.target.value)}
                        className={`w-full rounded-lg p-2.5 border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                          darkMode
                            ? "bg-gray-900 border-gray-600 text-white"
                            : "bg-white border-gray-300 text-gray-900"
                        }`}
                      >
                        <option value="sum">Sum</option>
                        <option value="mean">Average</option>
                        <option value="max">Maximum</option>
                        <option value="min">Minimum</option>
                      </select>
                    </div>
                  </div>

                  <div className={`flex items-center justify-between mt-6 pt-5 border-t ${darkMode ? "border-gray-700" : "border-gray-100"}`}>
                    <p className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                      Change the fields above, then apply to redraw the charts below.
                    </p>
                    <button
                      onClick={() => uploadFile()}
                      disabled={loading}
                      className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-medium px-5 py-2.5 rounded-xl transition shadow-sm shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      {loading ? "Updating…" : "🔄 Update Visualization"}
                    </button>
                  </div>
                </div>

                {data.chart_data && data.chart_data.length > 0 && (
                  <>
                    {/* Quick stat chips (replaces old debug box) */}
                    <div className="flex flex-wrap gap-3">
                      <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${darkMode ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-indigo-50 border-indigo-100 text-indigo-700"}`}>
                        X: {data.x_key}
                      </span>
                      <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${darkMode ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-violet-50 border-violet-100 text-violet-700"}`}>
                        Y: {data.y_key}
                      </span>
                      <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${darkMode ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-emerald-50 border-emerald-100 text-emerald-700"}`}>
                        {data.chart_data.length} data points
                      </span>
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
                            <Bar dataKey={data.y_key} fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={50} />
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
          <div key="ai" className="tab-fade max-w-3xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <PageIcon icon="🤖" />
              <h1 className={`text-3xl font-extrabold ${darkMode ? "text-white" : "text-gray-900"}`}>
                AI Assistant
              </h1>
            </div>

            <div className={`rounded-2xl shadow-sm border flex flex-col h-[680px] overflow-hidden ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
              <div className={`p-4 border-b ${darkMode ? "border-gray-700 bg-gray-800/50" : "border-gray-100 bg-gray-50/50"}`}>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500" />
                  ✨ AI Data Copilot
                </h3>
                <p className={`text-xs mt-0.5 ${darkMode ? "text-gray-400" : "text-gray-400"}`}>Contextual natural language analysis</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-tr-none shadow-sm shadow-indigo-500/20"
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
                    <div className={`text-xs rounded-2xl px-4 py-2.5 animate-pulse ${darkMode ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-400"}`}>
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
                  className={`w-full rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                    darkMode
                      ? "bg-gray-900 border border-gray-600 text-white placeholder-gray-500"
                      : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400"
                  }`}
                />
                <button
                  type="submit"
                  className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-medium px-4 py-2 rounded-xl text-sm transition shrink-0 shadow-sm shadow-indigo-500/30"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================= EXPLORER TAB ================= */}
        {activeTab === "explorer" && (
          <div key="explorer" className="tab-fade max-w-7xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
              <PageIcon icon="🔍" />
              <h1 className={`text-3xl font-extrabold ${darkMode ? "text-white" : "text-gray-900"}`}>
                Explorer
              </h1>
            </div>

            {!data && (
              <EmptyState
                icon="🔍"
                title="No data to explore yet"
                subtitle="Upload a file from the Reports tab to browse your schema and rows."
              />
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
