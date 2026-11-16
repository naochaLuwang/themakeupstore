-- Apply after the earlier financial/order-amendment/directory migrations, before this web build.
-- No existing balances, lifetime totals, roles or ledger records are recalculated.
BEGIN;
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO service_role;
CREATE SCHEMA IF NOT EXISTS app_security;
REVOKE ALL ON SCHEMA app_security FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA app_security TO authenticated,service_role;

-- A non-exposed, parameter-free role lookup avoids recursive profiles policies.
CREATE OR REPLACE FUNCTION app_security.current_profile_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND deleted_at IS NULL AND (is_admin=true OR user_type='admin'));
$$;
REVOKE ALL ON FUNCTION app_security.current_profile_admin() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION app_security.current_profile_admin() TO authenticated,service_role;

-- Revoke both relation-level AND any historical column-level grants.
DO $$ DECLARE t text; p record; c record; BEGIN
 FOREACH t IN ARRAY ARRAY['profiles','orders','order_items','loyalty_points','loyalty_transactions'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,t); END LOOP;
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
  FOR c IN SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=t LOOP
   EXECUTE format('REVOKE ALL (%I) ON public.%I FROM PUBLIC,anon,authenticated',c.column_name,t);
  END LOOP;
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
 END LOOP;
END $$;
CREATE POLICY profile_owner_admin_read ON public.profiles FOR SELECT TO authenticated USING(id=(SELECT auth.uid()) OR (SELECT app_security.current_profile_admin()));
CREATE POLICY profile_owner_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK(id=(SELECT auth.uid()) AND is_admin=false AND user_type='retail' AND deleted_at IS NULL);
CREATE POLICY profile_owner_update ON public.profiles FOR UPDATE TO authenticated USING(id=(SELECT auth.uid()) AND deleted_at IS NULL) WITH CHECK(id=(SELECT auth.uid()) AND deleted_at IS NULL);
GRANT INSERT(id,full_name,phone,street,pincode,push_subscription),UPDATE(id,full_name,phone,street,pincode,push_subscription) ON public.profiles TO authenticated;
-- Existing public catalog policies contain admin subqueries against these
-- columns. They need column privileges to evaluate, while profiles RLS gives
-- anon NO visible rows. Contact columns remain completely revoked from anon.
GRANT SELECT(id,is_admin,user_type) ON public.profiles TO anon;
CREATE POLICY orders_owner_admin_read ON public.orders FOR SELECT TO authenticated USING((user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.deleted_at IS NULL)) OR (SELECT app_security.current_profile_admin()));
CREATE POLICY items_owner_admin_read ON public.order_items FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.orders o WHERE o.id=order_id));
CREATE POLICY points_owner_admin_read ON public.loyalty_points FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()) OR (SELECT app_security.current_profile_admin()));
CREATE POLICY ledger_owner_admin_read ON public.loyalty_transactions FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()) OR (SELECT app_security.current_profile_admin()));

CREATE OR REPLACE FUNCTION public.guard_profile_privileges() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE trusted boolean;
BEGIN
 -- Even auth signup definers cannot create an administrator from user metadata.
 -- Provision new staff by a subsequent trusted UPDATE after the initial profile INSERT.
 IF TG_OP='INSERT' THEN NEW.is_admin:=false; NEW.user_type:='retail'; RETURN NEW; END IF;
 trusted := (current_user='service_role' AND (current_setting('role',true)='service_role' OR (session_user='service_role' AND COALESCE(current_setting('role',true),'none')='none'))) OR (current_user IN('postgres','supabase_admin') AND session_user IN('postgres','supabase_admin') AND COALESCE(current_setting('role',true),'none') IN('none','postgres','supabase_admin'));
 IF NOT trusted AND ROW(NEW.id,NEW.is_admin,NEW.user_type,NEW.deleted_at,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.is_admin,OLD.user_type,OLD.deleted_at,OLD.created_at) THEN RAISE EXCEPTION 'Profile privileges require a trusted server operation'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS zzz_guard_profile_privileges ON public.profiles;
CREATE TRIGGER zzz_guard_profile_privileges BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileges();
REVOKE ALL ON FUNCTION public.guard_profile_privileges() FROM PUBLIC,anon,authenticated;

-- Serialize snapshots for every existing ledger writer, including checkout/release.
CREATE OR REPLACE FUNCTION public.set_transaction_balance() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE current_balance integer;
BEGIN
 SELECT balance INTO current_balance FROM public.loyalty_points WHERE user_id=NEW.user_id FOR UPDATE;
 NEW.balance_before:=COALESCE(current_balance,0);
 IF NEW.type IN('earn','bonus') THEN NEW.balance_after:=NEW.balance_before+NEW.amount;
 ELSIF NEW.type IN('spend','expired') THEN NEW.balance_after:=greatest(NEW.balance_before-NEW.amount,0); END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.update_points_balance() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE before_balance integer; after_balance integer;
BEGIN
 -- Available-to-available note edits must never replay balance/lifetime mutations.
 IF TG_OP='UPDATE' AND (OLD.status='available' OR NEW.status<>'available') THEN RETURN NEW; END IF;
 IF NEW.status='available' OR (TG_OP='INSERT' AND NEW.type IN('spend','expired')) THEN
  SELECT balance INTO before_balance FROM public.loyalty_points WHERE user_id=NEW.user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN NEW; END IF;
  after_balance:=CASE WHEN NEW.type IN('earn','bonus') THEN before_balance+NEW.amount ELSE greatest(before_balance-NEW.amount,0) END;
  UPDATE public.loyalty_points SET balance=after_balance,
   lifetime_earned=lifetime_earned+CASE WHEN NEW.type IN('earn','bonus') THEN NEW.amount ELSE 0 END,updated_at=now() WHERE user_id=NEW.user_id;
  -- AFTER triggers queue for multi-row INSERTs. Rebase each final ledger row
  -- from the locked wallet instead of replaying its provisional BEFORE snapshot.
  UPDATE public.loyalty_transactions SET balance_before=before_balance,balance_after=after_balance WHERE id=NEW.id;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.set_transaction_balance(),public.update_points_balance() FROM PUBLIC,anon,authenticated;

ALTER TABLE public.loyalty_transactions ADD COLUMN IF NOT EXISTS admin_actor_id uuid;
CREATE TABLE IF NOT EXISTS public.loyalty_admin_credits(
 id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES public.profiles(id),actor_id uuid NOT NULL,
 transaction_id uuid REFERENCES public.loyalty_transactions(id) ON DELETE SET NULL,
 amount integer NOT NULL CHECK(amount BETWEEN 1 AND 100000),note text NOT NULL,
 balance_before integer NOT NULL,balance_after integer NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.loyalty_admin_credits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.loyalty_admin_credits FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.loyalty_admin_credits TO service_role;
CREATE INDEX IF NOT EXISTS loyalty_user_created_id_idx ON public.loyalty_transactions(user_id,created_at DESC,id DESC);

CREATE OR REPLACE FUNCTION public.credit_reward_user(p_request uuid,p_user uuid,p_actor uuid,p_amount integer,p_note text,p_expected integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE previous public.loyalty_admin_credits%ROWTYPE; wallet public.loyalty_points%ROWTYPE; tx uuid; result public.loyalty_admin_credits%ROWTYPE;
BEGIN
 IF p_request IS NULL OR p_user IS NULL OR p_actor IS NULL OR p_amount IS NULL OR p_amount NOT BETWEEN 1 AND 100000 OR p_note IS NULL OR length(trim(p_note)) NOT BETWEEN 3 AND 500 OR p_expected IS NULL OR p_expected<0 THEN RAISE EXCEPTION 'Invalid credit request'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_actor AND deleted_at IS NULL AND (is_admin=true OR user_type='admin')) THEN RAISE EXCEPTION 'Administrative access required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('reward-credit:'||p_request::text,0));
 SELECT * INTO previous FROM public.loyalty_admin_credits WHERE id=p_request;
 IF FOUND THEN
  IF ROW(previous.user_id,previous.actor_id,previous.amount,previous.note,previous.balance_before) IS DISTINCT FROM ROW(p_user,p_actor,p_amount,trim(p_note),p_expected) THEN RAISE EXCEPTION 'Credit reference was already used for different details'; END IF;
  RETURN to_jsonb(previous)-'note'-'actor_id'-'transaction_id';
 END IF;
 PERFORM 1 FROM public.profiles WHERE id=p_user AND deleted_at IS NULL FOR NO KEY UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Customer no longer exists or is deleted'; END IF;
 INSERT INTO public.loyalty_points(user_id,balance,lifetime_earned,tier) VALUES(p_user,0,0,'bronze') ON CONFLICT(user_id) DO NOTHING;
 SELECT * INTO STRICT wallet FROM public.loyalty_points WHERE user_id=p_user FOR UPDATE;
 IF wallet.balance<>p_expected THEN RAISE EXCEPTION 'Balance changed. Reload and review the credit again.'; END IF;
 IF wallet.balance::bigint+p_amount>2147483647 OR wallet.lifetime_earned::bigint+p_amount>2147483647 THEN RAISE EXCEPTION 'Credit exceeds the supported balance range'; END IF;
 INSERT INTO public.loyalty_transactions(user_id,type,amount,reference_type,reference_id,status,note,admin_actor_id)
 VALUES(p_user,'bonus',p_amount,'admin',p_request,'available',trim(p_note),p_actor) RETURNING id INTO tx;
 IF NOT EXISTS(SELECT 1 FROM public.loyalty_points WHERE user_id=p_user AND balance=wallet.balance+p_amount AND lifetime_earned=wallet.lifetime_earned+p_amount) THEN RAISE EXCEPTION 'Credit accounting could not be verified'; END IF;
 INSERT INTO public.loyalty_admin_credits(id,user_id,actor_id,transaction_id,amount,note,balance_before,balance_after)
 VALUES(p_request,p_user,p_actor,tx,p_amount,trim(p_note),wallet.balance,wallet.balance+p_amount) RETURNING * INTO result;
 RETURN to_jsonb(result)-'note'-'actor_id'-'transaction_id';
END $$;

-- Preserve account-erasure behavior for the new reason/audit records and concurrent credits.
CREATE OR REPLACE FUNCTION public.erase_reward_audit_on_deletion() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$ BEGIN
 IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
  DELETE FROM public.loyalty_admin_credits WHERE user_id=NEW.id;
  DELETE FROM public.loyalty_transactions WHERE user_id=NEW.id;
  DELETE FROM public.loyalty_points WHERE user_id=NEW.id;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS erase_reward_audit_on_deletion ON public.profiles;
CREATE TRIGGER erase_reward_audit_on_deletion AFTER UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.erase_reward_audit_on_deletion();
REVOKE ALL ON FUNCTION public.erase_reward_audit_on_deletion() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.backfill_reward_orders(p_actor uuid,p_limit integer DEFAULT 100) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE o record; amount integer; added integer:=0; left_count integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_actor AND deleted_at IS NULL AND (is_admin=true OR user_type='admin')) THEN RAISE EXCEPTION 'Administrative access required'; END IF;
 FOR o IN SELECT ord.id,ord.user_id,ord.total FROM public.orders ord JOIN public.profiles p ON p.id=ord.user_id AND p.deleted_at IS NULL
  WHERE ord.status IN('delivered','picked_up') AND ord.total>=100 AND NOT EXISTS(SELECT 1 FROM public.loyalty_transactions t WHERE t.reference_type='order' AND t.reference_id=ord.id AND t.type='earn')
  ORDER BY ord.id LIMIT greatest(1,least(COALESCE(p_limit,100),100)) FOR UPDATE OF ord LOOP
  PERFORM 1 FROM public.profiles WHERE id=o.user_id AND deleted_at IS NULL FOR NO KEY UPDATE;
  IF NOT FOUND OR EXISTS(SELECT 1 FROM public.loyalty_transactions WHERE reference_type='order' AND reference_id=o.id AND type='earn') THEN CONTINUE; END IF;
  amount:=floor(o.total/100)::integer;
  INSERT INTO public.loyalty_points(user_id,balance,lifetime_earned,tier) VALUES(o.user_id,0,0,'bronze') ON CONFLICT(user_id) DO NOTHING;
  PERFORM 1 FROM public.loyalty_points WHERE user_id=o.user_id FOR UPDATE;
  INSERT INTO public.loyalty_transactions(user_id,type,amount,reference_type,reference_id,status,order_delivered_at,note,admin_actor_id)
  VALUES(o.user_id,'earn',amount,'order',o.id,'available',now(),'Backfilled fulfilled order rewards',p_actor);
  added:=added+1;
 END LOOP;
 SELECT count(*) INTO left_count FROM public.orders ord JOIN public.profiles p ON p.id=ord.user_id AND p.deleted_at IS NULL WHERE ord.status IN('delivered','picked_up') AND ord.total>=100 AND NOT EXISTS(SELECT 1 FROM public.loyalty_transactions t WHERE t.reference_type='order' AND t.reference_id=ord.id AND t.type='earn');
 RETURN jsonb_build_object('backfilled',added,'remaining',left_count);
END $$;

-- Auth email lookup stays in a private, service-only report helper.
CREATE OR REPLACE FUNCTION private.reward_user_facts() RETURNS TABLE(user_id uuid,full_name text,phone text,email text,balance integer,lifetime_earned integer,lifetime_spent bigint,pending bigint,tier text,last_activity timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p.id,COALESCE(NULLIF(p.full_name,''),'Customer'),p.phone,u.email,COALESCE(lp.balance,0),COALESCE(lp.lifetime_earned,0),COALESCE(t.spent,0),COALESCE(t.pending,0),COALESCE(lp.tier,'bronze'),COALESCE(t.last_activity,p.created_at)
 FROM public.profiles p LEFT JOIN auth.users u ON u.id=p.id LEFT JOIN public.loyalty_points lp ON lp.user_id=p.id
 LEFT JOIN LATERAL(SELECT sum(amount) FILTER(WHERE type='spend' AND status='available') spent,sum(amount) FILTER(WHERE type IN('earn','bonus') AND status='pending') pending,max(created_at) last_activity FROM public.loyalty_transactions WHERE user_id=p.id) t ON true
 WHERE p.deleted_at IS NULL;
$$;
CREATE OR REPLACE FUNCTION public.admin_reward_users(p_search text DEFAULT '',p_tier text DEFAULT 'all',p_spent text DEFAULT 'all',p_hide_zero boolean DEFAULT false,p_sort text DEFAULT 'balance',p_page integer DEFAULT 1,p_size integer DEFAULT 25) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 WITH matching AS MATERIALIZED(SELECT * FROM private.reward_user_facts() WHERE (p_search='' OR strpos(lower(full_name),lower(trim(p_search)))>0 OR strpos(lower(COALESCE(email,'')),lower(trim(p_search)))>0 OR strpos(COALESCE(phone,''),trim(p_search))>0 OR strpos(user_id::text,trim(p_search))>0)
 AND (p_tier='all' OR tier=p_tier) AND (p_spent='all' OR (p_spent='spent' AND lifetime_spent>0) OR (p_spent='no-spent' AND lifetime_spent=0)) AND (NOT p_hide_zero OR balance>0)),
 stats AS(SELECT count(*) total,COALESCE(sum(balance),0) balance,COALESCE(sum(lifetime_earned),0) earned,COALESCE(sum(lifetime_spent),0) spent,COALESCE(sum(pending),0) pending,count(*) FILTER(WHERE balance>0) active FROM matching),
 sizing AS(SELECT *,greatest(1,least(COALESCE(p_size,25),5001)) size FROM stats),
 paging AS(SELECT *,greatest(1,ceil(total::numeric/size)::integer) pages FROM sizing),
 bounds AS(SELECT *,greatest(1,least(COALESCE(p_page,1),pages)) page FROM paging),
 selected AS(SELECT * FROM matching ORDER BY CASE WHEN p_sort='name' THEN full_name END ASC,CASE p_sort WHEN 'balance' THEN balance WHEN 'earned' THEN lifetime_earned WHEN 'spent' THEN lifetime_spent WHEN 'pending' THEN pending END DESC NULLS LAST,CASE WHEN p_sort='activity' THEN last_activity END DESC NULLS LAST,user_id LIMIT(SELECT size FROM bounds) OFFSET(SELECT (page-1)*size FROM bounds))
 SELECT jsonb_build_object('users',COALESCE((SELECT jsonb_agg(to_jsonb(s)) FROM selected s),'[]'::jsonb),'total',total,'page',page,'totalPages',pages,'summary',jsonb_build_object('balance',balance,'earned',earned,'spent',spent,'pending',pending,'active',active)) FROM bounds;
$$;
CREATE OR REPLACE FUNCTION public.admin_reward_user(p_user uuid,p_type text DEFAULT 'all',p_status text DEFAULT 'all',p_from date DEFAULT NULL,p_to date DEFAULT NULL,p_page integer DEFAULT 1,p_size integer DEFAULT 25) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 WITH customer AS(SELECT * FROM private.reward_user_facts() WHERE user_id=p_user),
 matching AS MATERIALIZED(SELECT t.*,p.full_name actor_name FROM public.loyalty_transactions t LEFT JOIN public.profiles p ON p.id=t.admin_actor_id WHERE t.user_id=p_user AND (p_type='all' OR t.type=p_type) AND (p_status='all' OR t.status=p_status) AND (p_from IS NULL OR t.created_at>=p_from::timestamp AT TIME ZONE 'Asia/Kolkata') AND (p_to IS NULL OR t.created_at<(p_to+1)::timestamp AT TIME ZONE 'Asia/Kolkata')),
 sizing AS(SELECT count(*) total,greatest(1,least(COALESCE(p_size,25),5001)) size FROM matching),
 paging AS(SELECT *,greatest(1,ceil(total::numeric/size)::integer) pages FROM sizing),
 bounds AS(SELECT *,greatest(1,least(COALESCE(p_page,1),pages)) page FROM paging),
 selected AS(SELECT * FROM matching ORDER BY created_at DESC,id DESC LIMIT(SELECT size FROM bounds) OFFSET(SELECT (page-1)*size FROM bounds))
 SELECT jsonb_build_object('user',to_jsonb(c),'transactions',COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.created_at DESC,s.id DESC) FROM selected s),'[]'::jsonb),'total',b.total,'page',b.page,'totalPages',b.pages,
 'summary',(SELECT jsonb_build_object('recordedEarned',COALESCE(sum(amount) FILTER(WHERE type IN('earn','bonus') AND status='available'),0),'spent',COALESCE(sum(amount) FILTER(WHERE type='spend' AND status='available'),0),'pending',COALESCE(sum(amount) FILTER(WHERE type IN('earn','bonus') AND status='pending'),0),'expired',COALESCE(sum(amount) FILTER(WHERE type='expired' AND status='available'),0)) FROM public.loyalty_transactions WHERE user_id=p_user)) FROM customer c CROSS JOIN bounds b;
$$;
REVOKE ALL ON FUNCTION private.reward_user_facts() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.reward_user_facts() TO service_role;
REVOKE ALL ON FUNCTION public.credit_reward_user(uuid,uuid,uuid,integer,text,integer),public.backfill_reward_orders(uuid,integer),public.admin_reward_users(text,text,text,boolean,text,integer,integer),public.admin_reward_user(uuid,text,text,date,date,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.credit_reward_user(uuid,uuid,uuid,integer,text,integer),public.backfill_reward_orders(uuid,integer),public.admin_reward_users(text,text,text,boolean,text,integer,integer),public.admin_reward_user(uuid,text,text,date,date,integer,integer) TO service_role;
COMMIT;
