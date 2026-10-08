"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { RiLockPasswordLine, RiUserLine, RiGraduationCapLine } from "react-icons/ri";
import { authenticateStudent, startStudentSession } from "../utils/studentScope.js";
import "../styles/AdminPages.css";
import "../styles/PortalShell.css";

// Student portal sign-in — full name + result token (no email, no password).
// The token is issued by the school and printed on the result slip; it is the
// same token used to check results on the public site.
export default function StudentLogin() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [busy, setBusy] = useState(false);

  const signIn = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Enter your full name as registered in the school."); return; }
    if (!token.trim()) { toast.error("Enter your access token."); return; }
    setBusy(true);
    try {
      const student = await authenticateStudent(name, token);
      if (!student) {
        toast.error("We couldn't match that name and token. Check your full name (as registered) and token, then try again.");
        return;
      }
      startStudentSession(student);
      router.replace("/home");
    } catch (err) {
      console.error("Student sign-in failed:", err);
      toast.error(err.message || "Could not sign in. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="staff-login-wrap">
      <ToastContainer position="top-center" />
      <div className="staff-login-card">
        <div className="staff-login-brand">
          <img src="/logo.jpg" alt="Bluebell logo" />
          <div>
            <h1>Student Portal</h1>
            <p>Bluebell International School</p>
          </div>
        </div>

        <form onSubmit={signIn} className="staff-login-form">
          <label className="ap-label"><RiUserLine /> Child&apos;s full name</label>
          <input
            type="text"
            className="ap-input mb-3"
            placeholder="Full name as registered in the school"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
          <label className="ap-label"><RiLockPasswordLine /> Access token</label>
          <div className="position-relative mb-2">
            <input
              type={showToken ? "text" : "password"}
              className="ap-input"
              style={{ paddingRight: 40 }}
              placeholder="Your result access token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
            <button
              type="button"
              className="staff-link-btn"
              style={{ position: "absolute", right: 8, top: 6, border: 0, background: "transparent" }}
              onClick={() => setShowToken((s) => !s)}
            >
              {showToken ? "Hide" : "Show"}
            </button>
          </div>
          <button type="submit" className="staff-login-submit mt-2" disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </button>
          <p className="staff-login-hint">
            <RiGraduationCapLine /> Use the access token given to you by the school — it is the same token
            printed on your result slip. Lost your token? Contact the school office.
          </p>
        </form>
      </div>
    </div>
  );
}
