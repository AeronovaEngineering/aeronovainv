import { createFileRoute } from "@tanstack/react-router";
import { DocList } from "./devis.index";
export const Route = createFileRoute("/_authenticated/factures/")({
  head: () => ({ meta: [{ title: "Factures — AeroNova" }] }),
  component: () => <DocList kind="invoice" />,
});
