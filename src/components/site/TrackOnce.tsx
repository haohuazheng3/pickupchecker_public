"use client";
import { useEffect, useRef } from "react";
import { track } from "@/lib/track";

export function TrackOnce({ event, props }: { event: string; props?: Record<string, unknown> }) {
  const propsRef = useRef(props);
  useEffect(() => { track(event, propsRef.current); }, [event]);
  return null;
}
