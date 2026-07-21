# Changelog

## 0.9.2

- Add voice call-event webhook types: `voice.call.initiated`, `voice.call.answered`, and `voice.call.ended` are now recognized event types with typed payloads. Additive; no breaking change.

## 0.9.1

- Documentation search results now carry a `slug`, and a new `DocsPage` type describes a documentation page's full Markdown. Additive wire types for the public docs read/search operations; no new SDK method.

## 0.9.0

- **Breaking:** WhatsApp message reads now return `from` and `to` (each a phone number and/or business-scoped user ID) in place of `business` and `contact`, matching the SMS/email convention.

## 0.8.5

- Verify: `whatsapp` is now a recognized verification channel — the open `channel` enum gained `whatsapp`, and a country route's per-channel settings accept a `whatsapp` key. Additive; no breaking change.

## 0.8.4

- **Breaking:** the contact list free-text filter is now `q` (was `search`), matching the API's renamed query parameter. Update `contacts.list({ search })` to `contacts.list({ q })`.

## 0.8.3

- Documentation clarifications.

## 0.8.2

- Received messages and the `email.received` event now carry `authentication` (`pass`/`fail`/`unknown`), a single summary of sender authentication; treat `unknown` as not verified. The `spf_pass`/`dkim_pass`/`dmarc_pass` fields remain. Additive; no breaking change.

## 0.8.1

- Add the WhatsApp webhook event types: `whatsapp.accepted`, `whatsapp.sent`, `whatsapp.delivered`, `whatsapp.read`, and `whatsapp.failed`. Additive; no breaking change.

## 0.8.0

- Add the sending domains collection: `domains.create`, `.get`, `.list`, `.update`, `.delete`, and `.verify`. Register a sending domain, publish the DNS records it returns, then verify until it is usable as a sender. Requires an API key with the `domains` scope.

## 0.7.6

- Clarify that `DocsSearchResult.url` and `.doc_url` are absolute URLs, matching `.markdown_url` and the API's actual output. Documentation only; no API or behavior change.

## 0.7.5

- Add the Realtime webhook event types: `realtime.cache_channels`, `realtime.channel_existence`, `realtime.client_events`, `realtime.presence`, and `realtime.subscription_count`. Additive; no breaking change.

## 0.7.4

- Contacts now carry `channels` (the channels a contact can be reached on) and audience members carry the `audiences` they belong to. Listing an audience's contacts gains an optional `search` filter (email substring). Additive response fields and an optional parameter; no breaking change.

## 0.7.3

- Correct the `verify.verifications.check` documentation: an already-resolved verification is no longer checkable and returns a 404, not a result with `success: false`. Documentation only; no API or behavior change.

## 0.7.2

- WhatsApp failure detail now carries `meta_error_code`, the raw error code from the WhatsApp Cloud API, and a fuller `description` sourced from Meta's error details. Additive response fields; no breaking change.

## 0.7.1

- Correct the error-code names shown in preview-feature field descriptions (regenerated from the API spec). Documentation only; no API or behavior change.

## 0.7.0

- Add the Verify product: `verify.verifications.create` sends a one-time passcode to a recipient and `verify.verifications.check` validates the code they submit.

## 0.6.0

- Add the WhatsApp channel: `whatsapp.send`, `.get`, `.list`, `.listEvents`. Add WhatsApp templates (read-only): `whatsappTemplates.list`.

## 0.5.0

- Remove the email templates collection (`emailTemplates.create`, `.get`, `.update`, `.delete`, `.publish`, `.list`, `.listVersions`, `.getVersion`), added in 0.3.0. Template management is no longer part of the public API. Sending a published template with `email.send` (pass `template` as an `emt_…` ID or name handle) is unchanged.

## 0.4.2

- Fix the package entry points so the SDK is importable: the build emits `dist/index.mjs`/`.d.mts`, but `main`/`types`/`exports` still pointed at `dist/index.js`/`.d.ts`, so 0.4.0 and 0.4.1 failed with `ERR_MODULE_NOT_FOUND`. 0.4.1 is deprecated; use 0.4.2.

## 0.4.1

- Build determinism: commit a lockfile and install it frozen so the published build is reproducible (0.4.0 failed to publish on a non-deterministic dependency resolution). Ship the caller-detection test fixtures inside the package so they resolve in the standalone build.
- Correct the `audiences.listContacts` example: a member's contact is `member.contact.id`, with `member.joined_at`.

## 0.4.0

- Add the contacts collection: `contacts.create`, `.get`, `.list`, `.update`, `.delete`, and `.batch` (bulk upsert by email). Requires an API key with the `email_marketing` scope.
- Add the audiences collection: `audiences.create`, `.get`, `.list`, `.update`, `.delete`, plus membership `.listContacts`, `.addContacts`, `.removeContacts`, `.removeContact`.
- Add contact properties: `contactProperties.create`, `.get`, `.list`, `.update`, `.archive`, `.unarchive`.

## 0.3.0

- Add the SMS channel: `sms.send`, `sms.sendBatch`, `sms.get`, `sms.list`.
- Add SMS templates (read-only): `smsTemplates.list`, `smsTemplates.get`.
- Add email templates: `emailTemplates.create`, `.get`, `.update`, `.delete`, `.publish`, `.list`, plus versions `.listVersions` and `.getVersion`.
- `email.send` can send a published template: pass `template` (an `emt_…` ID or name handle) with `parameters` in place of inline `subject`/`html`/`text`.

## 0.2.2

- Rename the anonymous client-identity headers from `X-Bird-Surface`/`X-Bird-Version` to `Bird-Surface`/`Bird-Version` (the `X-` prefix is deprecated, RFC 6648). Same telemetry, new header names; no other behavior or API-surface change.

## 0.2.1

- Send anonymous `X-Bird-Surface` and `X-Bird-Version` client-identity headers on every request, so Bird can attribute API usage by surface. No personal data, credentials, or request content: just which Bird client. Edge-safe (no runtime/OS detection); telemetry only, no behavior or API-surface change.

## 0.2.0

- Add batch email send: `email.sendBatch`.
- Point package metadata at the docs (https://bird.com/docs/sdks/typescript).

## 0.1.1

- Documentation and package-metadata fixes.

## 0.1.0

- Initial release: email send, webhook verification, pagination, typed errors.
