BEGIN;
SET LOCAL ROLE service_role;
DO $$ DECLARE actor uuid:='99999999-0000-4000-8000-000000000001'; customer uuid:='99999999-0000-4000-8000-000000000002'; request uuid:=gen_random_uuid(); tx uuid; r jsonb; BEGIN
 INSERT INTO public.profiles(id,full_name) VALUES(customer,'Anita');
 INSERT INTO public.loyalty_points(user_id,balance,lifetime_earned) VALUES(customer,100,100);
 r:=public.credit_reward_user(request,customer,actor,50,'Fixture compensation',100);
 ASSERT (r->>'balance_after')::integer=150;
 ASSERT (SELECT lifetime_earned FROM public.loyalty_points WHERE user_id=customer)=150;
 ASSERT (SELECT count(*) FROM public.loyalty_transactions WHERE user_id=customer)=1;
 PERFORM public.credit_reward_user(request,customer,actor,50,'Fixture compensation',100);
 ASSERT (SELECT balance FROM public.loyalty_points WHERE user_id=customer)=150;
 ASSERT (SELECT count(*) FROM public.loyalty_admin_credits WHERE user_id=customer)=1;
 SELECT transaction_id INTO tx FROM public.loyalty_admin_credits WHERE id=request;
 ASSERT (SELECT admin_actor_id FROM public.loyalty_transactions WHERE id=tx)=actor;
 UPDATE public.loyalty_transactions SET note='Updated note' WHERE id=tx;
 ASSERT (SELECT lifetime_earned FROM public.loyalty_points WHERE user_id=customer)=150;
 BEGIN PERFORM public.credit_reward_user(request,customer,actor,10,'Different payload',100); RAISE EXCEPTION 'Expected request conflict'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='Expected request conflict' THEN RAISE; END IF; END;
 BEGIN PERFORM public.credit_reward_user(gen_random_uuid(),customer,actor,10,'Stale balance',100); RAISE EXCEPTION 'Expected stale balance rejection'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='Expected stale balance rejection' THEN RAISE; END IF; END;
 BEGIN PERFORM public.credit_reward_user(gen_random_uuid(),customer,actor,100001,'Too large',150); RAISE EXCEPTION 'Expected limit rejection'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='Expected limit rejection' THEN RAISE; END IF; END;
 BEGIN PERFORM public.credit_reward_user(gen_random_uuid(),customer,actor,10,' ',150); RAISE EXCEPTION 'Expected missing reason rejection'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='Expected missing reason rejection' THEN RAISE; END IF; END;
 -- Pending release rebases a snapshot under a lock without replaying lifetime credit.
 INSERT INTO public.orders(id,user_id,status,total) VALUES('99999999-0000-4000-8000-000000000003',customer,'picked_up',1000);
 INSERT INTO public.loyalty_transactions(user_id,type,amount,reference_type,reference_id,status) VALUES(customer,'earn',10,'order','99999999-0000-4000-8000-000000000003','pending');
 ASSERT (SELECT balance FROM public.loyalty_points WHERE user_id=customer)=150;
 PERFORM public.release_fulfilled_order_points('99999999-0000-4000-8000-000000000003');
 PERFORM public.release_fulfilled_order_points('99999999-0000-4000-8000-000000000003');
 ASSERT (SELECT balance FROM public.loyalty_points WHERE user_id=customer)=160;
 ASSERT (SELECT lifetime_earned FROM public.loyalty_points WHERE user_id=customer)=160;
 -- Backfill must credit exactly once, including pickup, and never replay an existing earn.
 INSERT INTO public.orders(user_id,status,total) VALUES(customer,'delivered',1000),(customer,'picked_up',500),(customer,'confirmed',1000);
 r:=public.backfill_reward_orders(actor,100);
 ASSERT (r->>'backfilled')::integer=2;
 ASSERT (public.backfill_reward_orders(actor,100)->>'backfilled')::integer=0;
 ASSERT (SELECT balance FROM public.loyalty_points WHERE user_id=customer)=175;
 ASSERT (SELECT lifetime_earned FROM public.loyalty_points WHERE user_id=customer)=175;
 -- Erasure removes reasons, idempotency records and all reward rows.
 UPDATE public.profiles SET deleted_at=now() WHERE id=customer;
 ASSERT NOT EXISTS(SELECT 1 FROM public.loyalty_admin_credits WHERE user_id=customer);
 ASSERT NOT EXISTS(SELECT 1 FROM public.loyalty_points WHERE user_id=customer);
 ASSERT NOT EXISTS(SELECT 1 FROM public.loyalty_transactions WHERE user_id=customer);
 ASSERT public.admin_reward_user(customer) IS NULL;
 BEGIN PERFORM public.credit_reward_user(gen_random_uuid(),customer,actor,5,'Deleted user',0); RAISE EXCEPTION 'Expected deleted rejection'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='Expected deleted rejection' THEN RAISE; END IF; END;
END $$;
ROLLBACK;

-- Late audit failure must roll back the credited balance and ledger.
BEGIN;
CREATE FUNCTION public.reject_reward_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected audit failure'; END $$;
CREATE TRIGGER reject_reward_audit BEFORE INSERT ON public.loyalty_admin_credits FOR EACH ROW EXECUTE FUNCTION public.reject_reward_audit();
DO $$ DECLARE u uuid:=gen_random_uuid(); BEGIN
 INSERT INTO profiles(id) VALUES(u);
 BEGIN PERFORM credit_reward_user(gen_random_uuid(),u,'99999999-0000-4000-8000-000000000001',50,'Audit test',0); RAISE EXCEPTION 'Expected audit failure'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Injected audit failure' THEN RAISE; END IF; END;
 ASSERT NOT EXISTS(SELECT 1 FROM loyalty_transactions WHERE user_id=u);
 ASSERT NOT EXISTS(SELECT 1 FROM loyalty_points WHERE user_id=u);
END $$;
ROLLBACK;

-- Realistic row counts exceed both former caps: 1,000 users and 200 history rows.
BEGIN;
INSERT INTO profiles(id,full_name,phone) SELECT md5('reward-profile-'||n)::uuid,'Scale customer '||n,'900'||n FROM generate_series(1,1205) n;
INSERT INTO auth.users(id,email) SELECT id,'customer-'||right(full_name,4)||'@example.test' FROM profiles WHERE full_name LIKE 'Scale customer%';
UPDATE auth.users SET email='exact-search@example.test' WHERE id=md5('reward-profile-1205')::uuid;
INSERT INTO loyalty_points(user_id,balance,lifetime_earned) SELECT id,0,0 FROM profiles WHERE full_name LIKE 'Scale customer%';
INSERT INTO loyalty_transactions(user_id,type,amount,status,created_at) SELECT md5('reward-profile-1205')::uuid,'bonus',1,'available','2026-11-13T00:00:00Z'::timestamptz+n*interval '1 second' FROM generate_series(1,250) n;
INSERT INTO loyalty_transactions(user_id,type,amount,status,created_at) VALUES(md5('reward-profile-1205')::uuid,'spend',10,'available','2026-11-13T05:00:00Z'),(md5('reward-profile-1205')::uuid,'earn',5,'pending','2026-11-13T06:00:00Z');
DO $$ DECLARE r jsonb; u uuid:=md5('reward-profile-1205')::uuid; BEGIN
 r:=admin_reward_users('Scale customer'); ASSERT (r->>'total')::integer=1205 AND jsonb_array_length(r->'users')=25;
 r:=admin_reward_users('exact-search@example.test'); ASSERT (r->>'total')::integer=1;
 ASSERT (r->'summary'->>'balance')::integer=240;
 ASSERT (admin_reward_users('Scale customer 1','all','all',true)->>'total')::integer=1;
 ASSERT (admin_reward_users('Scale customer 1','all','spent',true)->>'total')::integer=1;
 ASSERT (admin_reward_users('Scale customer 1','all','no-spent',true)->>'total')::integer=0;
 ASSERT jsonb_array_length(admin_reward_users('Scale customer','all','all',false,'balance',1,5001)->'users')=1205;
 r:=admin_reward_user(u); ASSERT (r->>'total')::integer=252 AND jsonb_array_length(r->'transactions')=25;
 ASSERT (r->'summary'->>'recordedEarned')::integer=250 AND (r->'summary'->>'spent')::integer=10 AND (r->'summary'->>'pending')::integer=5;
 ASSERT jsonb_array_length(admin_reward_user(u,'all','all',NULL,NULL,1,5001)->'transactions')=252;
 ASSERT (admin_reward_user(u,'spend','available','2026-11-13','2026-11-13')->>'total')::integer=1;
 ASSERT (admin_reward_user(u,'earn','pending','2026-11-14','2026-11-14')->>'total')::integer=0;
END $$;
ROLLBACK;

-- RLS, column grants, ordinary profile edits and upsert remain compatible.
BEGIN;
SET LOCAL ROLE service_role;
INSERT INTO profiles(id,full_name) VALUES('99999999-0000-4000-8000-000000000010','Owner'),('99999999-0000-4000-8000-000000000011','Other');
INSERT INTO orders(id,user_id,status,total) VALUES('99999999-0000-4000-8000-000000000012','99999999-0000-4000-8000-000000000010','delivered',100);
RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='99999999-0000-4000-8000-000000000010';
INSERT INTO profiles(id,full_name,phone) VALUES('99999999-0000-4000-8000-000000000010','Renamed','9000000000') ON CONFLICT(id) DO UPDATE SET id=excluded.id,full_name=excluded.full_name,phone=excluded.phone;
DO $$ BEGIN
 ASSERT (SELECT count(*) FROM profiles)=1;
 ASSERT (SELECT full_name FROM profiles)='Renamed';
 ASSERT (SELECT count(*) FROM orders)=1;
 BEGIN UPDATE profiles SET is_admin=true; RAISE EXCEPTION 'Expected admin column denial'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE profiles SET user_type='admin'; RAISE EXCEPTION 'Expected role column denial'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN SELECT public.admin_reward_users(); RAISE EXCEPTION 'Expected report denial'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SET LOCAL request.jwt.claim.sub='99999999-0000-4000-8000-000000000001';
DO $$ BEGIN ASSERT (SELECT count(*) FROM profiles)>=3; ASSERT app_security.current_profile_admin(); END $$;
INSERT INTO profiles(id,full_name,phone) VALUES('99999999-0000-4000-8000-000000000001','Renamed Admin','9000000001') ON CONFLICT(id) DO UPDATE SET id=excluded.id,full_name=excluded.full_name,phone=excluded.phone;
DO $$ BEGIN ASSERT (SELECT is_admin FROM profiles WHERE id=auth.uid()); END $$;
RESET ROLE;
-- Guard even when a historical column grant is accidentally restored.
GRANT UPDATE(is_admin,user_type) ON profiles TO authenticated;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='99999999-0000-4000-8000-000000000010';
DO $$ BEGIN BEGIN UPDATE profiles SET is_admin=true WHERE id=auth.uid(); RAISE EXCEPTION 'Expected role guard'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='Expected role guard' THEN RAISE; END IF; END; END $$;
RESET ROLE;
-- Signup/definer insertion never trusts privileged fields from user metadata.
INSERT INTO profiles(id,is_admin,user_type) VALUES('99999999-0000-4000-8000-000000000099',true,'admin');
DO $$ BEGIN ASSERT NOT (SELECT is_admin FROM profiles WHERE id='99999999-0000-4000-8000-000000000099'); END $$;
-- An exposed historical definer owned by service_role cannot bypass the guard
-- when its caller is an ordinary authenticated customer.
GRANT CREATE ON SCHEMA public TO service_role;
CREATE FUNCTION public.fixture_role_wrapper() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ UPDATE public.profiles SET is_admin=true WHERE id=auth.uid() $$;
ALTER FUNCTION public.fixture_role_wrapper() OWNER TO service_role;
GRANT EXECUTE ON FUNCTION public.fixture_role_wrapper() TO authenticated;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='99999999-0000-4000-8000-000000000010';
DO $$ BEGIN BEGIN PERFORM public.fixture_role_wrapper(); RAISE EXCEPTION 'Expected definer role guard'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='Expected definer role guard' THEN RAISE; END IF; END; END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
UPDATE profiles SET is_admin=true,user_type='admin' WHERE id='99999999-0000-4000-8000-000000000099';
DO $$ BEGIN ASSERT (SELECT is_admin FROM profiles WHERE id='99999999-0000-4000-8000-000000000099'); END $$;
RESET ROLE;

ROLLBACK;

-- Preserve public catalog reads whose old admin policies query profiles.
BEGIN;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_public_products ON products FOR SELECT USING(true);
CREATE POLICY fixture_admin_products ON products FOR ALL USING(EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND is_admin=true));
INSERT INTO products(id,name) VALUES('99999999-0000-4000-8000-000000000055','Public product');
SET LOCAL ROLE anon;
DO $$ BEGIN
 ASSERT (SELECT count(*) FROM products WHERE id='99999999-0000-4000-8000-000000000055')=1;
 ASSERT (SELECT count(id) FROM profiles)=0;
 BEGIN PERFORM full_name,phone FROM profiles; RAISE EXCEPTION 'Expected public PII denial'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM shipping_address FROM orders; RAISE EXCEPTION 'Expected public order denial'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
