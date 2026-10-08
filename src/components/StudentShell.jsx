"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { fetchStudentScope, clearStudentSession, getStoredSession, onSessionChange } from "../utils/studentScope.js";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  RiDashboardLine,
  RiBookOpenLine,
  RiFileTextLine,
  RiDraftLine,
  RiMegaphoneLine,
  RiTimeLine,
  RiBarChartBoxLine,
  RiUserLine,
  RiLogoutBoxRLine,
  RiMenuLine,
  RiLockLine,
  RiMessage2Line,
} from "react-icons/ri";
import "../styles/AdminPages.css";
import "../styles/PortalShell.css";

// Context carrying the signed-in student + shared settings.
export const StudentContext = createContext(null);
export const useStudent = () => useContext(StudentContext);

const NAV = [
  { href: "/home", label: "Dashboard", icon: RiDashboardLine },
  { href: "/results", label: "Check Results", icon: RiBarChartBoxLine },
  { href: "/attendance", label: "Attendance", icon: RiTimeLine },
  { href: "/assignments", label: "Assignments", icon: RiFileTextLine },
  { href: "/notes", label: "E-Notes", icon: RiBookOpenLine },
  { href: "/lesson_plans", label: "Lesson Plans", icon: RiDraftLine },
  { href: "/announcements", label: "Announcements", icon: RiMegaphoneLine },
  { href: "/chat", label: "Messages", icon: RiMessage2Line },
  { href: "/profile", label: "My Profile", icon: RiUserLine },
];

export default function StudentShell({ children }) {
  const [state, setState] = useState({ phase: "checking" }); // checking | ready | disabled | signedout | error
  const [scope, setScope] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // True when this tab was opened by an admin via "Sign in as Student" — the
  // /impersonate landing sets this sessionStorage flag before handing off here.
  const [impersonating, setImpersonating] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    try {
      setImpersonating(sessionStorage.getItem("jmis_impersonating") === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const resolve = useCallback(async () => {
    if (!getStoredSession()) {
      setState({ phase: "signedout" });
      router.replace("/login");
      return;
    }
    try {
      const s = await fetchStudentScope();
      if (!s) {
        // Stored session no longer matches a student (token changed / record
        // removed) — force a fresh sign-in.
        clearStudentSession();
        toast.error("Your session is no longer valid. Please sign in again.");
        setState({ phase: "signedout" });
        router.replace("/login");
        return;
      }
      if (s.student.portal_status === "blocked" || s.student.portal_status === "suspended") {
        setScope(s);
        setState({ phase: "disabled" });
        return;
      }
      setScope(s);
      setState({ phase: "ready" });
    } catch (err) {
      console.error("Student scope failed:", err);
      toast.error("Could not load your profile. Check your connection and retry.");
      setState({ phase: "error" });
    }
  }, [router]);

  useEffect(() => {
    resolve();
    // React to login/logout from this tab or another tab.
    const unsubscribe = onSessionChange(() => {
      if (!getStoredSession()) {
        setState({ phase: "signedout" });
        router.replace("/login");
      }
    });
    return () => unsubscribe();
  }, [resolve, router]);

  // Track mobile viewport: below 800px the sidebar becomes an off-canvas
  // drawer opened from the topbar hamburger instead of a permanent rail.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 800px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  // Auto-close the mobile drawer on navigation.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const signOut = async () => {
    try {
      sessionStorage.removeItem("jmis_impersonating");
    } catch {
      /* ignore */
    }
    clearStudentSession();
    setState({ phase: "signedout" });
    router.replace("/login");
  };


  if (state.phase === "checking" || state.phase === "signedout") {
    return (
      <div className="staff-boot">
        <div className="ap-spinner" />
        <p>{state.phase === "checking" ? "Loading your portal…" : "Signing you out…"}</p>
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="staff-boot">
        <h4>Something went wrong</h4>
        <button className="staff-login-submit" style={{ maxWidth: 220 }} onClick={resolve}>Retry</button>
      </div>
    );
  }

  if (state.phase === "disabled") {
    return (
      <div className="staff-boot">
        <RiLockLine size={40} color="#e74a3b" />
        <h4>Portal disabled</h4>
        <p className="ap-muted text-center">
          Your student portal access has been {scope?.student?.portal_status || "disabled"}. Please contact the school office.
        </p>
        <button className="staff-login-submit" style={{ maxWidth: 220 }} onClick={signOut}>Sign out</button>
      </div>
    );
  }

  const ctxValue = { ...scope, signOut, reload: resolve };

  const showLabels = isMobile || !collapsed;
  const toggleSidebar = () => (isMobile ? setMobileOpen((o) => !o) : setCollapsed((c) => !c));

  return (
    <StudentContext.Provider value={ctxValue}>
      <div className={"staff-shell" + (collapsed ? " collapsed" : "") + (isMobile && mobileOpen ? " mobile-open" : "")}>
        <ToastContainer position="top-center" />
        {isMobile && mobileOpen && (
          <div className="staff-scrim" onClick={() => setMobileOpen(false)} aria-hidden="true" />
        )}
        <aside className="staff-side">
          <div className="staff-side-head">
            <button className="staff-side-collapse" onClick={toggleSidebar} title={isMobile ? "Close menu" : collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-label="Toggle sidebar">
              <RiMenuLine />
            </button>
          </div>
          <div className="staff-side-brand">
            <img src="/logo.jpg" alt="Bluebell" />
            {showLabels && (
              <div>
                <b>Student Portal</b>
                <span>Bluebell School</span>
              </div>
            )}
          </div>
          <nav className="staff-side-nav">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link key={href} href={href} className={"staff-navitem" + (active ? " active" : "")}>
                  <Icon /> {showLabels && <span>{label}</span>}
                </Link>
              );
            })}
          </nav>
          <div className="staff-side-foot">
            <button className="staff-signout" onClick={signOut} title="Sign out">
              <RiLogoutBoxRLine /> {showLabels && <span>Sign out</span>}
            </button>
          </div>
        </aside>
        <main className="staff-main">
          <header className="staff-topbar">
            <div className="staff-topbar-left">
              <button className="staff-menu-btn" onClick={() => setMobileOpen(true)} aria-label="Open menu">
                <RiMenuLine />
              </button>
              <div className="staff-topbar-id">
                <b>{scope.student.name}</b>
                <span className="ap-muted">
                  {scope.student.class}
                  {scope.session ? ` · ${scope.session}` : ""}
                  {scope.term ? ` · ${scope.term}` : ""}
                </span>
              </div>
            </div>
            {process.env.NEXT_PUBLIC_WEBSITE_URL && (
              <a className="ap-btn sm ghost staff-website-link" href={process.env.NEXT_PUBLIC_WEBSITE_URL} target="_blank" rel="noopener noreferrer">
                School website ↗
              </a>
            )}
          </header>
          {impersonating && (
            <div
              style={{
                background: "#fff4e5",
                color: "#8a5a00",
                border: "1px solid #f0d9a8",
                borderBottom: "none",
                padding: "8px 16px",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              You are viewing as {scope.student.name} (administrator preview) — actions here act on this
              student's real record. Close this tab when done.
            </div>
          )}
          <div className="staff-content">{children}</div>
        </main>
      </div>
    </StudentContext.Provider>
  );
}
