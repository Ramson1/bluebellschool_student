"use client";

import React, { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StudentContext } from "../components/StudentShell.jsx";
import { supabase } from "../supabaseClient.js";
import { toast } from "react-toastify";
import {
  RiShieldKeyholeLine,
  RiBarChartBoxLine,
  RiEyeLine,
  RiEyeOffLine,
  RiLockLine,
  RiInformationLine,
} from "react-icons/ri";
import "../styles/AdminPages.css";

// RESULT CHECK — revenue-critical, token-gated. Signing in to the portal does
// NOT reveal results: the learner must still enter their name + access token and
// pass the same two gates as the public site (resultLock + checkResult start
// date). The lookup + history fallback mirrors NavbarWeb.jsx exactly, and the
// payload is handed to the printable card through localStorage (avoids 431).
export default function StudentResultCheck() {
  const scope = useContext(StudentContext);
  const student = scope?.student;
  const router = useRouter();

  const [settings, setSettings] = useState(scope?.settings || {});
  const [name, setName] = useState(student?.name || "");
  const [pin, setPin] = useState("");
  const [resultType, setResultType] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (student?.name) setName(student.name); }, [student?.name]);

  // Refresh the shared settings (single row) so the gates match the public site.
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from("jmis_settings").select("*").limit(1);
        if (data && data[0]) setSettings(data[0]);
      } catch (_) {/* keep whatever the shell provided */}
    })();
  }, []);

  const locked = !!settings.resultLock;
  const startDate = settings.checkResult || "";
  const dateOpen = startDate ? new Date().toISOString().slice(0, 10) >= startDate : true;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (locked || !dateOpen) return;
    if (!name.trim()) { toast.error("Enter your full name."); return; }
    if (!pin.trim()) { toast.error("Enter your access token."); return; }
    if (!resultType) { toast.error("Select a result type (general or midterm)."); return; }
    if (!selectedTerm) { toast.error("Select a term result you wish to see."); return; }

    setBusy(true);
    toast.info("Verifying credentials...");
    const studentName = name.trim();
    try {
      let { data: resultData, error: resultError } = await supabase
        .from("jmis_result")
        .select("*")
        .eq("studentName", studentName)
        .eq("token", pin)
        .single();

      if (resultError) {
        if (resultError.code === "PGRST116") {
          const { data: archivedData, error: archivedError } = await supabase
            .from("jmis_result_history")
            .select("*")
            .eq("studentName", studentName)
            .eq("token", pin)
            .order("archived_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (archivedError && archivedError.code !== "PGRST116") throw archivedError;
          if (archivedData) {
            resultData = archivedData;
            toast.info("Viewing an archived result from a previous session");
          } else {
            toast.error("Invalid Credentials: Student Result does not exist. Please ensure the student name and token are correct.");
            setBusy(false);
            return;
          }
        } else {
          throw resultError;
        }
      }

      // Passport lookup: exact, then case-insensitive, then token-only fallback.
      let { data: studentData, error: studentError } = await supabase
        .from("jmis_student").select("*").eq("name", studentName).eq("token", pin).single();
      if (studentError || !studentData) {
        const r = await supabase.from("jmis_student").select("*").ilike("name", studentName).eq("token", pin).single();
        studentData = r.data; studentError = r.error;
      }
      if (studentError || !studentData) {
        const r = await supabase.from("jmis_student").select("*").eq("token", pin).single();
        studentData = r.data; studentError = r.error;
      }
      if (studentError) toast.warn("Student passport image not available, but showing result.");

      // tokenCount now lives on jmis_student (single source of truth). Carry the
      // student's remaining budget into the result payload so the result card's
      // exhausted-gate and per-view decrement act on the student's count instead
      // of the legacy per-result value (which is absent for students with no row).
      if (resultData && studentData && typeof studentData.tokenCount === "number") {
        resultData.tokenCount = studentData.tokenCount;
      }
      // Guarantee the result card can key the decrement back to the student row.
      if (resultData && !resultData.studentId && studentData?.id) {
        resultData.studentId = studentData.id;
      }

      try {
        localStorage.setItem("studentResultData", JSON.stringify(resultData));
        localStorage.setItem("studentPassportData", JSON.stringify(studentData || {}));
      } catch (err) { console.error("localStorage write failed:", err); }

      router.push(`/resultcard?selectedTerm=${encodeURIComponent(selectedTerm)}&resultType=${encodeURIComponent(resultType)}`);
    } catch (error) {
      console.error("Error verifying student credentials:", error.message);
      toast.error("An error occurred while verifying the credentials. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="ap-head">
        <div>
          <h1 className="ap-title"><span className="ap-title-ic"><RiBarChartBoxLine /></span>Check Results</h1>
          <p className="ap-sub">Enter your name and access token to view a term report card.</p>
        </div>
      </div>

      {locked ? (
        <div className="ap-card pad">
          <div className="d-flex align-items-center gap-2">
            <RiLockLine color="#e74a3b" size={22} />
            <b>Result checking is currently locked.</b>
          </div>
          <p className="ap-muted mb-0 mt-2">The school has temporarily suspended online result checking. Please contact the school office to ratify your result.</p>
        </div>
      ) : !dateOpen ? (
        <div className="ap-card pad">
          <div className="d-flex align-items-center gap-2">
            <RiInformationLine color="#f6a623" size={22} />
            <b>Results are not yet available.</b>
          </div>
          <p className="ap-muted mb-0 mt-2">Checking of students&apos; results starts on {startDate}. Please come back on or after that date.</p>
        </div>
      ) : (
        <div className="row g-3">
          <div className="col-lg-7">
            <div className="ap-card">
              <div className="ap-card-head"><RiShieldKeyholeLine /> Result check</div>
              <form onSubmit={handleSubmit} className="pad">
                <div className="mb-3">
                  <label className="ap-label">Student name</label>
                  <input className="ap-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" required />
                </div>
                <div className="mb-3">
                  <label className="ap-label">Access token (PIN)</label>
                  <div className="position-relative">
                    <input className="ap-input" style={{ paddingRight: 40 }} type={showPin ? "text" : "password"} value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Enter PIN" required />
                    <button type="button" className="btn position-absolute end-0 top-50 translate-middle-y border-0 bg-transparent" style={{ right: 8 }} onClick={() => setShowPin((s) => !s)}>
                      {showPin ? <RiEyeOffLine /> : <RiEyeLine />}
                    </button>
                  </div>
                  <div className="ap-muted" style={{ fontSize: "0.8rem" }}>The token provided by the school administrator. Your login does not replace it.</div>
                </div>
                <div className="mb-3">
                  <label className="ap-label">Result type</label>
                  <select className="ap-input" value={resultType} onChange={(e) => setResultType(e.target.value)} required>
                    <option value="" disabled>-- Select Result Type --</option>
                    <option value="general">General Term Result</option>
                    <option value="midterm">Midterm Result</option>
                  </select>
                </div>
                {resultType && (
                  <div className="mb-3">
                    <label className="ap-label">Term to view</label>
                    <select className="ap-input" value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} required>
                      <option value="" disabled>-- Select Term --</option>
                      <option value="1st term">1st Term</option>
                      <option value="2nd term">2nd Term</option>
                      <option value="3rd term">3rd Term</option>
                    </select>
                  </div>
                )}
                <button type="submit" className="ap-btn primary w-100" disabled={busy}>
                  <RiShieldKeyholeLine /> {busy ? "Verifying…" : "View result"}
                </button>
              </form>
            </div>
          </div>
          <div className="col-lg-5">
            <div className="ap-card pad">
              <h6 className="ap-label"><RiInformationLine /> How it works</h6>
              <p className="ap-muted mb-2">Your report card opens in a clean, printable view. You can print it or email it from there.</p>
              <p className="ap-muted mb-0">Lost your token? It is printed on your result slip — contact the school office if you cannot find it.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
