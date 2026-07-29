import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { AnchorHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import enMessages from "@/messages/en.json";
import esMessages from "@/messages/es.json";
import { HomeContent } from "./page";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    locale,
    href,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { locale?: string }) => (
    <a
      href={`${locale ? `/${locale}` : ""}${href === "/" ? "" : (href ?? "")}`}
      {...props}
    />
  ),
  usePathname: () => "/",
}));

describe("HomeContent", () => {
  it.each([
    {
      locale: "en" as const,
      messages: enMessages,
      heading: "Your team. Ready for matchday.",
      action: "Start with your team",
      workflow: "SquadMatchCall-upResultStats",
    },
    {
      locale: "es" as const,
      messages: esMessages,
      heading: "Tu equipo. Listo para el partido.",
      action: "Empieza con tu equipo",
      workflow: "PlantelPartidoConvocatoriaResultadoEstadísticas",
    },
  ])(
    "renders the $locale locale",
    ({ locale, messages, heading, action, workflow }) => {
      render(
        <NextIntlClientProvider locale={locale} messages={messages}>
          <HomeContent locale={locale} />
        </NextIntlClientProvider>,
      );

      expect(
        screen.getByRole("heading", { name: heading }),
      ).toBeInTheDocument();
      expect(screen.getByRole("list")).toHaveTextContent(workflow);
      expect(screen.getByRole("link", { name: action })).toHaveAttribute(
        "href",
        "/register",
      );
      expect(
        screen.getByRole("link", {
          name: locale === "en" ? "English" : "Español",
        }),
      ).toHaveAttribute("aria-current", "page");
    },
  );
});
