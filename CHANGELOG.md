# Changelog

## 0.2.1

- Send anonymous `X-Bird-Surface` and `X-Bird-Version` client-identity headers on every request, so Bird can attribute API usage by surface. No personal data, credentials, or request content: just which Bird client. Edge-safe (no runtime/OS detection); telemetry only, no behavior or API-surface change.

## 0.2.0

- Add batch email send: `email.sendBatch`.
- Point package metadata at the docs (https://bird.com/docs/sdks/typescript).

## 0.1.1

- Documentation and package-metadata fixes.

## 0.1.0

- Initial release: email send, webhook verification, pagination, typed errors.
