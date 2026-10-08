"use client";

import React from "react";
import { makeStudentResourcePage } from "./StudentResourceKit.jsx";
import { RiDraftLine } from "react-icons/ri";

// "Lesson Coverage" — what has been / is being taught, week by week.
export default makeStudentResourcePage({
  table: "jmis_lesson_plans",
  title: "Lesson Coverage",
  icon: RiDraftLine,
  layout: "cards",
  empty: "No lesson coverage records for your class yet.",
  card: {
    title: (r) => `${r.subject}${r.week ? ` — Week ${r.week}` : ""}`,
    meta: (r) => [r.term, r.review_status === "approved" ? "Approved" : null].filter(Boolean),
    body: (r) => [r.objectives, r.content].filter(Boolean).join("\n\n"),
  },
});
