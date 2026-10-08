"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredSession } from "../src/utils/studentScope.js";

// Root: send signed-in students to the dashboard, everyone else to /login.
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getStoredSession() ? "/home" : "/login");
  }, [router]);

  return (
    <div className="staff-boot">
      <div className="ap-spinner" />
      <p>Loading portal…</p>
    </div>
  );
}
