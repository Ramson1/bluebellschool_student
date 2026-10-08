"use client";

import React, { useContext, useEffect, useState } from "react";
import { StudentContext } from "../components/StudentShell.jsx";
import { supabase } from "../supabaseClient.js";
import {
  RiInboxLine,
  RiDownloadLine,
  RiExternalLinkLine,
  RiErrorWarningLine,
} from "react-icons/ri";
import "../styles/AdminPages.css";

// Class-name spelling drift between tables ("Year 1" vs "Year1") is normalised
// before every comparison so a learner's own class always matches.
export const norm = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");
const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—";

function FileLink({ url, label = "Open file" }) {
  if (!url) return <span className="ap-muted">—</span>;
  return (
    <a className="ap-btn sm ghost" href={url} target="_blank" rel="noopener noreferrer">
      <RiDownloadLine /> {label}
    </a>
  );
}

/**
 * Factory producing a read-only resource page scoped to the signed-in learner.
 * config:
 *   table       – Supabase table to read
 *   empty       – message when there is nothing for this student
 *   icon        – header icon (react-icons component)
 *   personal    – true ⇒ additionally filter by the learner's own name
 *   columns     – [{ key, label, render(row) }] used in "table" mode
 *   columns + title/body ⇒ "cards" layout when config.layout === "cards"
 *   layout      – "table" (default) | "cards"
 *   card        – { title(row), meta(row)[], body(row), file(row) } for cards mode
 */
export function makeStudentResourcePage(config) {
  return function StudentResource() {
    const scope = useContext(StudentContext);
    const student = scope?.student;
    const [rows, setRows] = useState(null);
    const [err, setErr] = useState("");

    useEffect(() => {
      if (!student?.class) return;
      let active = true;
      setRows(null);
      setErr("");
      (async () => {
        try {
          const { data, error } = await supabase
            .from(config.table)
            .select("*")
            .eq("class", student.class)
            .order("created_at", { ascending: false })
            .limit(400);
          if (error) throw error;
          let list = data || [];
          if (config.personal) {
            list = list.filter((r) => norm(r.student_name) === norm(student.name));
          }
          if (!active) return;
          setRows(list);
        } catch (e) {
          if (active) setErr(e.message || "Failed to load");
        }
      })();
      return () => { active = false; };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [student?.id, student?.class]);

    const header = (
      <div className="ap-head">
        <div>
          <h1 className="ap-title">
            <span className="ap-title-ic">{config.icon ? <config.icon /> : <RiInboxLine />}</span>
            {config.title}
          </h1>
          <p className="ap-sub">
            {config.personal ? "Your personal record" : "Published for"} {student?.class}
            {scope?.term ? ` · ${scope.term}` : ""}{scope?.session ? ` · ${scope.session}` : ""}
          </p>
        </div>
        {Array.isArray(rows) && (
          <div className="ap-actions"><span className="ap-pill">{rows.length} item{rows.length === 1 ? "" : "s"}</span></div>
        )}
      </div>
    );

    let body;
    if (err) {
      body = (
        <div className="ap-card pad">
          <p className="ap-muted mb-0"><RiErrorWarningLine /> {err}</p>
        </div>
      );
    } else if (rows === null) {
      body = <div className="ap-loading"><div className="ap-spinner" /></div>;
    } else if (rows.length === 0) {
      body = <div className="ap-card"><div className="ap-empty">{config.empty || "Nothing here yet."}</div></div>;
    } else if (config.layout === "cards") {
      body = (
        <div className="d-flex flex-column gap-3">
          {rows.map((r, i) => (
            <div className="ap-card" key={r.id ?? i}>
              <div className="ap-card-head">
                <span>{config.card.title(r)}</span>
                <span className="ap-muted ms-auto" style={{ fontSize: "0.78rem" }}>
                  {config.card.meta?.(r)?.join(" · ")}
                </span>
              </div>
              <div className="pad">
                {config.card.body?.(r) && (
                  <p className="mb-2" style={{ whiteSpace: "pre-wrap" }}>{config.card.body(r)}</p>
                )}
                {config.card.file && (
                  <FileLink url={config.card.file(r)} />
                )}
              </div>
            </div>
          ))}
        </div>
      );
    } else {
      body = (
        <div className="ap-card">
          <div className="ap-tablewrap">
            <table className="ap-table">
              <thead>
                <tr>{config.columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id ?? i}>
                    {config.columns.map((c) => (
                      <td key={c.key}>{c.render ? c.render(r) : (r[c.key] ?? "—")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    return <div>{header}{body}</div>;
  };
}

export { fmtDate, fmtDateTime, FileLink };
