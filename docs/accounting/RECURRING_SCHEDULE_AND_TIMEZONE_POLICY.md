# Recurring Schedule and Timezone Policy

Each template has an explicit IANA timezone. The organization timezone is the creation default; server-local time is never schedule truth. An occurrence has one canonical local date and one `scheduledFor` instant.

Supported frequencies are daily, weekly, monthly, quarterly, and yearly with a positive interval. The start date is the anchor. A monthly anchor on day 31 uses the last valid day of a shorter month; day 29 and leap-year February are handled by calendar rules. Quarterly and yearly schedules preserve the same month-end anchor.

DST forward and backward transitions are resolved in the template timezone. A canonical occurrence key plus database uniqueness prevents skipped clock hours or repeated clock hours from creating duplicate runs.

The explicit missed-run policies are:

- `SKIP_MISSED` (default): retain skipped evidence and advance without generating old drafts.
- `GENERATE_LATEST_ONLY`: generate only the latest due occurrence after recording older occurrences as skipped.
- `GENERATE_ALL`: generate every due occurrence in safely bounded batches.

The engine never creates an unlimited backlog. Generated and skipped run evidence is capped by the worker batch limit; a large backlog advances across later worker invocations. Pause prevents new claims; resume revalidates references and schedule policy; archive permanently prevents future generation while preserving history. End dates complete a schedule after its final occurrence.

Template schedule edits affect only future occurrences. Recalculation finds the first occurrence on or after the template's current `nextRunAt`; it never rewinds to the historical start date. A change with no valid future occurrence is rejected instead of silently rewriting history.

Occurrences inside a locked period become explicit blockers. The scheduler does not silently move the accounting date.
