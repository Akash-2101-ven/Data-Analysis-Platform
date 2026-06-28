import { Link } from "react-router-dom";

function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}

      <nav className="flex justify-between items-center px-10 py-6 bg-white shadow-sm">

        <h1 className="text-2xl font-bold text-blue-600">
          Data Analytics Platform
        </h1>

        <div className="space-x-4">
          <Link
            to="/login"
            className="text-gray-700 hover:text-blue-600 font-medium"
          >
            Sign In
          </Link>

          <Link
            to="/register"
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"
          >
            Sign Up
          </Link>
        </div>

      </nav>



      {/* Hero Section */}

      <section className="max-w-7xl mx-auto px-10 py-20 flex items-center justify-between">

        {/* Left */}

        <div className="max-w-xl">

          <h1 className="text-5xl font-bold leading-tight">

            Transform Your Data Into

            <span className="text-blue-600">

              {" "}Powerful Insights

            </span>

          </h1>

          <p className="mt-6 text-gray-600 text-lg">

            Upload CSV or Excel files, generate interactive dashboards,

            visualize business metrics and ask questions using AI.

          </p>

          <div className="mt-8 flex gap-4">

            <Link
              to="/login"
              className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700"
            >
              Get Started
            </Link>

            <Link
              to="/register"
              className="border border-gray-400 px-6 py-3 rounded-xl hover:bg-gray-100"
            >
              Create Account
            </Link>

          </div>

        </div>



        {/* Right */}

        <div>

          <img

            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71"

            alt="dashboard"

            className="w-[600px] rounded-2xl shadow-xl"

          />

        </div>

      </section>



      {/* Features */}

      <section className="max-w-7xl mx-auto py-20">

        <h2 className="text-4xl font-bold text-center">

          Features

        </h2>

        <div className="grid grid-cols-4 gap-8 mt-12">

          <div className="bg-white p-8 rounded-xl shadow">
            📊
            <h3 className="font-bold mt-4">Smart Dashboard</h3>
            <p className="text-gray-500 mt-2">
              Automatic KPI cards and charts.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow">
            🤖
            <h3 className="font-bold mt-4">AI Assistant</h3>
            <p className="text-gray-500 mt-2">
              Ask questions about uploaded data.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow">
            📈
            <h3 className="font-bold mt-4">Interactive Charts</h3>
            <p className="text-gray-500 mt-2">
              Bar, Pie and Line charts instantly.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow">
            ⚡
            <h3 className="font-bold mt-4">Fast Processing</h3>
            <p className="text-gray-500 mt-2">
              Upload and analyze files within seconds.
            </p>
          </div>

        </div>

      </section>



      {/* Footer */}

      <footer className="bg-gray-900 text-white py-8 text-center">

        © 2026 Data Analytics Platform

      </footer>

    </div>
  );
}

export default LandingPage;