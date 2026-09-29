import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GREETING } from "@/lib/chat";
import { defaultNdaData, type NdaData } from "@/lib/nda";
import { requestBody, stubFetch } from "@/test/fetch";

import NdaChat from "./NdaChat";

const updated: NdaData = { ...defaultNdaData, purpose: "Exploring a joint venture" };

const reply = (text: string, fields = updated) => Response.json({ reply: text, fields });

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("NdaChat", () => {
  it("opens with the greeting", () => {
    render(<NdaChat data={defaultNdaData} onChange={() => {}} />);
    expect(screen.getByText(GREETING.content)).toBeInTheDocument();
  });

  it("sends the conversation and fields, shows the reply and applies the fields", async () => {
    const fetchMock = stubFetch(reply("Great. When should it take effect?"));
    const onChange = vi.fn();
    render(<NdaChat data={defaultNdaData} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("Message"), "A joint venture");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Great. When should it take effect?")).toBeInTheDocument();
    expect(screen.getByText("A joint venture")).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith(updated);

    expect(requestBody(fetchMock)).toMatchObject({
      messages: [GREETING, { role: "user", content: "A joint venture" }],
      fields: defaultNdaData,
    });
  });

  it("sends on Enter, adds a new line on Shift+Enter", async () => {
    const fetchMock = stubFetch(reply("Thanks!"));
    render(<NdaChat data={defaultNdaData} onChange={() => {}} />);
    const input = screen.getByLabelText("Message");

    await userEvent.type(input, "Line one{Shift>}{Enter}{/Shift}line two");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(input).toHaveValue("Line one\nline two");

    await userEvent.type(input, "{Enter}");
    expect(await screen.findByText("Thanks!")).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("shows a thinking indicator and blocks sending while waiting", async () => {
    let respond!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => (respond = resolve))));
    render(<NdaChat data={defaultNdaData} onChange={() => {}} />);

    await userEvent.type(screen.getByLabelText("Message"), "Hello");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(screen.getByRole("status")).toHaveTextContent("Thinking");
    await userEvent.type(screen.getByLabelText("Message"), "More");
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();

    respond(reply("Hi there"));
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  });

  it("shows the server's error and retries the same conversation", async () => {
    const fetchMock = stubFetch(
      Response.json({ detail: "The AI assistant is unavailable right now." }, { status: 502 }),
      reply("Back again!"),
    );
    const onChange = vi.fn();
    render(<NdaChat data={defaultNdaData} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("Message"), "Hello");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("unavailable right now");
    expect(onChange).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Back again!")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getAllByText("Hello")).toHaveLength(1);
    expect(requestBody(fetchMock, 1).messages).toEqual(requestBody(fetchMock, 0).messages);
  });
});
