import StudentShell from "../../src/components/StudentShell";

// All authenticated portal routes render inside the student shell
// (sidebar + auth guard + StudentContext carrying the student + settings).
export default function StudentGroupLayout({ children }) {
  return <StudentShell>{children}</StudentShell>;
}
