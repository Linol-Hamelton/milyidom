import React from "react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { ListingForm } from "./listing-form";

describe("ListingForm coordinates", () => {
  it("allows decimal latitude and longitude values", () => {
    render(<ListingForm amenities={[]} onSubmit={vi.fn().mockResolvedValue(undefined)} />);

    const latitudeInput = screen.getByLabelText("Широта") as HTMLInputElement;
    const longitudeInput = screen.getByLabelText("Долгота") as HTMLInputElement;

    expect(latitudeInput).toHaveAttribute("step", "0.000001");
    expect(longitudeInput).toHaveAttribute("step", "0.000001");
    expect(latitudeInput).toHaveAttribute("min", "-90");
    expect(longitudeInput).toHaveAttribute("min", "-180");
  });
});
