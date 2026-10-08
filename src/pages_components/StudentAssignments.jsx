"use client";

import React, { useContext, useEffect, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { StudentContext } from "../components/StudentShell.jsx";
import { supabase } from "../supabaseClient.js";
import { toast } from "react-toastify";
import { fmtDate } from "./StudentResourceKit.jsx";
import {
  RiFileTextLine,
  RiDownloadLine,
  RiSendPlaneFill,
  RiEditLine,
  RiCheckLine,
  RiUploadCloud2Line,
  RiErrorWarningLine,
} from "react-icons/ri";
import "../styles/AdminPages.css";

// Req 10: students submit their assignment / assessment / project work — as
// text and/or a file — to the teacher who set it. The teacher reviews it on the
// staff portal "Submissions" page. Assignments shown here are exactly the ones
// published to the learner's class; one submission per assignment is kept (a
// re-submit edits the same row via the (assignment_id, student_id) upsert).

// Files reuse the existing public buckets: the academics 'cbt' bucket first,
// falling back to the students' 'passport' bucket if anon can't write there.
async function uploadSubmissionFile(file) {
  const ext = file.name.split(".").pop() || "bin";
  const path = `submissions/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  let { error } = await supabase.storage.from("cbt").upload(path, file, { upsert: false });
  let bucket = "cbt";
  if (error) {
    ({ error } = await supabase.storage.from("passport").upload(path, file, { upsert: false }));
    bucket = "passport";
    if (error) throw error;
  }
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export default function StudentAssignments() {
  const scope = useContext(StudentContext);
  const student = scope?.student;
  const [rows, setRows] = useState(null); // assignments
  const [subs, setSubs] = useState({}); // assignment_id -> submission row
  const [err, setErr] = useState("");
  const [show, setShow] = useState(false);
  const [active, setActive] = useState(null);
  const [text, setText] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    if (!student?.class) return;
    setErr("");
    (async () => {
      try {
        const { data: asg, error: e1 } = await supabase
          .from("jmis_assignments")
          .select("*")
          .eq("class", student.class)
          .order("created_at", { ascending: false })
          .limit(400);
        if (e1) throw e1;
        setRows(asg || []);
        // Read the learner's existing submissions; if the table isn't provisioned
        // yet, still show the assignments (submitting will surface the error).
        const { data: mine, error: e2 } = await supabase
          .from("jmis_assignment_submissions")
          .select("*")
          .eq("student_id", student.id);
        const map = {};
        if (!e2) for (const s of mine || []) map[s.assignment_id] = s;
        setSubs(map);
      } catch (e) {
        setErr(e.message || "Failed to load");
        setRows([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [student?.id, student?.class]);

  const openSubmit = (a) => {
    const existing = subs[a.id];
    setActive(a);
    setText(existing?.submission_text || "");
    setFileUrl(existing?.file_url || "");
    setFileName("");
    setShow(true);
  };

  const onPickFile = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadSubmissionFile(file);
      setFileUrl(url);
      setFileName(file.name);
      toast.success("File attached.");
    } catch (e) {
      toast.error("Upload failed: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveSubmission = async () => {
    if (!active) return;
    if (!text.trim() && !fileUrl) { toast.warn("Type your answer or attach a file."); return; }
    setBusy(true);
    try {
      const payload = {
        assignment_id: active.id,
        class: active.class || student.class,
        subject: active.subject || null,
        student_id: student.id,
        student_name: student.name,
        submission_text: text.trim(),
        file_url: fileUrl || null,
        status: "submitted",
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("jmis_assignment_submissions")
        .upsert(payload, { onConflict: "assignment_id,student_id" })
        .select()
        .single();
      if (error) throw error;
      setSubs((m) => ({ ...m, [active.id]: data }));
      setShow(false);
      setActive(null);
      toast.success("Work submitted.");
    } catch (e) {
      toast.error(e.message || "Submit failed");
    } finally {
      setBusy(false);
    }
  };

  if (!student) return null;

  const header = (
    <div className="ap-head">
      <div>
        <h1 className="ap-title">
          <span className="ap-title-ic"><RiFileTextLine /></span>Assignments
        </h1>
        <p className="ap-sub">
          Your class {student.class}{scope?.term ? ` · ${scope.term}` : ""}{scope?.session ? ` · ${scope.session}` : ""} —
          submit each task as text or an attached file.
        </p>
      </div>
      {Array.isArray(rows) && (
        <div className="ap-actions"><span className="ap-pill">{rows.length} task{rows.length === 1 ? "" : "s"}</span></div>
      )}
    </div>
  );

  let body;
  if (err) {
    body = <div className="ap-card pad"><p className="ap-muted mb-0"><RiErrorWarningLine /> {err}</p></div>;
  } else if (rows === null) {
    body = <div className="ap-loading"><div className="ap-spinner" /></div>;
  } else if (rows.length === 0) {
    body = <div className="ap-card"><div className="ap-empty">No assignments or projects for your class right now.</div></div>;
  } else {
    body = (
      <div className="d-flex flex-column gap-3">
        {rows.map((r, i) => {
          const s = subs[r.id];
          return (
            <div className="ap-card" key={r.id ?? i}>
              <div className="ap-card-head">
                <span>{r.title || "Untitled"}</span>
                {s && (
                  <span className={"ap-badge " + (s.status === "reviewed" ? "info" : "ok")} style={{ marginLeft: 8 }}>
                    <RiCheckLine /> {s.status === "reviewed" ? "Reviewed" : "Submitted"}
                  </span>
                )}
                <span className="ap-muted ms-auto" style={{ fontSize: "0.78rem" }}>
                  {[r.subject, r.assignment_type && r.assignment_type !== "assignment" ? r.assignment_type : null, r.due_date ? `Due ${fmtDate(r.due_date)}` : null]
                    .filter(Boolean).join(" · ")}
                </span>
              </div>
              <div className="pad">
                {r.instructions && <p className="mb-2" style={{ whiteSpace: "pre-wrap" }}>{r.instructions}</p>}
                {r.attachment_url && (
                  <a className="ap-btn sm ghost" href={r.attachment_url} target="_blank" rel="noopener noreferrer">
                    <RiDownloadLine /> Open task file
                  </a>
                )}
                <div className="d-flex align-items-center gap-2 flex-wrap mt-2">
                  <button className="ap-btn primary sm" onClick={() => openSubmit(r)}>
                    {s ? <RiEditLine /> : <RiSendPlaneFill />} {s ? "Edit submission" : "Submit work"}
                  </button>
                  {s?.file_url && (
                    <a className="ap-muted" href={s.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.8rem" }}>
                      <RiUploadCloud2Line /> your attached file
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      {header}
      {body}

      <Modal show={show} onHide={() => setShow(false)} centered>
        <Modal.Header className="ap-modal-head" closeButton closeVariant="white">
          <Modal.Title style={{ fontSize: "1.05rem", fontWeight: 800 }}>
            {subs[active?.id] ? "Edit" : "Submit"} work{active?.title ? ` — ${active.title}` : ""}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="ap-modal-body">
          {active?.instructions && (
            <p className="ap-muted" style={{ whiteSpace: "pre-wrap", fontSize: "0.88rem" }}>{active.instructions}</p>
          )}
          <div className="mb-3">
            <label className="ap-label">Your answer</label>
            <textarea className="ap-input" rows={6} value={text} placeholder="Type your answer here…" onChange={(e) => setText(e.target.value)} />
          </div>
          <div>
            <label className="ap-label">Attach a file (optional)</label>
            <input className="ap-input" type="file" disabled={busy} onChange={(e) => onPickFile(e.target.files?.[0])} />
            {fileUrl && (
              <a className="ap-muted" href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.8rem", display: "inline-block", marginTop: 4 }}>
                <RiUploadCloud2Line /> {fileName || "attached file"} — open
              </a>
            )}
            {busy && <span className="ap-muted" style={{ fontSize: "0.8rem", display: "block", marginTop: 4 }}>Working…</span>}
          </div>
        </Modal.Body>
        <Modal.Footer className="ap-modal-foot">
          <Button variant="light" onClick={() => setShow(false)}>Cancel</Button>
          <Button variant="success" disabled={busy} onClick={saveSubmission}>{busy ? "Saving…" : "Submit work"}</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
