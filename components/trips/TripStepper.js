import Image from "next/image";

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true" className="shrink-0 text-[#7386f5]">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function TripStepper({ stops }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {stops.map((stop, index) => {
        const highlighted = index === 0;

        return (
          <div key={stop.id} className="flex items-center gap-4">
            <div className="flex h-36 w-72 overflow-hidden rounded-2xl shadow-sm">
              <div className="relative w-1/2 shrink-0">
                <Image src={stop.image} alt={stop.name} fill sizes="144px" className="object-cover" />
              </div>
              <div
                className={`flex w-1/2 flex-col justify-between p-4 ${highlighted ? "bg-[#7386f5]" : "bg-white"}`}
              >
                <div>
                  <p className={`text-sm font-medium ${highlighted ? "text-white/90" : "text-[#7386f5]"}`}>
                    {stop.order}° Parada
                  </p>
                  <p className={`text-lg font-bold ${highlighted ? "text-white" : "text-gray-900"}`}>{stop.name}</p>
                </div>
                <p className={`self-end text-sm ${highlighted ? "text-white/90" : "text-gray-400"}`}>
                  {stop.days} {stop.days === 1 ? "dia" : "dias"}
                </p>
              </div>
            </div>
            {index < stops.length - 1 ? <ArrowIcon /> : null}
          </div>
        );
      })}
    </div>
  );
}
