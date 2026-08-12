import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ServiceWorkerRegistration } from "./service-worker-registration";

describe("ServiceWorkerRegistration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("removes the Matchday service worker and shell cache in development", async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const getRegistrations = vi.fn().mockResolvedValue([
      {
        active: { scriptURL: "http://localhost:3000/sw.js" },
        installing: null,
        waiting: null,
        unregister,
      },
    ]);
    const caches = {
      delete: vi.fn().mockResolvedValue(true),
      keys: vi.fn().mockResolvedValue(["matchday-shell-v1", "unrelated-cache"]),
    };

    Object.defineProperty(window.navigator, "serviceWorker", {
      configurable: true,
      value: { getRegistrations },
    });
    Object.defineProperty(window, "caches", {
      configurable: true,
      value: caches,
    });

    render(<ServiceWorkerRegistration />);

    await waitFor(() => expect(unregister).toHaveBeenCalledOnce());
    expect(caches.delete).toHaveBeenCalledWith("matchday-shell-v1");
    expect(caches.delete).not.toHaveBeenCalledWith("unrelated-cache");
  });
});
