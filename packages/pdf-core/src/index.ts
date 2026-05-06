export interface PdfRenderRequest {
  organizationId: string;
  templateId?: string;
  title: string;
  html: string;
  embeddedXml?: string;
}

export interface PdfRenderResult {
  storageKey: string;
  contentType: "application/pdf";
  byteLength: number;
}
