import { createFileRoute } from "@tanstack/react-router";
import { DocumentForm } from "@/components/DocumentForm";
export const Route = createFileRoute("/_authenticated/factures/nouveau")({
  head: () => ({ meta: [{ title: "Nouvelle facture — AeroNova" }] }),
  component: () => <DocumentForm kind="invoice" />,
});