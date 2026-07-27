-- Add a devis-only field for the "conditions générales" clause shown on quotation
-- PDFs. This intentionally lives only on `quotations`, not `invoices`, so it can
-- never carry over when a devis is converted to a facture.
ALTER TABLE public.quotations
  ADD COLUMN conditions_generales text;