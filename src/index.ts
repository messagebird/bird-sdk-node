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
  type UnmetGate,
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
  SmsMessage,
  SmsSendParams,
  SmsSendBatchParams,
  SmsSendBatchResult,
  SmsListQuery,
} from "./resources/sms.js";
export type {
  SmsTemplate,
  SmsTemplateList,
  SmsTemplateListQuery,
} from "./resources/smsTemplates.js";
export type {
  WhatsAppMessage,
  WhatsappSendParams,
  WhatsappListQuery,
  WhatsappListEventsQuery,
  WhatsAppEventList,
} from "./resources/whatsapp.js";
export type {
  WhatsAppTemplate,
  WhatsAppTemplateList,
} from "./resources/whatsappTemplates.js";
export type {
  Verification,
  VerificationCheckResult,
  VerificationCreateParams,
  VerificationCheckParams,
} from "./resources/verify.js";
export type {
  Contact,
  ContactCreateParams,
  ContactUpdateParams,
  ContactBatchParams,
  ContactUpsertResult,
  ContactListQuery,
} from "./resources/contacts.js";
export type {
  Audience,
  AudienceMember,
  AudienceCreateParams,
  AudienceUpdateParams,
  AudienceAddContactsParams,
  AudienceRemoveContactsParams,
  AudienceListQuery,
  AudienceContactsQuery,
} from "./resources/audiences.js";
export type {
  ContactProperty,
  ContactPropertyCreateParams,
  ContactPropertyUpdateParams,
  ContactPropertyListQuery,
} from "./resources/contactProperties.js";
export type {
  BirdWebhookEvent,
  WebhookHeaders,
  WebhookOptions,
} from "./resources/webhooks.js";
export { WebhookEventType } from "./event-types.gen.js";
export type { WebhookEventTypeValue } from "./event-types.gen.js";
