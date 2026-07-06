"use client";

import { useEffect } from "react";

// PREVIEW: Service Worker DESACTIVADO. Cacheaba HTML/chunks viejos → __next_f vacío →
// React no hidrataba → el contenido quedaba oculto en el Suspense. Además desregistra
// cualquier SW previo para limpiar caches viejas en el navegador del usuario.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {});
    if ("caches" in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
    }
  }, []);

  return null;
}
