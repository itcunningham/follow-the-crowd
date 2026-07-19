import { BookingsRouteChrome } from "@/app/components/bookings/BookingsRouteChrome";

export const dynamic = "force-dynamic";

export default function BookingsLayout({ children }: { children: React.ReactNode }) {
  return <BookingsRouteChrome>{children}</BookingsRouteChrome>;
}
