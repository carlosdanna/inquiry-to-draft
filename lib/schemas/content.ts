import { z } from "zod";

// What GET /api/content returns to the browser.
export const ContentListItemSchema = z.object({
  productId: z.number().int(),
  variationId: z.number().int(),
  title: z.string(),
  description: z.string(),
});
export type ContentListItem = z.infer<typeof ContentListItemSchema>;

export const ContentListResponseSchema = z.object({
  items: z.array(ContentListItemSchema),
});
export type ContentListResponse = z.infer<typeof ContentListResponseSchema>;

// Error body returned by every route handler in this app.
export const ApiErrorSchema = z.object({ error: z.string() });
