import Link from "next/link";

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path d="M19 12H5M11 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function BackLink({ href, label = "Volver", variant = "default" }) {
  if (variant === "overlay") {
    return (
      <Link
        href={href}
        className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-gray-800 shadow-lg backdrop-blur transition hover:bg-white"
      >
        <ArrowLeftIcon />
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-800"
    >
      <ArrowLeftIcon />
      {label}
    </Link>
  );
}
