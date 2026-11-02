INSERT INTO public.products VALUES('80000000-0000-4000-8000-000000000001','Legacy product');
INSERT INTO public.flash_sales(id,scope,product_id,discount_type,discount_value,starts_at,ends_at,label,is_active) VALUES
 ('80000000-0000-4000-8000-000000000010','product','80000000-0000-4000-8000-000000000001','percentage',20,'2020-01-01','2099-01-01','Legacy sale',true),
 ('80000000-0000-4000-8000-000000000011','all',null,'fixed',100,'2020-01-01','2099-01-01','Paused sale',false);
