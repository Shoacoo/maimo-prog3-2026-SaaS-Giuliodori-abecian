import { CATEGORY_LABELS } from "@/lib/places/nearby";

function formatClock(hhmm) {
  if (!hhmm || hhmm.length !== 4) {
    return hhmm;
  }

  const hour24 = Number(hhmm.slice(0, 2));
  const minutes = hhmm.slice(2);
  const suffix = hour24 >= 12 ? "pm" : "am";
  const hour12 = hour24 % 12 || 12;

  return minutes === "00" ? `${hour12}${suffix}` : `${hour12}:${minutes}${suffix}`;
}

function closingTimeToday(openingHours) {
  const periods = openingHours?.periods;
  if (!periods) {
    return null;
  }

  const now = new Date();
  const todayIndex = now.getDay();

  // An open period can close after midnight (close.day is the next day) - match
  // on the open side's day, which is what "today's hours" means to a visitor.
  const todayPeriod = periods.find((period) => period.open?.day === todayIndex);
  if (!todayPeriod?.close) {
    return null;
  }

  return formatClock(todayPeriod.close.time);
}

function guessCategory(types) {
  const match = (types || []).find((type) => CATEGORY_LABELS[type]);
  return match ? CATEGORY_LABELS[match] : null;
}

// Editorial summaries (a one-line "what is this place" blurb Google curates)
// only exist on the New Places API, not the Legacy Place Details API this
// project otherwise uses everywhere else - confirmed live against both APIs
// with the same place_id before adding this. Best-effort: most places don't
// have one, and we never fabricate a substitute when it's missing.
export async function fetchEditorialSummary(placeId, apiKey) {
  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "editorialSummary",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.editorialSummary?.text || null;
  } catch {
    return null;
  }
}

export async function getPlaceDetails(placeId, apiKey) {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set(
    "fields",
    "name,geometry,types,rating,user_ratings_total,formatted_address,formatted_phone_number,website,opening_hours,current_opening_hours,reviews,photos,price_level",
  );
  url.searchParams.set("language", "es");
  url.searchParams.set("key", apiKey);

  const [response, description] = await Promise.all([fetch(url), fetchEditorialSummary(placeId, apiKey)]);
  const data = await response.json();

  if (data.status !== "OK") {
    return { error: data.error_message || data.status };
  }

  const result = data.result;
  const openingHours = result.current_opening_hours || result.opening_hours;

  return {
    placeId,
    name: result.name,
    lat: result.geometry?.location?.lat ?? null,
    lng: result.geometry?.location?.lng ?? null,
    category: guessCategory(result.types),
    description,
    rating: result.rating ?? null,
    ratingsCount: result.user_ratings_total || 0,
    address: result.formatted_address || null,
    phone: result.formatted_phone_number || null,
    website: result.website || null,
    priceLevel: typeof result.price_level === "number" ? result.price_level : null,
    openNow: typeof openingHours?.open_now === "boolean" ? openingHours.open_now : null,
    closesAt: openingHours?.open_now ? closingTimeToday(openingHours) : null,
    weekdayText: openingHours?.weekday_text || [],
    reviews: (result.reviews || []).map((review) => ({
      author: review.author_name,
      avatar: review.profile_photo_url || null,
      rating: review.rating,
      relativeTime: review.relative_time_description,
      text: review.text,
    })),
    photos: (result.photos || [])
      .slice(0, 12)
      .map((photo) => `/api/places/photo?ref=${encodeURIComponent(photo.photo_reference)}`),
  };
}
