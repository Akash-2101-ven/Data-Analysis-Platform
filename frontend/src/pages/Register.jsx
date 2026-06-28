import React, { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate, Link } from "react-router-dom";

const Register = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      alert("Please fill all fields");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await updateProfile(userCredential.user, {
        displayName: name,
      });

      alert("Account Created Successfully");

      navigate("/");
    }catch (error) {
      console.log(error);
      alert(error.code + "\n\n" + error.message);
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
  👤
</div>
        <h1
  style={{
    fontSize: "30px",
    fontWeight: "700",
    marginBottom: "10px",
  }}
>
  Create Account
</h1>

<p
  style={{
    color: "#cbd5e1",
    fontSize: "15px",
    marginBottom: "25px",
  }}
>
  Create your account to get started.
</p>

        <input
          type="text"
          placeholder="Full Name"
          onChange={(e) => setName(e.target.value)}
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

        <input
          type="password"
          placeholder="Confirm Password"
          onChange={(e) => setConfirmPassword(e.target.value)}
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

        <button
          onClick={handleRegister}
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
          Create Account
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
          Already have an account?{" "}
          <Link
            to="/"
            style={{
  color: "#60a5fa",
  textDecoration: "none",
  fontWeight: "600",
}}
>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;