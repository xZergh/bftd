import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, test } from "vitest";
import { TamaguiProvider } from "tamagui";
import tamaguiConfig from "../tamagui.config";
import { PageLoading } from "./PageLoading";

function renderWithTamagui(ui: ReactElement) {
  return render(<TamaguiProvider config={tamaguiConfig} defaultTheme="light">{ui}</TamaguiProvider>);
}

describe("PageLoading", () => {
  test("renders default loading message", () => {
    renderWithTamagui(<PageLoading />);
    expect(screen.getByTestId("page-loading")).toHaveTextContent("Loading…");
  });

  test("inline variant uses dataTestId override", () => {
    renderWithTamagui(<PageLoading inline dataTestId="projects-list-loading" message="Fetching…" />);
    expect(screen.getByTestId("projects-list-loading")).toHaveTextContent("Fetching…");
  });
});
