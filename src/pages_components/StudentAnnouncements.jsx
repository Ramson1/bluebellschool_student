"use client";

import React, { useContext, useEffect, useState } from "react";
import { StudentContext } from "../components/StudentShell.jsx";
import { supabase } from "../supabaseClient.js";
import { RiMegaphoneLine, RiErrorWarningLine } from "react-icons/ri";
import "../styles/AdminPages.css";

// Announcements addressed to every student, to the whole school (public), or to
// this learner's specific class.
export default function StudentAnnouncements() {
  const scope = useContext(StudentContext);
  const student = scope?.student;
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!student?.class) return;
    let active = true;
    (async () => {
      try {
        const orFilter = `audience.eq.all_students,audience.eq.public,audience.eq.class:${student.class}`;
        const { data, error } = await supabase
          .from("bluebell_announcements")
          .select("title, body, created_at, audience, pinned")
          .or(orFilter)
          .order("pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw error;
        if (active) setRows(data || []);
      } catch (e) {
        if (active) setErr(e.message || "Failed to load");
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.id, student?.class]);

  return (
    <div>
      <div className="ap-head">
        <div>
          <h1 className="ap-title"><span className="ap-title-ic"><RiMegaphoneLine /></span>Announcements</h1>
          <p className="ap-sub">News for {student?.class} and the whole school.</p>
        </div>
      </div>

      {err ? (
        <div className="ap-card pad"><p className="ap-muted mb-0"><RiErrorWarningLine /> {err}</p></div>
      ) : !rows ? (
        <div className="ap-loading"><div className="ap-spinner" /></div>
      ) : rows.length === 0 ? (
        <div className="ap-card"><div className="ap-empty">No announcements yet.</div></div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {rows.map((a, i) => (
            <div className="ap-card" key={a.id ?? i}>
              <div className="ap-card-head">
                {a.pinned && <span className="ap-badge warn me-2">Pinned</span>}
                <span>{a.title}</span>
                <span className="ap-muted ms-auto" style={{ fontSize: "0.78rem" }}>
                  {a.created_at ? new Date(a.created_at).toLocaleDateString() : ""}
                </span>
              </div>
              <div className="pad"><p className="ap-muted mb-0" style={{ whiteSpace: "pre-wrap" }}>{a.body}</p></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
