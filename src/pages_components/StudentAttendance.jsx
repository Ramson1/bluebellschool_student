"use client";

import React, { useContext, useEffect, useState } from "react";
import { StudentContext } from "../components/StudentShell.jsx";
import { supabase } from "../supabaseClient.js";
import { norm } from "./StudentResourceKit.jsx";
import { RiTimeLine, RiCheckLine, RiErrorWarningLine } from "react-icons/ri";
import "../styles/AdminPages.css";

// The learner's own gate sign-in / sign-out history (read-only — attendance is
// captured by the front-desk scanner, requirement 11).
export default function StudentAttendance() {
  const scope = useContext(StudentContext);
  const student = scope?.student;
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!student?.name) return;
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("jmis_attendance")
          .select("date, check_in_time, check_out_time, status")
          .eq("class", student.class)
          .order("date", { ascending: false })
          .limit(365);
        if (error) throw error;
        const mine = (data || []).filter((r) => norm(r.student_name) === norm(student.name));
        if (active) setRows(mine);
      } catch (e) {
        if (active) setErr(e.message || "Failed to load");
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.id, student?.name, student?.class]);

  const time = (t) => (t ? new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—");

  const present = (rows || []).filter((r) => r.check_in_time).length;
  const inSchool = (rows || []).some((r) => r.date === new Date().toISOString().slice(0, 10) && r.check_in_time && !r.check_out_time);

  return (
    <div>
      <div className="ap-head">
        <div>
          <h1 className="ap-title"><span className="ap-title-ic"><RiTimeLine /></span>Attendance</h1>
          <p className="ap-sub">Your sign-in and sign-out record at the school gate.</p>
        </div>
        {rows && (
          <div className="ap-actions">
            <span className="ap-pill blue">{present} day{present === 1 ? "" : "s"} present</span>
          </div>
        )}
      </div>

      <div className="ap-card mb-3 pad d-flex align-items-center gap-2">
        {inSchool ? (
          <><RiCheckLine color="#1e7e34" size={20} /> <b>You are currently signed in.</b></>
        ) : (
          <><RiErrorWarningLine color="#8a93a2" size={20} /> <span className="ap-muted">Attendance is recorded automatically when your card is scanned at the gate.</span></>
        )}
      </div>

      {err ? (
        <div className="ap-card pad"><p className="ap-muted mb-0"><RiErrorWarningLine /> {err}</p></div>
      ) : !rows ? (
        <div className="ap-loading"><div className="ap-spinner" /></div>
      ) : rows.length === 0 ? (
        <div className="ap-card"><div className="ap-empty">No attendance records yet.</div></div>
      ) : (
        <div className="ap-card">
          <div className="ap-card-head"><RiTimeLine /> History</div>
          <div className="ap-tablewrap">
            <table className="ap-table">
              <thead><tr><th>Date</th><th>Sign in</th><th>Sign out</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.date ?? i}>
                    <td>{r.date}</td>
                    <td>{time(r.check_in_time)}</td>
                    <td>
                      {r.check_out_time ? time(r.check_out_time)
                        : r.check_in_time ? <span className="ap-badge ok">Still in</span> : "—"}
                    </td>
                    <td>
                      {r.status
                        ? <span className={"ap-badge " + (r.status === "present" ? "ok" : r.status === "late" ? "warn" : "danger")}>{r.status}</span>
                        : (r.check_in_time ? <span className="ap-badge ok">Present</span> : <span className="ap-badge neutral">No show</span>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
