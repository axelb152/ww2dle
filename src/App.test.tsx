import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import "./i18n";

// Drives the real component tree: open the Leagues panel, create a league,
// paste a friend's share result, and confirm it lands in the standings.
test("league flow: create, paste a result, see standings", async () => {
  localStorage.clear();
  render(<App />);

  await userEvent.click(screen.getByTitle("Leagues"));

  await userEvent.type(
    screen.getByPlaceholderText("League name"),
    "D-Day Boys"
  );
  await userEvent.click(screen.getByRole("button", { name: "Create" }));

  // Now in the league detail view.
  expect(
    screen.getByRole("heading", { name: "D-Day Boys" })
  ).toBeInTheDocument();

  await userEvent.type(screen.getByPlaceholderText(/Who\?/), "Ada");
  await userEvent.type(
    screen.getByPlaceholderText(/Paste/),
    "#WW2dle #3 2/6\n🟩🟩\nhttps://x"
  );
  await userEvent.click(screen.getByRole("button", { name: /Add/ }));

  const row = screen.getByText("Ada").closest("tr");
  // Solve in 2 guesses => 7 points.
  expect(within(row as HTMLElement).getByText("7")).toBeInTheDocument();
});
