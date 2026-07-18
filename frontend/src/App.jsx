import Login from "./pages/Login";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import html2canvas from "html2canvas";
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

// Shared palette for pie/category colors — "Others" always renders in neutral slate
const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#3b82f6", "#f97316", "#06b6d4"];
const OTHERS_COLOR = "#94a3b8";

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

  // Smart Data Explorer states (server-side pagination/search/sort)
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortColumn, setSortColumnState] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [explorerRows, setExplorerRows] = useState([]);
  const [explorerTotalRows, setExplorerTotalRows] = useState(0);
  const [explorerTotalPages, setExplorerTotalPages] = useState(1);
  const [explorerLoading, setExplorerLoading] = useState(false);

  // Pie chart can get unreadable with many categories, so we cap it to a
  // "Top N + Others" view by default and let the user widen it if they want.
  const [pieTopN, setPieTopN] = useState(8);

  // Drill-down: clicking a bar/pie segment shows the matching raw rows
  const [drillCategory, setDrillCategory] = useState(null);
  const [drillRows, setDrillRows] = useState([]);
  const [drillLoading, setDrillLoading] = useState(false);

  // Ref around the chart section so "Download PNG" can snapshot just the visuals
  const chartsRef = useRef(null);
  const [pngExporting, setPngExporting] = useState(false);

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
      // Reset Smart Data Explorer to page 1 for the newly loaded dataset
      setCurrentPage(1);
      setSearchTerm("");
      setDebouncedSearch("");
      setSortColumnState("");
      setSortOrder("asc");
      setDrillCategory(null);
      setDrillRows([]);
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
    // Reset Smart Data Explorer too
    setCurrentPage(1);
    setSearchTerm("");
    setDebouncedSearch("");
    setSortColumnState("");
    setSortOrder("asc");
    setExplorerRows([]);
    setExplorerTotalRows(0);
    setExplorerTotalPages(1);
    setDrillCategory(null);
    setDrillRows([]);
  };

  // Fetches one page of rows from the backend instead of loading the whole dataset
  const fetchExplorerData = async () => {
    setExplorerLoading(true);
    try {
      const response = await axios.get("http://127.0.0.1:8000/data", {
        params: {
          page: currentPage,
          limit: rowsPerPage,
          search: debouncedSearch,
          sort: sortColumn,
          order: sortOrder
        }
      });
      setExplorerRows(response.data.rows || []);
      setExplorerTotalRows(response.data.total_rows || 0);
      setExplorerTotalPages(response.data.total_pages || 1);
    } catch (error) {
      console.error(error);
    } finally {
      setExplorerLoading(false);
    }
  };

  // Debounce the search box so we don't hit the backend on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Re-fetch whenever page, page size, sorting, or the debounced search changes
  useEffect(() => {
    if (data) {
      fetchExplorerData();
    } else {
      setExplorerRows([]);
      setExplorerTotalRows(0);
      setExplorerTotalPages(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, rowsPerPage, sortColumn, sortOrder, debouncedSearch, data]);

  const handleSort = (col) => {
    if (sortColumn === col) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumnState(col);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(Number(value));
    setCurrentPage(1);
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

  // Sort categories by value and collapse the long tail into "Others" so the
  // pie chart stays readable even when the grouped field has 50-100+ values
  const pieChartData = useMemo(() => {
    if (!data?.chart_data || !data.y_key || !data.x_key) return [];
    const sorted = [...data.chart_data].sort(
      (a, b) => (Number(b[data.y_key]) || 0) - (Number(a[data.y_key]) || 0)
    );
    if (pieTopN === "all" || sorted.length <= pieTopN) return sorted;

    const top = sorted.slice(0, pieTopN);
    const rest = sorted.slice(pieTopN);
    const othersTotal = rest.reduce((sum, item) => sum + (Number(item[data.y_key]) || 0), 0);

    return [...top, { [data.x_key]: `Others (${rest.length})`, [data.y_key]: othersTotal }];
  }, [data, pieTopN]);

  // Maps a correlation coefficient (-1 to +1) to a color: indigo for positive,
  // red for negative, intensity scales with strength. Used by the heatmap.
  const getCorrelationColor = (value) => {
    const v = Math.max(-1, Math.min(1, Number(value) || 0));
    const alpha = 0.12 + Math.abs(v) * 0.75;
    return v >= 0 ? `rgba(99, 102, 241, ${alpha})` : `rgba(239, 68, 68, ${alpha})`;
  };

  // Drill-down: fetch the raw rows behind a clicked bar/pie category so users
  // can see exactly which records make up that slice of the chart.
  const fetchDrillDownRows = async (category) => {
    if (!data || !category || String(category).startsWith("Others")) return;
    setDrillCategory(category);
    setDrillLoading(true);
    try {
      const response = await axios.get("http://127.0.0.1:8000/data", {
        params: { column: data.x_key, value: category, page: 1, limit: 10 }
      });
      setDrillRows(response.data.rows || []);
    } catch (error) {
      console.error(error);
      setDrillRows([]);
    } finally {
      setDrillLoading(false);
    }
  };

  const clearDrillDown = () => {
    setDrillCategory(null);
    setDrillRows([]);
  };

  // PNG export: snapshots the chart section exactly as rendered on screen
  const handleDownloadPng = async () => {
    if (!chartsRef.current) return;
    setPngExporting(true);
    try {
      const canvas = await html2canvas(chartsRef.current, {
        backgroundColor: darkMode ? "#111827" : "#ffffff",
        scale: 2,
        useCORS: true
      });
      const link = document.createElement("a");
      link.download = `dashboard-visuals-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error(error);
      alert("Couldn't generate PNG — please try again.");
    } finally {
      setPngExporting(false);
    }
  };

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
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className={`p-5 rounded-2xl shadow-sm border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
                          <p className="text-sm text-gray-400 uppercase">Sum</p>
                          <p className="text-xl font-bold text-emerald-600">{stats.sum.toLocaleString()}</p>
                        </div>
                        <div className={`p-5 rounded-2xl shadow-sm border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
                          <p className="text-sm text-gray-400 uppercase">Average</p>
                          <p className="text-xl font-bold text-blue-600">{stats.average.toLocaleString()}</p>
                        </div>
                        <div className={`p-5 rounded-2xl shadow-sm border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
                          <p className="text-sm text-gray-400 uppercase">Median</p>
                          <p className="text-xl font-bold text-cyan-600">{(stats.median ?? 0).toLocaleString()}</p>
                        </div>
                        <div className={`p-5 rounded-2xl shadow-sm border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
                          <p className="text-sm text-gray-400 uppercase">Std Dev</p>
                          <p className="text-xl font-bold text-fuchsia-600">{(stats.std_dev ?? 0).toLocaleString()}</p>
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
                  href={`http://127.0.0.1:8000/export-csv?search=${encodeURIComponent(debouncedSearch)}&sort=${encodeURIComponent(sortColumn)}&order=${encodeURIComponent(sortOrder)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-4 py-2.5 rounded-xl text-center transition shadow-sm shadow-emerald-500/20"
                >
                  ⬇️ Download CSV
                </a>

                <a
                  href={`http://127.0.0.1:8000/export-pdf?generated_by=${encodeURIComponent(user?.displayName || user?.email || "Guest User")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none bg-rose-500 hover:bg-rose-600 text-white font-medium px-4 py-2.5 rounded-xl text-center transition shadow-sm shadow-rose-500/20"
                >
                  ⬇️ Download PDF
                </a>
              </div>

              <p className={`text-xs mt-3 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                💡 "Generate Dashboard" processes your file and takes you straight to the Dashboard tab. CSV
                export respects whatever search/sort you've applied in the Explorer tab; PDF export is a full
                business report.
              </p>
            </div>
          </div>
        )}

        {/* ================= VISUALIZATIONS TAB ================= */}
        {activeTab === "visualizations" && (
          <div key="visualizations" className="tab-fade max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <PageIcon icon="📈" />
                <h1 className={`text-3xl font-extrabold ${darkMode ? "text-white" : "text-gray-900"}`}>
                  Visualizations
                </h1>
              </div>

              {data && data.chart_data && data.chart_data.length > 0 && (
                <button
                  onClick={handleDownloadPng}
                  disabled={pngExporting}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    darkMode ? "border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {pngExporting ? "Exporting…" : "🖼️ Download PNG"}
                </button>
              )}
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
                  <div ref={chartsRef} className="space-y-8">
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
                      <span className={`text-xs font-medium px-3 py-1.5 rounded-full border ${darkMode ? "bg-gray-800 border-gray-700 text-gray-500" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                        💡 Click a bar or pie slice to drill down into its rows
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
                            <Bar
                              dataKey={data.y_key}
                              fill="#6366f1"
                              radius={[6, 6, 0, 0]}
                              maxBarSize={50}
                              cursor="pointer"
                              onClick={(entry) => fetchDrillDownRows(entry?.payload?.[data.x_key] ?? entry?.[data.x_key])}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* PIE CHART */}
                    <div className={`p-6 rounded-2xl shadow-sm border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div>
                          <h3 className="text-xl font-bold">Category Composition Matrix</h3>
                          <p className={`text-sm mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            {pieTopN === "all" || data.chart_data.length <= pieTopN
                              ? `All ${data.chart_data.length} categories by ${data.y_key}`
                              : `Top ${pieTopN} of ${data.chart_data.length} categories by ${data.y_key}`}
                          </p>
                        </div>

                        <select
                          value={pieTopN}
                          onChange={(e) => setPieTopN(e.target.value === "all" ? "all" : Number(e.target.value))}
                          className={`rounded-xl px-3 py-2 text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                            darkMode ? "bg-gray-900 border-gray-600 text-white" : "bg-white border-gray-200 text-gray-900"
                          }`}
                        >
                          <option value={5}>Top 5</option>
                          <option value={8}>Top 8</option>
                          <option value={10}>Top 10</option>
                          <option value={15}>Top 15</option>
                          <option value="all">Show all ({data.chart_data.length})</option>
                        </select>
                      </div>

                      <div className="w-full h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieChartData}
                              dataKey={data.y_key}
                              nameKey={data.x_key}
                              innerRadius={60}
                              outerRadius={110}
                              paddingAngle={2}
                              label={({ percent }) => (percent > 0.04 ? `${(percent * 100).toFixed(0)}%` : "")}
                            >
                              {pieChartData.map((entry, index) => {
                                const isOthers = String(entry[data.x_key]).startsWith("Others");
                                return (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={isOthers ? OTHERS_COLOR : PIE_COLORS[index % PIE_COLORS.length]}
                                    stroke={darkMode ? "#1f2937" : "#ffffff"}
                                    strokeWidth={2}
                                    cursor={isOthers ? "default" : "pointer"}
                                    onClick={() => !isOthers && fetchDrillDownRows(entry[data.x_key])}
                                  />
                                );
                              })}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }} />
                            <Legend
                              iconType="circle"
                              layout="horizontal"
                              verticalAlign="bottom"
                              align="center"
                              wrapperStyle={{ fontSize: "12px", lineHeight: "1.6" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {pieTopN !== "all" && data.chart_data.length > pieTopN && (
                        <p className={`text-xs mt-3 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                          💡 The remaining {data.chart_data.length - pieTopN} categories are grouped into "Others". Pick "Show all" above to break them out individually.
                        </p>
                      )}
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

                    {/* PREDICTIVE TREND / FORECAST CHART */}
                    {data.forecast_data && data.forecast_data.length > 0 && (
                      <div className={`p-6 rounded-2xl shadow-sm border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                          <div>
                            <h3 className="text-xl font-bold">Predictive Trend Forecast</h3>
                            <p className="text-sm text-gray-400 mt-1">
                              Linear regression fit over {data.x_key} groups, projected 3 steps ahead
                            </p>
                          </div>
                          {data.trend_info?.direction && (
                            <span
                              className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
                                data.trend_info.direction === "increasing"
                                  ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                                  : data.trend_info.direction === "decreasing"
                                  ? "bg-red-50 border-red-100 text-red-700"
                                  : "bg-gray-50 border-gray-200 text-gray-600"
                              } ${darkMode ? "bg-gray-900 border-gray-700 text-gray-300" : ""}`}
                            >
                              {data.trend_info.direction === "increasing" ? "📈" : data.trend_info.direction === "decreasing" ? "📉" : "➡️"}{" "}
                              {data.trend_info.direction} · R² {data.trend_info.r_squared}
                            </span>
                          )}
                        </div>
                        <div className="w-full h-72 mt-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.forecast_data}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis dataKey={data.x_key} tickLine={false} stroke="#9ca3af" angle={-20} textAnchor="end" height={55} interval={0} tick={{ fontSize: 11 }} />
                              <YAxis tickLine={false} stroke="#9ca3af" />
                              <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }} />
                              <Legend />
                              <Line type="monotone" dataKey="actual" name="Actual" stroke="#6366f1" strokeWidth={3} dot={{ r: 3 }} connectNulls={false} />
                              <Line type="monotone" dataKey="trend" name="Trend / Forecast" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 4" dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <p className={`text-xs mt-3 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                          💡 The last 3 points on the right (no "Actual" value) are forecasted, based on a simple linear trend — not a guarantee of future performance.
                        </p>
                      </div>
                    )}

                    {/* CORRELATION HEATMAP */}
                    {data.correlation_matrix?.columns?.length >= 2 && (
                      <div className={`p-6 rounded-2xl shadow-sm border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
                        <h3 className="text-xl font-bold mb-2">Correlation Heatmap</h3>
                        <p className="text-sm text-gray-400 mb-6">
                          How strongly numeric columns move together, from -1 (opposite) to +1 (same direction)
                        </p>
                        <div className="overflow-x-auto">
                          <table className="border-collapse">
                            <thead>
                              <tr>
                                <th className="p-2"></th>
                                {data.correlation_matrix.columns.map((col) => (
                                  <th key={col} className={`p-2 text-xs font-semibold whitespace-nowrap ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {data.correlation_matrix.columns.map((rowCol, i) => (
                                <tr key={rowCol}>
                                  <td className={`p-2 text-xs font-semibold whitespace-nowrap text-right pr-3 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                                    {rowCol}
                                  </td>
                                  {data.correlation_matrix.matrix[i].map((val, j) => (
                                    <td
                                      key={j}
                                      className="text-center text-xs font-semibold w-16 h-11 rounded-lg"
                                      style={{
                                        backgroundColor: getCorrelationColor(val),
                                        color: Math.abs(val) > 0.55 ? "#ffffff" : darkMode ? "#e5e7eb" : "#1f2937"
                                      }}
                                    >
                                      {val.toFixed(2)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* DRILL-DOWN PANEL — sits outside the PNG-captured ref since it's supplementary, not a chart */}
                {drillCategory && (
                  <div className={`rounded-2xl border p-6 ${darkMode ? "bg-gray-800 border-indigo-500/40" : "bg-white border-indigo-200"}`}>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                          🔎 Drill-down: {data.x_key} = "{drillCategory}"
                        </h3>
                        <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          Showing up to 10 matching raw records
                        </p>
                      </div>
                      <button
                        onClick={clearDrillDown}
                        className={`text-sm font-medium px-3 py-1.5 rounded-lg border transition shrink-0 ${
                          darkMode ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-200 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        ✕ Close
                      </button>
                    </div>

                    {drillLoading ? (
                      <p className={`text-sm animate-pulse ${darkMode ? "text-gray-400" : "text-gray-500"}`}>⏳ Loading rows…</p>
                    ) : drillRows.length === 0 ? (
                      <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>No matching rows found.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className={darkMode ? "bg-gray-900 border-b border-gray-700" : "bg-gray-50 border-b border-gray-100"}>
                              {data.columns.slice(0, 6).map((col) => (
                                <th key={col} className={`text-xs uppercase font-semibold tracking-wider px-4 py-3 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-700/20">
                            {drillRows.map((row, index) => (
                              <tr key={index} className={darkMode ? "hover:bg-gray-700/40 transition" : "hover:bg-gray-50/50 transition"}>
                                {data.columns.slice(0, 6).map((col, i) => (
                                  <td key={i} className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                                    {row[col] !== null && row[col] !== undefined ? row[col].toString() : "—"}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {data.columns.length > 6 && (
                          <p className={`text-xs mt-3 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                            Showing first 6 of {data.columns.length} columns — open the Explorer tab and search "{drillCategory}" for the full row.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
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

                {/* Smart Data Explorer */}
                <div className={`rounded-2xl shadow-sm border overflow-hidden ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
                  <div className={`p-6 border-b flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 ${darkMode ? "border-gray-700" : "border-gray-100"}`}>
                    <div>
                      <h3 className="text-xl font-bold">Smart Data Explorer</h3>
                      <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                        Search, sort, and page through the full dataset without loading it all at once.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-60 pointer-events-none">🔍</span>
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Search rows..."
                          className={`pl-9 pr-3 py-2 rounded-xl text-sm w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                            darkMode
                              ? "bg-gray-900 border border-gray-600 text-white placeholder-gray-500"
                              : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400"
                          }`}
                        />
                      </div>

                      <select
                        value={rowsPerPage}
                        onChange={(e) => handleRowsPerPageChange(e.target.value)}
                        className={`rounded-xl px-3 py-2 text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                          darkMode ? "bg-gray-900 border-gray-600 text-white" : "bg-white border-gray-200 text-gray-900"
                        }`}
                      >
                        <option value={10}>10 / page</option>
                        <option value={20}>20 / page</option>
                        <option value={50}>50 / page</option>
                        <option value={100}>100 / page</option>
                      </select>
                    </div>
                  </div>

                  <div className="relative overflow-x-auto min-h-[200px]">
                    {explorerLoading && (
                      <div className={`absolute inset-0 flex items-center justify-center z-10 backdrop-blur-sm ${darkMode ? "bg-gray-800/70" : "bg-white/70"}`}>
                        <span className={`text-sm font-medium animate-pulse ${darkMode ? "text-gray-300" : "text-gray-500"}`}>
                          ⏳ Loading rows…
                        </span>
                      </div>
                    )}

                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className={darkMode ? "bg-gray-900 border-b border-gray-700" : "bg-gray-50 border-b border-gray-100"}>
                          {data.columns.map((col, index) => (
                            <th
                              key={index}
                              onClick={() => handleSort(col)}
                              className={`text-xs uppercase font-semibold tracking-wider px-6 py-4 cursor-pointer select-none transition ${
                                sortColumn === col
                                  ? "text-indigo-500"
                                  : darkMode
                                  ? "text-gray-400 hover:text-indigo-400"
                                  : "text-gray-500 hover:text-indigo-500"
                              }`}
                            >
                              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                {col}
                                {sortColumn === col && (sortOrder === "asc" ? "▲" : "▼")}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/20">
                        {explorerRows.map((row, index) => (
                          <tr key={index} className={darkMode ? "hover:bg-gray-700/40 transition" : "hover:bg-gray-50/50 transition"}>
                            {data.columns.map((col, i) => (
                              <td key={i} className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                                {row[col] !== null && row[col] !== undefined ? row[col].toString() : "—"}
                              </td>
                            ))}
                          </tr>
                        ))}

                        {!explorerLoading && explorerRows.length === 0 && (
                          <tr>
                            <td
                              colSpan={data.columns.length}
                              className={`px-6 py-12 text-center text-sm ${darkMode ? "text-gray-500" : "text-gray-400"}`}
                            >
                              No matching rows found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination footer */}
                  <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-t text-sm ${darkMode ? "border-gray-700 text-gray-400" : "border-gray-100 text-gray-500"}`}>
                    <p>
                      Showing{" "}
                      <span className={`font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
                        {explorerTotalRows === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}
                        {"–"}
                        {Math.min(currentPage * rowsPerPage, explorerTotalRows)}
                      </span>{" "}
                      of{" "}
                      <span className={`font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}>{explorerTotalRows}</span> rows
                    </p>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${
                          darkMode ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                        }`}
                      >
                        ← Prev
                      </button>

                      <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${darkMode ? "bg-gray-900 text-gray-200" : "bg-white border border-gray-200 text-gray-700"}`}>
                        Page {currentPage} of {explorerTotalPages}
                      </span>

                      <button
                        onClick={() => setCurrentPage((p) => Math.min(explorerTotalPages, p + 1))}
                        disabled={currentPage >= explorerTotalPages}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${
                          darkMode ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                        }`}
                      >
                        Next →
                      </button>
                    </div>
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
