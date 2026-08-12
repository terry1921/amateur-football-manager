"use client";

import { useEffect } from "react";

function isMatchdayServiceWorker(registration: ServiceWorkerRegistration) {
  const scriptUrl =
    registration.active?.scriptURL ??
    registration.waiting?.scriptURL ??
    registration.installing?.scriptURL;

  return scriptUrl === new URL("/sw.js", window.location.href).href;
}

async function cleanDevelopmentServiceWorker() {
  const registrations = await navigator.serviceWorker.getRegistrations();

  await Promise.all(
    registrations
      .filter(isMatchdayServiceWorker)
      .map((registration) => registration.unregister()),
  );

  if ("caches" in window) {
    const cacheNames = await window.caches.keys();

    await Promise.all(
      cacheNames
        .filter((cacheName) => cacheName.startsWith("matchday-shell-"))
        .map((cacheName) => window.caches.delete(cacheName)),
    );
  }
}

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      void cleanDevelopmentServiceWorker().catch(() => {});
      return;
    }

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Offline support is progressive enhancement; a registration failure
      // must never block the authenticated application.
    });
  }, []);

  return null;
}
