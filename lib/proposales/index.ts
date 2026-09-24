import "server-only";

import { proposalesFetch } from "./client";
import { ProposalesError } from "./errors";
import {
  BulkArchiveResponseSchema,
  ContentMutationResponseSchema,
  CreateContentInputSchema,
  CreateProposalInputSchema,
  ListCompaniesResponseSchema,
  ListContentResponseSchema,
  ListTemplatesResponseSchema,
  ProposalMutationResponseSchema,
  ProposalSearchResponseSchema,
  type BulkArchiveResult,
  type Company,
  type ContentItem,
  type ContentMutationResult,
  type CreateContentInput,
  type CreateProposalInput,
  type CreatedProposal,
  type ProposalSearchResult,
  type ProposalTemplate,
} from "./schemas";

export { ProposalesError, isProposalesError } from "./errors";
export type {
  Company,
  ContentItem,
  CreateContentInput,
  CreateProposalInput,
  CreatedProposal,
  ProposalSearchResult,
  ProposalTemplate,
} from "./schemas";

export async function listCompanies(): Promise<Company[]> {
  const response = await proposalesFetch("/v3/companies", {
    schema: ListCompaniesResponseSchema,
  });
  return response.data;
}

export async function listCompanyTemplates(
  companyId: number,
): Promise<ProposalTemplate[]> {
  const response = await proposalesFetch(
    `/v3/companies/${companyId}/templates`,
    { schema: ListTemplatesResponseSchema },
  );
  return response.data;
}

type ListContentOptions = {
  companyId?: number;
  includeArchived?: boolean;
};

export async function listContent(
  options: ListContentOptions = {},
): Promise<ContentItem[]> {
  const response = await proposalesFetch("/v3/content", {
    query: {
      company_id: options.companyId,
      include_archived: options.includeArchived || undefined,
    },
    schema: ListContentResponseSchema,
  });
  return response.data;
}

export async function createContent(
  input: CreateContentInput,
): Promise<ContentMutationResult> {
  const response = await proposalesFetch("/v3/content", {
    method: "POST",
    body: CreateContentInputSchema.parse(input),
    schema: ContentMutationResponseSchema,
  });
  return response.data;
}

// Archiving hides content from the library without deleting it.
export async function archiveContent(
  productIds: number[],
): Promise<BulkArchiveResult> {
  const response = await proposalesFetch("/v3/content", {
    method: "DELETE",
    query: { action: "bulk" },
    body: { product_ids: productIds },
    schema: BulkArchiveResponseSchema,
  });
  return response.data;
}

// Creates a draft proposal. Only call this after the user has confirmed.
export async function createProposal(
  input: CreateProposalInput,
): Promise<CreatedProposal> {
  const response = await proposalesFetch("/v3/proposals", {
    method: "POST",
    body: CreateProposalInputSchema.parse(input),
    schema: ProposalMutationResponseSchema,
  });
  return response.proposal;
}

type SearchProposalsOptions = {
  companyId?: number;
  recipientEmail?: string;
  limit?: number;
  // Matches properties in the proposal data field, for example { source: "inquiry-to-draft" }.
  dataFilter?: Record<string, string>;
};

export async function searchProposals(
  options: SearchProposalsOptions = {},
): Promise<ProposalSearchResult[]> {
  const filters = Object.fromEntries(
    Object.entries(options.dataFilter ?? {}).map(([key, value]) => [
      `filter[${key}]`,
      value,
    ]),
  );
  const response = await proposalesFetch("/v3/proposal-search", {
    query: {
      company_id: options.companyId,
      recipient_email: options.recipientEmail,
      limit: options.limit ?? 25,
      ...filters,
    },
    schema: ProposalSearchResponseSchema,
  });
  return response.data;
}

// Uses PROPOSALES_COMPANY_ID when set. Otherwise falls back to the only
// company the token can access, and fails when there are several.
export async function resolveCompanyId(): Promise<number> {
  const configured = process.env.PROPOSALES_COMPANY_ID;
  if (configured) {
    const id = Number(configured);
    if (Number.isInteger(id) && id > 0) return id;
    throw configError("PROPOSALES_COMPANY_ID must be a positive whole number.");
  }

  const companies = await listCompanies();
  if (companies.length === 1) return companies[0].id;
  if (companies.length === 0) {
    throw configError("The Proposales token has no access to any company.");
  }
  const choices = companies.map((c) => `${c.id} (${c.name})`).join(", ");
  throw configError(
    `Set PROPOSALES_COMPANY_ID to one of these companies: ${choices}.`,
  );
}

function configError(message: string) {
  return new ProposalesError({ kind: "config", message, path: "/v3/companies" });
}

// Picks the English text, or the first language available.
export function pickText(text: Record<string, string> | null | undefined) {
  if (!text) return "";
  return text.en ?? Object.values(text)[0] ?? "";
}
