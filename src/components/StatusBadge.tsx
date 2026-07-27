import { Badge } from "@/components/ui/badge";
import type { Database } from "@/integrations/supabase/types";

type Status = Database["public"]["Enums"]["doc_status"];

const LABELS: Record<Status, string> = {
  draft: "Brouillon",
  validated: "Validé",
  partially_paid: "Payé partiellement",
  paid: "Payé",
  cancelled: "Annulé",
};

const CLASSES: Record<Status, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  validated: "bg-info/10 text-info border-info/20",
  partially_paid: "bg-warning/15 text-warning-foreground border-warning/30",
  paid: "bg-success/15 text-success border-success/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge variant="outline" className={CLASSES[status]}>
      {LABELS[status]}
    </Badge>
  );
}

export const STATUS_LABELS = LABELS;
export type { Status };
