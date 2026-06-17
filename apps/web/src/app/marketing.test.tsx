import { marketingContent, marketingContentForMarket, marketingDetails, marketingMetadata, marketingPath } from "@/components/marketing/marketing-site";

const serializedMarketing = JSON.stringify({ marketingContent, marketingDetails });

describe("marketing public claim safety", () => {
  it("keeps launch, pricing, and access copy in private beta context", () => {
    expect(serializedMarketing).toMatch(/private beta/i);
    expect(serializedMarketing).toMatch(/public plans later/i);
    expect(serializedMarketing).toMatch(/public pricing is intentionally held/i);
    expect(serializedMarketing).toMatch(/public launch, production operations, and official compliance claims remain gated/i);

    expect(serializedMarketing).not.toMatch(/paid production launch/i);
    expect(serializedMarketing).not.toMatch(/production-ready/i);
    expect(serializedMarketing).not.toMatch(/public trial/i);
    expect(serializedMarketing).toMatch(/No self-serve signup push/i);
  });

  it("keeps the generic marketing bundle neutral by default", () => {
    expect(serializedMarketing).toMatch(/Compliance readiness groundwork/i);
    expect(serializedMarketing).toMatch(/No certification claim/i);

    expect(serializedMarketing).not.toMatch(/Saudi-first|ZATCA readiness groundwork|UAE eInvoicing readiness|PINT-AE|FTA reporting/i);
    expect(serializedMarketing).not.toMatch(/certified ZATCA/i);
    expect(serializedMarketing).not.toMatch(/production ZATCA compliance/i);
    expect(serializedMarketing).not.toMatch(/ZATCA compliant/i);
  });

  it("keeps KSA and UAE marketing wording behind explicit market selection", () => {
    const ksa = JSON.stringify(marketingContentForMarket("en", "KSA"));
    const uae = JSON.stringify(marketingContentForMarket("en", "UAE"));

    expect(ksa).toMatch(/KSA accounting workspace/i);
    expect(ksa).toMatch(/ZATCA readiness groundwork/i);
    expect(ksa).not.toMatch(/UAE eInvoicing|PINT-AE|FTA reporting/i);

    expect(uae).toMatch(/UAE accounting workspace/i);
    expect(uae).toMatch(/UAE eInvoicing\/PINT-AE readiness/i);
    expect(uae).not.toMatch(/ZATCA|Saudi|KSA/i);
  });

  it("keeps provider, email, backup, and storage claims review-gated", () => {
    expect(serializedMarketing).toMatch(/Hosted backup, object storage, monitoring, email delivery, and support evidence remain review gates/i);
    expect(serializedMarketing).not.toMatch(/real email provider/i);
    expect(serializedMarketing).not.toMatch(/backup compliance/i);
    expect(serializedMarketing).not.toMatch(/storage compliance/i);
  });

  it("builds localized public routes and metadata without changing app workflows", () => {
    expect(marketingPath("en", "home")).toBe("/");
    expect(marketingPath("ar", "home")).toBe("/ar");
    expect(marketingPath("en", "readiness")).toBe("/readiness");
    expect(marketingPath("ar", "readiness")).toBe("/ar/readiness");

    expect(marketingMetadata("en", "pricing")).toMatchObject({
      title: "Private beta access, public plans later | LedgerByte",
      alternates: {
        canonical: "/pricing",
        languages: { ar: "/ar/pricing", en: "/pricing" },
      },
    });
  });
});
