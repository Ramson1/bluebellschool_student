"use client";

import React from "react";
import { makeStudentResourcePage } from "./StudentResourceKit.jsx";
import { RiBookOpenLine } from "react-icons/ri";

export default makeStudentResourcePage({
  table: "bluebell_notes",
  title: "Notes",
  icon: RiBookOpenLine,
  layout: "cards",
  empty: "No notes have been shared with your class yet.",
  card: {
    title: (r) => r.title,
    meta: (r) => [r.subject, r.term, r.uploaded_by].filter(Boolean),
    body: (r) => r.content,
    file: (r) => r.file_url,
  },
});
