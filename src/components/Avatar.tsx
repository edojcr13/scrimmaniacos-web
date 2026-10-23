export default function Avatar({ src, nombre, size = 40 }: { src: string | null; nombre: string; size?: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} referrerPolicy="no-referrer" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-violeta/30 font-bold text-violet-200"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {nombre.slice(0, 1).toUpperCase()}
    </span>
  );
}
