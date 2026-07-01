"use client";

import type { CSSProperties } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  OverlayView,
} from "@react-google-maps/api";
import type { Venue } from "@/lib/domain/event";

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter = {
  lat: -37.8136,
  lng: 144.9631,
};

/** Default red Google marker height from anchor (tip) to top of pin head. */
const MARKER_HEIGHT_PX = 34;
/** Gap between top of marker and bottom of label. */
const LABEL_GAP_PX = 8;

const labelStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  color: "#000000",
  fontSize: "11px",
  fontWeight: 600,
  fontFamily: "system-ui, -apple-system, sans-serif",
  padding: "4px 6px",
  borderRadius: "6px",
  lineHeight: 1.2,
  whiteSpace: "nowrap",
  pointerEvents: "none",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.28), 0 1px 2px rgba(0, 0, 0, 0.12)",
  border: "1px solid rgba(0, 0, 0, 0.08)",
};

function getLabelOffset(width: number, height: number) {
  return {
    x: -(width / 2),
    y: -(height + MARKER_HEIGHT_PX + LABEL_GAP_PX),
  };
}

type VenueMapProps = {
  venues: Venue[];
};

export default function VenueMap({ venues }: VenueMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 px-6 text-center">
        <p className="text-sm leading-relaxed text-zinc-500">
          Add{" "}
          <code className="font-mono text-blue-400">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </code>{" "}
          to <code className="font-mono text-zinc-400">.env.local</code> to
          load the venue map.
        </p>
      </div>
    );
  }

  return (
    <LoadScript googleMapsApiKey={apiKey}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={defaultCenter}
        zoom={12}
      >
        {venues.map((venue) => (
          <Marker
            key={`${venue.lat}-${venue.lng}-${venue.name}`}
            position={{ lat: venue.lat, lng: venue.lng }}
            title={venue.name}
          />
        ))}

        {venues.map((venue) => (
          <OverlayView
            key={`label-${venue.lat}-${venue.lng}-${venue.name}`}
            position={{ lat: venue.lat, lng: venue.lng }}
            mapPaneName={OverlayView.FLOAT_PANE}
            getPixelPositionOffset={getLabelOffset}
          >
            <div style={labelStyle}>{venue.name}</div>
          </OverlayView>
        ))}
      </GoogleMap>
    </LoadScript>
  );
}
