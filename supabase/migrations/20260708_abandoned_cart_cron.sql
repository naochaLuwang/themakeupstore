-- Enable pg_cron and pg_net extensions (required for scheduled HTTP calls)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop existing schedule if re-running (silently ignore if not found)
DO $$
BEGIN
  PERFORM cron.unschedule('send-abandoned-cart-emails');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;


SELECT cron.schedule(
  'send-abandoned-cart-emails',
  '0 */2 * * *',
  $$
  SELECT net.http_post(
    url:='https://pdfkikpoalylyufuprki.supabase.co/functions/v1/scheduled-abandoned-cart',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.cron_secret', true)
    )
  ) AS request_id;
  $$
);
