import { listContent, pickText, resolveCompanyId } from "@/lib/proposales";
import { proposalesErrorResponse } from "@/lib/proposales/http";
import type { ContentListResponse } from "@/lib/schemas";

// Lists the active content items in the hotel's Proposales library.
export async function GET() {
  try {
    const companyId = await resolveCompanyId();
    const content = await listContent({ companyId });
    const body: ContentListResponse = {
      items: content.map((item) => ({
        productId: item.product_id,
        variationId: item.variation_id,
        title: pickText(item.title),
        description: pickText(item.description),
      })),
    };
    return Response.json(body);
  } catch (error) {
    return proposalesErrorResponse(error);
  }
}
