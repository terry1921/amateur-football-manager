import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";
import type { BillingOverview } from "./ui-model";
import { BillingSettings } from "./billing-settings";
import { PricingPage } from "./pricing-page";
import { PremiumPreview } from "./premium-preview";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

function renderUi(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const activeSubscription: BillingOverview = {
  plan: "pro",
  status: "active",
  renewalAt: "2026-09-04T12:00:00.000Z",
  cancelAtPeriodEnd: false,
  actions: { checkout: false, portal: true, cancel: true, resume: false },
};

describe("PricingPage", () => {
  it("shows exactly Free and Pro with the monthly MXN price", () => {
    renderUi(<PricingPage checkoutStatus="idle" />);

    expect(
      screen.getByRole("heading", { name: "Choose your plan" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("$99 MXN / month")).toBeInTheDocument();
    expect(
      screen.queryByText(/offer ends|limited time/i),
    ).not.toBeInTheDocument();
  });

  it("explains that checkout completion is still being confirmed", () => {
    renderUi(<PricingPage checkoutStatus="success" />);

    expect(
      screen.getByText(
        "Payment received. We’re confirming your subscription now.",
      ),
    ).toBeInTheDocument();
  });

  it("opens an upgrade dialog without granting Pro locally", () => {
    renderUi(<PricingPage checkoutStatus="idle" />);

    fireEvent.click(screen.getByRole("button", { name: "Choose Pro" }));

    expect(
      screen.getByRole("dialog", { name: "Upgrade to Pro" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Pro is activated after payment confirmation."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Checkout is unavailable" }),
    ).toBeDisabled();
  });
});

describe("BillingSettings", () => {
  it("shows an active Pro subscription, renewal date, and supported management actions", () => {
    renderUi(
      <BillingSettings
        overview={activeSubscription}
        locale="en"
        onPortal={async () => ({ kind: "success" })}
        onCancel={async () => ({ kind: "success" })}
      />,
    );

    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Renews September 4, 2026")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Manage payment details" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Cancel at period end" }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "Resume subscription" }),
    ).not.toBeInTheDocument();
  });

  it("explains a scheduled cancellation and makes resuming available", () => {
    renderUi(
      <BillingSettings
        locale="en"
        overview={{
          ...activeSubscription,
          status: "canceling",
          cancelAtPeriodEnd: true,
          actions: {
            ...activeSubscription.actions,
            cancel: false,
            resume: true,
          },
        }}
        onPortal={async () => ({ kind: "success" })}
        onResume={async () => ({ kind: "success" })}
      />,
    );

    expect(
      screen.getByText("Your Pro access ends September 4, 2026."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Resume subscription" }),
    ).toBeEnabled();
  });

  it("keeps unavailable backend actions visibly unavailable", () => {
    renderUi(
      <BillingSettings
        locale="en"
        overview={{
          plan: "free",
          status: "unavailable",
          renewalAt: null,
          cancelAtPeriodEnd: false,
          actions: {
            checkout: false,
            portal: false,
            cancel: false,
            resume: false,
          },
        }}
      />,
    );

    expect(
      screen.getByText("Subscription details are not available yet."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Manage payment details" }),
    ).toBeDisabled();
  });
});

describe("PremiumPreview", () => {
  it("labels locked content clearly and offers the same upgrade path", () => {
    renderUi(
      <PremiumPreview
        title="Extended history"
        description="Look beyond the current season."
      />,
    );

    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Extended history")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Learn about Pro" }),
    ).toBeInTheDocument();
  });
});
