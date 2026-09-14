import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LeaguesProvider, useLeagues } from "./useLeagues";

jest.mock("../lib/supabase", () => ({
  isConfigured: true,
  supabase: {
    rpc: async (fn: string, a: Record<string, unknown>) =>
      fn === "get_league"
        ? { data: { id: a.p_id, name: "Kursk Krew", results: [] }, error: null }
        : { data: null, error: null },
  },
}));

function Joiner() {
  const { joinLeague } = useLeagues();
  return (
    <button type="button" onClick={() => joinLeague("abc123")}>
      join
    </button>
  );
}

function Reader() {
  const { joined } = useLeagues();
  return (
    <ul>
      {joined.map((j) => (
        <li key={j.id}>{j.name}</li>
      ))}
    </ul>
  );
}

// Regression: Game (auto-submit) and the Leagues panel each held their own
// copy of the membership list, so a league joined in the panel was unknown to
// the auto-submit until a reload. One provider, one list.
test("a league joined in one component is visible to another", async () => {
  localStorage.clear();
  render(
    <LeaguesProvider>
      <Joiner />
      <Reader />
    </LeaguesProvider>
  );

  await userEvent.click(screen.getByRole("button", { name: "join" }));

  expect(await screen.findByText("Kursk Krew")).toBeInTheDocument();
});
