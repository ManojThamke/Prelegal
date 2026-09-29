import { describe, expect, it } from "vitest";

import { validate } from "./AuthForm";

describe("validate", () => {
  it("checks sign-up details", () => {
    expect(validate("signup", " ", "ada@acme.test", "password1")).toMatch(/name/);
    expect(validate("signup", "Ada", "ada@acme", "password1")).toMatch(/email/);
    expect(validate("signup", "Ada", "ada@acme.test", "short")).toMatch(/8 characters/);
    expect(validate("signup", "Ada", "ada@acme.test", "password1")).toBeNull();
  });

  it("only needs an email and password to sign in", () => {
    expect(validate("signin", "", "ada@acme.test", "")).toMatch(/password/);
    expect(validate("signin", "", "ada@acme.test", "x")).toBeNull();
  });
});
