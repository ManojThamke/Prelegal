import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import SignInForm from "./SignInForm";

describe("SignInForm", () => {
  it("shows an error and stays put when details are invalid", async () => {
    render(<SignInForm />);

    await userEvent.type(screen.getByLabelText("Name"), "Ada");
    await userEvent.type(screen.getByLabelText("Work email"), "not-an-email");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/valid email/);
    expect(localStorage.length).toBe(0);
  });

  it("signs the user in with any valid name and email", async () => {
    render(<SignInForm />);

    await userEvent.type(screen.getByLabelText("Name"), "Ada Lovelace");
    await userEvent.type(screen.getByLabelText("Work email"), "ada@acme.test");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(JSON.parse(localStorage.getItem("prelegal.user")!)).toEqual({
      name: "Ada Lovelace",
      email: "ada@acme.test",
    });
  });
});
