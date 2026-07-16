-- Add refund tracking columns to order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS refunded_quantity INTEGER NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC NOT NULL DEFAULT 0;

-- Create order_refunds audit table
CREATE TABLE IF NOT EXISTS order_refunds (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  amount NUMERIC NOT NULL,
  reason TEXT,
  refund_method TEXT NOT NULL CHECK (refund_method IN ('razorpay', 'gpay')),
  transaction_id TEXT,
  processed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT order_refunds_pkey PRIMARY KEY (id)
);

-- Add partially_refunded to orders payment_status check
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check CHECK (payment_status = ANY (ARRAY['paid'::text, 'unpaid'::text, 'refunded'::text, 'partially_refunded'::text]));
