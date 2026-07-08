// `bird.smsTemplates` — the SMS-template collection (ADR-0042 §8: a collection,
// plural, with read verbs). A top-level resource, sibling to the `emailTemplates`
// collection; the API scopes templates under /v1/sms/templates. Read-only:
// Bird's built-in templates plus any the workspace authored.
// Calls the generated hey-api SDK functions through the lifecycle core.

import { getSmsTemplate, listSmsTemplates } from "../generated/sdk.gen.js";
import type {
  ListSmsTemplatesData,
  SmsTemplate,
  SmsTemplateList,
} from "../generated/types.gen.js";
import { Resource } from "./base.js";
import type { APIPromise, RequestOptions } from "../core/result.js";

/** An SMS template with its body, variables, and available languages. */
export type { SmsTemplate };
/** The (unpaginated) set of templates available to the workspace. */
export type { SmsTemplateList };
/** Filters for `bird.smsTemplates.list`. */
export type SmsTemplateListQuery = NonNullable<ListSmsTemplatesData["query"]>;

export class SmsTemplatesResource extends Resource {
  /**
   * List the SMS templates available to the workspace — Bird's built-in
   * templates plus any the workspace authored. The catalogue is small and
   * returned in full (`.data`); this list is not paginated. Filter by `scope`,
   * `category`, or `locale` (a BCP-47 language tag).
   *
   * @example List the built-in templates
   * const { data } = await bird.smsTemplates.list({ scope: "system" });
   * for (const tpl of data) console.log(tpl.id, tpl.name);
   */
  list(
    query?: SmsTemplateListQuery,
    options?: RequestOptions,
  ): APIPromise<SmsTemplateList> {
    return this.call<SmsTemplateList>("GET", options, ({ signal, headers }) =>
      listSmsTemplates({
        client: this.client,
        query,
        headers,
        signal,
      }),
    );
  }

  /**
   * Fetch a single SMS template by its alias or id, including its body and the
   * variables it expects.
   *
   * @example
   * const tpl = await bird.smsTemplates.get("bird_otp_verification");
   * console.log(tpl.body, tpl.variables);
   */
  get(templateRef: string, options?: RequestOptions): APIPromise<SmsTemplate> {
    return this.call<SmsTemplate>("GET", options, ({ signal, headers }) =>
      getSmsTemplate({
        client: this.client,
        path: { template_ref: templateRef },
        headers,
        signal,
      }),
    );
  }
}
