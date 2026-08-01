import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Matchday — Amateur Football Manager",
    short_name: "Matchday",
    description: "Manage amateur football teams from call-up to final result.",
    start_url: "/en/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f6f9f7",
    theme_color: "#071a36",
    categories: ["sports", "productivity"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
