import React, { useState } from "react";
import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import { Link } from "react-router-dom";
import { auth, provider } from "../firebase";
import { useNavigate } from "react-router-dom";

const Login = () => {
  // ✅ STATE
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  // 🔐 EMAIL/PASSWORD LOGIN
  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      console.log("Login Success:", userCredential.user);


      navigate("/dashboard"); // ✅ FIXED
    } catch (error) {
      console.log(error);
      alert(error.message);
    }
  };
    // 🌐 GOOGLE LOGIN
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);

      console.log("User:", result.user);


      alert("Login Successful");

      navigate("/dashboard"); // ❌ FIXED (no window.location)
    } catch (error) {
      console.log(error);
      alert(error.code + " : " + error.message);
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
textAlign: "center",
color: "white",
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
  📊
</div>
<h1
  style={{
    fontSize: "30px",
    fontWeight: "700",
    marginBottom: "18px",
  }}
>
  Data Analysis Platform
</h1>

<p
  style={{
    color: "#cbd5e1",
    fontSize: "16px",
    marginTop: "8px",
    marginBottom: "6px",
    fontWeight: "600",
  }}
>
  Welcome 👋
</p>

<p
  style={{
    color: "#94a3b8",
    fontSize: "14px",
    marginBottom: "25px",
  }}
>
  Sign in to continue or create a new account.
</p>

        {/* EMAIL */}
        <input
          type="email"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
          style={{
            
  width: "100%",
  padding: "13px",
  marginTop: "15px",
  borderRadius: "10px",
  border: "1px solid #475569",
  outline: "none",
  backgroundColor: "#334155",
  color: "white",
  fontSize: "15px",
  boxSizing: "border-box",
}}
        />

        {/* PASSWORD */}
        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
          style={{
           
  width: "100%",
  padding: "13px",
  marginTop: "15px",
  borderRadius: "10px",
  border: "1px solid #475569",
  outline: "none",
  backgroundColor: "#334155",
  color: "white",
  fontSize: "15px",
  boxSizing: "border-box",
}}
        />

          <p
  style={{
    textAlign: "right",
    marginTop: "10px",
    fontSize: "14px",
  }}
>
  <Link
    to="/forgot-password"
    style={{
      color: "#60a5fa",
      textDecoration: "none",
      fontWeight: "600",
    }}
  >
    Forgot Password?
  </Link>
</p>


        {/* LOGIN BUTTON */}
        <button
          onClick={handleLogin}
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
          Login
        </button>

        {/* GOOGLE LOGIN */}
        <button
          onClick={handleGoogleLogin}
          style={{
  width: "100%",
  padding: "13px",
  marginTop: "12px",
  background: "#ffffff",
  color: "#111827",
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "15px",
}}
        >
          Continue with Google
        </button>
        <p
  style={{
    marginTop: "22px",
    textAlign: "center",
    fontSize: "14px",
    color: "#cbd5e1",
    whiteSpace: "nowrap",
  }}
>
  Don't have an account?{" "}
  <Link
    to="/register"
    style={{
      color: "#60a5fa",
      textDecoration: "none",
      fontWeight: "600",
    }}
  >
    Create Account
  </Link>
</p>
      </div>
    </div>
  );
};

export default Login;