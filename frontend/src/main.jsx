import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import "./index.css";

import App from "./App.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
    <BrowserRouter>
      <Routes>
      <Route path="/" element={<LandingPage />} />

<Route path="/login" element={<Login />} />

<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <App />
    </ProtectedRoute>
  }
/>

<Route path="/register" element={<Register />} />

<Route path="/forgot-password" element={<ForgotPassword />} />  
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  </StrictMode>
);