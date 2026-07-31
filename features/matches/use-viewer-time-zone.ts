"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;
const getServerSnapshot = () => "";
const getClientSnapshot = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone;

export function useViewerTimeZone() {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
