-- Apply after the order-amendment and customer/cart reporting migrations.
-- Read-only, service-only reporting. No orders, payments or inventory are changed.
BEGIN;

CREATE OR REPLACE FUNCTION public.admin_dashboard_order_facts(p_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid,user_id uuid,created_at timestamptz,status text,order_type text,payment_status text,
 total numeric,item_refunds numeric,refunded numeric,retained numeric,balance_due numeric,refund_due numeric,
 cancellation_started_at timestamptz,promo_code text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 WITH refunds AS (
   SELECT r.order_id,sum(r.amount) AS amount FROM public.order_refunds r
   WHERE p_id IS NULL OR r.order_id=p_id GROUP BY r.order_id
 ), settlements AS (
   SELECT s.order_id,sum(s.amount) AS amount FROM public.order_edit_settlements s
   WHERE s.status='complete' AND s.kind='refund' AND (p_id IS NULL OR s.order_id=p_id) GROUP BY s.order_id
 ), base AS (
   SELECT o.*,coalesce(r.amount,0) AS item_refunds,coalesce(s.amount,0) AS edit_refunds,
     CASE WHEN o.edit_paid_amount IS NOT NULL THEN o.edit_paid_amount
       WHEN o.payment_status IN ('paid','partially_refunded') THEN greatest(0,o.total-coalesce(r.amount,0)-coalesce(s.amount,0))
       WHEN o.payment_status IN ('refunded','unpaid') THEN 0 ELSE NULL END AS cash,
     CASE WHEN o.status='cancelled' OR o.cancellation_started_at IS NOT NULL THEN 0
       ELSE greatest(0,o.total-coalesce(r.amount,0)) END AS liability
   FROM public.orders o LEFT JOIN refunds r ON r.order_id=o.id LEFT JOIN settlements s ON s.order_id=o.id
   WHERE p_id IS NULL OR o.id=p_id
 )
 SELECT b.id,b.user_id,b.created_at,b.status,coalesce(b.order_type,'delivery'),b.payment_status,b.total,b.item_refunds,
   CASE WHEN b.edit_paid_amount IS NULL AND b.payment_status='refunded' THEN greatest(b.total,b.item_refunds+b.edit_refunds)
     ELSE b.item_refunds+b.edit_refunds END,
   b.cash,CASE WHEN b.cash IS NULL THEN NULL ELSE greatest(0,b.liability-b.cash) END,
   CASE WHEN b.cash IS NULL THEN NULL ELSE greatest(0,b.cash-b.liability) END,b.cancellation_started_at,b.promo_code
 FROM base b;
$$;

CREATE OR REPLACE FUNCTION public.admin_dashboard_order_detail(p_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT to_jsonb(f)||jsonb_build_object(
   'customer_name',coalesce(nullif(p.full_name,''),nullif(o.shipping_address->>'full_name',''),'Guest'),
   'payment_method',o.payment_method,'shipping_price',coalesce(o.shipping_price,0),'shipping_label',o.shipping_label,
   'promo_discount_amount',coalesce(o.promo_discount_amount,0),'bxgy_discount_amount',coalesce(o.bxgy_discount_amount,0),
   'gift_card_discount',coalesce(o.gift_card_discount,0),'coin_discount_amount',coalesce(o.coin_discount_amount,0),
   'additional_charges',coalesce(o.additional_charges,0),'additional_charges_label',o.additional_charges_label,
   'edit_version',coalesce(o.edit_version,0),
   'items',coalesce((SELECT jsonb_agg(jsonb_build_object(
     'id',i.id,'product_name',i.product_name,'variant_title',i.variant_title,'quantity',i.quantity,
     'unit_price',i.unit_price,'is_gift',coalesce(i.is_gift,false),'line_discount_amount',i.line_discount_amount,
     'refunded_quantity',coalesce(i.refunded_quantity,0)) ORDER BY i.id) FROM public.order_items i WHERE i.order_id=o.id),'[]'::jsonb)
 ) FROM public.orders o JOIN public.admin_dashboard_order_facts(p_id) f ON f.id=o.id
 LEFT JOIN public.profiles p ON p.id=o.user_id WHERE o.id=p_id;
$$;

CREATE OR REPLACE FUNCTION public.admin_dashboard_section(
 p_section text,p_from timestamptz,p_before timestamptz,p_as_of timestamptz DEFAULT now(),
 p_status text DEFAULT '',p_queue text DEFAULT '',p_page integer DEFAULT 1
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE result jsonb; today_start timestamptz;
BEGIN
 IF p_from IS NULL OR p_before IS NULL OR p_as_of IS NULL OR p_before<=p_from OR p_before-p_from>interval '3660 days' THEN
   RAISE EXCEPTION 'Invalid reporting range';
 END IF;
 today_start:=date_trunc('day',p_as_of AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata';
 IF p_section='orders' THEN
   WITH facts AS MATERIALIZED (SELECT * FROM public.admin_dashboard_order_facts()),
   periods(name,start_at,before_at) AS (VALUES
     ('current',p_from,p_before),('previous',p_from-(p_before-p_from),p_from),('today',today_start,today_start+interval '1 day')),
   metrics AS (
     SELECT p.name,jsonb_build_object(
       'count',count(f.id) FILTER(WHERE f.status IS DISTINCT FROM 'cancelled'),'allCount',count(f.id),
       'orderValue',coalesce(sum(f.total) FILTER(WHERE f.status IS DISTINCT FROM 'cancelled'),0),
       'retained',coalesce(sum(f.retained),0),'outstanding',coalesce(sum(f.balance_due),0),
       'refundDue',coalesce(sum(f.refund_due),0),'refunded',coalesce(sum(f.refunded),0),
       'refundOrders',count(f.id) FILTER(WHERE f.refunded>0 OR f.payment_status IN ('refunded','partially_refunded')),
       'completed',count(f.id) FILTER(WHERE f.status IN ('delivered','picked_up')),
       'customers',count(DISTINCT f.user_id) FILTER(WHERE f.status IS DISTINCT FROM 'cancelled'),
       'unknownPayments',count(f.id) FILTER(WHERE f.retained IS NULL),
       'promoOrders',count(f.id) FILTER(WHERE f.status IS DISTINCT FROM 'cancelled' AND nullif(btrim(f.promo_code),'') IS NOT NULL)
     ) AS value FROM periods p LEFT JOIN facts f ON f.created_at>=p.start_at AND f.created_at<p.before_at GROUP BY p.name
   ), days AS (
     SELECT p_from+n*interval '1 day' AS start_at FROM generate_series(0,(extract(epoch FROM (p_before-p_from))/86400)::integer-1) n
   ), daily AS (
     SELECT (f.created_at AT TIME ZONE 'Asia/Kolkata')::date AS day,
       coalesce(sum(f.total) FILTER(WHERE f.status IS DISTINCT FROM 'cancelled'),0) AS order_value,
       coalesce(sum(f.retained),0) AS retained
     FROM facts f WHERE f.created_at>=p_from-(p_before-p_from) AND f.created_at<p_before
     GROUP BY (f.created_at AT TIME ZONE 'Asia/Kolkata')::date
   ), trend AS (
     SELECT (d.start_at AT TIME ZONE 'Asia/Kolkata')::date::text AS day,
       coalesce(current_day.order_value,0) AS "orderValue",coalesce(current_day.retained,0) AS retained,
       coalesce(prior_day.order_value,0) AS "previousOrderValue",coalesce(prior_day.retained,0) AS "previousRetained"
     FROM days d LEFT JOIN daily current_day ON current_day.day=(d.start_at AT TIME ZONE 'Asia/Kolkata')::date
     LEFT JOIN daily prior_day ON prior_day.day=((d.start_at-(p_before-p_from)) AT TIME ZONE 'Asia/Kolkata')::date
   ), weekday AS (
     SELECT n AS day,coalesce(sum(f.total),0) AS "orderValue",count(f.id) AS count
     FROM generate_series(0,6) n LEFT JOIN facts f ON extract(dow FROM (f.created_at AT TIME ZONE 'Asia/Kolkata'))=n
       AND f.created_at>=p_from AND f.created_at<p_before AND f.status IS DISTINCT FROM 'cancelled' GROUP BY n
   ), payments AS (
     SELECT coalesce(nullif(lower(btrim(o.payment_method)),''),'unknown') AS method,count(*) AS count FROM public.orders o
     WHERE o.created_at>=p_from AND o.created_at<p_before AND o.status IS DISTINCT FROM 'cancelled' GROUP BY 1
   ), recent AS (
     SELECT id,created_at FROM public.orders WHERE created_at>=p_from AND created_at<p_before ORDER BY created_at DESC,id DESC LIMIT 8
   ), products AS (
     SELECT i.product_id AS id,i.product_name AS name,sum(i.quantity) AS quantity
     FROM public.order_items i JOIN public.orders o ON o.id=i.order_id
     WHERE o.created_at>=p_from AND o.created_at<p_before AND o.status IS DISTINCT FROM 'cancelled' AND NOT coalesce(i.is_gift,false)
     GROUP BY i.product_id,i.product_name ORDER BY quantity DESC,i.product_name LIMIT 5
   ), category_items AS (
     SELECT coalesce(c.name,'Uncategorized') AS name,i.quantity
     FROM public.order_items i JOIN public.orders o ON o.id=i.order_id
     LEFT JOIN LATERAL (SELECT pc.category_id FROM public.product_categories pc WHERE pc.product_id=i.product_id ORDER BY pc.category_id LIMIT 1) pc ON true
     LEFT JOIN public.categories c ON c.id=pc.category_id
     WHERE o.created_at>=p_from AND o.created_at<p_before AND o.status IS DISTINCT FROM 'cancelled' AND NOT coalesce(i.is_gift,false)
   ), categories AS (SELECT name,sum(quantity) AS quantity FROM category_items GROUP BY name ORDER BY quantity DESC,name LIMIT 5)
   SELECT jsonb_build_object(
     'current',(SELECT value FROM metrics WHERE name='current'),'previous',(SELECT value FROM metrics WHERE name='previous'),'today',(SELECT value FROM metrics WHERE name='today'),
     'trend',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY day) FROM trend t),'[]'::jsonb),
     'recent',coalesce((SELECT jsonb_agg(public.admin_dashboard_order_detail(r.id) ORDER BY r.created_at DESC,r.id DESC) FROM recent r),'[]'::jsonb),
     'products',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY quantity DESC,name) FROM products p),'[]'::jsonb),
     'categories',coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY quantity DESC,name) FROM categories c),'[]'::jsonb),
     'weekday',(SELECT jsonb_agg(to_jsonb(w) ORDER BY day) FROM weekday w),
     'payments',coalesce((SELECT jsonb_agg(to_jsonb(pm) ORDER BY count DESC,method) FROM payments pm),'[]'::jsonb)
   ) INTO result;
 ELSIF p_section='operations' THEN
   WITH facts AS MATERIALIZED (SELECT * FROM public.admin_dashboard_order_facts()),
   flagged AS MATERIALIZED (
     SELECT f.*,array_remove(ARRAY[
       CASE WHEN status='pending' AND created_at<p_as_of-interval '2 hours' THEN 'confirmation' END,
       CASE WHEN status IN ('confirmed','packed') AND order_type='delivery' AND created_at<p_as_of-interval '24 hours' THEN 'dispatch' END,
       CASE WHEN status='failed_delivery' THEN 'failed' END,CASE WHEN status='no_show' THEN 'pickup' END,
       CASE WHEN balance_due>0 THEN 'payment' END,CASE WHEN refund_due>0 THEN 'refund' END,
       CASE WHEN retained IS NULL OR EXISTS(SELECT 1 FROM public.order_edit_settlements s WHERE s.order_id=f.id AND s.status='reserved')
         OR EXISTS(SELECT 1 FROM public.promotion_refund_requests r WHERE r.order_id=f.id AND r.status='reserved') THEN 'settlement' END
     ],NULL) AS flags FROM facts f
   ), counts AS (SELECT status,count(*) AS count FROM facts GROUP BY status),
   matching AS MATERIALIZED (
     SELECT id,created_at FROM flagged WHERE (coalesce(p_status,'')='' OR status=p_status)
       AND (coalesce(p_queue,'')='' OR p_queue=ANY(flags))
   ), paging AS (SELECT count(*) AS total,greatest(1,ceil(count(*)::numeric/25)::integer) AS pages FROM matching),
   bounds AS (SELECT total,pages,greatest(1,least(coalesce(p_page,1),pages)) AS page FROM paging),
   selected AS (SELECT * FROM matching ORDER BY created_at DESC,id DESC LIMIT 25 OFFSET(SELECT (page-1)::bigint*25 FROM bounds))
   SELECT jsonb_build_object(
     'statuses',coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY status) FROM counts c),'[]'::jsonb),
     'attention',(SELECT jsonb_object_agg(flag,total) FROM (SELECT key AS flag,count(f.id) AS total FROM
       unnest(ARRAY['confirmation','dispatch','failed','pickup','payment','refund','settlement']) key
       LEFT JOIN flagged f ON key=ANY(f.flags) GROUP BY key) a),
     'orders',coalesce((SELECT jsonb_agg(public.admin_dashboard_order_detail(s.id) ORDER BY s.created_at DESC,s.id DESC) FROM selected s),'[]'::jsonb),
     'total',bounds.total,'page',bounds.page,'totalPages',bounds.pages
   ) INTO result FROM bounds;
 ELSIF p_section='inventory' THEN
   WITH items AS (
     SELECT v.id,coalesce(p.name,'Unknown product') AS name,v.title,v.sku,coalesce(v.stock,0) AS stock FROM public.product_variants v LEFT JOIN public.products p ON p.id=v.product_id
   ), selected AS (
     (SELECT * FROM items WHERE stock<=0 ORDER BY stock,id LIMIT 6)
     UNION ALL (SELECT * FROM items WHERE stock BETWEEN 1 AND 10 ORDER BY stock,id LIMIT 6)
   )
   SELECT jsonb_build_object('total',count(*),'available',count(*) FILTER(WHERE stock>0),
     'out',count(*) FILTER(WHERE stock<=0),'low',count(*) FILTER(WHERE stock BETWEEN 1 AND 10),
     'items',coalesce((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.stock,s.id) FROM selected s),'[]'::jsonb)) INTO result FROM items;
 ELSIF p_section='audience' THEN
   WITH customers AS (
     SELECT user_id,min(created_at) AS first_at FROM public.orders WHERE status IS DISTINCT FROM 'cancelled' AND user_id IS NOT NULL GROUP BY user_id
   ), ordered AS (SELECT DISTINCT user_id FROM public.orders WHERE status IS DISTINCT FROM 'cancelled' AND created_at>=p_from AND created_at<p_before AND user_id IS NOT NULL),
   carts AS (SELECT c.* FROM public.carts c JOIN public.profiles p ON p.id=c.user_id WHERE p.deleted_at IS NULL
     AND EXISTS(SELECT 1 FROM public.cart_items i WHERE i.cart_id=c.id AND i.quantity>0))
   SELECT jsonb_build_object(
     'ordering',(SELECT count(*) FROM ordered),'new',(SELECT count(*) FROM ordered o JOIN customers c USING(user_id) WHERE first_at>=p_from),
     'returning',(SELECT count(*) FROM ordered o JOIN customers c USING(user_id) WHERE first_at<p_from),
     'registered',(SELECT count(*) FROM public.profiles WHERE deleted_at IS NULL AND created_at>=p_from AND created_at<p_before),
     'carts',(SELECT jsonb_build_object('pending',count(*) FILTER(WHERE updated_at<p_as_of-interval '1 hour' AND abandoned_email_sent_at IS NULL),
       'sent',count(*) FILTER(WHERE updated_at<p_as_of-interval '1 hour' AND abandoned_email_sent_at IS NOT NULL),
       'recent',count(*) FILTER(WHERE updated_at>=p_as_of-interval '1 hour')) FROM carts),
     'traffic',(SELECT jsonb_build_object('views',count(*),'browsers',count(DISTINCT nullif(session_id::text,''))) FROM public.traffic_log
       WHERE created_at>=p_as_of-interval '24 hours' AND created_at<=p_as_of AND coalesce(path,'') NOT LIKE '/admin%' AND coalesce(path,'') NOT LIKE '/pos%')
   ) INTO result;
 ELSIF p_section='activity' THEN
   WITH events AS (
     SELECT id,name,subject AS label,'message'::text AS kind,created_at FROM public.contact_messages
     UNION ALL SELECT id,business_name AS name,'Wholesale application' AS label,'wholesale'::text,created_at FROM public.wholesale_applications
   ), recent AS (SELECT * FROM events ORDER BY created_at DESC,id DESC LIMIT 6)
   SELECT jsonb_build_object('unread',(SELECT count(*) FROM public.contact_messages WHERE status='unread'),
     'wholesale',(SELECT count(*) FROM public.wholesale_applications WHERE status='pending'),
     'events',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC,r.id DESC) FROM recent r),'[]'::jsonb)) INTO result;
 ELSE RAISE EXCEPTION 'Unknown dashboard section'; END IF;
 RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_dashboard_order_facts(uuid),public.admin_dashboard_order_detail(uuid),public.admin_dashboard_section(text,timestamptz,timestamptz,timestamptz,text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_order_facts(uuid),public.admin_dashboard_order_detail(uuid),public.admin_dashboard_section(text,timestamptz,timestamptz,timestamptz,text,text,integer) TO service_role;
COMMIT;
