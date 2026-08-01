import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";
import { InstallAppButton } from "./install-app-button";

function renderButton() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <InstallAppButton />
    </NextIntlClientProvider>,
  );
}

describe("InstallAppButton", () => {
  it("appears only when the browser makes installation available", async () => {
    renderButton();
    expect(
      screen.queryByRole("button", { name: "Install app" }),
    ).not.toBeInTheDocument();

    const installEvent = new Event("beforeinstallprompt", {
      cancelable: true,
    }) as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
    };
    installEvent.prompt = vi.fn().mockResolvedValue(undefined);
    installEvent.userChoice = Promise.resolve({ outcome: "accepted" });

    window.dispatchEvent(installEvent);

    const button = await screen.findByRole("button", { name: "Install app" });
    fireEvent.click(button);

    await waitFor(() => expect(installEvent.prompt).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Install app" }),
      ).not.toBeInTheDocument(),
    );
  });
});
