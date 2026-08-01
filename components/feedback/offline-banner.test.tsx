import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";
import messages from "@/messages/en.json";
import { OfflineBanner } from "./offline-banner";

function renderBanner() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <OfflineBanner />
    </NextIntlClientProvider>,
  );
}

describe("OfflineBanner", () => {
  afterEach(() => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  it("announces offline mode and removes it after reconnecting", async () => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    });
    renderBanner();

    expect(
      screen.getByRole("status", {
        name: /you’re offline/i,
      }),
    ).toBeInTheDocument();

    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    });
    fireEvent(window, new Event("online"));

    await waitFor(() =>
      expect(screen.queryByRole("status")).not.toBeInTheDocument(),
    );
  });
});
