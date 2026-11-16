-- Deploy in a procurement maintenance window BEFORE the matching web build.
-- Existing received orders are baselined once; stock/ledger are never replayed.
BEGIN;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS expected_on date;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS create_request jsonb;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS last_save_request jsonb;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS last_save_version integer;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS legacy_receipt boolean NOT NULL DEFAULT false;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='purchase_order_items' AND column_name='received_quantity') THEN
        ALTER TABLE public.purchase_order_items ADD COLUMN received_quantity integer NOT NULL DEFAULT 0 CHECK (received_quantity >= 0);
        UPDATE public.purchase_order_items i SET received_quantity=i.quantity FROM public.purchase_orders p WHERE i.purchase_order_id=p.id AND p.status='received';
        UPDATE public.purchase_orders SET legacy_receipt=true WHERE status='received';
    END IF;
END $$;
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS damaged_quantity integer NOT NULL DEFAULT 0 CHECK (damaged_quantity >= 0);
-- Snapshot newly saved lines so later catalog renames do not rewrite a PO.
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS product_name text;
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS variant_title text;
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS variant_sku text;
UPDATE public.purchase_order_items i SET product_name=p.name, variant_title=v.title, variant_sku=v.sku
FROM public.products p, public.product_variants v WHERE i.product_id=p.id AND i.variant_id=v.id AND i.product_name IS NULL;

CREATE TABLE IF NOT EXISTS public.purchase_receipts (
    id uuid PRIMARY KEY, purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id),
    actor_id uuid NOT NULL, received_on date NOT NULL, notes text NOT NULL DEFAULT '',
    lines jsonb NOT NULL, request jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.purchase_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id),
    actor_id uuid NOT NULL, action text NOT NULL, snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS purchase_receipts_order_idx ON public.purchase_receipts(purchase_order_id,created_at);
CREATE INDEX IF NOT EXISTS purchase_events_order_idx ON public.purchase_events(purchase_order_id,created_at);
CREATE INDEX IF NOT EXISTS purchase_orders_created_id_idx ON public.purchase_orders(created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS purchase_items_variant_idx ON public.purchase_order_items(variant_id);
CREATE INDEX IF NOT EXISTS purchase_items_order_idx ON public.purchase_order_items(purchase_order_id);

-- Remove accumulated permissive policies; writes go through checked server actions.
-- POS still writes its stock ledger with the admin cookie client.
DO $$ DECLARE t text; pol record; BEGIN
    FOREACH t IN ARRAY ARRAY['suppliers','purchase_orders','purchase_order_items','stock_ledger','purchase_receipts','purchase_events'] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
            EXECUTE format('DROP POLICY %I ON public.%I',pol.policyname,t);
        END LOOP;
        EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated',t);
        EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
        EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
        EXECUTE format('CREATE POLICY purchase_admin_read ON public.%I FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND (is_admin=true OR user_type=''admin'')))',t);
    END LOOP;
END $$;
GRANT INSERT ON public.stock_ledger TO authenticated;
CREATE POLICY purchase_admin_ledger_insert ON public.stock_ledger FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND (is_admin=true OR user_type='admin')));

CREATE OR REPLACE FUNCTION public.admin_purchase_detail(p_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
SELECT to_jsonb(p) - ARRAY['create_request','last_save_request','last_save_version'] || jsonb_build_object(
    'status',CASE WHEN p.status='ordered' AND EXISTS(SELECT 1 FROM public.purchase_order_items i WHERE i.purchase_order_id=p.id AND i.received_quantity+i.damaged_quantity>0) THEN 'partial' ELSE p.status END,
    'supplier',to_jsonb(s),
    'units',COALESCE((SELECT sum(quantity) FROM public.purchase_order_items WHERE purchase_order_id=p.id),0),
    'received_units',COALESCE((SELECT sum(received_quantity) FROM public.purchase_order_items WHERE purchase_order_id=p.id),0),
    'damaged_units',COALESCE((SELECT sum(damaged_quantity) FROM public.purchase_order_items WHERE purchase_order_id=p.id),0),
    'items',COALESCE((SELECT jsonb_agg(to_jsonb(i) || jsonb_build_object('name',COALESCE(i.product_name,pr.name,'Deleted product'),'title',CASE WHEN i.product_name IS NOT NULL THEN i.variant_title ELSE v.title END,'sku',CASE WHEN i.product_name IS NOT NULL THEN i.variant_sku ELSE v.sku END) ORDER BY i.id)
        FROM public.purchase_order_items i LEFT JOIN public.products pr ON pr.id=i.product_id LEFT JOIN public.product_variants v ON v.id=i.variant_id WHERE i.purchase_order_id=p.id),'[]'::jsonb),
    'receipts',COALESCE((SELECT jsonb_agg(to_jsonb(r)-'request' ORDER BY r.created_at DESC,r.id) FROM public.purchase_receipts r WHERE r.purchase_order_id=p.id),'[]'::jsonb),
    'events',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',e.id,'action',e.action,'created_at',e.created_at) ORDER BY e.created_at DESC,e.id) FROM public.purchase_events e WHERE e.purchase_order_id=p.id),'[]'::jsonb)
) FROM public.purchase_orders p LEFT JOIN public.suppliers s ON s.id=p.supplier_id WHERE p.id=p_id;
$$;

CREATE OR REPLACE FUNCTION public.admin_purchase_catalog(p_search text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
SELECT COALESCE(jsonb_agg(to_jsonb(matches)),'[]'::jsonb) FROM (
    SELECT v.id variant_id,p.id product_id,p.name,p.brand,p.status,v.title,v.sku,COALESCE(v.stock,0) stock,COALESCE(v.price,0) selling_price,
        (SELECT i.unit_cost FROM public.purchase_order_items i JOIN public.purchase_orders po ON po.id=i.purchase_order_id
         WHERE i.variant_id=v.id AND i.received_quantity>0 AND i.unit_cost>=0
         ORDER BY COALESCE((SELECT max(r.created_at) FROM public.purchase_receipts r WHERE r.purchase_order_id=po.id AND EXISTS(SELECT 1 FROM jsonb_array_elements(r.lines) x WHERE x->>'item_id'=i.id::text AND (x->>'accepted')::integer>0)),po.received_at,po.created_at) DESC,po.id DESC LIMIT 1) last_cost
    FROM public.product_variants v JOIN public.products p ON p.id=v.product_id
    WHERE length(trim(p_search))>=2 AND (strpos(lower(p.name),lower(trim(p_search)))>0 OR strpos(lower(COALESCE(p.brand,'')),lower(trim(p_search)))>0 OR strpos(lower(COALESCE(v.title,'')),lower(trim(p_search)))>0 OR strpos(lower(COALESCE(v.sku,'')),lower(trim(p_search)))>0)
    ORDER BY (lower(COALESCE(v.sku,''))=lower(trim(p_search))) DESC,p.name,v.title,v.id LIMIT 30
) matches;
$$;

CREATE OR REPLACE FUNCTION public.admin_purchase_list(p_search text DEFAULT '',p_status text DEFAULT '',p_from date DEFAULT NULL,p_to date DEFAULT NULL,p_page integer DEFAULT 1,p_size integer DEFAULT 25) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
WITH facts AS (
    SELECT p.id,p.reference_number,p.total_cost,p.created_at,p.expected_on,p.version,to_jsonb(s) supplier,
        COALESCE(i.units,0) units,COALESCE(i.accepted,0) received_units,COALESCE(i.damaged,0) damaged_units,
        CASE WHEN p.status='ordered' AND COALESCE(i.accepted+i.damaged,0)>0 THEN 'partial' ELSE p.status END status
    FROM public.purchase_orders p LEFT JOIN public.suppliers s ON s.id=p.supplier_id
    LEFT JOIN LATERAL (SELECT sum(quantity) units,sum(received_quantity) accepted,sum(damaged_quantity) damaged FROM public.purchase_order_items WHERE purchase_order_id=p.id) i ON true
    WHERE (p_from IS NULL OR p.created_at>=p_from::timestamp AT TIME ZONE 'Asia/Kolkata') AND (p_to IS NULL OR p.created_at<(p_to+1)::timestamp AT TIME ZONE 'Asia/Kolkata')
      AND (p_search='' OR strpos(lower(COALESCE(p.reference_number,'')),lower(trim(p_search)))>0 OR strpos(lower(COALESCE(s.name,'')),lower(trim(p_search)))>0)
), filtered AS (SELECT * FROM facts WHERE p_status='' OR status=p_status),
counts AS (SELECT count(*) total,COALESCE(sum(total_cost),0) value,count(*) FILTER(WHERE status IN('ordered','partial')) open,COALESCE(sum(received_units),0) received,COALESCE(sum(damaged_units),0) damaged FROM filtered),
paging AS (SELECT total,greatest(1,least(COALESCE(p_size,25),5001)) size FROM counts),
pages AS (SELECT *,greatest(1,ceil(total::numeric/size)::integer) pages FROM paging),
current_page AS (SELECT *,greatest(1,least(COALESCE(p_page,1),pages)) page FROM pages)
SELECT jsonb_build_object('total',c.total,'page',c.page,'totalPages',c.pages,
    'summary',(SELECT jsonb_build_object('value',value,'open',open,'received',received,'damaged',damaged) FROM counts),
    'orders',COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC,r.id DESC) FROM (SELECT * FROM filtered ORDER BY created_at DESC,id DESC LIMIT c.size OFFSET (c.page-1)*c.size) r),'[]'::jsonb)) FROM current_page c;
$$;

CREATE OR REPLACE FUNCTION public.admin_purchase_save(p_id uuid,p_version integer,p_payload jsonb,p_actor uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE po public.purchase_orders%ROWTYPE; line jsonb; v public.product_variants%ROWTYPE; pr public.products%ROWTYPE;
    qty numeric; cost numeric; total numeric:=0; seen uuid[]:='{}'; supplier uuid; ref text;
BEGIN
    IF p_actor IS NULL OR p_id IS NULL OR p_version IS NULL OR p_version<0 THEN RAISE EXCEPTION 'Invalid purchase request'; END IF;
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text,0));
    SELECT * INTO po FROM public.purchase_orders WHERE id=p_id FOR UPDATE;
    IF FOUND THEN
        IF p_version=0 AND po.create_request=p_payload THEN RETURN public.admin_purchase_detail(p_id); END IF;
        IF po.version=p_version+1 AND po.last_save_version=p_version AND po.last_save_request=p_payload THEN RETURN public.admin_purchase_detail(p_id); END IF;
        IF po.status<>'draft' OR po.version<>p_version THEN RAISE EXCEPTION 'Purchase changed. Reload before saving.'; END IF;
    ELSIF p_version<>0 THEN RAISE EXCEPTION 'Purchase no longer exists'; END IF;
    IF jsonb_typeof(p_payload->'items') IS DISTINCT FROM 'array' OR jsonb_array_length(p_payload->'items') NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Add between 1 and 500 items'; END IF;
    supplier:=(p_payload->>'supplier_id')::uuid;
    PERFORM 1 FROM public.suppliers WHERE id=supplier FOR KEY SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Supplier not found'; END IF;
    IF length(COALESCE(p_payload->>'reference_number',''))>100 OR length(COALESCE(p_payload->>'notes',''))>2000 THEN RAISE EXCEPTION 'Reference or notes too long'; END IF;
    FOR line IN SELECT * FROM jsonb_array_elements(p_payload->'items') LOOP
        qty:=(line->>'quantity')::numeric; cost:=(line->>'unit_cost')::numeric;
        IF qty IS NULL OR qty<>trunc(qty) OR qty NOT BETWEEN 1 AND 1000000 OR cost IS NULL OR cost NOT BETWEEN 0 AND 10000000 OR cost<>round(cost,2) THEN RAISE EXCEPTION 'Invalid quantity or unit cost'; END IF;
        IF (line->>'variant_id')::uuid=ANY(seen) THEN RAISE EXCEPTION 'Duplicate shade'; END IF;
        seen:=array_append(seen,(line->>'variant_id')::uuid);
        PERFORM 1 FROM public.product_variants WHERE id=(line->>'variant_id')::uuid FOR KEY SHARE;
        IF NOT FOUND THEN RAISE EXCEPTION 'A selected shade no longer exists'; END IF;
        total:=total+qty*cost;
    END LOOP;
    IF total>1000000000000 THEN RAISE EXCEPTION 'Purchase total too large'; END IF;
    ref:=COALESCE(NULLIF(trim(p_payload->>'reference_number'),''),po.reference_number,'PO-'||to_char(now() AT TIME ZONE 'Asia/Kolkata','YYYYMMDD')||'-'||p_id::text);
    IF po.id IS NULL THEN
        INSERT INTO public.purchase_orders(id,supplier_id,reference_number,status,total_cost,expected_on,notes,create_request)
        VALUES(p_id,supplier,ref,'draft',total,NULLIF(p_payload->>'expected_on','')::date,COALESCE(p_payload->>'notes',''),p_payload);
    ELSE
        UPDATE public.purchase_orders SET supplier_id=supplier,reference_number=ref,total_cost=total,expected_on=NULLIF(p_payload->>'expected_on','')::date,notes=COALESCE(p_payload->>'notes',''),last_save_request=p_payload,last_save_version=p_version,version=version+1 WHERE id=p_id;
        DELETE FROM public.purchase_order_items WHERE purchase_order_id=p_id;
    END IF;
    FOR line IN SELECT * FROM jsonb_array_elements(p_payload->'items') LOOP
        SELECT * INTO STRICT v FROM public.product_variants WHERE id=(line->>'variant_id')::uuid;
        SELECT * INTO STRICT pr FROM public.products WHERE id=v.product_id;
        INSERT INTO public.purchase_order_items(purchase_order_id,product_id,variant_id,quantity,unit_cost,product_name,variant_title,variant_sku)
        VALUES(p_id,pr.id,v.id,(line->>'quantity')::integer,(line->>'unit_cost')::numeric,pr.name,v.title,v.sku);
    END LOOP;
    INSERT INTO public.purchase_events(purchase_order_id,actor_id,action,snapshot) VALUES(p_id,p_actor,CASE WHEN po.id IS NULL THEN 'Draft created' ELSE 'Draft updated' END,public.admin_purchase_detail(p_id));
    RETURN public.admin_purchase_detail(p_id);
END $$;

CREATE OR REPLACE FUNCTION public.admin_purchase_transition(p_id uuid,p_version integer,p_status text,p_actor uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE po public.purchase_orders%ROWTYPE;
BEGIN
    SELECT * INTO STRICT po FROM public.purchase_orders WHERE id=p_id FOR UPDATE;
    IF p_actor IS NULL OR p_version IS NULL OR p_status IS NULL THEN RAISE EXCEPTION 'Invalid purchase status change'; END IF;
    IF po.version=p_version+1 AND po.status=p_status AND p_status IN('ordered','cancelled') THEN RETURN public.admin_purchase_detail(p_id); END IF;
    IF po.version<>p_version THEN RAISE EXCEPTION 'Purchase changed. Reload before continuing.'; END IF;
    IF (p_status='ordered' AND po.status<>'draft') OR (p_status='cancelled' AND po.status NOT IN('draft','ordered')) OR p_status NOT IN('ordered','cancelled') THEN RAISE EXCEPTION 'Invalid purchase status change'; END IF;
    IF p_status='ordered' AND (NOT EXISTS(SELECT 1 FROM public.purchase_order_items WHERE purchase_order_id=p_id) OR EXISTS(SELECT 1 FROM public.purchase_order_items WHERE purchase_order_id=p_id AND (quantity<=0 OR unit_cost<0 OR variant_id IS NULL))) THEN RAISE EXCEPTION 'Review and save valid draft items first'; END IF;
    IF EXISTS(SELECT 1 FROM public.purchase_receipts WHERE purchase_order_id=p_id) OR EXISTS(SELECT 1 FROM public.purchase_order_items WHERE purchase_order_id=p_id AND received_quantity+damaged_quantity>0) THEN RAISE EXCEPTION 'A received purchase cannot be cancelled or reordered'; END IF;
    UPDATE public.purchase_orders SET status=p_status,version=version+1 WHERE id=p_id;
    INSERT INTO public.purchase_events(purchase_order_id,actor_id,action,snapshot) VALUES(p_id,p_actor,CASE WHEN p_status='ordered' THEN 'Marked ordered' ELSE 'Cancelled' END,public.admin_purchase_detail(p_id));
    RETURN public.admin_purchase_detail(p_id);
END $$;

CREATE OR REPLACE FUNCTION public.admin_purchase_receive(p_id uuid,p_version integer,p_receipt uuid,p_payload jsonb,p_actor uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE po public.purchase_orders%ROWTYPE; prior public.purchase_receipts%ROWTYPE; i public.purchase_order_items%ROWTYPE;
    line jsonb; accepted numeric; damaged numeric; seen uuid[]:='{}'; units integer:=0; receipt_date date; changes jsonb:='[]';
BEGIN
    IF p_actor IS NULL OR p_receipt IS NULL OR p_version IS NULL THEN RAISE EXCEPTION 'Invalid receipt request'; END IF;
    SELECT * INTO STRICT po FROM public.purchase_orders WHERE id=p_id FOR UPDATE;
    SELECT * INTO prior FROM public.purchase_receipts WHERE id=p_receipt;
    IF FOUND THEN
        IF prior.purchase_order_id=p_id AND prior.request=p_payload THEN RETURN public.admin_purchase_detail(p_id); END IF;
        RAISE EXCEPTION 'Receipt reference already used';
    END IF;
    IF po.version<>p_version OR po.status<>'ordered' THEN RAISE EXCEPTION 'Purchase changed. Reload before receiving.'; END IF;
    receipt_date:=(p_payload->>'received_on')::date;
    IF receipt_date IS NULL OR receipt_date>(now() AT TIME ZONE 'Asia/Kolkata')::date OR receipt_date<(po.created_at AT TIME ZONE 'Asia/Kolkata')::date THEN RAISE EXCEPTION 'Receipt date must be between the order date and today'; END IF;
    IF length(COALESCE(p_payload->>'notes',''))>2000 OR jsonb_typeof(p_payload->'lines') IS DISTINCT FROM 'array' OR jsonb_array_length(p_payload->'lines') NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Invalid receipt lines or notes'; END IF;
    FOR line IN SELECT * FROM jsonb_array_elements(p_payload->'lines') LOOP
        SELECT * INTO i FROM public.purchase_order_items WHERE id=(line->>'item_id')::uuid AND purchase_order_id=p_id;
        IF NOT FOUND OR i.id=ANY(seen) THEN RAISE EXCEPTION 'Unknown or duplicate receipt item'; END IF;
        seen:=array_append(seen,i.id);
        accepted:=(line->>'accepted')::numeric; damaged:=(line->>'damaged')::numeric;
        IF accepted IS NULL OR damaged IS NULL OR accepted<>trunc(accepted) OR damaged<>trunc(damaged) OR accepted<0 OR damaged<0 OR accepted+damaged>i.quantity-i.received_quantity-i.damaged_quantity THEN RAISE EXCEPTION 'Receipt quantity exceeds remaining units or is invalid'; END IF;
        IF accepted+damaged>0 AND i.variant_id IS NULL THEN RAISE EXCEPTION 'A received shade no longer exists'; END IF;
        units:=units+(accepted+damaged)::integer;
        changes:=changes||jsonb_build_array(jsonb_build_object('item_id',i.id,'accepted',accepted,'damaged',damaged));
    END LOOP;
    IF units=0 THEN RAISE EXCEPTION 'Enter at least one accepted or damaged unit'; END IF;
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(changes) x WHERE (x->>'damaged')::integer>0) AND trim(COALESCE(p_payload->>'notes',''))='' THEN RAISE EXCEPTION 'Add a note explaining damaged units'; END IF;
    -- Lock variants in deterministic order, then add to their CURRENT stock.
    PERFORM v.id FROM public.product_variants v WHERE v.id IN(SELECT variant_id FROM public.purchase_order_items WHERE purchase_order_id=p_id) ORDER BY v.id FOR UPDATE;
    FOR line IN SELECT * FROM jsonb_array_elements(changes) LOOP
        SELECT * INTO STRICT i FROM public.purchase_order_items WHERE id=(line->>'item_id')::uuid;
        accepted:=(line->>'accepted')::integer; damaged:=(line->>'damaged')::integer;
        IF accepted>0 THEN
            UPDATE public.product_variants SET stock=COALESCE(stock,0)+accepted::integer WHERE id=i.variant_id;
            IF NOT FOUND THEN RAISE EXCEPTION 'A received shade no longer exists'; END IF;
            INSERT INTO public.stock_ledger(variant_id,change_amount,entry_type,reference_id) VALUES(i.variant_id,accepted::integer,'purchase',p_receipt);
        END IF;
        UPDATE public.purchase_order_items SET received_quantity=received_quantity+accepted::integer,damaged_quantity=damaged_quantity+damaged::integer WHERE id=i.id;
    END LOOP;
    INSERT INTO public.purchase_receipts(id,purchase_order_id,actor_id,received_on,notes,lines,request) VALUES(p_receipt,p_id,p_actor,receipt_date,COALESCE(p_payload->>'notes',''),changes,p_payload);
    UPDATE public.purchase_orders SET status=CASE WHEN EXISTS(SELECT 1 FROM public.purchase_order_items WHERE purchase_order_id=p_id AND received_quantity+damaged_quantity<quantity) THEN 'ordered' ELSE 'received' END,
        received_at=CASE WHEN NOT EXISTS(SELECT 1 FROM public.purchase_order_items WHERE purchase_order_id=p_id AND received_quantity+damaged_quantity<quantity) THEN now() ELSE NULL END,version=version+1 WHERE id=p_id;
    INSERT INTO public.purchase_events(purchase_order_id,actor_id,action,snapshot) VALUES(p_id,p_actor,'Delivery recorded',jsonb_build_object('receipt_id',p_receipt,'lines',changes));
    RETURN public.admin_purchase_detail(p_id);
END $$;

REVOKE ALL ON FUNCTION public.admin_purchase_detail(uuid),public.admin_purchase_catalog(text),public.admin_purchase_list(text,text,date,date,integer,integer),public.admin_purchase_save(uuid,integer,jsonb,uuid),public.admin_purchase_transition(uuid,integer,text,uuid),public.admin_purchase_receive(uuid,integer,uuid,jsonb,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_purchase_detail(uuid),public.admin_purchase_catalog(text),public.admin_purchase_list(text,text,date,date,integer,integer),public.admin_purchase_save(uuid,integer,jsonb,uuid),public.admin_purchase_transition(uuid,integer,text,uuid),public.admin_purchase_receive(uuid,integer,uuid,jsonb,uuid) TO service_role;
COMMIT;
