"use client";

import DjAvailabilityCalendar from "@/app/components/DjAvailabilityCalendar";

type DjAvailabilityManagerProps = {
  description?: string;
};

export default function DjAvailabilityManager({ description }: DjAvailabilityManagerProps) {
  return <DjAvailabilityCalendar description={description} />;
}
