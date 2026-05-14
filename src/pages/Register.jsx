import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./auth.css";

export default function Register() {
  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
        await axios.post("/api/auth/register", {
          full_name: formData.full_name,
          username: formData.username,
          email: formData.email,
          password: formData.password
        });
        alert("Registration successful! Please log in.");
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="gold-glow">Join QuickTrade</h2>
        <p className="auth-subtitle">Trade smarter, trade faster.</p>
        
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} placeholder="e.g. Miguel Santos" />
          </div>
          <div className="form-group">
            <label>Username *</label>
            <input type="text" name="username" required value={formData.username} onChange={handleChange} placeholder="Unique username" />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="your@email.com" />
          </div>
          <div className="form-group">
            <label>Password * (min 8 chars)</label>
            <input type="password" name="password" required value={formData.password} onChange={handleChange} placeholder="••••••••" />
          </div>
          <div className="form-group">
            <label>Confirm Password *</label>
            <input type="password" name="confirmPassword" required value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" />
          </div>

          <button type="submit" className="btn-gold auth-btn">Create Account</button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login" className="gold-glow">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
