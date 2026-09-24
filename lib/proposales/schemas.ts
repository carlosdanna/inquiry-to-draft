import { z } from "zod";

// Schemas for the parts of the Proposales version 3 interface we use.
// Proposales may add new keys to responses at any time, so these schemas
// only describe the keys we read. Zod drops the rest.

export const ErrorResponseSchema = z.object({
  error: z.object({
    message: z.string(),
    issues: z
      .array(
        z.object({
          code: z.string(),
          path: z.array(z.union([z.string(), z.number()])),
          message: z.string(),
        }),
      )
      .optional(),
  }),
});

// Text keyed by language code, for example { en: "Boardroom" }.
export const LocalizedTextSchema = z.record(z.string(), z.string());

export const CompanySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  currency: z.string(),
  timezone: z.string().optional(),
});
export type Company = z.infer<typeof CompanySchema>;

export const ListCompaniesResponseSchema = z.object({
  data: z.array(CompanySchema),
});

export const ProposalTemplateSchema = z.object({
  uuid: z.string(),
  language: z.string(),
  title: z.string().nullable().optional(),
  background_image_uuid: z.string().nullable().optional(),
});
export type ProposalTemplate = z.infer<typeof ProposalTemplateSchema>;

export const ListTemplatesResponseSchema = z.object({
  data: z.array(ProposalTemplateSchema),
});

export const ContentItemSchema = z.object({
  product_id: z.number().int(),
  variation_id: z.number().int(),
  created_at: z.number(),
  title: LocalizedTextSchema,
  description: LocalizedTextSchema.nullable().optional(),
  is_archived: z.boolean().optional(),
});
export type ContentItem = z.infer<typeof ContentItemSchema>;

export const ListContentResponseSchema = z.object({
  data: z.array(ContentItemSchema),
});

export const ContentImageInputSchema = z.object({
  // Uploadcare identifier, or an empty string when a public url is given.
  uuid: z.string(),
  url: z.url().optional(),
  filename: z.string().optional(),
});

export const CreateContentInputSchema = z.object({
  company_id: z.number().int().positive(),
  language: z.string().min(2),
  title: z.string().min(1),
  description: z.string().optional(),
  images: z.array(ContentImageInputSchema).optional(),
});
export type CreateContentInput = z.infer<typeof CreateContentInputSchema>;

export const ContentMutationResponseSchema = z.object({
  data: z.object({
    product_id: z.number().int(),
    variation_id: z.number().int(),
    message: z.string().optional(),
  }),
});
export type ContentMutationResult = z.infer<
  typeof ContentMutationResponseSchema
>["data"];

export const BulkArchiveResponseSchema = z.object({
  data: z.object({
    archived_count: z.number().int(),
    product_ids: z.array(z.number().int()).optional(),
    message: z.string().optional(),
  }),
});
export type BulkArchiveResult = z.infer<typeof BulkArchiveResponseSchema>["data"];

export const RecipientInputSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.email().optional(),
  phone: z.string().optional(),
  company_name: z.string().optional(),
});

// A proposal block points at a content item by its variation identifier.
// Price and quantity override the content library defaults.
// Unit values are in the smallest currency unit, so 6 500 kronor is 650000.
export const ProposalBlockInputSchema = z.object({
  content_id: z.number().int().positive(),
  type: z.literal("product-block").optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  currency: z.string().length(3).optional(),
  quantity: z.number().positive().optional(),
  unit_value_with_discount_with_tax: z.number().int().nonnegative().optional(),
  unit_value_without_discount_with_tax: z.number().int().nonnegative().optional(),
});

export const CreateProposalInputSchema = z.object({
  company_id: z.number().int().positive(),
  language: z.string().min(2),
  contact_email: z.email().optional(),
  title_md: z.string().optional(),
  description_md: z.string().optional(),
  recipient: RecipientInputSchema.optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  blocks: z.array(ProposalBlockInputSchema).optional(),
  // Records which template the proposal came from. The template must belong
  // to the same company, otherwise Proposales answers with not found.
  tracking: z.object({ created_from_template: z.uuid().optional() }).optional(),
});
export type CreateProposalInput = z.infer<typeof CreateProposalInputSchema>;

export const ProposalMutationResponseSchema = z.object({
  proposal: z.object({
    uuid: z.string(),
    url: z.string(),
  }),
});
export type CreatedProposal = z.infer<
  typeof ProposalMutationResponseSchema
>["proposal"];

export const ProposalSearchResultSchema = z.object({
  uuid: z.string(),
  series_uuid: z.string(),
  company_id: z.number().int(),
  title: z.string(),
  status: z.string().nullable(),
  created_at: z.number(),
  updated_at: z.number(),
  data: z.record(z.string(), z.unknown()).nullable(),
  url: z.string(),
});
export type ProposalSearchResult = z.infer<typeof ProposalSearchResultSchema>;

export const ProposalSearchResponseSchema = z.object({
  data: z.array(ProposalSearchResultSchema),
});
