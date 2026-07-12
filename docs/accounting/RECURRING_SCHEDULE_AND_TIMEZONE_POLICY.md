# Recurring Schedule and Timezone Policy

Each template has an explicit IANA timezone. The organization timezone is the creation default; server-local time is never schedule truth. An occurrence has one canonical local date and one `scheduledFor` instant.

Supported frequencies are daily, weekly, monthly, quarterly, and yearly with a positive interval. The start date is the anchor. A monthly anchor on day 31 uses the last valid day of a shorter month; day 29 and leap-year February are handled by calendar rules. Quarterly and yearly schedules preserve the same month-end anchor.

DST forward and backward transitions are resolved in the template timezone. A canonical occurrence key plus database uniqueness prevents skipped clock hours or repeated clock hours from creating duplicate runs.

The explicit missed-run policies are:

- `SKIP_MISSED` (default): retain skipped evidence and advance without generating old drafts.
- `RUN_LATEST_ONLY`: generate only the latest due occurrence.
- `RUN_BOUNDED`: generate a safely bounded number of occurrences.

The engine never creates an unlimited backlog. Pause prevents new claims; resume revalidates references and schedule policy; archive permanently prevents future generation while preserving history. End dates complete a schedule after its final occurrence.

Occurrences inside a locked period become explicit blockers. The scheduler does not silently move the accounting date.
