export default function StopOrdinal({ order, highlighted, isLast }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#7386f5] text-sm font-bold ${
          highlighted ? "bg-[#7386f5] text-white" : "bg-white text-[#7386f5]"
        }`}
      >
        {order}°
      </span>
      {!isLast ? <span className="my-1 w-0 flex-1 border-l-2 border-dashed border-[#7386f5]/40" /> : null}
    </div>
  );
}
