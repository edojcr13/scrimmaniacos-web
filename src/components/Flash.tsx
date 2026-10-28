"use client";

import { useSearchParams } from "next/navigation";

export default function Flash() {
  const params = useSearchParams();
  const error = params.get("error");
  const ok = params.get("ok");
  if (!error && !ok) return null;

  return (
    <div className="mx-auto mt-4 max-w-6xl px-4">
      <p
        role="status"
        className={`rounded-lg border px-4 py-3 text-sm ${
          error ? "border-red-500/40 bg-red-500/10 text-red-200" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
        }`}
      >
        {error ?? ok}
      </p>
    </div>
  );
}
