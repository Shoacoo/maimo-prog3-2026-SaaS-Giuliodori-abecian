import { NextResponse } from "next/server";

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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId");

  if (!placeId) {
    return NextResponse.json({ error: "Falta placeId." }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en el servidor." }, { status: 500 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set(
    "fields",
    "name,rating,user_ratings_total,formatted_address,formatted_phone_number,website,opening_hours,current_opening_hours,reviews,photos,price_level",
  );
  url.searchParams.set("language", "es");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== "OK") {
    return NextResponse.json({ error: data.error_message || data.status }, { status: 502 });
  }

  const result = data.result;
  const openingHours = result.current_opening_hours || result.opening_hours;

  return NextResponse.json({
    name: result.name,
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
  });
}
