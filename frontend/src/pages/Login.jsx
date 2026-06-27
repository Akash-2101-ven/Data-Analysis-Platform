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

      localStorage.setItem(
        "user",
        JSON.stringify(userCredential.user)
      );

      alert("Login Successful");

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

      localStorage.setItem("user", JSON.stringify(result.user));

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
        background: "#0f172a",
      }}
    >
      <div
        style={{
          background: "#1e293b",
          padding: "40px",
          borderRadius: "12px",
          width: "350px",
          textAlign: "center",
          color: "white",
        }}
      >
        <h1>Data Analytics Platform</h1>

        <p>Welcome Back 👋</p>

        {/* EMAIL */}
        <input
          type="email"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "20px",
            borderRadius: "8px",
            border: "none",
          }}
        />

        {/* PASSWORD */}
        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "15px",
            borderRadius: "8px",
            border: "none",
          }}
        />

        {/* LOGIN BUTTON */}
        <button
          onClick={handleLogin}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "20px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Login
        </button>

        {/* GOOGLE LOGIN */}
        <button
          onClick={handleGoogleLogin}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "10px",
            background: "white",
            color: "black",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Continue with Google
        </button>
        <p style={{ marginTop: "20px", color: "white" }}>
  Don't have an account?{" "}
  <Link
    to="/register"
    style={{
      color: "#60a5fa",
      textDecoration: "none",
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