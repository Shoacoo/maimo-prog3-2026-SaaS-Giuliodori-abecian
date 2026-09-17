"use client";

const TABS = [
  { id: "overview", label: "Vista general" },
  { id: "menu", label: "Carta" },
  { id: "reviews", label: "Reseñas" },
  { id: "photos", label: "Fotos" },
  { id: "info", label: "Información" },
];

function StarRating({ value }) {
  if (!value) {
    return null;
  }

  return (
    <span className="text-[#7386f5]">
      {"★".repeat(Math.round(value))}
      <span className="text-gray-300">{"★".repeat(5 - Math.round(value))}</span>
    </span>
  );
}

function StatusLine({ details }) {
  if (!details || details.openNow === null) {
    return null;
  }

  if (!details.openNow) {
    return <p className="mt-1 text-sm font-semibold text-red-500">Cerrado</p>;
  }

  return (
    <p className="mt-1 text-sm">
      <span className="font-semibold text-emerald-600">Abierto</span>
      {details.closesAt ? <span className="text-gray-500"> • Cierra {details.closesAt}</span> : null}
    </p>
  );
}

function ReviewsList({ reviews }) {
  if (!reviews || reviews.length === 0) {
    return <p className="text-sm text-gray-400">Todavia no hay reseñas de este lugar.</p>;
  }

  return (
    <ul className="grid gap-4">
      {reviews.map((review, index) => (
        <li key={`${review.author}-${index}`} className="flex gap-3">
          <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-100">
            {review.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={review.avatar} alt={review.author} className="h-full w-full object-cover" />
            ) : null}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-gray-900">{review.author}</p>
              <span className="shrink-0 text-xs text-gray-400">{review.relativeTime}</span>
            </div>
            <StarRating value={review.rating} />
            <p className="mt-1 text-sm text-gray-600">{review.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function PhotosGrid({ photos }) {
  if (!photos || photos.length === 0) {
    return <p className="text-sm text-gray-400">No hay fotos disponibles para este lugar.</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((photo, index) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={photo}
          src={photo}
          alt={`Foto ${index + 1}`}
          className="h-24 w-full rounded-lg object-cover shadow-md"
        />
      ))}
    </div>
  );
}

const PRICE_LABELS = ["Gratis", "Económico", "Moderado", "Caro", "Muy caro"];

export default function PlaceSheet({ place, details, loading, activeTab, onTabChange, onClose }) {
  const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${place.id}`;

  return (
    <div className="absolute inset-x-3 bottom-3 z-20 flex max-h-[65%] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="relative shrink-0 bg-gray-100">
        {place.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={place.image} alt={place.name} className="h-36 w-full object-cover" />
        ) : (
          <div className="h-36 w-full" />
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#7386f5] text-white shadow-lg transition hover:bg-[#5f70e0]"
        >
          ✕
        </button>
      </div>

      <div className="overflow-y-auto px-4 pb-4 pt-3">
        <div className="flex items-start justify-between gap-3">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="truncate text-base font-bold text-gray-900 hover:text-[#7386f5]"
          >
            {place.name}
          </a>
          {place.rating ? (
            <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-gray-700">
              {place.rating}
              <StarRating value={place.rating} />
            </span>
          ) : null}
        </div>

        <p className="mt-1 text-sm text-gray-600">{place.category}</p>
        <StatusLine details={details} />

        <div className="-mx-4 mt-3 border-b border-gray-100 px-4">
          <div className="flex gap-4 overflow-x-auto pb-3 text-sm font-medium text-gray-500">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`shrink-0 whitespace-nowrap border-b-2 pb-1 transition ${
                  activeTab === tab.id ? "border-[#7386f5] font-semibold text-[#7386f5]" : "border-transparent hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-gray-400">Cargando informacion...</p>
          ) : (
            <>
              {activeTab === "overview" ? (
                <div className="grid gap-2">
                  {place.address ? <p className="text-sm text-gray-600">{place.address}</p> : null}
                  {details?.reviews?.length ? (
                    <div className="mt-2">
                      <ReviewsList reviews={details.reviews.slice(0, 2)} />
                      <button
                        type="button"
                        onClick={() => onTabChange("reviews")}
                        className="mt-2 text-sm font-semibold text-[#7386f5] hover:underline"
                      >
                        Ver todas las reseñas
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {activeTab === "menu" ? (
                <p className="text-sm text-gray-400">Google no ofrece informacion de menu para este lugar.</p>
              ) : null}

              {activeTab === "reviews" ? <ReviewsList reviews={details?.reviews} /> : null}

              {activeTab === "photos" ? <PhotosGrid photos={details?.photos} /> : null}

              {activeTab === "info" ? (
                <div className="grid gap-3 text-sm text-gray-600">
                  {details?.address ? <p>{details.address}</p> : null}
                  {details?.phone ? (
                    <a href={`tel:${details.phone}`} className="font-medium text-[#7386f5] hover:underline">
                      {details.phone}
                    </a>
                  ) : null}
                  {details?.website ? (
                    <a
                      href={details.website}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate font-medium text-[#7386f5] hover:underline"
                    >
                      {details.website}
                    </a>
                  ) : null}
                  {typeof details?.priceLevel === "number" ? <p>{PRICE_LABELS[details.priceLevel]}</p> : null}
                  {details?.weekdayText?.length ? (
                    <ul className="grid gap-1">
                      {details.weekdayText.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
