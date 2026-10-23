"use client";

import { useState } from "react";

/**
 * El usuario elige fecha y hora en su zona local; se envía en ISO (UTC)
 * para que todos vean la misma hora convertida a su país.
 */
export default function DateTimeInput({ name, required, defaultValue }: { name: string; required?: boolean; defaultValue?: string }) {
  const [iso, setIso] = useState(defaultValue ?? "");

  return (
    <>
      <input
        type="datetime-local"
        className="input"
        required={required}
        onChange={(e) => setIso(e.target.value ? new Date(e.target.value).toISOString() : "")}
      />
      <input type="hidden" name={name} value={iso} />
    </>
  );
}
