# DEV-08J Source PDF Permission Policy Hardening Verification

## Scope

- Task: `DEV-08J Part 30: source PDF permission policy hardening verification`.
- Runtime mutation performed: no.
- Login/browser/output/download performed: no.

## Verification Result

Code-level verification confirmed:

- AP source PDF stream/generate routes still require each AP source view permission through `@RequirePermissions(...)`.
- The new assertion requires `generatedDocuments.download` before source PDF stream/generate handlers call the rendering/archive service.
- Restricted AP viewers without archive-download permission no longer see AP source PDF buttons in the changed detail pages.
- `pdf-data` routes were not widened or blocked by the new output permission.
- Generated-document archived download still uses the existing `generatedDocuments.download` controller guard.

## Tests

The targeted API helper test, targeted AP page Jest suites, and API typecheck passed as recorded in the Part 29 evidence. Full web test/typecheck remained blocked by unrelated untracked marketing/nav/permission-matrix work.
