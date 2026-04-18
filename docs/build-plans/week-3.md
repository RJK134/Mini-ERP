# Week 3 — extraction (`phase-2-extraction`)

## Objectives
- Turn inbound items into structured records.
- Keep humans in control.

## Deliverables
- Extraction pipeline (worker job).
- Prompt templates versioned in `@ops-hub/prompts`.
- Confidence scoring + reviewer state.
- Human review screen (accept / edit / reject).
- Case creation from approved extraction.
- Acknowledgement + request-for-info draft generation.
- Activity logging for every step.

## Acceptance
- Reviewer can accept / edit / reject extracted fields.
- Approved extraction creates a `Case`.
- Initial reply draft can be edited and sent.
- Timeline shows every step.
