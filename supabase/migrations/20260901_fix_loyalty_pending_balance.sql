-- Fix loyalty points balance update: only update balance when transaction is available
-- or for spend/expired transactions on insert (which are immediately available).
-- This prevents pending earn/bonus transactions from immediately increasing the balance.

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trg_update_points_balance ON public.loyalty_transactions;
DROP FUNCTION IF EXISTS public.update_points_balance();

-- Create new function that handles INSERT and UPDATE
CREATE OR REPLACE FUNCTION public.update_points_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update balance and lifetime_earned only for:
    -- 1. Transactions with status 'available' (whether insert or update)
    -- 2. Spend/expired transactions on insert (they are inserted as 'available')
    IF (NEW.status = 'available')
       OR (NEW.type IN ('spend', 'expired') AND TG_OP = 'INSERT')
    THEN
        UPDATE public.loyalty_points
        SET balance = NEW.balance_after,
            lifetime_earned = CASE 
                                  WHEN NEW.type IN ('earn', 'bonus') THEN lifetime_earned + NEW.amount
                                  ELSE lifetime_earned
                              END,
            updated_at = now()
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to fire on INSERT and UPDATE
CREATE TRIGGER trg_update_points_balance
    AFTER INSERT OR UPDATE ON public.loyalty_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_points_balance();
