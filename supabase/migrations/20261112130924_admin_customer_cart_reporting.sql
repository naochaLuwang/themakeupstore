-- Read-only reports. Email stays in Auth; no contact columns or public policies are added.
-- Private definers can read auth.users. Only the service role may call their public
-- invoker wrappers, after the web application has checked requireAdmin().
BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO service_role;

CREATE OR REPLACE FUNCTION private.admin_customer_directory(
  p_search text DEFAULT '', p_from timestamptz DEFAULT NULL,
  p_before timestamptz DEFAULT NULL, p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 25, p_customer_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH matching AS MATERIALIZED (
    SELECT p.id, p.full_name, p.phone, u.email, p.created_at
    FROM public.profiles p LEFT JOIN auth.users u ON u.id = p.id
    WHERE p.deleted_at IS NULL
      AND (p_customer_id IS NULL OR p.id = p_customer_id)
      AND (p_from IS NULL OR p.created_at >= p_from)
      AND (p_before IS NULL OR p.created_at < p_before)
      AND (
        coalesce(btrim(p_search), '') = ''
        OR strpos(lower(coalesce(p.full_name, '')), lower(btrim(p_search))) > 0
        OR strpos(lower(coalesce(u.email, '')), lower(btrim(p_search))) > 0
        OR strpos(coalesce(p.phone, ''), btrim(p_search)) > 0
        OR (btrim(p_search) ~ '^[+()0-9 .-]+$'
          AND length(regexp_replace(p_search, '[^0-9]', '', 'g')) >= 3
          AND strpos(regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g'),
                     regexp_replace(p_search, '[^0-9]', '', 'g')) > 0)
      )
  ), stats AS (
    SELECT count(*) AS total,
      count(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM public.orders o WHERE o.user_id = m.id
          AND o.status IS DISTINCT FROM 'cancelled'
          AND o.created_at >= now() - interval '30 days'
      )) AS active FROM matching m
  ), paging AS (
    SELECT greatest(1, least(coalesce(p_page_size, 25), 100)) AS size,
      greatest(1, ceil(total::numeric / greatest(1, least(coalesce(p_page_size, 25), 100)))::integer) AS pages
    FROM stats
  ), bounds AS (
    SELECT size, pages, greatest(1, least(coalesce(p_page, 1), pages)) AS page FROM paging
  ), selected AS (
    SELECT m.* FROM matching m ORDER BY m.created_at DESC, m.id DESC
    LIMIT (SELECT size FROM bounds)
    OFFSET (SELECT (page - 1)::bigint * size FROM bounds)
  ), rows AS (
    SELECT s.*, summary.order_count, summary.order_value
    FROM selected s CROSS JOIN LATERAL (
      SELECT count(*) AS order_count, coalesce(sum(o.total), 0) AS order_value
      FROM public.orders o WHERE o.user_id = s.id AND o.status IS DISTINCT FROM 'cancelled'
    ) summary
  )
  SELECT jsonb_build_object(
    'customers', coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC, r.id DESC) FROM rows r), '[]'::jsonb),
    'total', stats.total, 'active30d', stats.active,
    'page', bounds.page, 'pageSize', bounds.size, 'totalPages', bounds.pages
  ) FROM stats CROSS JOIN bounds;
$$;

CREATE OR REPLACE FUNCTION public.admin_customer_directory(
  p_search text DEFAULT '', p_from timestamptz DEFAULT NULL,
  p_before timestamptz DEFAULT NULL, p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 25, p_customer_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT private.admin_customer_directory(p_search, p_from, p_before, p_page, p_page_size, p_customer_id);
$$;

CREATE OR REPLACE FUNCTION private.admin_cart_recovery_directory(
  p_page integer DEFAULT 1, p_page_size integer DEFAULT 25, p_status text DEFAULT 'all',
  p_recoverable_only boolean DEFAULT false
) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH carts AS MATERIALIZED (
    SELECT c.id, c.user_id, c.updated_at, c.abandoned_email_sent_at,
      p.full_name, p.phone, u.email,
      (SELECT coalesce(sum(ci.quantity), 0) FROM public.cart_items ci
        WHERE ci.cart_id = c.id AND ci.quantity > 0) AS item_count
    FROM public.carts c JOIN public.profiles p ON p.id = c.user_id
      LEFT JOIN auth.users u ON u.id = c.user_id
    WHERE p.deleted_at IS NULL AND EXISTS (
      SELECT 1 FROM public.cart_items ci WHERE ci.cart_id = c.id AND ci.quantity > 0
    )
  ), stats AS (
    SELECT
      count(*) FILTER (WHERE updated_at < now() - interval '1 hour' AND abandoned_email_sent_at IS NULL) AS pending,
      count(*) FILTER (WHERE updated_at < now() - interval '1 hour' AND abandoned_email_sent_at IS NOT NULL) AS sent,
      count(*) FILTER (WHERE updated_at >= now() - interval '1 hour') AS recent,
      count(*) FILTER (WHERE updated_at < now() - interval '1 hour' AND abandoned_email_sent_at IS NULL AND nullif(btrim(email), '') IS NULL) AS unreachable
    FROM carts
  ), matching AS MATERIALIZED (
    SELECT * FROM carts WHERE updated_at < now() - interval '1 hour'
      AND (NOT coalesce(p_recoverable_only, false) OR nullif(btrim(email), '') IS NOT NULL)
      AND (p_status = 'all' OR (p_status = 'pending' AND abandoned_email_sent_at IS NULL)
        OR (p_status = 'sent' AND abandoned_email_sent_at IS NOT NULL))
  ), paging AS (
    SELECT count(*) AS total,
      greatest(1, least(coalesce(p_page_size, 25), 100)) AS size,
      greatest(1, ceil(count(*)::numeric / greatest(1, least(coalesce(p_page_size, 25), 100)))::integer) AS pages
    FROM matching
  ), bounds AS (
    SELECT total, size, pages, greatest(1, least(coalesce(p_page, 1), pages)) AS page FROM paging
  ), selected AS (
    SELECT * FROM matching
    ORDER BY CASE WHEN p_recoverable_only THEN updated_at END ASC, updated_at DESC, id DESC
    LIMIT (SELECT size FROM bounds)
    OFFSET (SELECT (page - 1)::bigint * size FROM bounds)
  )
  SELECT jsonb_build_object(
    'carts', coalesce((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.updated_at DESC, s.id DESC) FROM selected s), '[]'::jsonb),
    'stats', to_jsonb(stats), 'total', bounds.total,
    'page', bounds.page, 'pageSize', bounds.size, 'totalPages', bounds.pages
  ) FROM stats CROSS JOIN bounds;
$$;

CREATE OR REPLACE FUNCTION public.admin_cart_recovery_directory(
  p_page integer DEFAULT 1, p_page_size integer DEFAULT 25, p_status text DEFAULT 'all',
  p_recoverable_only boolean DEFAULT false
) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT private.admin_cart_recovery_directory(p_page, p_page_size, p_status, p_recoverable_only);
$$;

REVOKE ALL ON FUNCTION private.admin_customer_directory(text,timestamptz,timestamptz,integer,integer,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_customer_directory(text,timestamptz,timestamptz,integer,integer,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.admin_cart_recovery_directory(integer,integer,text,boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_cart_recovery_directory(integer,integer,text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.admin_customer_directory(text,timestamptz,timestamptz,integer,integer,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_customer_directory(text,timestamptz,timestamptz,integer,integer,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION private.admin_cart_recovery_directory(integer,integer,text,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_cart_recovery_directory(integer,integer,text,boolean) TO service_role;

COMMIT;
