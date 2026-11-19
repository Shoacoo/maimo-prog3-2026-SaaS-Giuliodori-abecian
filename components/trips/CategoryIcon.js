// Icono y color de cada categoria de lugar (tipos de Google Places que usa
// "Lugares para visitar"). Mismo trazo que el resto de los iconos de Triphy.
export const CATEGORY_STYLE = {
  lodging: { color: "#143DA6", icon: "bed" },
  restaurant: { color: "#E8613C", icon: "fork" },
  bar: { color: "#9E5941", icon: "glass" },
  cafe: { color: "#B07A4F", icon: "cup" },
  tourist_attraction: { color: "#7386F5", icon: "landmark" },
  museum: { color: "#6B5BD2", icon: "museum" },
  shopping_mall: { color: "#E07AA6", icon: "bag" },
  park: { color: "#5FA94B", icon: "tree" },
  zoo: { color: "#C9922E", icon: "paw" },
  aquarium: { color: "#2B9DC9", icon: "fish" },
  amusement_park: { color: "#F5A524", icon: "ferris" },
  art_gallery: { color: "#C2477A", icon: "palette" },
};

const FALLBACK = { color: "#7386F5", icon: "pin" };

export function categoryStyle(type) {
  return CATEGORY_STYLE[type] || FALLBACK;
}

const PATHS = {
  bed: <path d="M3 18V7M3 13h18v5M21 18v-3a3 3 0 0 0-3-3h-7v1M7 12a1.8 1.8 0 1 0 0-3.6A1.8 1.8 0 0 0 7 12Z" />,
  fork: <path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v5M9 3v5M17 21V3c-2 1-3 3.5-3 6.5V13h3" />,
  glass: <path d="M6 4h12l-6 8-6-8ZM12 12v8M8 20h8M8.5 7.5h7" />,
  cup: <path d="M4 9h12v4a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V9ZM16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8 3c0 1 1 1.5 1 2.5M12 3c0 1 1 1.5 1 2.5" />,
  landmark: <path d="M12 3 4 7h16l-8-4ZM5 7v0M6 10v7M10 10v7M14 10v7M18 10v7M4 20h16M4 17h16" />,
  museum: <path d="M3 9 12 4l9 5M5 9v9M19 9v9M9 12v6M15 12v6M3 20h18" />,
  bag: <path d="M5 8h14l-1 12H6L5 8ZM9 8V6.5a3 3 0 0 1 6 0V8" />,
  tree: <path d="M12 21v-5M12 3 6 11h3l-3 5h12l-3-5h3l-6-8Z" />,
  paw: (
    <>
      <circle cx="7" cy="10" r="1.6" />
      <circle cx="10.5" cy="6.5" r="1.6" />
      <circle cx="14.5" cy="6.5" r="1.6" />
      <circle cx="18" cy="10" r="1.6" />
      <path d="M12.5 11.5c-3 0-5.5 3.5-5.5 5.5 0 1.5 1.5 2.5 3 2l2.5-.8 2.5.8c1.5.5 3-.5 3-2 0-2-2.5-5.5-5.5-5.5Z" />
    </>
  ),
  fish: <path d="M3 12c3-4 7-5.5 11-5 3 .4 5 2.5 7 5-2 2.5-4 4.6-7 5-4 .5-8-1-11-5ZM3 12 1.5 9M3 12l-1.5 3M15.5 11h.01" />,
  ferris: (
    <>
      <circle cx="12" cy="10" r="6.5" />
      <path d="M12 3.5v13M5.5 10h13M7.4 5.4l9.2 9.2M16.6 5.4l-9.2 9.2M9 21l3-5 3 5" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 0 0 0 18c1.2 0 1.8-.8 1.8-1.6 0-1.4-1.3-1.7-1.3-3 0-1 .8-1.6 1.8-1.6H17a4 4 0 0 0 4-4C21 6.4 17 3 12 3Z" />
      <path d="M7.5 11.5h.01M9.5 7.5h.01M14.5 7.5h.01" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
};

export default function CategoryIcon({ type, size = 16, className = "" }) {
  const { icon } = categoryStyle(type);
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {PATHS[icon] || PATHS.pin}
    </svg>
  );
}
