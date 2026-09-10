"use client";

import { createContext, useContext, useEffect, useState } from "react";

const TripPillContext = createContext({ trip: null, setTrip: () => {} });

export function TripPillProvider({ children }) {
  const [trip, setTrip] = useState(null);

  return (
    <TripPillContext.Provider value={{ trip, setTrip }}>{children}</TripPillContext.Provider>
  );
}

export function useTripPill() {
  return useContext(TripPillContext).trip;
}

export function SetTripPill({ id, name }) {
  const { setTrip } = useContext(TripPillContext);

  useEffect(() => {
    setTrip({ id, name });
    return () => setTrip(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, name]);

  return null;
}
