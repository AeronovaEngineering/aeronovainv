-- ============ PAYMENTS ============
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL DEFAULT 'virement',
  reference TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read payments" ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update payments" ON public.payments FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin delete payments" ON public.payments FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Recompute invoice paid_amount + status from payments
CREATE OR REPLACE FUNCTION public.recompute_invoice_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv_id UUID;
  total_paid NUMERIC;
  inv_total NUMERIC;
  inv_status public.doc_status;
BEGIN
  inv_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  SELECT COALESCE(SUM(amount),0) INTO total_paid FROM public.payments WHERE invoice_id = inv_id;
  SELECT total_ttc, status INTO inv_total, inv_status FROM public.invoices WHERE id = inv_id;
  IF inv_status = 'cancelled' THEN
    UPDATE public.invoices SET paid_amount = total_paid WHERE id = inv_id;
    RETURN NULL;
  END IF;
  UPDATE public.invoices SET
    paid_amount = total_paid,
    status = CASE
      WHEN total_paid >= inv_total AND inv_total > 0 THEN 'paid'::public.doc_status
      WHEN total_paid > 0 THEN 'partially_paid'::public.doc_status
      ELSE 'validated'::public.doc_status
    END
  WHERE id = inv_id;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_payments_recompute AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.recompute_invoice_payment();

-- ============ EXPENSES ============
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  amount_ht NUMERIC NOT NULL DEFAULT 0,
  vat_amount NUMERIC NOT NULL DEFAULT 0,
  amount_ttc NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'especes',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read expenses" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update expenses" ON public.expenses FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin delete expenses" ON public.expenses FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PURCHASE INVOICES ============
CREATE TABLE public.purchase_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_invoice_number TEXT,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  subtotal_ht NUMERIC NOT NULL DEFAULT 0,
  vat_rate NUMERIC NOT NULL DEFAULT 19,
  vat_amount NUMERIC NOT NULL DEFAULT 0,
  fiscal_stamp NUMERIC NOT NULL DEFAULT 0,
  total_ttc NUMERIC NOT NULL DEFAULT 0,
  withholding_rate NUMERIC NOT NULL DEFAULT 0,
  withholding_amount NUMERIC NOT NULL DEFAULT 0,
  net_payable NUMERIC NOT NULL DEFAULT 0,
  status public.doc_status NOT NULL DEFAULT 'validated',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_invoices TO authenticated;
GRANT ALL ON public.purchase_invoices TO service_role;
ALTER TABLE public.purchase_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read purchase_invoices" ON public.purchase_invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert purchase_invoices" ON public.purchase_invoices FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update purchase_invoices" ON public.purchase_invoices FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin delete purchase_invoices" ON public.purchase_invoices FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE TRIGGER trg_purchase_invoices_updated_at BEFORE UPDATE ON public.purchase_invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();