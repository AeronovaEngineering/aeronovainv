import { createFileRoute } from "@tanstack/react-router";
import { DocumentForm } from "@/components/DocumentForm";
export const Route = createFileRoute("/_authenticated/devis/$id")({
  head: () => ({ meta: [{ title: "Devis — AeroNova" }] }),
  component: () => {
    const { id } = Route.useParams();
    return <DocumentForm kind="quotation" documentId={id} />;
  },
});
