import { ContentCount } from "@/components/content-count";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Inquiry to Draft
        </h1>
        <p className="text-muted-foreground">
          Paste a customer inquiry email and turn it into a draft proposal in
          Proposales.
        </p>
        <ContentCount />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Customer inquiry</CardTitle>
          <CardDescription>
            The paste form will go here.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </main>
  );
}
