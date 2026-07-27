import { createFileRoute } from "@tanstack/react-router";
import { DocumentForm } from "@/components/DocumentForm";
export const Route = createFileRoute("/_authenticated/factures/$id")({
  head: () => ({ meta: [{ title: "Facture — AeroNova" }] }),
  component: () => {
    const { id } = Route.useParams();
    return <DocumentForm kind="invoice" documentId={id} />;
  },
});
