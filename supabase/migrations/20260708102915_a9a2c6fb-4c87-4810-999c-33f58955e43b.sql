
-- Fix search_path on the one function missing it
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Revoke public/authenticated EXECUTE on security definer functions;
-- they are called from RLS policies (which run as definer already) and from server code via service role.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- next_document_number is called from the client to reserve a number; keep it callable by authenticated
REVOKE EXECUTE ON FUNCTION public.next_document_number(text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_document_number(text, int) TO authenticated;

-- has_role/is_admin also need to be callable by RLS as authenticated? No - SECURITY DEFINER runs as owner.
-- But policies invoke them as the querying user; since they are STABLE SECURITY DEFINER, the ownership handles it.
-- However Postgres still needs EXECUTE for the caller. Grant back to authenticated for policy evaluation.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
