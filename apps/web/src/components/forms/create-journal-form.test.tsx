import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CreateJournalForm } from "./create-journal-form";

const apiRequestMock = jest.fn();
let mockActiveOrganization: ReturnType<typeof organizationFixture> | null = organizationFixture("AED");

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganization: () => mockActiveOrganization,
  useActiveOrganizationId: () => mockActiveOrganization?.id ?? null,
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("CreateJournalForm organization currency", () => {
  beforeEach(() => {
    mockActiveOrganization = organizationFixture("AED");
    apiRequestMock.mockReset();
    apiRequestMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/accounts") {
        return Promise.resolve([
          { id: "cash-1", code: "1110", name: "Cash", isActive: true, allowPosting: true },
          { id: "revenue-1", code: "4010", name: "Revenue", isActive: true, allowPosting: true },
        ]);
      }
      if (path === "/tax-rates") {
        return Promise.resolve([]);
      }
      if (path === "/journal-entries" && options?.method === "POST") {
        return Promise.resolve({ id: "journal-1", entryNumber: "JE-000001" });
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
  });

  it.each(["AED", "SAR"])("submits a balanced %s journal header and lines at rate one", async (baseCurrency) => {
    mockActiveOrganization = organizationFixture(baseCurrency);
    const { container } = render(<CreateJournalForm />);

    await screen.findAllByRole("option", { name: "4010 Revenue" });

    fireEvent.change(container.querySelector('input[name="description"]')!, { target: { value: "Balanced journal" } });
    const amountInputs = container.querySelectorAll<HTMLInputElement>('input[inputmode="decimal"]');
    fireEvent.change(amountInputs[0]!, { target: { value: "100.0000" } });
    fireEvent.change(amountInputs[3]!, { target: { value: "100.0000" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Save draft journal" })).toBeEnabled());
    fireEvent.submit(screen.getByRole("button", { name: "Save draft journal" }).closest("form")!);

    await waitFor(() =>
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/journal-entries",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            currency: baseCurrency,
            lines: [
              expect.objectContaining({ currency: baseCurrency, exchangeRate: "1.00000000", debit: "100.0000" }),
              expect.objectContaining({ currency: baseCurrency, exchangeRate: "1.00000000", credit: "100.0000" }),
            ],
          }),
        }),
      ),
    );
  });

  it("keeps journal submission disabled without an active organization", () => {
    mockActiveOrganization = null;

    render(<CreateJournalForm />);

    expect(screen.getByRole("button", { name: "Save draft journal" })).toBeDisabled();
  });
});

function organizationFixture(baseCurrency: string) {
  return {
    id: baseCurrency === "AED" ? "org-ae" : "org-sa",
    name: "LedgerByte Test",
    legalName: null,
    taxNumber: null,
    countryCode: baseCurrency === "AED" ? "AE" : "SA",
    baseCurrency,
    timezone: baseCurrency === "AED" ? "Asia/Dubai" : "Asia/Riyadh",
  };
}
