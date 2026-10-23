import type { Metadata } from "next";
import { Suspense } from "react";
import BotonGoogle from "./BotonGoogle";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm py-12">
      <div className="card p-8 text-center">
        <h1 className="titulo">Entra a Scrim Maníacos</h1>
        <p className="mt-2 text-sm text-suave">
          Usa tu cuenta de Google (Gmail). Con ella creas tu perfil, armas tu equipo y te inscribes a torneos.
        </p>
        <div className="mt-6">
          <Suspense>
            <BotonGoogle />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
