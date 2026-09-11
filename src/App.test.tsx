import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import "./i18n";
import { encodeLeague } from "./domain/leagues";

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

// Drives the real component tree: open the Leagues panel, create a league,
// paste a friend's share result, and confirm it lands in the standings.
test("league flow: create, paste a result, see standings", async () => {
  render(<App />);

  await userEvent.click(screen.getByTitle("Leagues"));

  await userEvent.type(
    screen.getByPlaceholderText("League name"),
    "D-Day Boys"
  );
  await userEvent.click(screen.getByRole("button", { name: "Create" }));

  // Now in the league detail view.
  expect(
    screen.getByRole("heading", { name: /D-Day Boys/ })
  ).toBeInTheDocument();

  await userEvent.type(screen.getByPlaceholderText(/Who\?/), "Ada");
  await userEvent.type(
    screen.getByPlaceholderText(/Paste/),
    "#WW2dle #3 2/6\n🟩🟩\nhttps://x"
  );
  await userEvent.click(screen.getByRole("button", { name: /Add/ }));

  const card = screen.getByText("Ada").closest("li");
  // Solve in 2 guesses => 7 points, 1 game, 100% win rate, avg 2.0.
  expect(within(card as HTMLElement).getByText((content, element) => {
    return element?.textContent?.trim() === "7";
  })).toBeInTheDocument();
  expect(within(card as HTMLElement).getByText("100%")).toBeInTheDocument();
  expect(within(card as HTMLElement).getByText("2.0")).toBeInTheDocument();
});

// Regression: the panel kept its own useLeagues state, so a league imported in
// App wasn't in the panel's list until a reload.
test("a ?league= link import shows up in the panel right away", async () => {
  const code = encodeLeague({
    id: "abc123",
    name: "Kursk Krew",
    members: ["Ada"],
    results: { 3: { Ada: 2 } },
  });
  window.history.replaceState(null, "", `/?league=${code}`);
  window.confirm = () => true;

  render(<App />);

  await userEvent.click(screen.getByTitle("Leagues"));
  expect(screen.getByText(/Kursk Krew/)).toBeInTheDocument();
});

// Regression: a half-played day was recorded as a loss (3 points), locking the
// day in. Own result is only offered once the game is actually over.
test("no own result to add while today's game is unfinished", async () => {
  const dayString = new Date().toISOString().slice(0, 10);
  localStorage.setItem(
    "guesses",
    JSON.stringify({
      [dayString]: [{ name: "Kursk", distance: 500000, direction: "N" }],
    })
  );

  render(<App />);

  await userEvent.click(screen.getByTitle("Leagues"));
  await userEvent.type(screen.getByPlaceholderText("League name"), "Mid Game");
  await userEvent.click(screen.getByRole("button", { name: "Create" }));
  await userEvent.type(screen.getByPlaceholderText(/Who\?/), "Ada");

  expect(screen.getByRole("button", { name: /Add my result/ })).toBeDisabled();
  expect(
    screen.getByPlaceholderText("Paste a friend's share text")
  ).toBeInTheDocument();
});
