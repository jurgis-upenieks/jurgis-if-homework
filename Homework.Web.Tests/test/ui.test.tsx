import { createRef } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button, Card, Input } from "@/generic-configurables/ui";
import { Card as PublicCard } from "@/components/ui/card";

afterEach(cleanup);

describe("Shared controls", () => {
  it("uses the same card implementation through the public component path", () => {
    expect(PublicCard).toBe(Card);
  });

  it("keeps ordinary buttons out of form submission and supports explicit submit buttons", () => {
    const submit = vi.fn();
    render(
      <form onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <Button>Cancel</Button>
        <Button type="submit">Save</Button>
      </form>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(submit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("does not activate disabled buttons", () => {
    const click = vi.fn();
    render(<Button disabled onClick={click}>Unavailable</Button>);

    fireEvent.click(screen.getByRole("button", { name: "Unavailable" }));

    expect(click).not.toHaveBeenCalled();
  });

  it("preserves native input labels, refs, form values, and change events", () => {
    const ref = createRef<HTMLInputElement>();
    const change = vi.fn();
    render(
      <form aria-label="Search">
        <label>Search by title<Input ref={ref} type="search" name="title" defaultValue="Initial" onChange={change} /></label>
      </form>,
    );
    const input = screen.getByRole<HTMLInputElement>("searchbox", { name: "Search by title" });

    expect(ref.current).toBe(input);
    fireEvent.change(input, { target: { value: "Updated" } });
    expect(change).toHaveBeenCalledTimes(1);
    expect(new FormData(screen.getByRole<HTMLFormElement>("form")).get("title")).toBe("Updated");
    ref.current?.focus();
    expect(document.activeElement).toBe(input);
  });

  it("exposes disabled and invalid input states to assistive technology", () => {
    render(<><Input aria-label="Title" aria-invalid="true" aria-describedby="problem" disabled /><p id="problem">Enter a title.</p></>);
    const input = screen.getByRole<HTMLInputElement>("textbox", { name: "Title" });

    expect(input.disabled).toBe(true);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe("problem");
  });

  it("renders cards as articles with headings and all supplied content", () => {
    render(<Card title="Item" aria-label="Item summary"><p>First detail</p><p>Second detail</p></Card>);

    expect(screen.getByRole("article", { name: "Item summary" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Item", level: 2 })).toBeTruthy();
    expect(screen.getByText("First detail")).toBeTruthy();
    expect(screen.getByText("Second detail")).toBeTruthy();
  });
});
