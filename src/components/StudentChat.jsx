"use client";

import React, { useContext, useMemo } from "react";
import Chat from "../components/Chat.jsx";
import { StudentContext } from "./StudentShell.jsx";
import { findClassTeachers } from "../utils/chatApi.js";
import "../styles/Chat.css";

// Student/parent view of the shared chat: message the School Admin/Office or a
// class teacher for the learner's class. Identity comes from the portal session.
export default function StudentChat() {
  const scope = useContext(StudentContext);
  const student = scope?.student;

  const me = useMemo(
    () => ({ side: "student", key: `student:${student?.id}`, name: student?.name || "Parent" }),
    [student?.id, student?.name]
  );
  const listFilter = useMemo(() => ({ studentId: student?.id }), [student?.id]);

  const loadContacts = async () => {
    if (!student?.id) return [];
    const office = {
      key: "admin", kind: "admin",
      title: "School Admin / Office", subtitle: "Ask the school office",
      studentId: student.id, studentName: student.name, studentClass: student.class,
      schoolType: "admin", schoolLabel: "School Admin/Office",
    };
    const teachers = await findClassTeachers(student.class);
    return [
      office,
      ...teachers.map((t) => ({
        key: `staff:${t.staffId}`, kind: "teacher",
        title: t.name, subtitle: "Class teacher",
        studentId: student.id, studentName: student.name, studentClass: student.class,
        schoolType: "teacher", teacherStaffId: t.staffId, schoolLabel: t.name,
      })),
    ];
  };

  const getPeer = (conv) => ({
    title: conv.school_label || (conv.school_type === "admin" ? "School Admin/Office" : "Class Teacher"),
    subtitle: conv.school_type === "admin" ? "School office" : "Class teacher",
  });

  if (!student) return null;
  return <Chat me={me} listFilter={listFilter} loadContacts={loadContacts} getPeer={getPeer} placeholder="Message the school…" />;
}
