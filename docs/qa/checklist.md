# Pilot QA checklist

- [ ] Email ingestion tested with realistic payloads (MIME, attachments, UTF-8, long bodies).
- [ ] Form ingestion tested with partial and malformed data.
- [ ] Extraction tested against ≥ 30 sample enquiries from the target vertical.
- [ ] Review flow tested for accept / edit / reject paths.
- [ ] Assignment tested with no-owner and multi-owner edge cases.
- [ ] Dashboard metrics checked against seed data and live actions.
- [ ] Multi-tenant isolation checked at API and UI levels.
- [ ] Permissions checked for every role (OWNER, ADMIN, MANAGER, OPERATOR, REVIEWER, VIEWER).
- [ ] Audit events validated for all state-changing actions.
- [ ] Pilot onboarding rehearsed end to end.
- [ ] Overdue SLA marker appears on a seeded high-priority case.
- [ ] Attachment download works.
- [ ] Retry works on a forced-failed inbound item.
