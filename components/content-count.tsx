"use client";

import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorSchema, ContentListResponseSchema } from "@/lib/schemas";

async function fetchContent() {
  const response = await fetch("/api/content");
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = ApiErrorSchema.safeParse(body);
    throw new Error(
      parsed.success ? parsed.data.error : "Could not load the content library.",
    );
  }
  return ContentListResponseSchema.parse(body);
}

export function useContentList() {
  return useQuery({ queryKey: ["content"], queryFn: fetchContent });
}

export function ContentCount() {
  const { data, error, isPending } = useContentList();

  if (isPending) return <Skeleton className="h-5 w-56" />;
  if (error) {
    return <p className="text-sm text-destructive">{error.message}</p>;
  }

  const count = data.items.length;
  return (
    <p className="text-sm text-muted-foreground">
      <span className="font-medium text-foreground">{count}</span>{" "}
      {count === 1 ? "item" : "items"} in your content library
    </p>
  );
}
