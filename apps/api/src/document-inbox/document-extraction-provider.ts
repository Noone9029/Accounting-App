import { DocumentExtractionProviderType } from "@prisma/client";
import type { RunDocumentExtractionDto } from "./dto/run-document-extraction.dto";

export interface NormalizedDocumentExtraction {
  provider: DocumentExtractionProviderType;
  confidence: number | null;
  extracted: {
    supplierName: string | null;
    documentDate: string | null;
    currency: string | null;
    totalAmount: number | null;
    taxAmount: number | null;
    lineItems: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  };
  redactedRaw: Record<string, unknown>;
}

export interface DocumentExtractionProvider {
  readonly provider: DocumentExtractionProviderType;
  extract(input: { title: string; filename: string; dto?: RunDocumentExtractionDto }): Promise<NormalizedDocumentExtraction>;
}

export class MockDocumentExtractionProvider implements DocumentExtractionProvider {
  readonly provider = DocumentExtractionProviderType.MOCK;

  async extract(input: { title: string; filename: string; dto?: RunDocumentExtractionDto }): Promise<NormalizedDocumentExtraction> {
    const dto = input.dto ?? {};
    const totalAmount = dto.totalAmount ?? 125;
    const taxAmount = dto.taxAmount ?? 6.25;
    return {
      provider: this.provider,
      confidence: dto.confidence ?? 0.82,
      extracted: {
        supplierName: dto.supplierName?.trim() || "Mock supplier - review required",
        documentDate: dto.documentDate ?? null,
        currency: dto.currency?.trim().toUpperCase() || "SAR",
        totalAmount,
        taxAmount,
        lineItems: [
          {
            description: input.title || input.filename,
            quantity: 1,
            unitPrice: totalAmount - taxAmount,
            total: totalAmount,
          },
        ],
      },
      redactedRaw: {
        provider: "mock",
        sourceFilename: input.filename,
        note: "Synthetic extraction only. Review required before posting.",
      },
    };
  }
}
