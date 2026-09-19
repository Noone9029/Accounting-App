import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import PlansPage from "@/app/(app)/plans/page";
import { PermissionBoundary } from "@/components/permissions/permission-boundary";
import { PermissionProvider } from "@/components/permissions/permission-provider";
import { OrganizationSetupForm } from "./organization-setup-form";

const mockApiRequest = jest.fn();
const mockRouter = { push: jest.fn(), replace: jest.fn() };
let mockPathname = "/organization/setup";
let mockLocale: "en" | "ar" = "en";

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockPathname,
}));
jest.mock("@/components/app-locale-provider", () => ({
  useAppLocale: () => ({ locale: mockLocale }),
}));
jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
}));

function Journey() {
  const [path, setPath] = useState("/organization/setup");
  mockPathname = path;
  mockRouter.push.mockImplementation(setPath);
  mockRouter.replace.mockImplementation(setPath);
  return <PermissionProvider><PermissionBoundary>
    {path === "/organization/setup" ? <OrganizationSetupForm /> : path === "/plans" ? <PlansPage /> : <h1>Trial workspace</h1>}
  </PermissionBoundary></PermissionProvider>;
}

describe("organization setup membership refresh", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockRouter.push.mockReset();
    mockRouter.replace.mockReset();
    mockPathname = "/organization/setup";
    localStorage.clear();
  });

  it.each(["en", "ar"] as const)("opens the trial page with fresh owner permissions in %s", async (locale) => {
    mockLocale = locale;
    const organization = { id: "new-org", name: "Synthetic trading company", legalName: null, taxNumber: null, countryCode: "SA", baseCurrency: "SAR", timezone: "Asia/Riyadh" };
    const me = { id: "new-owner", name: "Owner", email: "synthetic@example.test", emailVerifiedAt: "2026-09-19T00:00:00.000Z", memberships: [] };
    const owner = { ...me, memberships: [{ id: "membership", status: "ACTIVE", organization, role: { id: "owner-role", name: "Owner", permissions: ["billing.view", "billing.manage", "dashboard.view"] } }] };
    let created = false;
    const refresh: { resolve?: (value: typeof owner) => void } = {};
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/auth/me") return created ? new Promise((resolve) => { refresh.resolve = resolve; }) : Promise.resolve(me);
      if (path === "/organizations") { created = true; return Promise.resolve(organization); }
      if (path === "/billing/catalog") return Promise.resolve({
        plans: [{ key: "STARTER", displayName: "Starter", amountMinor: 14900, seats: 3 }],
        trialDays: 14, selfServiceEnabled: true, seller: { legalName: null }, taxDisplay: "Applicable taxes are shown before checkout.",
      });
      if (path === "/billing/plans") return Promise.resolve([{ key: "STARTER", planVersionId: "starter-version" }]);
      if (path === "/billing/status") return Promise.resolve({ subscription: null, providerReadiness: { checkoutEnabled: false } });
      if (path === "/billing/trial") return Promise.resolve({ status: "TRIALING" });
      throw new Error(`Unexpected route: ${path}`);
    });

    render(<Journey />);
    const create = await screen.findByRole("button", { name: "Create organization" });
    await waitFor(() => expect(create).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Organization name"), { target: { value: organization.name } });
    fireEvent.click(create);

    await waitFor(() => expect(refresh.resolve).toBeDefined());
    expect(screen.getByText("Loading access")).toBeInTheDocument();
    expect(screen.queryByText("Access denied")).not.toBeInTheDocument();
    await act(async () => { refresh.resolve?.(owner); });

    const trial = await screen.findByRole("button", { name: locale === "ar" ? "ابدأ تجربة Starter" : "Start Starter trial" });
    await waitFor(() => expect(trial).toBeEnabled());
    expect(screen.getByText(locale === "ar" ? "تجربة لمدة 14 يوماً دون بطاقة دفع." : "14-day trial. No card required.")).toBeInTheDocument();
    expect(screen.getByText(locale === "ar" ? /لا تشمل الخطط الإرسال إلى هيئة الزكاة/ : /Tax-authority submission and live banking are not included/)).toBeInTheDocument();
    fireEvent.click(trial);
    expect(await screen.findByRole("heading", { name: "Trial workspace" })).toBeInTheDocument();
    expect(mockApiRequest).toHaveBeenCalledWith("/billing/trial", { method: "POST", body: { planKey: "STARTER" } });
    expect(mockApiRequest.mock.calls.filter(([path]) => path === "/organizations")).toHaveLength(1);
  });
});
