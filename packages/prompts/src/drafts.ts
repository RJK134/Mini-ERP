export const DRAFTS_VERSION = "drafts.v1";

export const ACKNOWLEDGEMENT_PROMPT = `Write a short, warm acknowledgement email (<= 120 words) confirming we've received the enquiry below.
- Use the sender's first name if known.
- Reference the service type in plain English.
- State that someone will follow up within one working day.
- Do NOT promise a specific time.
- Sign off "The {{TENANT_NAME}} team".

Enquiry summary: {{SUMMARY}}
Sender first name: {{FIRST_NAME}}

Output just the email body. No subject, no preamble.`;

export const REQUEST_FOR_INFO_PROMPT = `Write a short email (<= 120 words) asking the customer for the missing information below.
- Be polite and concise.
- List the missing items as a short bulleted list.
- Make it easy for them to reply inline.

Sender first name: {{FIRST_NAME}}
Missing information: {{MISSING_FIELDS}}

Output just the email body.`;

export const CONFIRMATION_PROMPT = `Write a short confirmation email (<= 120 words) confirming the booked visit window.
- Include the service type, date, and time window.
- Include the on-the-day contact number placeholder "{{CONTACT_PHONE}}".
- Remind them how to reschedule.

Service type: {{SERVICE_TYPE}}
Window: {{WINDOW}}
Sender first name: {{FIRST_NAME}}

Output just the email body.`;
