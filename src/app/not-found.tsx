import Link from "next/link";

export default function NoEncontrado() {
  return (
    <div className="py-20 text-center">
      <p className="font-display text-6xl font-bold text-acento">404</p>
      <p className="mt-2 text-suave">Esta página se fue a la hierba alta.</p>
      <Link href="/" className="btn-primario mt-6">Volver al inicio</Link>
    </div>
  );
}
