import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { FTC_CANONICAL_HOST, isPreviewDeploymentHost } from "@/lib/debug/ftcDeployment";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  if (!isPreviewDeploymentHost(host)) {
    return NextResponse.next();
  }

  const canonicalUrl = request.nextUrl.clone();
  canonicalUrl.hostname = FTC_CANONICAL_HOST;
  canonicalUrl.protocol = "https";
  canonicalUrl.port = "";

  return NextResponse.redirect(canonicalUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
