import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlayerLifecycleButton } from "./player-lifecycle-button";

describe("PlayerLifecycleButton", () => {
  it("renders its icon from a serializable lifecycle variant", () => {
    render(
      <PlayerLifecycleButton
        action={async () => ({ status: "idle" })}
        label="Deactivate"
        lifecycle="deactivate"
      />,
    );

    const button = screen.getByRole("button", { name: "Deactivate" });
    expect(button.querySelector("svg")).toBeInTheDocument();
  });
});
