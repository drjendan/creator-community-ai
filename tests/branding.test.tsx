import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UpNexxIcon, UpNexxLogo, UpNexxStackedLogo } from "@/components/brand/UpNexxLogo";

function luminance(hex: string) {
  const rgb = hex.match(/[a-f\d]{2}/gi)!.map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function contrast(foreground: string, background: string) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe("UpNexx brand system", () => {
  it("provides accessible logo variants", () => {
    render(
      <>
        <UpNexxLogo title="UpNexx dark-background logo" />
        <UpNexxLogo theme="light" title="UpNexx light-background logo" />
        <UpNexxLogo theme="monochrome" title="UpNexx monochrome logo" />
        <UpNexxStackedLogo theme="light" />
        <UpNexxIcon title="UpNexx icon" />
      </>
    );
    expect(screen.getByRole("img", { name: "UpNexx dark-background logo" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "UpNexx light-background logo" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "UpNexx monochrome logo" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "UpNexx icon" })).toBeInTheDocument();
  });

  it("meets WCAG AA for core text combinations", () => {
    expect(contrast("#F8FAFC", "#7C3AED")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#F8FAFC", "#08112B")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#94A3B8", "#03071E")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#08112B", "#F8FAFC")).toBeGreaterThanOrEqual(4.5);
  });
});
