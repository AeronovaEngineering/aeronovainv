import { createFileRoute } from "@tanstack/react-router";
import { PartyList } from "./clients";

export const Route = createFileRoute("/_authenticated/fournisseurs")({
  head: () => ({ meta: [{ title: "Fournisseurs — AeroNova" }] }),
  component: () => <PartyList entity="supplier" />,
});
