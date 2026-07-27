import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";
import { Loader2 } from "lucide-react";

export type PartyRow = {
  id: string; company_name: string; matricule_fiscal: string | null;
  address: string | null; telephone: string | null; email: string | null; notes: string | null;
};

export function PartyDialog({
  open, onOpenChange, entity, initial, onSaved,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  entity: "client" | "supplier";
  initial?: Partial<PartyRow> & { id?: string };
  onSaved?: () => void;
}) {
  const [form, setForm] = useState<Partial<PartyRow>>({});
  const [busy, setBusy] = useState(false);
  const table = entity === "client" ? "clients" : "suppliers";
  const title = initial?.id ? "Modifier" : "Nouveau";

  useEffect(() => { setForm(initial ?? {}); }, [initial, open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_name?.trim()) { toast.error("Le nom de la société est requis"); return; }
    setBusy(true);
    const payload = {
      company_name: form.company_name!.trim(),
      matricule_fiscal: form.matricule_fiscal ?? null,
      address: form.address ?? null,
      telephone: form.telephone ?? null,
      email: form.email ?? null,
      notes: form.notes ?? null,
    };
    if (initial?.id) {
      const { error } = await supabase.from(table).update(payload).eq("id", initial.id);
      setBusy(false);
      if (error) return toast.error(error.message);
      await logActivity("update", entity, initial.id, { company_name: payload.company_name });
      toast.success("Enregistré");
    } else {
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase.from(table).insert({ ...payload, created_by: userRes.user?.id ?? null }).select("id").single();
      setBusy(false);
      if (error) return toast.error(error.message);
      await logActivity("create", entity, data?.id ?? null, { company_name: payload.company_name });
      toast.success("Créé");
    }
    onOpenChange(false);
    onSaved?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title} {entity === "client" ? "client" : "fournisseur"}</DialogTitle>
          <DialogDescription>
            Renseignez les informations. Seuls Nom, Adresse, Téléphone et Matricule Fiscal apparaissent sur les factures.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5"><Label>Nom de la société *</Label>
            <Input required value={form.company_name ?? ""} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Matricule fiscal</Label>
              <Input value={form.matricule_fiscal ?? ""} onChange={(e) => setForm({ ...form, matricule_fiscal: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Téléphone</Label>
              <Input value={form.telephone ?? ""} onChange={(e) => setForm({ ...form, telephone: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Adresse</Label>
            <Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Email</Label>
            <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Notes</Label>
            <Textarea rows={3} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async (): Promise<PartyRow[]> => {
      const { data, error } = await supabase.from("clients").select("*").order("company_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}
