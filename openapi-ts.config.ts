import { defineConfig } from "@hey-api/openapi-ts";
import { surfaceOps } from "./surface-ops.gen";

// Mirrors apps/dashboard and apps/admin so the whole monorepo shares one OpenAPI
// codegen. Input is the public bundle (public surface only).
//
// Unlike the apps, the SDK FILTERS generation to the operations the curated
// facade actually wraps (ADR-0042 §6): the generated surface equals the exposed
// surface, and the SDK's generated files stop churning when unrelated parts of
// the spec change. The op list (`surfaceOps`) is generated from the surface
// catalog (backend/openapi/surfaces.yaml) — to expose a new operation on the
// SDK, add it to the catalog and regenerate, never edit the list here.
//
// `WebhookEvent` is included explicitly: it's referenced by no operation (only by
// `webhooks.unwrap`), so the default `orphans: false` would otherwise drop it.
export default defineConfig({
  input: "../../backend/openapi/.generated/openapi.public.bundle.yaml",
  output: {
    path: "src/generated",
    format: "prettier",
  },
  parser: {
    filters: {
      operations: {
        include: surfaceOps,
      },
      // Keep all schemas (don't prune orphans). The public bundle's named ID
      // refs (APIKeyID, …) are transitively reached from WebhookEvent; pruning
      // them leaves dangling $refs that crash the parser. Filtering operations is
      // the §6 win; the schema set stays full.
      orphans: true,
    },
  },
  plugins: ["@hey-api/typescript", "@hey-api/schemas", "@hey-api/sdk"],
});
