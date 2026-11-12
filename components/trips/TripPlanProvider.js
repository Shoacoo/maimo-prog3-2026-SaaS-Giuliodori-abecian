"use client";

import { createContext, useContext } from "react";

const TripPlanContext = createContext(null);

export function TripPlanProvider({ plan, children }) {
  return <TripPlanContext.Provider value={plan}>{children}</TripPlanContext.Provider>;
}

export function useTripPlan() {
  return useContext(TripPlanContext);
}
