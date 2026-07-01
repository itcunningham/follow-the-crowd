export type EventBrief = {
  eventName: string;
  venue: string;
  city: string;
  eventType: string;
  genre: string;
  date: string;
  capacity: string;
  budget: string;
};

export type Venue = {
  name: string;
  lat: number;
  lng: number;
};

export type EventPlanResult = {
  result: string;
  venues: Venue[];
};

export const emptyEventBrief: EventBrief = {
  eventName: "",
  venue: "",
  city: "",
  eventType: "",
  genre: "",
  date: "",
  capacity: "",
  budget: "",
};
