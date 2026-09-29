import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { parseUser, signIn, signOut, useUser, validateSignIn } from "./session";

describe("validateSignIn", () => {
  it("requires a name", () => {
    expect(validateSignIn({ name: "  ", email: "ada@acme.test" })).toMatch(/name/);
  });

  it("requires a valid email", () => {
    expect(validateSignIn({ name: "Ada", email: "ada" })).toMatch(/email/);
    expect(validateSignIn({ name: "Ada", email: "ada@acme" })).toMatch(/email/);
  });

  it("accepts valid details", () => {
    expect(validateSignIn({ name: "Ada", email: " ada@acme.test " })).toBeNull();
  });
});

describe("parseUser", () => {
  it("rejects missing or malformed data", () => {
    expect(parseUser(null)).toBeNull();
    expect(parseUser("not json")).toBeNull();
    expect(parseUser('{"name":"Ada"}')).toBeNull();
  });

  it("reads a stored user", () => {
    expect(parseUser('{"name":"Ada","email":"a@b.co","extra":1}')).toEqual({
      name: "Ada",
      email: "a@b.co",
    });
  });
});

describe("useUser", () => {
  it("is null when signed out", () => {
    const { result } = renderHook(() => useUser());
    expect(result.current).toBeNull();
  });

  it("follows sign-in and sign-out", () => {
    const { result } = renderHook(() => useUser());

    act(() => signIn({ name: " Ada ", email: "ada@acme.test " }));
    expect(result.current).toEqual({ name: "Ada", email: "ada@acme.test" });

    act(() => signOut());
    expect(result.current).toBeNull();
  });

  it("keeps the same object between renders", () => {
    signIn({ name: "Ada", email: "ada@acme.test" });
    const { result, rerender } = renderHook(() => useUser());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
