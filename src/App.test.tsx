import React from "react";
import { DateTime } from "luxon";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import "./i18n";

// In-memory fake of the Supabase RPC surface (create_league / get_league /
// submit_result) so the league flow runs end-to-end without a network.
jest.mock("./lib/supabase", () => {
  const names: Record<string, string> = {};
  const rows: Array<{
    league_id: string;
    day: number;
    player: string;
    guesses: number;
  }> = [];
  return {
    __reset: () => {
      for (const k of Object.keys(names)) delete names[k];
      rows.length = 0;
    },
    isConfigured: true,
    supabase: {
      rpc: async (fn: string, a: Record<string, unknown>) => {
        if (fn === "create_league") {
          names["testcode"] = a.p_name as string;
          return { data: "testcode", error: null };
        }
        if (fn === "get_league") {
          const name = names[a.p_id as string];
          if (name == null) return { data: null, error: null };
          return {
            data: {
              id: a.p_id,
              name,
              results: rows
                .filter((r) => r.league_id === a.p_id)
                .map(({ day, player, guesses }) => ({ day, player, guesses })),
            },
            error: null,
          };
        }
        if (fn === "submit_result") {
          rows.push({
            league_id: a.p_league_id as string,
            day: a.p_day as number,
            player: a.p_player as string,
            guesses: a.p_guesses as number,
          });
          return { data: null, error: null };
        }
        return { data: null, error: null };
      },
    },
  };
});

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("./lib/supabase").__reset();
});

test("league flow: create a league, own result auto-submits, standings show it", async () => {
  localStorage.clear();
  // Seed today's game as a solve in 2 guesses => 7 points.
  const today = DateTime.now().toFormat("yyyy-MM-dd");
  localStorage.setItem(
    "guesses",
    JSON.stringify({
      [today]: [
        { name: "x", distance: 100, direction: "N" },
        { name: "y", distance: 0, direction: "N" },
      ],
    })
  );

  render(<App />);
  await userEvent.click(screen.getByTitle("Leagues"));

  await userEvent.type(screen.getByPlaceholderText("Your name"), "Ada");
  await userEvent.type(
    screen.getByPlaceholderText("New league name"),
    "D-Day Boys"
  );
  await userEvent.click(screen.getByRole("button", { name: "Create" }));

  expect(
    await screen.findByRole("heading", { name: /D-Day Boys/ })
  ).toBeInTheDocument();

  const card = (await screen.findByText("Ada")).closest("li");
  // Solve in 2 guesses => 7 points, 1 game, 100% win rate, avg 2.0.
  expect(within(card as HTMLElement).getByText("7")).toBeInTheDocument();
  expect(within(card as HTMLElement).getByText("100%")).toBeInTheDocument();
  expect(within(card as HTMLElement).getByText("2.0")).toBeInTheDocument();
});

// Regression: a half-played day was recorded as a loss (3 points). Own result
// is only submitted once today's game is actually over.
test("no own result submitted while today's game is unfinished", async () => {
  localStorage.clear();
  const today = DateTime.now().toFormat("yyyy-MM-dd");
  localStorage.setItem(
    "guesses",
    JSON.stringify({
      [today]: [{ name: "Kursk", distance: 500000, direction: "N" }],
    })
  );

  render(<App />);
  await userEvent.click(screen.getByTitle("Leagues"));
  await userEvent.type(screen.getByPlaceholderText("Your name"), "Ada");
  await userEvent.type(
    screen.getByPlaceholderText("New league name"),
    "Mid Game"
  );
  await userEvent.click(screen.getByRole("button", { name: "Create" }));

  expect(
    await screen.findByRole("heading", { name: /Mid Game/ })
  ).toBeInTheDocument();
  expect(await screen.findByText(/No results yet/)).toBeInTheDocument();
});
