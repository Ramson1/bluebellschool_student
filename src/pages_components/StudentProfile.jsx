"use client";

import React, { useContext, useState } from "react";
import { StudentContext } from "../components/StudentShell.jsx";
import { supabase } from "../supabaseClient.js";
import { studentPhotoUrl } from "../utils/photo.js";
import { logAction } from "../api/auditLog.js";
import { toast } from "react-toastify";
import {
  RiUserLine,
  RiSaveLine,
  RiInformationLine,
  RiFileCopyLine,
  RiCheckLine,
} from "react-icons/ri";
import "../styles/AdminPages.css";

// Student profile: identity fields (name/class/token) are immutable here and
// edits are limited to non-academic contact fields. Students sign in with their
// full name + access token (no password), so there is no change-password flow.
export default function StudentProfile() {
  const scope = useContext(StudentContext);
  const student = scope?.student;
  const reload = scope?.reload;

  const [form, setForm] = useState(() => ({
    sex: student?.sex || "",
    email: student?.email || "",
    parentcontact: student?.parentcontact || "",
    address: student?.address || "",
  }));
  const [saving, setSaving] = useState(false);
  const [photoOk, setPhotoOk] = useState(true);
  const [copied, setCopied] = useState(false);

  if (!student) return null;

  const photo = studentPhotoUrl(student.passport);

  const copyToken = async () => {
    if (!student.token) { toast.error("No access token is set for your account."); return; }
    try {
      await navigator.clipboard.writeText(student.token);
      setCopied(true);
      toast.success("Access token copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      toast.error("Couldn't copy the token. Please select and copy it manually.");
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("bluebell_student")
      .update({ sex: form.sex, email: form.email, parentcontact: form.parentcontact, address: form.address })
      .eq("id", student.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    logAction(supabase, { email: student.email || student.name, role: "student", action: "student_profile_update", targetTable: "bluebell_student", recordId: student.id, details: { fields: Object.keys(form) } });
    toast.success("Profile updated.");
    reload?.();
  };

  const immutable = [
    ["Name", student.name],
    ["Class", student.class],
  ];


  return (
    <div>
      <div className="ap-head">
        <div>
          <h1 className="ap-title"><span className="ap-title-ic"><RiUserLine /></span>My Profile</h1>
          <p className="ap-sub">Keep your contact details up to date.</p>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-6">
          <div className="ap-card">
            <div className="ap-card-head"><RiUserLine /> Account details</div>
            <div className="pad">
              <div className="d-flex align-items-center gap-3 mb-3">
                {photo && photoOk ? (
                  <img src={photo} alt="" onError={() => setPhotoOk(false)} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#e9ecef", display: "flex", alignItems: "center", justifyContent: "center" }}><RiUserLine size={26} color="#8a93a2" /></div>
                )}
                <div><b style={{ fontSize: "1.05rem" }}>{student.name}</b><div className="ap-muted" style={{ fontSize: "0.85rem" }}>{student.class}</div></div>
              </div>
              <table className="ap-table">
                <tbody>
                  {immutable.map(([label, value]) => (
                    <tr key={label}><td className="ap-muted" style={{ width: 140 }}>{label}</td><td>{value}</td></tr>
                  ))}
                  <tr>
                    <td className="ap-muted" style={{ width: 140 }}>Access token</td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <code style={{ wordBreak: "break-all" }}>{student.token || "—"}</code>
                        <button
                          type="button"
                          className="ap-btn sm soft"
                          onClick={copyToken}
                          disabled={!student.token}
                          title="Copy access token"
                        >
                          {copied ? <RiCheckLine /> : <RiFileCopyLine />} {copied ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="ap-muted" style={{ fontSize: "0.8rem", marginBottom: 0 }}>
                <RiInformationLine /> Name, class and token are managed by the school. Ask the office if any of these are wrong.
              </p>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="ap-card">
            <div className="ap-card-head"><RiUserLine /> My contact information</div>
            <div className="pad">
              <div className="mb-3">
                <label className="ap-label">Sex</label>
                <select className="ap-input" value={form.sex} onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value }))}>
                  <option value="">— Select —</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="ap-label">Email address</label>
                <input type="email" className="ap-input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@example.com" />
              </div>
              <div className="mb-3">
                <label className="ap-label">Parent / guardian contact</label>
                <input className="ap-input" value={form.parentcontact} onChange={(e) => setForm((f) => ({ ...f, parentcontact: e.target.value }))} placeholder="Phone number" />
              </div>
              <div className="mb-3">
                <label className="ap-label">Address</label>
                <textarea className="ap-input" rows={2} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
              </div>
              <button className="ap-btn primary" disabled={saving} onClick={saveProfile}><RiSaveLine /> {saving ? "Saving…" : "Save changes"}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
