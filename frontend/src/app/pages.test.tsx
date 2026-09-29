// Integration tests for the sign-in page and the signed-in NDA page, with
// Next's router mocked and the backend's /api/templates stubbed.
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import NdaPage from "@/app/nda/page";
import SignInPage from "@/app/page";
import { defaultNdaData } from "@/lib/nda";
import { signIn } from "@/lib/session";
import { stubTemplatesApi } from "@/test/templatesApi";

const router = { replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

beforeEach(() => {
  router.replace.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("sign-in page", () => {
  it("signs in and navigates to the NDA creator", async () => {
    render(<SignInPage />);

    await userEvent.type(screen.getByLabelText("Name"), "Ada");
    await userEvent.type(screen.getByLabelText("Work email"), "ada@acme.test");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith("/nda/");
  });

  it("sends signed-in users straight into the app", () => {
    signIn({ name: "Ada", email: "ada@acme.test" });
    render(<SignInPage />);
    expect(router.replace).toHaveBeenCalledWith("/nda/");
  });
});

describe("NDA page", () => {
  it("redirects to sign-in when signed out", () => {
    stubTemplatesApi();
    render(<NdaPage />);
    expect(router.replace).toHaveBeenCalledWith("/");
    expect(screen.queryByText("Mutual NDA Creator")).not.toBeInTheDocument();
  });

  it("shows the user and the NDA creator with the loaded template", async () => {
    stubTemplatesApi();
    signIn({ name: "Ada Lovelace", email: "ada@acme.test" });
    render(<NdaPage />);

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Standard Terms" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeDisabled();
  });

  it("fills in the agreement from the AI chat", async () => {
    stubTemplatesApi({
      chat: {
        reply: "Which state's law should govern?",
        fields: { ...defaultNdaData, purpose: "Exploring a joint venture" },
      },
    });
    signIn({ name: "Ada", email: "ada@acme.test" });
    render(<NdaPage />);
    await screen.findByRole("heading", { name: "Standard Terms" });

    await userEvent.type(screen.getByLabelText("Message"), "A joint venture{Enter}");

    expect(await screen.findByText("Which state's law should govern?")).toBeInTheDocument();
    expect(screen.getByText("Exploring a joint venture")).toBeInTheDocument(); // In the preview.
  });

  it("shows an error when the template cannot be loaded", async () => {
    stubTemplatesApi({ status: 500 });
    signIn({ name: "Ada", email: "ada@acme.test" });
    render(<NdaPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be loaded/);
  });

  it("signs out from the header", async () => {
    stubTemplatesApi();
    signIn({ name: "Ada", email: "ada@acme.test" });
    render(<NdaPage />);

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(localStorage.getItem("prelegal.user")).toBeNull();
    expect(router.replace).toHaveBeenCalledWith("/");
    await act(async () => {}); // Let the pending template fetch settle.
  });
});
