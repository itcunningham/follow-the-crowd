import { Suspense } from "react";
import EventsPageClient from "./EventsPageClient";

type EventsPageProps = {
  searchParams: Promise<{ tab?: string | string[] }>;
};

function readTabParam(tab: string | string[] | undefined): string | null {
  if (typeof tab === "string") {
    return tab;
  }

  return null;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = await searchParams;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-ftc-bg text-sm text-ftc-text-muted">
          Loading...
        </div>
      }
    >
      <EventsPageClient initialTab={readTabParam(params.tab)} />
    </Suspense>
  );
}
