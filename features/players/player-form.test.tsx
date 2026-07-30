import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";
import { PlayerForm } from "./player-form";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={`/en${href}`} {...props}>
      {children}
    </a>
  ),
}));

describe("PlayerForm", () => {
  it("allows a three-digit shirt number", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <PlayerForm action={async () => ({ status: "idle" })} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByLabelText("Shirt number")).toHaveAttribute("max", "999");
    expect(screen.getByPlaceholderText("0–999")).toBeInTheDocument();
  });
});
