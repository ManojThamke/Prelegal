// Integration tests for every page, with Next's router mocked and the backend faked.
import { act, render, screen, within } from "@testing-library/react";
import { StrictMode } from "react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DocumentsPage from "@/app/documents/page";
import DraftPage from "@/app/draft/page";
import SignInPage from "@/app/page";
import SignUpPage from "@/app/signup/page";
import { ADA, CSA, draftOf, party, savedDraft, stubBackend } from "@/test/backend";

const router = { replace: vi.fn(), push: vi.fn() };
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/documents/",
  useSearchParams: () => new URLSearchParams(search),
}));

/** Next's Link drops the trailing slash in tests (the build's trailingSlash setting adds it). */
const href = (path: string) => path.replace(/\/(\?|$)/, "$1");

beforeEach(() => {
  router.replace.mockReset();
  search = "";
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("sign-in page", () => {
  it("signs in and goes to the documents page", async () => {
    stubBackend();
    render(<SignInPage />);

    await userEvent.type(screen.getByLabelText("Work email"), "ada@acme.test");
    await userEvent.type(screen.getByLabelText("Password"), "correct horse");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(router.replace).toHaveBeenCalledWith("/documents/");
  });

  it("shows why a sign-in was rejected", async () => {
    stubBackend({ authError: "Incorrect email or password." });
    render(<SignInPage />);

    await userEvent.type(screen.getByLabelText("Work email"), "ada@acme.test");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("sends signed-in users to their documents", async () => {
    stubBackend({ user: ADA });
    render(<SignInPage />);
    await vi.waitFor(() => expect(router.replace).toHaveBeenCalledWith("/documents/"));
  });

  it("shows the disclaimer and links to sign-up", () => {
    stubBackend();
    render(<SignInPage />);
    expect(screen.getAllByText(/should be reviewed by a qualified lawyer/).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", href("/signup/"));
  });
});

describe("sign-up page", () => {
  it("creates an account and goes to the documents page", async () => {
    const fetchMock = stubBackend();
    render(<SignUpPage />);

    await userEvent.type(screen.getByLabelText("Full name"), "Ada Lovelace");
    await userEvent.type(screen.getByLabelText("Work email"), "ada@acme.test");
    await userEvent.type(screen.getByLabelText("Password"), "correct horse");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(router.replace).toHaveBeenCalledWith("/documents/");
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/signup", expect.objectContaining({ method: "POST" }));
  });

  it("checks the form before submitting", async () => {
    const fetchMock = stubBackend();
    render(<SignUpPage />);

    await userEvent.type(screen.getByLabelText("Full name"), "Ada");
    await userEvent.type(screen.getByLabelText("Work email"), "ada@acme.test");
    await userEvent.type(screen.getByLabelText("Password"), "short");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByRole("alert")).toHaveTextContent("at least 8 characters");
    expect(fetchMock).not.toHaveBeenCalledWith("/api/auth/signup", expect.anything());
  });
});

describe("documents page", () => {
  it("sends signed-out visitors to sign in", async () => {
    stubBackend();
    render(<DocumentsPage />);
    await vi.waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
  });

  it("invites a new user to draft their first document", async () => {
    stubBackend({ user: ADA });
    render(<DocumentsPage />);

    expect(await screen.findByText("No documents yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Draft your first document" })).toHaveAttribute("href", href("/draft/"));
  });

  it("lists saved documents with their status, and deletes them", async () => {
    stubBackend({
      user: ADA,
      drafts: [
        savedDraft(7, draftOf(CSA), { title: "Cloud Service Agreement for Acme", complete: true }),
        savedDraft(3, draftOf(CSA), { title: "Cloud Service Agreement for Globex" }),
      ],
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<DocumentsPage />);

    const list = await screen.findByRole("list");
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByRole("link", { name: "Cloud Service Agreement for Acme" })).toHaveAttribute("href", href("/draft/?id=7"));
    expect(within(rows[0]).getByText("Ready to download")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Needs details")).toBeInTheDocument();

    await userEvent.click(within(rows[1]).getByRole("button", { name: "Delete" }));

    await vi.waitFor(() => expect(screen.queryByText("Cloud Service Agreement for Globex")).not.toBeInTheDocument());
    expect(screen.getByText("Cloud Service Agreement for Acme")).toBeInTheDocument();
  });

  it("signs out from the account menu", async () => {
    stubBackend({ user: ADA });
    render(<DocumentsPage />);

    const menuButton = await screen.findByRole("button", { name: "Account menu for Ada Lovelace" });
    await userEvent.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("ada@acme.test")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await vi.waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
  });

  it("closes the account menu with Escape", async () => {
    stubBackend({ user: ADA });
    render(<DocumentsPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Account menu for Ada Lovelace" }));
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
  });

  it("stays signed in when signing out fails", async () => {
    stubBackend({ user: ADA, failing: "/api/auth/signout" });
    render(<DocumentsPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Account menu for Ada Lovelace" }));
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByText("Couldn't sign you out. Try again.")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("returns to sign-in when the session has ended", async () => {
    const fetchMock = stubBackend({ user: ADA });
    const { unmount } = render(<DocumentsPage />);
    await screen.findByText("No documents yet");

    // E.g. the server restarted and its temporary database was reset.
    fetchMock.mockImplementation(async () => Response.json({ detail: "Please sign in." }, { status: 401 }));
    await userEvent.click(screen.getByRole("link", { name: "Draft your first document" }));
    unmount();
    render(<DraftPage />);
    await vi.waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));

    render(<SignInPage />);
    expect(screen.getByText("Your session ended. Sign in again to continue.")).toBeInTheDocument();
  });

  it("shows the disclaimer on every signed-in page", async () => {
    stubBackend({ user: ADA });
    render(<DocumentsPage />);
    expect(await screen.findByText(/should be reviewed by a qualified lawyer/)).toBeInTheDocument();
  });
});

describe("drafting page", () => {
  it("shows the catalog until the chat chooses a document", async () => {
    stubBackend({ user: ADA });
    render(<DraftPage />);

    expect(await screen.findByText("Your document will appear here")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "New document" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Download PDF" })).not.toBeInTheDocument();
  });

  it("previews the chosen document with the disclaimer, and saves it", async () => {
    stubBackend({
      user: ADA,
      chat: { reply: "How long is each subscription?", draft: draftOf(CSA, { governingLaw: "Delaware" }), draftId: 12 },
    });
    const replaceState = vi.spyOn(window.history, "replaceState");
    render(<DraftPage />);
    await screen.findByText("Your document will appear here");

    await userEvent.type(screen.getByLabelText("Message"), "We sell SaaS{Enter}");

    expect(await screen.findByText("How long is each subscription?")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 1, name: "Cloud Service Agreement" })).toBeInTheDocument();
    expect(await screen.findByRole("article", { name: "Cloud Service Agreement" })).toBeInTheDocument();
    expect(screen.getByText("Delaware")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("Draft for legal review");
    expect(screen.getByText("Saved to your documents as you go.")).toBeInTheDocument();
    expect(replaceState).toHaveBeenCalledWith(null, "", "/draft/?id=12");
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeDisabled();
  });

  it("reopens a saved document with its conversation", async () => {
    search = "id=7";
    const draft = draftOf(CSA, { subscriptionPeriod: "1 year" }, { party1: party("Ada", "Acme", "ada@acme.test") });
    stubBackend({
      user: ADA,
      drafts: [
        savedDraft(7, draft, {
          messages: [
            { role: "user", content: "We sell SaaS" },
            { role: "assistant", content: "Which state's law should govern?" },
          ],
        }),
      ],
    });
    render(<DraftPage />);

    expect(await screen.findByText("Which state's law should govern?")).toBeInTheDocument();
    expect(screen.getByText("We sell SaaS")).toBeInTheDocument();
    expect(await screen.findByText("1 year")).toBeInTheDocument();
  });

  it("reopens a saved document under React's development double-render", async () => {
    search = "id=7";
    stubBackend({ user: ADA, drafts: [savedDraft(7, draftOf(CSA))] });
    render(
      <StrictMode>
        <DraftPage />
      </StrictMode>,
    );

    expect(await screen.findByRole("heading", { level: 1, name: "Cloud Service Agreement" })).toBeInTheDocument();
  });

  it("explains when a saved document can't be opened", async () => {
    search = "id=99";
    stubBackend({ user: ADA });
    render(<DraftPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("doesn't exist or belongs to another account");
    expect(screen.getByRole("link", { name: "Back to your documents" })).toBeInTheDocument();
    await act(async () => {});
  });
});
