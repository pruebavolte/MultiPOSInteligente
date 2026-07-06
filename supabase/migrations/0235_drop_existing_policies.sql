-- 0235: Dropear políticas RLS preexistentes (public + storage.objects)
-- para que 024_remaining_schema.sql pueda recrearlas sin conflicto.
-- Dinámico: no requiere conocer nombres. Idempotente.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
       OR (schemaname = 'storage' AND tablename = 'objects')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;
