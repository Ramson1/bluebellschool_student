// Student portal scope + session.
//
// Students do NOT have email/password auth accounts. They sign in with the
// child's FULL NAME (exactly as registered in bluebell_student) plus their RESULT
// TOKEN — the same token used on the public site to check results. Because the
// token is already the secret capability the whole portal trusts, we keep a
// lightweight client session (localStorage) instead of Supabase Auth: store the
// resolved { id, token } and re-validate it against bluebell_student on load.

import { supabase } from "../supabaseClient.js";

const STUDENT_COLS =
  "id, name, class, sex, token, parentcontact, passport, email, address, user_id, auth_user_id, portal_status, first_login";

const SESSION_KEY = "bluebell_student_session";
const SESSION_EVENT = "jmis-student-session-changed";

// ---- session storage -------------------------------------------------------

export function getStoredSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export function startStudentSession(student) {
  if (typeof window === "undefined" || !student) return;
  try {
    window.localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ id: student.id, token: student.token })
    );
  } catch (_) {/* storage unavailable — login simply won't persist */}
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearStudentSession() {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(SESSION_KEY); } catch (_) {/* ignore */}
  window.dispatchEvent(new Event(SESSION_EVENT));
}

// Fires the given callback whenever the session changes (login/logout, incl.
// from another tab). Returns an unsubscribe function.
export function onSessionChange(callback) {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener(SESSION_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(SESSION_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

// ---- lookups --------------------------------------------------------------

// Verify a name + token pair against bluebell_student. Returns the student row or
// null. Name match is case-insensitive (the token is what actually gates).
export async function authenticateStudent(name, token) {
  const cleanName = (name || "").trim();
  const cleanToken = (token || "").trim();
  if (!cleanName || !cleanToken) return null;
  const { data, error } = await supabase
    .from("bluebell_student")
    .select(STUDENT_COLS)
    .eq("token", cleanToken)
    .ilike("name", cleanName)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

// Resolve the currently-stored session to a full scope object (student +
// settings + result-check gates), re-validating the token against the DB.
export async function fetchStudentScope() {
  const session = getStoredSession();
  if (!session?.id || !session?.token) return null;

  const { data: student, error } = await supabase
    .from("bluebell_student")
    .select(STUDENT_COLS)
    .eq("id", session.id)
    .eq("token", session.token)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!student) return null;

  let settings = {};
  try {
    const { data } = await supabase.from("bluebell_settings").select("*").limit(1);
    settings = data?.[0] || {};
  } catch (_) {/* optional */}

  return {
    student,
    settings,
    session: settings.session || "",
    term: settings.term || "",
    // result-check availability gate (shared with the public site)
    checkResultDate: settings.checkResult || "",
    resultLock: !!settings.resultLock,
  };
}

export async function signOutStudent() {
  clearStudentSession();
}
