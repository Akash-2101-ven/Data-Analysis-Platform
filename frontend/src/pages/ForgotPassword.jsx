
import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { Link } from "react-router-dom";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");

  const handleReset = async () => {
    if (!email) {
      alert("Please enter your email");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);

      alert("Password reset email sent successfully.");

    } catch (error) {
      console.log(error);
      alert(error.message);
    }
  };
  return (
  <div
    style={{
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "linear-gradient(135deg, #0f172a, #1e293b)",
    }}
  >
    <div
      style={{
        background: "#1e293b",
        padding: "45px",
        borderRadius: "18px",
        width: "400px",
        color: "white",
        textAlign: "center",
        boxShadow: "0 12px 35px rgba(0,0,0,0.35)",
        border: "1px solid #334155",
      }}
    >
      <div
        style={{
          fontSize: "50px",
          marginBottom: "12px",
        }}
      >
        🔒
      </div>

      <h1
        style={{
          fontSize: "30px",
          fontWeight: "700",
          marginBottom: "10px",
        }}
      >
        Forgot Password
      </h1>

      <p
        style={{
          color: "#cbd5e1",
          fontSize: "15px",
          marginBottom: "25px",
        }}
      >
        Enter your email to receive a password reset link.
      </p>

      <input
        type="email"
        placeholder="Enter your email"
        onChange={(e) => setEmail(e.target.value)}
        style={{
          width: "100%",
          padding: "13px",
          borderRadius: "10px",
          border: "1px solid #475569",
          outline: "none",
          backgroundColor: "#334155",
          color: "white",
          fontSize: "15px",
          boxSizing: "border-box",
        }}
      />

      <button
        onClick={handleReset}
        style={{
          width: "100%",
          padding: "13px",
          marginTop: "22px",
          background: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "10px",
          cursor: "pointer",
          fontWeight: "600",
          fontSize: "15px",
        }}
      >
        Send Reset Link
      </button>

      <p
        style={{
          marginTop: "22px",
          color: "#cbd5e1",
          fontSize: "14px",
        }}
      >
        Remember your password?{" "}
        <Link
          to="/"
          style={{
            color: "#60a5fa",
            textDecoration: "none",
            fontWeight: "600",
          }}
        >
          Back to Login
        </Link>
      </p>
    </div>
  </div>
);
};

export default ForgotPassword;