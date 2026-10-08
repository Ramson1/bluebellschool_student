import { supabase } from "../supabaseClient.js";

// Students' photos are stored in bluebell_student.passport as a bare FILENAME in
// the public "passport" storage bucket (this matches the admin /full_student
// page, which prepends the bucket base URL). Older rows may already hold a full
// URL, so handle both. Returns null when there is nothing to show.
export function studentPhotoUrl(passport) {
  const p = String(passport ?? "").trim();
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  try {
    return supabase.storage.from("passport").getPublicUrl(p).data.publicUrl || null;
  } catch (_) {
    return null;
  }
}
