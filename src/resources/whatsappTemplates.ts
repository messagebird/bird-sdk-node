// `bird.whatsappTemplates` — the WhatsApp-template collection (ADR-0042 §8: a
// collection, plural, with read verbs). A top-level resource, sibling to
// `smsTemplates`; the API scopes templates under /v1/whatsapp/templates.
// Read-only: the workspace's Meta-approved templates. Calls the generated
// hey-api SDK functions through the lifecycle core.

import { listWhatsAppTemplates } from "../generated/sdk.gen.js";
import type { WhatsAppTemplate, WhatsAppTemplateList } from "../generated/types.gen.js";
import { Resource } from "./base.js";
import type { APIPromise, RequestOptions } from "../core/result.js";

/** A WhatsApp message template with its content blocks and review status. */
export type { WhatsAppTemplate };
/** The (unpaginated) set of templates available to the workspace. */
export type { WhatsAppTemplateList };

export class WhatsappTemplatesResource extends Resource {
  /**
   * List the WhatsApp message templates available to the workspace — Meta's
   * approved templates for this business account. The catalogue is small and
   * returned in full (`.data`); this list is not paginated.
   *
   * @example
   * const { data } = await bird.whatsappTemplates.list();
   * for (const tpl of data) console.log(tpl.name, tpl.status);
   */
  list(options?: RequestOptions): APIPromise<WhatsAppTemplateList> {
    return this.call<WhatsAppTemplateList>(
      "GET",
      options,
      ({ signal, headers }) =>
        listWhatsAppTemplates({
          client: this.client,
          headers,
          signal,
        }),
    );
  }
}
