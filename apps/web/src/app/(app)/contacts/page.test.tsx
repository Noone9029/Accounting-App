import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import ContactsPage from "./page";
import type { Contact } from "@/lib/types";

const apiRequestMock = jest.fn();
const canMock = jest.fn((_: string) => true);
const getSearchParamMock = jest.fn();

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => getSearchParamMock(key),
  }),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    can: (permission: string) => canMock(permission),
  }),
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("contacts page route guidance", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    canMock.mockReset();
    canMock.mockReturnValue(true);
    getSearchParamMock.mockReset();
    getSearchParamMock.mockReturnValue(null);
  });

  it("points supplier onboarding to the first bill instead of the first invoice", async () => {
    getSearchParamMock.mockImplementation((key: string) => (key === "type" ? "SUPPLIER" : null));
    apiRequestMock.mockResolvedValue([]);

    render(<ContactsPage />);

    expect(await screen.findByText(/No contacts yet\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "create the first bill" })).toHaveAttribute("href", "/purchases/bills/new");
    expect(screen.queryByRole("link", { name: "create the first invoice" })).not.toBeInTheDocument();
  });

  it("routes customer and supplier rows to their richer detail surfaces", async () => {
    apiRequestMock.mockResolvedValue([
      contactFixture({ id: "customer-1", name: "Beta Customer", type: "CUSTOMER" }),
      contactFixture({ id: "supplier-1", name: "Beta Supplier", type: "SUPPLIER" }),
      contactFixture({ id: "both-1", name: "Hybrid Contact", type: "BOTH" }),
    ]);

    render(<ContactsPage />);

    expect(await screen.findByText("Beta Customer")).toBeInTheDocument();

    const rows = screen.getAllByRole("link", { name: "View" });
    expect(rows.map((link) => link.getAttribute("href"))).toEqual([
      "/customers/customer-1",
      "/suppliers/supplier-1",
      "/contacts/both-1",
    ]);
  });

  it("shows UAE eInvoicing readiness fields without blocking contact rows", async () => {
    apiRequestMock.mockResolvedValue([
      contactFixture({
        id: "customer-1",
        name: "UAE Customer",
        type: "CUSTOMER",
        uaeTin: "1234567890",
        uaeTrn: "100000000000003",
        uaeAddressLine1: "Business Bay",
        uaeEmirate: "Dubai",
        peppolParticipantId: "02351234567890",
      }),
      contactFixture({ id: "customer-2", name: "Missing UAE Fields", type: "CUSTOMER" }),
    ]);

    render(<ContactsPage />);

    expect(await screen.findByText("UAE eInvoicing readiness fields")).toBeInTheDocument();
    expect(screen.getByText("Peppol 02351234567890")).toBeInTheDocument();
    expect(screen.getByText(/Missing TIN\/TRN, Peppol ID, UAE address/i)).toBeInTheDocument();
  });
});

function contactFixture(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "contact-1",
    organizationId: "org-1",
    type: "CUSTOMER",
    name: "Alpha Contact",
    displayName: null,
    email: null,
    phone: null,
    taxNumber: null,
    addressLine1: null,
    addressLine2: null,
    buildingNumber: null,
    district: null,
    city: null,
    postalCode: null,
    countryCode: "SA",
    identificationType: null,
    identificationNumber: null,
    isActive: true,
    ...overrides,
  };
}
