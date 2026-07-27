import { createFileRoute } from "@tanstack/react-router";
import { DocumentForm } from "@/components/DocumentForm";
export const Route = createFileRoute("/_authenticated/devis/nouveau")({
  head: () => ({ meta: [{ title: "Nouveau devis — AeroNova" }] }),
  component: () => <DocumentForm kind="quotation" />,
});
