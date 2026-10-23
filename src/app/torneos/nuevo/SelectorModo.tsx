"use client";

import { useState } from "react";

/** UNITE se juega por equipos; Champions normalmente es individual. */
export default function SelectorModo() {
  const [modo, setModo] = useState<"equipos" | "individual">("equipos");

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor="game">Juego</label>
        <select id="game" name="game" className="input" defaultValue="unite" onChange={(e) => setModo(e.target.value === "unite" ? "equipos" : "individual")}>
          <option value="unite">Pokémon UNITE</option>
          <option value="champions">Pokémon Champions</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="mode">Modalidad</label>
        <select id="mode" name="mode" className="input" value={modo} onChange={(e) => setModo(e.target.value as typeof modo)}>
          <option value="equipos">Por equipos</option>
          <option value="individual">Individual</option>
        </select>
      </div>
    </div>
  );
}
