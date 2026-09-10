import { getFlagUrl } from "@/lib/countries/flags";

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true" className="shrink-0 text-[#7386f5]">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function RouteFlags({ destinations }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {destinations.map((destination, index) => {
        const flagUrl = getFlagUrl(destination.countryCode, destination.country);

        return (
          <div key={destination.id || destination.placeId || index} className="flex items-center gap-3">
            <span className="flex items-center gap-2">
              {flagUrl ? (
                <span className="h-6 w-6 shrink-0 overflow-hidden rounded-full ring-1 ring-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={flagUrl}
                    alt={destination.country || destination.name}
                    className="h-full w-full object-cover"
                  />
                </span>
              ) : null}
              <span className="font-semibold text-gray-900">{destination.name}</span>
            </span>
            {index < destinations.length - 1 ? <ArrowIcon /> : null}
          </div>
        );
      })}
    </div>
  );
}
