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
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];
function App() {
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const uploadFile = async () => {
    if (!file) {
      alert("Please select a file first!");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);

    try {
      const response = await axios.post("http://127.0.0.1:8000/upload", formData);
      setData(response.data);
    } catch (error) {
      console.error(error);
      alert("Upload Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-6 md:p-10">
     {/* Header Banner */}
<div className="max-w-7xl mx-auto mb-8">
  <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Data Analysis Platform</h1>
  <p className="text-gray-500 mt-1">Smart Analytics Dashboard for Automated Business Insights</p>
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
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* 📈 SECTION 1: EXEC SUMMARY KPI CARDS */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Executive Summary</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Total Records</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{data.total_rows} Rows</p>
              </div>
              {data.kpis.target_column && (
                <>
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Total {data.kpis.target_column}</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">{data.kpis.total.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Average {data.kpis.target_column}</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{data.kpis.average.toFixed(1)}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Peak {data.kpis.target_column}</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">{data.kpis.max.toLocaleString()}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 📊 SECTION 2: AUTOMATED CHART GENERATION */}
          {data.chart_data && data.chart_data.length > 0 && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Automated Data Distribution</h3>
              <p className="text-sm text-gray-400 mb-6">Visualizing total {data.y_key} grouped by {data.x_key}</p>
              <div className="w-full h-80">
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
          )}
         {/* 🥧 PIE CHART */}
<div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
  <h3 className="text-xl font-bold text-gray-900 mb-4">Category Distribution</h3>
  <div className="w-full h-80">
    <ResponsiveContainer width="100%" height="100%">
  <PieChart>
    <Pie
      data={data.chart_data}
      dataKey={data.y_key}
      nameKey={data.x_key}
      outerRadius={120}
      label
    >
      {data.chart_data && data.chart_data.map((entry, index) => {
        // Direct inline array declaration to avoid reference bugs
        const sliceColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];
        return (
          <Cell 
            key={`cell-${index}`} 
            fill={sliceColors[index % sliceColors.length]} 
          />
        );
      })}
    </Pie>
    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
    <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" align="center" />
  </PieChart>
</ResponsiveContainer>
  </div>
</div>
          {/* 📋 SECTION 3: DETECTED COLUMNS TAGS */}
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

          {/* 🔍 SECTION 4: TABLE PREVIEW */}
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