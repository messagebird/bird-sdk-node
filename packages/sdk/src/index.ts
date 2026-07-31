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
  // response types
  EmailStatsSummary,
  EmailStatsResponse,
  EmailStatsTagsResponse,
  EmailStatsByCategoryResponse,
  EmailStatsBySendingIpResponse,
  EmailStatsBySendingDomainResponse,
  EmailStatsByRecipientDomainResponse,
  EmailStatsByMailboxProviderResponse,
  EmailStatsByMailboxProviderRegionResponse,
  EmailStatsByTemplateResponse,
  EmailStatsByLocationResponse,
  EmailStatsByClientResponse,
  EmailStatsByBounceCodeResponse,
  EmailStatsByComplaintTypeResponse,
  EmailStatsByBroadcastResponse,
  // per-method query params
  EmailStatsSummaryQuery,
  EmailStatsDailyQuery,
  EmailStatsHourlyQuery,
  EmailStatsByTagQuery,
  EmailStatsByCategoryQuery,
  EmailStatsBySendingIpQuery,
  EmailStatsBySendingDomainQuery,
  EmailStatsByRecipientDomainQuery,
  EmailStatsByMailboxProviderQuery,
  EmailStatsByMailboxProviderRegionQuery,
  EmailStatsByTemplateQuery,
  EmailStatsByLocationQuery,
  EmailStatsByClientQuery,
  EmailStatsByBounceCodeQuery,
  EmailStatsByComplaintTypeQuery,
  EmailStatsByBroadcastQuery,
} from "./resources/emailStats.gen.js";
export type {
  SmsSendParams,
  SmsSendBatchParams,
  SmsSendBatchResult,
} from "./resources/sms.js";
export type { SmsMessage, SmsListQuery } from "./resources/sms.gen.js";
export type {
  SmsTemplate,
  SmsTemplateList,
  SmsTemplateListQuery,
} from "./resources/smsTemplates.gen.js";
export type { WhatsappSendParams } from "./resources/whatsapp.js";
export type {
  WhatsAppMessage,
  WhatsappListQuery,
  WhatsappListEventsQuery,
  WhatsAppEventList,
} from "./resources/whatsapp.gen.js";
export type {
  Verification,
  VerificationCheckResult,
  VerifyVerificationsCreateParams,
  VerifyVerificationsCheckParams,
} from "./resources/verifyVerifications.gen.js";
export type {
  Contact,
  ContactCreateParams,
  ContactUpdateParams,
  ContactBatchParams,
  ContactUpsertResult,
  ContactListQuery,
} from "./resources/contacts.gen.js";
export type {
  Audience,
  AudienceMember,
  AudienceCreateParams,
  AudienceUpdateParams,
  AudienceAddContactsParams,
  AudienceRemoveContactsParams,
  AudienceListQuery,
  AudienceListContactsQuery,
} from "./resources/audiences.gen.js";
export type {
  ContactProperty,
  ContactPropertyCreateParams,
  ContactPropertyUpdateParams,
  ContactPropertyListQuery,
} from "./resources/contactProperties.gen.js";
export type {
  Domain,
  DomainCreateParams,
  DomainUpdateParams,
  DomainListQuery,
} from "./resources/domains.gen.js";
export type {
  DnsRecord,
  DomainDkim,
  DomainCapabilities,
} from "./generated/types.gen.js";
export type {
  BirdWebhookEvent,
  WebhookHeaders,
  WebhookOptions,
} from "./resources/webhooks.js";
export type {
  // response types
  RealtimePublishResult,
  RealtimeBatchPublishResult,
  RealtimeChannelsList,
  RealtimeChannelListItem,
  RealtimeChannelInfo,
  RealtimeChannelMembers,
  RealtimeChannelMember,
  RealtimeChannelInclude,
  // request params and query
  RealtimePublishParams,
  RealtimeBatchPublishParams,
  RealtimeChannelsListQuery,
  RealtimeChannelGetQuery,
  // credentials: client config + per-call override
  RealtimeOptions,
  RealtimeRequestOptions,
} from "./resources/realtime.js";
export { WebhookEventType } from "./event-types.gen.js";
export type { WebhookEventTypeValue } from "./event-types.gen.js";
export type {
  Mailbox,
  EmailMailboxesCreateParams,
  EmailMailboxesUpdateParams,
  EmailMailboxesUpdateQuery,
  EmailMailboxesListQuery,
  EmailMailboxesStatsQuery,
  MailboxStatsResponse,
  EmailMailboxLabelList,
} from "./resources/emailMailboxes.gen.js";
export type {
  EmailMailboxesMessagesCreateParams,
  EmailThreadMessage,
} from "./resources/emailMailboxesMessages.js";
export type {
  ReceiveRule,
  EmailMailboxesReceiveRulesCreateParams,
  EmailMailboxesReceiveRulesListQuery,
} from "./resources/emailMailboxesReceiveRules.gen.js";
export type {
  EmailThread,
  EmailThreadsListQuery,
  EmailThreadsDeleteQuery,
  EmailThreadsUpdateParams,
} from "./resources/emailThreads.gen.js";
export type {
  EmailThreadMessageBody,
  EmailThreadMessageAttachmentList,
  EmailThreadsMessagesListQuery,
  EmailThreadsMessagesReplyParams,
} from "./resources/emailThreadsMessages.gen.js";
