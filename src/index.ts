export {
  BirdClient,
  type BirdClientOptions,
  type BirdRequest,
} from "./client.js";
export {
  // base + transport
  BirdError,
  BirdConnectionError,
  BirdTimeoutError,
  BirdAPIError,
  // one per error `type`
  BirdAuthError,
  BirdPermissionError,
  BirdNotFoundError,
  BirdConflictError,
  BirdBadRequestError,
  BirdBillingError,
  BirdPreconditionError,
  BirdPayloadTooLargeError,
  BirdInternalError,
  BirdNotImplementedError,
  BirdMisdirectedError,
  BirdServiceUnavailableError,
  BirdValidationError,
  BirdRateLimitError,
  BirdWebhookVerificationError,
  type ErrorDetail,
  type ErrorNextAction,
} from "./errors.js";
export { regionFromApiKey, baseUrlForRegion } from "./region.js";
export type {
  APIPromise,
  PaginatedPromise,
  CursorPage,
  RequestOptions,
  SafeResult,
} from "./core/result.js";
export type { BirdResponse } from "./core/http.js";
export type {
  EmailMessage,
  EmailSendParams,
  EmailSendBatchParams,
  EmailSendBatchResult,
  EmailListQuery,
  EmailChannelDefaults,
} from "./resources/email.js";
export type {
  BirdWebhookEvent,
  WebhookHeaders,
  WebhookOptions,
} from "./resources/webhooks.js";
export { WebhookEventType } from "./event-types.gen.js";
export type { WebhookEventTypeValue } from "./event-types.gen.js";
