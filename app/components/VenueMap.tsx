"use client";

import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter = {
  lat: 40.6782,
  lng: -73.9442,
};

const sampleVenues = [
  { lat: 40.7033, lng: -73.9235, label: "Warehouse district" },
  { lat: 40.6615, lng: -73.982, label: "Basement club" },
  { lat: 40.7188, lng: -73.957, label: "Late-night spot" },
];

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0d0d0f" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8b8b95" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0d0d0f" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1a1a1f" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#2a2a32" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0a1628" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#141418" }],
  },
];

export default function VenueMap() {
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
        options={{
          styles: darkMapStyle,
          disableDefaultUI: true,
          zoomControl: true,
          backgroundColor: "#070708",
        }}
      >
        {sampleVenues.map((venue) => (
          <Marker key={venue.label} position={{ lat: venue.lat, lng: venue.lng }} />
        ))}
      </GoogleMap>
    </LoadScript>
  );
}
