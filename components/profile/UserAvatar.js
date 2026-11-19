/* eslint-disable @next/next/no-img-element */

const COLORS = ["#7386F5", "#7CBE66", "#F5A524", "#143DA6", "#9E5941"];

function initialsOf(name) {
  return (
    String(name || "")
      .replace(/@.*/, "")
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "?"
  );
}

// Foto de perfil redonda; si no hay foto, las iniciales sobre un color fijo
// por nombre (asi cada persona tiene siempre el mismo color).
export default function UserAvatar({ src, name, size = 36, className = "" }) {
  const style = { width: size, height: size };
  if (src) {
    return (
      <img
        src={src}
        alt={name ? `Foto de ${name}` : ""}
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className={`shrink-0 rounded-full object-cover ring-2 ring-white ${className}`}
        style={style}
      />
    );
  }
  const color = COLORS[[...String(name || "?")].reduce((sum, char) => sum + char.charCodeAt(0), 0) % COLORS.length];
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ring-2 ring-white ${className}`}
      style={{ ...style, backgroundColor: color, fontSize: Math.max(11, Math.round(size * 0.36)) }}
    >
      {initialsOf(name)}
    </span>
  );
}
