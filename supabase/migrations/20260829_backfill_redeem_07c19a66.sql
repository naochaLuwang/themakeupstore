-- Backfill the affecting redemption: order 07c19a66 applied a ₹15 coin discount on 8/28
-- but the broke atomic_redeem_coins RPC never wrote a spend tx or deducted the balance.
-- Run AFTER 20260829_fix_atomic_redeem_coins_cast.sql in the Supabase SQL Editor.
-- The AFTER INSERT trigger handles the balance deduction — do NOT add a manual UPDATE.

SELECT atomic_redeem_coins('7515465f-5349-45be-bcc1-c93fc0f89c72', 15, '07c19a66-31b7-4913-b3ac-a824199fe65e');