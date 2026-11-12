import Link from "next/link";
import AddToItineraryButton from "@/components/trips/AddToItineraryButton";

export default function FavoritesSection({ tripId, favorites, inItinerary, dateList }) {
  return (
    <section className="flex w-full flex-col gap-4">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold text-gray-900">♡ Favoritos del viaje</h2>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">{favorites.length}</span>
        <span className="flex-1" />
        <Link
          href={`/dashboard/trips/${tripId}/lugares?filtro=favoritos`}
          className="text-sm font-semibold text-[#7386f5] hover:underline"
        >
          Ver todos →
        </Link>
      </div>

      {favorites.length === 0 ? (
        <p className="rounded-[14px] border-2 border-dashed border-gray-200 px-4 py-6 text-sm text-gray-400">
          Tocá ♡ en la ficha de un lugar para guardarlo acá.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {favorites.slice(0, 4).map((place) => (
            <div key={place.placeId} className="flex flex-col rounded-[14px] bg-white shadow-sm">
              <div className="h-[110px] w-full overflow-hidden rounded-t-[14px] bg-gray-100">
                {place.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={place.image} alt={place.name} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="flex flex-col items-start gap-1 px-3 pb-3 pt-2.5">
                <p className="w-full truncate text-sm font-semibold text-gray-900">{place.name}</p>
                <p className="w-full truncate text-xs text-gray-500">
                  {[place.category, place.city].filter(Boolean).join(" · ")}
                </p>
                {inItinerary.has(place.placeId) ? (
                  <span className="rounded-full bg-emerald-600/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                    ✓ En el itinerario
                  </span>
                ) : (
                  <AddToItineraryButton
                    place={place}
                    tripId={tripId}
                    dateList={dateList}
                    compact
                    label="+ Agregar lugar"
                    showAdded={false}
                    buttonClassName="rounded-full bg-[#7386f5]/10 px-2 py-0.5 text-[11px] font-semibold text-[#7386f5] transition hover:bg-[#7386f5]/20"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
