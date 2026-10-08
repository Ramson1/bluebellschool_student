"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ResultCardComponent from "../../src/pages_components/ResultCardComponent";

// Standalone (no portal chrome) printable report card. The result + passport
// payloads are read from localStorage by the component (they are too large for
// the query string); only the small term/type selectors travel via the URL.
function ResultCardContent() {
  const searchParams = useSearchParams();
  const selectedTerm = searchParams.get("selectedTerm") || undefined;
  const resultType = searchParams.get("resultType") || undefined;
  return (
    <ResultCardComponent selectedTerm={selectedTerm} resultType={resultType} />
  );
}

export default function ResultCardPage() {
  return (
    <Suspense fallback={<div className="staff-boot"><div className="ap-spinner" /><p>Loading result…</p></div>}>
      <ResultCardContent />
    </Suspense>
  );
}
