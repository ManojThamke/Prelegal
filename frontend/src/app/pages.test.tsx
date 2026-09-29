// Integration tests for the sign-in page and the signed-in drafting page, with Next's
// router mocked and the backend stubbed.
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DraftPage from "@/app/draft/page";
import SignInPage from "@/app/page";
import { signIn } from "@/lib/session";
import { CSA, draftOf, stubBackend } from "@/test/backend";

const router = { replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

beforeEach(() => {
  router.replace.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("sign-in page", () => {
  it("signs in and navigates to the drafting page", async () => {
    render(<SignInPage />);

    await userEvent.type(screen.getByLabelText("Name"), "Ada");
    await userEvent.type(screen.getByLabelText("Work email"), "ada@acme.test");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith("/draft/");
  });

  it("sends signed-in users straight into the app", () => {
    signIn({ name: "Ada", email: "ada@acme.test" });
    render(<SignInPage />);
    expect(router.replace).toHaveBeenCalledWith("/draft/");
  });
});

describe("drafting page", () => {
  it("redirects to sign-in when signed out", () => {
    stubBackend();
    render(<DraftPage />);
    expect(router.replace).toHaveBeenCalledWith("/");
    expect(screen.queryByText("Draft an agreement")).not.toBeInTheDocument();
  });

  it("shows the catalog until the chat chooses a document", async () => {
    stubBackend();
    signIn({ name: "Ada Lovelace", email: "ada@acme.test" });
    render(<DraftPage />);

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(await screen.findByText("Your document will appear here")).toBeInTheDocument();
    expect(screen.getByText("Cloud Service Agreement")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Download PDF" })).not.toBeInTheDocument();
  });

  it("previews the document the chat chooses, filled in as the user answers", async () => {
    stubBackend({
      chat: {
        reply: "A Cloud Service Agreement it is. How long is each subscription?",
        draft: draftOf(CSA, { governingLaw: "Delaware" }),
      },
    });
    signIn({ name: "Ada", email: "ada@acme.test" });
    render(<DraftPage />);
    await screen.findByText("Your document will appear here");

    await userEvent.type(screen.getByLabelText("Message"), "We sell SaaS{Enter}");

    expect(await screen.findByText(/How long is each subscription/)).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 1, name: "Cloud Service Agreement" })).toBeInTheDocument();
    expect(screen.getByText("Delaware")).toBeInTheDocument();
    expect(screen.getByText(/Still needed:/).closest("p")).toHaveTextContent("Still needed: Subscription Period, Provider name");
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeDisabled();
    expect(screen.queryByText("Your document will appear here")).not.toBeInTheDocument();
  });

  it("shows an error when the catalog cannot be loaded", async () => {
    stubBackend({ failing: "/api/documents" });
    signIn({ name: "Ada", email: "ada@acme.test" });
    render(<DraftPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/catalog could not be loaded/);
  });

  it("shows an error when the chosen document cannot be loaded", async () => {
    stubBackend({ chat: { reply: "OK", draft: draftOf(CSA) }, failing: "/api/templates" });
    signIn({ name: "Ada", email: "ada@acme.test" });
    render(<DraftPage />);
    await screen.findByText("Your document will appear here");

    await userEvent.type(screen.getByLabelText("Message"), "SaaS{Enter}");

    expect(await screen.findByText(/Cloud Service Agreement could not be loaded/)).toBeInTheDocument();
  });

  it("signs out from the header", async () => {
    stubBackend();
    signIn({ name: "Ada", email: "ada@acme.test" });
    render(<DraftPage />);

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(localStorage.getItem("prelegal.user")).toBeNull();
    expect(router.replace).toHaveBeenCalledWith("/");
    await act(async () => {}); // Let the pending catalog fetch settle.
  });
});
