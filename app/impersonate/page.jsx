"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  startStudentSession,
  fetchStudentScope,
  clearStudentSession,
} from "../../src/utils/studentScope.js";
import "../../src/styles/AdminPages.css";
import "../../src/styles/PortalShell.css";

// Impersonation landing — opened in a NEW TAB by the admin "Sign in as Student"
// button on the Full Student page. The student portal has no Supabase Auth: a
// student session is a localStorage { id, token } pair (the result access token
// IS the capability the portal trusts). The admin server put both values in this
// URL's hash fragment (#i=<id>&t=<token>), which never reaches a server, the
// referrer, or history. Here we establish that session, re-validate it against
// bluebell_student (fetchStudentScope), and hand off to the normal portal.
//
// This lives OUTSIDE the (student) route group (like /login), so it is not
// wrapped by StudentShell; after establishing the session we navigate to /home,
// where StudentShell picks it up via getStoredSession + fetchStudentScope.
export default function ImpersonatePage() {
  const router = useRouter();
  const [status, setStatus] = useState("working"); // working | failed
  const [message, setMessage] = useState("Opening the student portal…");
  const ranOnce = useRef(false);

  useEffect(() => {
    if (ranOnce.current) return; // guard StrictMode double-invoke
    ranOnce.current = true;

    const fail = (msg) => {
      setMessage(msg || "Could not open this student session.");
      setStatus("failed");
    };

    const run = async () => {
      const hash = window.location.hash || "";
      const gi = hash.match(/[#&]i=([^&]+)/);
      const gt = hash.match(/[#&]t=([^&]+)/);
      const id = gi ? decodeURIComponent(gi[1]) : "";
      const token = gt ? decodeURIComponent(gt[1]) : "";
      if (!id || !token) {
        fail("No sign-in details were provided. Please use the button in the admin dashboard.");
        return;
      }

      // Establish the lightweight client session, then re-validate it resolves to
      // a real student before committing to the hand-off.
      startStudentSession({ id, token });
      try {
        const scope = await fetchStudentScope();
        if (!scope || !scope.student) {
          clearStudentSession();
          fail("This student's portal access is no longer valid. Ask the office to issue an access token.");
          return;
        }
        // Scrub the one-time token from the address bar before navigating.
        try {
          window.history.replaceState(null, "", window.location.pathname);
        } catch {
          /* ignore */
        }
        // Flag this tab so StudentShell shows the administrator-preview banner.
        try {
          sessionStorage.setItem("jmis_impersonating", "1");
        } catch {
          /* ignore */
        }
        router.replace("/home");
      } catch (e) {
        clearStudentSession();
        fail(e?.message || "Could not complete the sign-in.");
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="staff-login-wrap">
      <div className="staff-login-card">
        <div className="staff-login-brand">
          <img src="/logo.jpg" alt="Bluebell logo" />
          <div>
            <h1>Student Portal</h1>
            <p>Administrator preview</p>
          </div>
        </div>

        {status === "working" ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div className="ap-spinner" style={{ margin: "0 auto 12px" }} />
            <p style={{ margin: 0 }}>{message}</p>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <p style={{ color: "#a13834", fontWeight: 700, marginBottom: 16 }}>{message}</p>
            <button className="staff-login-submit" style={{ maxWidth: 240, margin: "0 auto" }} onClick={() => router.replace("/login")}>
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
