import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./auth.css";

export default function Login() {
  const [formData, setFormData] = useState({
    identifier: "", // username or email
    password: ""
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("/api/auth/login", formData);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      alert("Login successful!");
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid credentials");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="gold-glow">Welcome Back</h2>
        <p className="auth-subtitle">Trade smarter, trade faster.</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username or Email</label>
            <input 
              type="text" name="identifier" required 
              value={formData.identifier} onChange={handleChange} 
              placeholder="Username or Email" 
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" name="password" required 
              value={formData.password} onChange={handleChange} 
              placeholder="••••••••" 
            />
          </div>

          <div style={{ textAlign: 'right', marginBottom: '20px' }}>
            <Link to="/help" className="gold-glow" style={{ fontSize: '0.8rem' }}>Forgot Password?</Link>
          </div>

          <button type="submit" className="btn-gold auth-btn">Sign In</button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/register" className="gold-glow">Join Now</Link>
        </p>
      </div>
    </div>
  );
}
