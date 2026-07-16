export type JourneyState = {
  fixedEventId: string | null;
  fixedEventName: string | null;
  openEventId: string | null;
  openEventName: string | null;
  plannerDjConversationHref: string | null;
  fixedOfferAccepted: boolean;
};

export const journeyState: JourneyState = {
  fixedEventId: null,
  fixedEventName: null,
  openEventId: null,
  openEventName: null,
  plannerDjConversationHref: null,
  fixedOfferAccepted: false,
};
