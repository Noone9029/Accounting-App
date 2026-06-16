import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { ArchiveDocumentGuidance, SettingsImpactGuidance, SourceDocumentGuidance } from "./document-guidance";

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

describe("document guidance", () => {
  it("explains source PDF archive behavior without claiming production compliance", () => {
    render(<SourceDocumentGuidance />);

    expect(screen.getByText(/PDF downloads from source records are archived automatically/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open archive" })).toHaveAttribute("href", "/documents");
    expect(screen.getByRole("link", { name: "Document settings" })).toHaveAttribute("href", "/settings/documents");
    expect(screen.getByText(/PDF\/A-3 embedding,\s+ZATCA network submission/)).toBeInTheDocument();
    expect(screen.queryByText(/production submission is connected/i)).not.toBeInTheDocument();
  });

  it("explains archived downloads are non-posting document retrievals", () => {
    render(<ArchiveDocumentGuidance />);

    expect(screen.getByText(/does not post accounting entries/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Adjust PDF settings" })).toHaveAttribute("href", "/settings/documents");
  });

  it("explains settings affect future generated PDFs only", () => {
    render(<SettingsImpactGuidance />);

    expect(screen.getByText(/apply to PDFs generated after saving/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review number sequences" })).toHaveAttribute("href", "/settings/number-sequences");
  });
});
