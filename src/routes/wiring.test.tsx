// @vitest-environment jsdom
// Records and level on the profile, Report on a made puzzle, the owner page. Each has a deliberate line for nothing.
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import { POOLS } from "../copy";
import { OwnerPuzzles } from "./OwnerPuzzles";
import { Profile } from "./Profile";
import { RatePuzzle } from "./RatePuzzle";

type Me = { id: string; handle: string; name: string } | null;
const world = vi.hoisted(() => ({
  me: null as Me,
  api: {} as Record<string, (...a: unknown[]) => Promise<unknown>>,
}));

vi.mock("../lib/auth", () => ({
  useAuth: () => ({
    enabled: true,
    loading: false,
    profile: world.me,
    session: world.me ? { user: { id: world.me.id } } : null,
  }),
}));
vi.mock("../avatar/store", () => ({
  avatarCodeOf: () => undefined,
  subscribeAvatars: () => () => {},
}));
vi.mock("../lib/api", async (original) => {
  const real = await original<typeof import("../lib/api")>();
  const names = [
    "fetchOwnPlays",
    "fetchPublicPlays",
    "fetchProfileByHandle",
    "fetchBadges",
    "fetchFollowers",
    "fetchFollowing",
    "isFollowing",
    "fetchPuzzleRating",
    "ratePuzzle",
    "reportPuzzle",
    "fetchHiddenPuzzles",
    "restorePuzzle",
    "removePuzzle",
  ];
  const fakes = Object.fromEntries(
    names.map((n) => [n, (...a: unknown[]) => world.api[n]!(...a)]),
  );
  return { ...real, ...fakes };
});

const ok =
  <T,>(v: T) =>
  () =>
    Promise.resolve(v);
const fail = () => Promise.reject(new Error("offline"));

beforeAll(() => {
  // jsdom has no modal dialogs. This is enough for the tree to be reachable.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

beforeEach(() => {
  localStorage.clear();
  world.me = null;
  world.api = {
    fetchOwnPlays: ok([]),
    fetchPublicPlays: ok([]),
    fetchProfileByHandle: ok(null),
    fetchBadges: ok([]),
    fetchFollowers: ok([]),
    fetchFollowing: ok([]),
    isFollowing: ok(false),
    fetchPuzzleRating: ok(null),
    ratePuzzle: ok({ ok: true }),
    reportPuzzle: ok({ ok: true, status: 200, error: null, again: false }),
    fetchHiddenPuzzles: ok([]),
    restorePuzzle: ok({ ok: true, status: 200 }),
    removePuzzle: ok({ ok: true, status: 200 }),
  };
});

/** Nothing on the page reads like a missing value. */
function expectNoHoles() {
  expect(document.body.textContent ?? "").not.toMatch(
    /undefined|NaN|Invalid Date|\bnull\b|0 of 0/,
  );
}

const ADA = { id: "u1", handle: "ada", name: "Ada" };
const profile = {
  id: "u1",
  handle: "ada",
  name: "Ada",
  created_at: "2026-03-04T00:00:00Z",
};
const play = (i: number, over: Record<string, unknown> = {}) => ({
  game_id: `g${i}`,
  day_no: null,
  found: 3,
  total: 5,
  score: 300,
  secs: 60,
  created_at: "2026-10-01T10:00:00Z",
  verified: true,
  ...over,
});

function openProfile() {
  return render(
    <MemoryRouter initialEntries={["/u/ada"]}>
      <Routes>
        <Route path="/u/:handle" element={<Profile />} />
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Profile records, clean reads and level", () => {
  beforeEach(() => {
    world.api.fetchProfileByHandle = ok(profile);
  });

  it("your own records show, with the browser noted nowhere they are not true", async () => {
    world.me = ADA;
    world.api.fetchOwnPlays = ok([play(1)]);
    localStorage.setItem(
      "gazecraft-records",
      JSON.stringify({
        clean: { Bible: 75 },
        daily: 7,
        long: { word: "Habakkuk", len: 8 },
      }),
    );
    openProfile();
    expect(
      await screen.findByRole("heading", { name: "Your records" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Fastest clean read, Bible")).toBeInTheDocument();
    expect(screen.getByText("1:15")).toBeInTheDocument();
    expect(screen.getByText("Most found in a daily")).toBeInTheDocument();
    expect(screen.getByText("Habakkuk")).toBeInTheDocument();
    expectNoHoles();
  });

  it("no records yet is one calm line, not an empty heading", async () => {
    world.me = ADA;
    world.api.fetchOwnPlays = ok([play(1)]);
    openProfile();
    expect(
      await screen.findByRole("heading", { name: "Your records" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/shows here\. Records are kept in this browser\./),
    ).toBeInTheDocument();
    expect(screen.queryByText("Longest word")).toBeNull();
    expectNoHoles();
  });

  it("malformed storage reads as no records", async () => {
    world.me = ADA;
    world.api.fetchOwnPlays = ok([play(1)]);
    localStorage.setItem("gazecraft-records", "{not json");
    openProfile();
    expect(
      await screen.findByText(/Records are kept in this browser\./),
    ).toBeInTheDocument();
    expectNoHoles();
  });

  it("half valid storage keeps only what is a record", async () => {
    world.me = ADA;
    world.api.fetchOwnPlays = ok([play(1)]);
    localStorage.setItem(
      "gazecraft-records",
      JSON.stringify({
        clean: { Bible: "fast", Cities: 90 },
        daily: -3,
        long: { word: "", len: "x" },
      }),
    );
    openProfile();
    expect(
      await screen.findByText("Fastest clean read, Cities"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Bible/)).toBeNull();
    expect(screen.queryByText("Most found in a daily")).toBeNull();
    expect(screen.queryByText("Longest word")).toBeNull();
    expectNoHoles();
  });

  it("records are never shown on someone else's page", async () => {
    world.me = ADA;
    world.api.fetchProfileByHandle = ok({
      ...profile,
      id: "u2",
      handle: "bola",
      name: "Bola",
    });
    world.api.fetchPublicPlays = ok([play(1)]);
    localStorage.setItem(
      "gazecraft-records",
      JSON.stringify({ clean: { Bible: 75 }, daily: 7, long: null }),
    );
    render(
      <MemoryRouter initialEntries={["/u/bola"]}>
        <Routes>
          <Route path="/u/:handle" element={<Profile />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("Streak")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your records" })).toBeNull();
    expectNoHoles();
  });

  it("clean reads sit beside the stats when there are some, and are left out at 0 or unknown", async () => {
    world.me = ADA;
    world.api.fetchOwnPlays = ok([
      play(1, { clean: true }),
      play(2, { clean: true }),
      play(3, { clean: null }),
    ]);
    const first = openProfile();
    expect(await screen.findByText("Clean reads")).toBeInTheDocument();
    expect(
      screen.getByText("Clean reads").nextElementSibling,
    ).toHaveTextContent("2");
    first.unmount();
    world.api.fetchOwnPlays = ok([play(1), play(2, { clean: false })]);
    openProfile();
    expect(await screen.findByText("Perfect")).toBeInTheDocument();
    expect(screen.queryByText("Clean reads")).toBeNull();
    expectNoHoles();
  });

  it("the level badge sits by the avatar once points show, and not before", async () => {
    world.me = ADA;
    world.api.fetchOwnPlays = ok([play(1)]);
    const first = openProfile();
    expect(await screen.findByText("Points")).toBeInTheDocument();
    expect(document.querySelector("[data-level]")).not.toBeNull();
    first.unmount();
    world.api.fetchOwnPlays = ok([play(1, { verified: false })]);
    openProfile();
    expect(await screen.findByText("Best streak")).toBeInTheDocument();
    expect(document.querySelector("[data-level]")).toBeNull();
    expectNoHoles();
  });

  it("a new player has no records block and no level", async () => {
    world.me = ADA;
    openProfile();
    expect(
      await screen.findByRole("heading", {
        name: "Your run starts with one puzzle.",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your records" })).toBeNull();
    expect(document.querySelector("[data-level]")).toBeNull();
  });

  it("plays that did not load show neither records nor level", async () => {
    world.me = ADA;
    world.api.fetchOwnPlays = fail;
    openProfile();
    expect(
      await screen.findByText(
        "Your plays did not load. Try again in a moment.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your records" })).toBeNull();
    expectNoHoles();
  });
});

describe("Report this puzzle", () => {
  const rating = { maker: "bola", own: false, ups: 2, mine: null };
  const show = () =>
    render(
      <MemoryRouter>
        <RatePuzzle code="ABC123" />
      </MemoryRouter>,
    );

  it("asks once, then says a calm line from the pool", async () => {
    world.me = ADA;
    world.api.fetchPuzzleRating = ok(rating);
    const report = vi.fn(
      ok({ ok: true, status: 200, error: null, again: false }),
    );
    world.api.reportPuzzle = report;
    show();
    fireEvent.click(
      await screen.findByRole("button", { name: "Report this puzzle" }),
    );
    expect(report).not.toHaveBeenCalled();
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Report",
      }),
    );
    await waitFor(() => expect(report).toHaveBeenCalledWith("ABC123"));
    const line = await screen.findByRole("status");
    expect(POOLS.reportDone).toContain(line.textContent);
    expect(
      screen.queryByRole("button", { name: "Report this puzzle" }),
    ).toBeNull();
  });

  it("a second report says it is already noted", async () => {
    world.me = ADA;
    world.api.fetchPuzzleRating = ok(rating);
    world.api.reportPuzzle = ok({
      ok: true,
      status: 200,
      error: null,
      again: true,
    });
    show();
    fireEvent.click(
      await screen.findByRole("button", { name: "Report this puzzle" }),
    );
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Report",
      }),
    );
    const line = await screen.findByRole("status");
    expect(POOLS.reportAgain).toContain(line.textContent);
  });

  it("a failed report says so and keeps the link for another try", async () => {
    world.me = ADA;
    world.api.fetchPuzzleRating = ok(rating);
    world.api.reportPuzzle = ok({
      ok: false,
      status: 0,
      error: "network",
      again: false,
    });
    show();
    fireEvent.click(
      await screen.findByRole("button", { name: "Report this puzzle" }),
    );
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Report",
      }),
    );
    const line = await screen.findByRole("status");
    expect(POOLS.reportFailed).toContain(line.textContent);
  });

  it("cancel sends nothing", async () => {
    world.me = ADA;
    world.api.fetchPuzzleRating = ok(rating);
    const report = vi.fn(
      ok({ ok: true, status: 200, error: null, again: false }),
    );
    world.api.reportPuzzle = report;
    show();
    fireEvent.click(
      await screen.findByRole("button", { name: "Report this puzzle" }),
    );
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Cancel",
      }),
    );
    expect(report).not.toHaveBeenCalled();
  });

  it("never on your own puzzle, when signed out, or when there is no maker", async () => {
    world.me = ADA;
    world.api.fetchPuzzleRating = ok({ ...rating, own: true });
    const own = show();
    expect(await screen.findByText(/liked it/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Report this puzzle" }),
    ).toBeNull();
    own.unmount();

    world.me = null;
    world.api.fetchPuzzleRating = ok(rating);
    const out = show();
    expect(await screen.findByText(/Made by/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Report this puzzle" }),
    ).toBeNull();
    out.unmount();

    world.me = ADA;
    world.api.fetchPuzzleRating = ok({ ...rating, maker: null });
    const none = show();
    await Promise.resolve();
    expect(none.container).toBeEmptyDOMElement();
  });
});

describe("Owner page", () => {
  const hidden = (i: number, over: Record<string, unknown> = {}) => ({
    code: `CODE0${i}`,
    title: `Puzzle ${i}`,
    noun: "words",
    text: "x",
    dict: [],
    maker: "bola",
    safety: "failed",
    reports: 3,
    created_at: "2026-10-01T10:00:00Z",
    hidden_at: "2026-10-02T10:00:00Z",
    ...over,
  });
  const open = () =>
    render(
      <MemoryRouter initialEntries={["/owner/puzzles"]}>
        <Routes>
          <Route path="/owner/puzzles" element={<OwnerPuzzles />} />
          <Route path="/" element={<p>Home</p>} />
        </Routes>
      </MemoryRouter>,
    );

  beforeEach(() => {
    world.me = ADA;
  });

  it("lists hidden puzzles with Restore and Remove", async () => {
    world.api.fetchHiddenPuzzles = ok([hidden(1), hidden(2)]);
    open();
    expect(await screen.findByText("Puzzle 1")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Restore" })).toHaveLength(2);
    expect(screen.getAllByText(/3 reports/)).toHaveLength(2);
    expectNoHoles();
  });

  it("a non owner gets the normal not found screen", async () => {
    world.api.fetchHiddenPuzzles = ok(null);
    open();
    expect(await screen.findByText("Home")).toBeInTheDocument();
  });

  it("a truly empty list says so, and a failed fetch says it did not load", async () => {
    world.api.fetchHiddenPuzzles = ok([]);
    const first = open();
    expect(await screen.findByText(/Nothing is hidden/)).toBeInTheDocument();
    first.unmount();
    world.api.fetchHiddenPuzzles = fail;
    open();
    expect(
      await screen.findByText("This list did not load. Try again in a moment."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Nothing is hidden/)).toBeNull();
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });

  it("a puzzle with no title, no maker and a bad date still reads", async () => {
    world.api.fetchHiddenPuzzles = ok([
      hidden(1, {
        title: null,
        maker: null,
        hidden_at: "soon",
        reports: undefined,
        safety: "odd",
      }),
    ]);
    open();
    expect(await screen.findByText("Untitled puzzle")).toBeInTheDocument();
    expect(screen.getByText(/No maker/)).toBeInTheDocument();
    expectNoHoles();
  });

  it("Restore takes the puzzle off the list", async () => {
    world.api.fetchHiddenPuzzles = ok([hidden(1)]);
    const restore = vi.fn(ok({ ok: true, status: 200 }));
    world.api.restorePuzzle = restore;
    open();
    fireEvent.click(await screen.findByRole("button", { name: "Restore" }));
    await waitFor(() => expect(restore).toHaveBeenCalledWith("CODE01"));
    expect(await screen.findByText(/Nothing is hidden/)).toBeInTheDocument();
  });

  it("Remove asks first, and only the confirm deletes", async () => {
    world.api.fetchHiddenPuzzles = ok([hidden(1)]);
    const remove = vi.fn(ok({ ok: true, status: 200 }));
    world.api.removePuzzle = remove;
    open();
    fireEvent.click(await screen.findByRole("button", { name: "Remove" }));
    expect(remove).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("cannot be undone");
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith("CODE01"));
    expect(await screen.findByText(/Nothing is hidden/)).toBeInTheDocument();
  });

  it("a failed Remove keeps the puzzle and says so", async () => {
    world.api.fetchHiddenPuzzles = ok([hidden(1)]);
    world.api.removePuzzle = ok({ ok: false, status: 500 });
    open();
    fireEvent.click(await screen.findByRole("button", { name: "Remove" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Remove",
      }),
    );
    expect(
      await screen.findByText("That did not work. Try again in a moment."),
    ).toBeInTheDocument();
    expect(screen.getByText("Puzzle 1")).toBeInTheDocument();
  });
});
