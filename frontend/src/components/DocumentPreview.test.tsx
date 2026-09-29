import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { parseClauses } from "@/lib/template";
import { CSA, draftOf, party, readTemplate } from "@/test/backend";

import DocumentPreview from "./DocumentPreview";

describe("DocumentPreview", () => {
  it("renders the key terms, the parties by role, and the numbered standard terms", () => {
    const draft = draftOf(CSA, { governingLaw: "Delaware" }, { party1: party("Ada", "Acme", "ada@acme.test") });

    render(<DocumentPreview spec={CSA} clauses={parseClauses(readTemplate("csa"))} draft={draft} />);

    expect(screen.getByRole("heading", { level: 2, name: "Cloud Service Agreement" })).toBeInTheDocument();
    expect(screen.getByText("Delaware")).toBeInTheDocument();
    expect(screen.getByText("[Subscription Period]")).toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Provider" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Customer" })).toBeInTheDocument();
    expect(within(table).getByText("Acme")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "1. Service" })).toBeInTheDocument();
    expect(screen.getByText(/^1\.1/)).toHaveTextContent("1.1 Access and Use.");
    expect(screen.getByText("Common Paper Cloud Service Agreement free to use under CC BY 4.0.")).toBeInTheDocument();
  });
});
