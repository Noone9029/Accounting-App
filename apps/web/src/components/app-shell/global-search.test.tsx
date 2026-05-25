import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { searchGlobalRecords } from "@/lib/global-search";
import { GlobalSearch } from "./global-search";

const pushMock = jest.fn();
let mockActiveMembership: unknown = { role: { permissions: ["*"] } };

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({ activeMembership: mockActiveMembership }),
}));

jest.mock("@/lib/global-search", () => {
  const actual = jest.requireActual("@/lib/global-search");
  return {
    ...actual,
    searchGlobalRecords: jest.fn(),
  };
});

const searchGlobalRecordsMock = searchGlobalRecords as jest.MockedFunction<typeof searchGlobalRecords>;

describe("GlobalSearch", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    pushMock.mockReset();
    searchGlobalRecordsMock.mockReset();
    searchGlobalRecordsMock.mockResolvedValue({ query: "", results: [] });
    mockActiveMembership = { role: { permissions: ["*"] } };
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("renders the dashboard search box and focuses it with Ctrl+K", () => {
    render(<GlobalSearch />);

    const input = screen.getByPlaceholderText("Search transactions, contacts, reports, and pages");

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    expect(input).toHaveFocus();
  });

  it("shows local report results and opens the selected result with keyboard navigation", () => {
    render(<GlobalSearch />);

    const input = screen.getByPlaceholderText("Search transactions, contacts, reports, and pages");
    fireEvent.change(input, { target: { value: "aged" } });

    expect(screen.getByText("Aged Payables")).toBeInTheDocument();
    expect(screen.getByText("Aged Receivables")).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(pushMock).toHaveBeenCalledWith("/reports/aged-receivables");
  });

  it("loads remote record results after debounce and opens the top result with Enter", async () => {
    searchGlobalRecordsMock.mockResolvedValueOnce({
      query: "inv",
      results: [
        {
          id: "invoice-1",
          category: "Transactions",
          label: "INV-001",
          href: "/sales/invoices/invoice-1",
          resultType: "Invoice",
          detail: "Alpha Customer",
          amount: "115.0000",
          date: "2026-05-01T00:00:00.000Z",
          status: "FINALIZED",
          keywords: ["INV-001", "Alpha Customer"],
        },
      ],
    });
    render(<GlobalSearch />);

    const input = screen.getByPlaceholderText("Search transactions, contacts, reports, and pages");
    fireEvent.change(input, { target: { value: "inv" } });

    await act(async () => {
      jest.advanceTimersByTime(350);
    });

    expect(await screen.findByText("INV-001")).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/sales/invoices/invoice-1"));
    expect(searchGlobalRecordsMock).toHaveBeenCalledWith("inv");
  });

  it("shows no-result and view-all states", async () => {
    searchGlobalRecordsMock.mockResolvedValueOnce({
      query: "alpha",
      results: Array.from({ length: 9 }, (_, index) => ({
        id: `customer-${index}`,
        category: "Contacts",
        label: `Alpha Customer ${index}`,
        href: `/customers/customer-${index}`,
        resultType: "Customer",
        detail: "alpha@example.com",
        amount: "0.0000",
        date: null,
        status: "Active",
        keywords: [`Alpha Customer ${index}`],
      })),
    });
    render(<GlobalSearch />);

    const input = screen.getByPlaceholderText("Search transactions, contacts, reports, and pages");
    fireEvent.change(input, { target: { value: "nothing-matches-locally" } });

    expect(screen.getByText("No results found")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "alpha" } });
    await act(async () => {
      jest.advanceTimersByTime(350);
    });

    expect(await screen.findByRole("button", { name: /View all results/ })).toBeInTheDocument();
  });
});
