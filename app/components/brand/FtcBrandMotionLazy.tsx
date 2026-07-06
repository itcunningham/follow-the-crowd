"use client";

import dynamic from "next/dynamic";
import { FtcBrandMotionPlaceholder, type FtcBrandMotionProps } from "./FtcBrandMotion";

const FtcBrandMotion = dynamic(() => import("./FtcBrandMotion"), {
  ssr: false,
  loading: () => <FtcBrandMotionPlaceholder variant="hero" />,
});

export default function FtcBrandMotionLazy(props: FtcBrandMotionProps) {
  return <FtcBrandMotion {...props} />;
}
