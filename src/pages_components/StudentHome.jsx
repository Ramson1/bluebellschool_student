"use client";

import React, { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { StudentContext } from "../components/StudentShell.jsx";
import { supabase } from "../supabaseClient.js";
import { studentPhotoUrl } from "../utils/photo.js";
import { norm } from "./StudentResourceKit.jsx";
import {
  RiGraduationCapLine,
  RiMegaphoneLine,
  RiFileTextLine,
  RiBarChartBoxLine,
  RiTimeLine,
  RiArrowRightLine,
  RiCheckLine,
  RiBookOpenLine,
} from "react-icons/ri";
import "../styles/AdminPages.css";

// Student dashboard: greeting + passport, attendance snapshot, upcoming
// assignments and the latest announcements for the learner's class.
export default function StudentHome() {
  const scope = useContext(StudentContext);
  const student = scope?.student;

  const [announcements, setAnnouncements] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [today, setToday] = useState(null);
  const [daysPresent, setDaysPresent] = useState(0);
  const [photoOk, setPhotoOk] = useState(true);

  useEffect(() => {
    if (!student?.class) return;
    let active = true;
    (async () => {
      try {
        const orFilter = `audience.eq.all_students,audience.eq.public,audience.eq.class:${student.class}`;
        const [ann, asg, att] = await Promise.all([
          supabase.from("jmis_announcements").select("id, title, body, created_at, pinned").or(orFilter)
            .order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(5),
          supabase.from("jmis_assignments").select("id, title, subject, due_date").eq("class", student.class)
            .order("due_date", { ascending: true }).limit(5),
          supabase.from("jmis_attendance").select("date, check_in_time, check_out_time").eq("class", student.class),
        ]);
        if (!active) return;
        setAnnouncements(ann.data || []);
        setAssignments((asg.data || []).filter((a) => a.due_date && a.due_date >= new Date().toISOString().slice(0, 10)));
        const mine = (att.data || []).filter((r) => norm(r.student_name ?? "") === norm(student.name));
        const todayRow = mine.find((r) => r.date === new Date().toISOString().slice(0, 10)) || null;
        setToday(todayRow);
        setDaysPresent(mine.filter((r) => r.check_in_time).length);
      } catch (_) {/* dashboard is best-effort */}
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.id, student?.class]);

  if (!student) return null;

  const fmt = (d) => (d ? new Date(d).toLocaleDateString() : "");
  const photo = studentPhotoUrl(student.passport);

  return (
    <div>
      <div className="ap-head">
        <div className="d-flex align-items-center gap-3">
          {photo && photoOk ? (
            <img src={photo} alt="" onError={() => setPhotoOk(false)} style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#e9ecef", display: "flex", alignItems: "center", justifyContent: "center" }}><RiGraduationCapLine size={26} color="#8a93a2" /></div>
          )}
          <div>
            <h1 className="ap-title">Welcome, {student.name.split(" ")[0]} 👋</h1>
            <p className="ap-sub mb-0">
              {student.class}{scope?.session ? ` · ${scope.session}` : ""}{scope?.term ? ` · ${scope.term}` : ""}
            </p>
          </div>
        </div>
        <div className="ap-actions">
          <span className="ap-badge ok"><RiTimeLine /> {today?.check_in_time ? "Signed in today" : "Not signed in yet"}</span>
        </div>
      </div>

      <div className="row g-3 mt-1">
        <div className="col-md-6 col-xl-3">
          <div className="ap-card pad">
            <h6 className="ap-label"><RiTimeLine /> Days present</h6>
            <div className="stat-big">{daysPresent}</div>
            <p className="ap-muted mb-0">recorded at the gate</p>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="ap-card pad">
            <h6 className="ap-label"><RiFileTextLine /> Upcoming work</h6>
            <div className="stat-big">{assignments.length}</div>
            <p className="ap-muted mb-0">assignments due soon</p>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="ap-card pad">
            <h6 className="ap-label"><RiMegaphoneLine /> Announcements</h6>
            <div className="stat-big">{announcements.length}</div>
            <p className="ap-muted mb-0">latest for your class</p>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="ap-card pad">
            <h6 className="ap-label"><RiCheckLine /> Today</h6>
            <p className="mb-0">
              {today?.check_in_time
                ? `Signed in at ${new Date(today.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "No sign-in recorded yet today."}
            </p>
          </div>
        </div>
      </div>

      <div className="ap-card mt-4">
        <div className="ap-card-head"><RiGraduationCapLine /> Quick links</div>
        <div className="d-flex flex-wrap gap-2 pad">
          <Link className="ap-btn green" href="/results"><RiBarChartBoxLine /> Check Results</Link>
          <Link className="ap-btn green" href="/assignments"><RiFileTextLine /> Assignments</Link>
          <Link className="ap-btn green" href="/notes"><RiBookOpenLine /> Notes</Link>
          <Link className="ap-btn green" href="/attendance"><RiTimeLine /> Attendance</Link>
          <Link className="ap-btn green" href="/profile"><RiGraduationCapLine /> My Profile</Link>
        </div>
      </div>

      <div className="row g-3 mt-1">
        <div className="col-lg-7">
          <div className="ap-card">
            <div className="ap-card-head">
              <RiMegaphoneLine /> Latest announcements
              <span className="ms-auto"><Link className="panel-link" href="/announcements" style={{ color: "#022aa1", fontWeight: 700, textDecoration: "none" }}>All <RiArrowRightLine /></Link></span>
            </div>
            {announcements.length === 0 ? (
              <div className="ap-empty">No announcements yet.</div>
            ) : (
              announcements.map((a, i) => (
                <div key={a.id ?? i} className="ann-row">
                  <div className="d-flex align-items-center gap-2">
                    {a.pinned && <span className="ap-badge warn">Pinned</span>}
                    <b>{a.title}</b>
                    <span className="ap-muted ms-auto" style={{ fontSize: "0.75rem" }}>{fmt(a.created_at)}</span>
                  </div>
                  <p className="ap-muted mb-0" style={{ whiteSpace: "pre-wrap" }}>{a.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="col-lg-5">
          <div className="ap-card">
            <div className="ap-card-head">
              <RiFileTextLine /> Due soon
              <span className="ms-auto"><Link className="panel-link" href="/assignments" style={{ color: "#022aa1", fontWeight: 700, textDecoration: "none" }}>All <RiArrowRightLine /></Link></span>
            </div>
            {assignments.length === 0 ? (
              <div className="ap-empty">Nothing due right now. Well done!</div>
            ) : (
              assignments.map((a, i) => (
                <div key={a.id ?? i} className="ann-row d-flex align-items-center gap-2">
                  <div>
                    <b>{a.title}</b>
                    <div className="ap-muted" style={{ fontSize: "0.8rem" }}>{a.subject}</div>
                  </div>
                  <span className="ap-badge info ms-auto">Due {fmt(a.due_date)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
