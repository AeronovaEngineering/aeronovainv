-- Manual withholding-at-source entries (retenue à la source au bénéfice de X)
CREATE TABLE public.withholding_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL DEFAULT current_date,
  beneficiary text NOT NULL,
  base_amount numeric NOT NULL DEFAULT 0,
  rate numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.withholding_entries TO authenticated;
GRANT ALL ON public.withholding_entries TO service_role;

ALTER TABLE public.withholding_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view withholding entries"
  ON public.withholding_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create withholding entries"
  ON public.withholding_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update withholding entries"
  ON public.withholding_entries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete withholding entries"
  ON public.withholding_entries FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER set_withholding_entries_updated_at
  BEFORE UPDATE ON public.withholding_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();