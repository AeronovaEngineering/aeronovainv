
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('administrator', 'assistant');
CREATE TYPE public.doc_status AS ENUM ('draft', 'validated', 'partially_paid', 'paid', 'cancelled');

-- ============ UPDATED_AT HELPER ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'administrator');
$$;

-- ============ AUTO-PROFILE + FIRST-USER-IS-ADMIN ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  assigned_role := CASE WHEN user_count = 0 THEN 'administrator'::public.app_role ELSE 'assistant'::public.app_role END;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profiles RLS
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

-- User roles RLS
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ COMPANY SETTINGS (singleton) ============
CREATE TABLE public.company_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name TEXT NOT NULL DEFAULT 'Aeronova Engineering',
  address TEXT NOT NULL DEFAULT 'Ariana-Tunise',
  phone TEXT DEFAULT '+216 23 948 792',
  email TEXT DEFAULT 'aeronova.eng@gmail.com',
  matricule_fiscal TEXT DEFAULT '1919265 L/A/M/000',
  rc TEXT DEFAULT 'C01152562025',
  ccb TEXT DEFAULT 'BIAT Agence Raoued/El Ghazela 08 065 0220110002475 74',
  footer_address TEXT DEFAULT 'N°47 Rue Fathi Zouhir Cité Nkhilette 2083 Raoued Ariana-Tunise',
  default_vat_rate NUMERIC(5,2) NOT NULL DEFAULT 19.00,
  fiscal_stamp NUMERIC(10,3) NOT NULL DEFAULT 1.000,
  logo_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.company_settings TO authenticated;
GRANT ALL ON public.company_settings TO service_role;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated read settings" ON public.company_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins update settings" ON public.company_settings FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins insert settings" ON public.company_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.company_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TRIGGER trg_company_settings_updated BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ CLIENTS ============
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  matricule_fiscal TEXT,
  address TEXT,
  telephone TEXT,
  email TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update clients" ON public.clients FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins delete clients" ON public.clients FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_clients_name ON public.clients (company_name);

-- ============ SUPPLIERS ============
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  matricule_fiscal TEXT,
  address TEXT,
  telephone TEXT,
  email TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins delete suppliers" ON public.suppliers FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ NUMBERING ============
-- Atomic next-number function per (doc_type, year), starting at 1.
CREATE TABLE public.document_sequences (
  doc_type TEXT NOT NULL,
  year INT NOT NULL,
  last_number INT NOT NULL DEFAULT 0,
  PRIMARY KEY (doc_type, year)
);
GRANT SELECT ON public.document_sequences TO authenticated;
GRANT ALL ON public.document_sequences TO service_role;
ALTER TABLE public.document_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read sequences" ON public.document_sequences FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.next_document_number(_doc_type TEXT, _year INT)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_num INT;
BEGIN
  INSERT INTO public.document_sequences (doc_type, year, last_number)
  VALUES (_doc_type, _year, 1)
  ON CONFLICT (doc_type, year)
  DO UPDATE SET last_number = public.document_sequences.last_number + 1
  RETURNING last_number INTO new_num;
  RETURN new_num;
END;
$$;

-- ============ QUOTATIONS ============
CREATE TABLE public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INT NOT NULL,
  year INT NOT NULL,
  document_date DATE NOT NULL DEFAULT CURRENT_DATE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  project_name TEXT,
  project_address TEXT,
  vat_rate NUMERIC(5,2) NOT NULL DEFAULT 19.00,
  fiscal_stamp NUMERIC(10,3) NOT NULL DEFAULT 1.000,
  subtotal_ht NUMERIC(14,3) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(14,3) NOT NULL DEFAULT 0,
  total_ttc NUMERIC(14,3) NOT NULL DEFAULT 0,
  status public.doc_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (number, year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO authenticated;
GRANT ALL ON public.quotations TO service_role;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read quotations" ON public.quotations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert quotations" ON public.quotations FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update quotations" ON public.quotations FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin delete quotations" ON public.quotations FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_quotations_updated BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_quotations_client ON public.quotations (client_id);
CREATE INDEX idx_quotations_year_number ON public.quotations (year DESC, number DESC);

CREATE TABLE public.quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  unit TEXT DEFAULT 'unité',
  quantity NUMERIC(14,3) NOT NULL DEFAULT 1,
  unit_price_ht NUMERIC(14,3) NOT NULL DEFAULT 0,
  total_ht NUMERIC(14,3) NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotation_items TO authenticated;
GRANT ALL ON public.quotation_items TO service_role;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read q_items" ON public.quotation_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth write q_items" ON public.quotation_items FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE INDEX idx_q_items_quotation ON public.quotation_items (quotation_id);

-- ============ INVOICES ============
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INT NOT NULL,
  year INT NOT NULL,
  document_date DATE NOT NULL DEFAULT CURRENT_DATE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  project_name TEXT,
  project_address TEXT,
  vat_rate NUMERIC(5,2) NOT NULL DEFAULT 19.00,
  fiscal_stamp NUMERIC(10,3) NOT NULL DEFAULT 1.000,
  subtotal_ht NUMERIC(14,3) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(14,3) NOT NULL DEFAULT 0,
  total_ttc NUMERIC(14,3) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(14,3) NOT NULL DEFAULT 0,
  status public.doc_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  converted_from_quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (number, year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read invoices" ON public.invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update invoices" ON public.invoices FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin delete invoices" ON public.invoices FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_invoices_client ON public.invoices (client_id);
CREATE INDEX idx_invoices_year_number ON public.invoices (year DESC, number DESC);
CREATE INDEX idx_invoices_status ON public.invoices (status);

CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  unit TEXT DEFAULT 'unité',
  quantity NUMERIC(14,3) NOT NULL DEFAULT 1,
  unit_price_ht NUMERIC(14,3) NOT NULL DEFAULT 0,
  total_ht NUMERIC(14,3) NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read i_items" ON public.invoice_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth write i_items" ON public.invoice_items FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE INDEX idx_i_items_invoice ON public.invoice_items (invoice_id);

-- ============ ACTIVITY LOGS ============
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own logs" ON public.activity_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Auth insert logs" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE INDEX idx_activity_created ON public.activity_logs (created_at DESC);
