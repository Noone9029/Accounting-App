# DEV-08J Source PDF Permission Policy Edge Preflight

## Scope

- Task: `DEV-08J Part 28: source PDF permission policy edge preflight`.
- Runtime mutation performed: no.
- Code change performed in this preflight: no.

## Current Permission Map Before Hardening

| Surface | Existing guard/gating |
| --- | --- |
| AP `pdf-data` routes | AP source `*.view` permission |
| AP source PDF stream routes | AP source `*.view` permission |
| AP explicit generate PDF routes | AP source `*.view` permission |
| Generated-document archive list/detail | `generatedDocuments.view` |
| Generated-document archived download | `generatedDocuments.download` |
| `/documents` UI archived download action | hidden without `generatedDocuments.download` |
| AP detail UI source PDF actions | visible to users who could open the AP source detail page |

## Recommendation

The safe narrow policy is:

- Keep `pdf-data` as AP source-view read-only.
- Require both the AP source view permission and `generatedDocuments.download` before source PDF streaming or explicit source PDF generation.
- Reuse the existing `generatedDocuments.download` permission instead of adding a new permission in this arc.

Reason: the source PDF stream and explicit generate routes create generated-document archive rows and deliver PDF output. AP viewers without archive-download permission should be able to inspect AP source records, but should not create or download generated-document output through source route shortcuts.

## Part 29 Plan

Part 29 should apply a narrow backend assertion on AP source PDF stream/generate routes and frontend gating for AP source PDF buttons. It must not change `pdf-data`, schema, migrations, seed data, output generation behavior, email, ZATCA, or broad role defaults.

Required Part 29 phrase was received exactly in the upfront approval bundle:

`I approve DEV-08J Part 29 local-only source PDF permission policy hardening under marker DEV08J-AP-20260528T000000. No production, no beta, no customer data.`
