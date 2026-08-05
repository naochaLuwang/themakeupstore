CREATE TABLE IF NOT EXISTS public.whatsapp_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number_id TEXT NOT NULL,
    waba_id TEXT,
    business_account_id TEXT,
    access_token TEXT NOT NULL,
    verify_token TEXT DEFAULT '',
    webhook_secret TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage whatsapp_config"
    ON public.whatsapp_config
    FOR ALL
    USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true))
    WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));

CREATE TABLE IF NOT EXISTS public.message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT DEFAULT 'UTILITY',
    language TEXT DEFAULT 'en_US',
    header_type TEXT,
    header_content TEXT,
    body_text TEXT NOT NULL,
    footer_text TEXT,
    buttons JSONB,
    status TEXT DEFAULT 'APPROVED',
    meta_template_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage message_templates"
    ON public.message_templates
    FOR ALL
    USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true))
    WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));

CREATE POLICY "Anyone can read active message_templates"
    ON public.message_templates
    FOR SELECT
    USING (true);

CREATE TABLE IF NOT EXISTS public.notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT,
    user_id UUID REFERENCES auth.users(id),
    customer_phone TEXT NOT NULL,
    template_name TEXT NOT NULL,
    template_params JSONB,
    whatsapp_message_id TEXT,
    status TEXT DEFAULT 'sent',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notification_log"
    ON public.notification_log
    FOR ALL
    USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true))
    WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));

CREATE INDEX IF NOT EXISTS idx_notification_log_order_id ON public.notification_log(order_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_whatsapp_message_id ON public.notification_log(whatsapp_message_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON public.notification_log(status);
