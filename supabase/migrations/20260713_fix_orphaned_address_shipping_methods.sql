-- Fix orphaned user_addresses.shipping_method_id
-- Addresses may reference deleted shipping methods or methods from old zones.
-- Re-map them to the current active method for their pincode.

-- 1. Preview orphaned addresses (shipping_method_id points to a deleted method)
-- Run this SELECT first to see what will be updated:
SELECT
  ua.id AS address_id,
  ua.full_name,
  ua.pincode,
  ua.shipping_method_id AS old_method_id,
  sm.name AS old_method_name,
  sm.price AS old_method_price,
  sm.zone_id AS old_zone_id,
  new_sm.id AS new_method_id,
  new_sm.name AS new_method_name,
  new_sm.price AS new_method_price,
  new_sm.zone_id AS new_zone_id
FROM user_addresses ua
LEFT JOIN shipping_methods sm ON sm.id = ua.shipping_method_id
LEFT JOIN shipping_zones sz ON sz.pincode = ua.pincode
LEFT JOIN shipping_methods new_sm ON new_sm.zone_id = sz.id AND new_sm.is_active = true
WHERE ua.shipping_method_id IS NOT NULL
  AND (
    -- Method was deleted (FK dangling)
    sm.id IS NULL
    -- Or method belongs to a zone that no longer matches the pincode
    OR sm.zone_id != new_sm.zone_id
  );

-- 2. Actually fix them: re-map to current active method for the pincode
UPDATE user_addresses ua
SET shipping_method_id = sub.new_method_id
FROM (
  SELECT
    ua_inner.id,
    new_sm.id AS new_method_id
  FROM user_addresses ua_inner
  LEFT JOIN shipping_methods sm ON sm.id = ua_inner.shipping_method_id
  LEFT JOIN shipping_zones sz ON sz.pincode = ua_inner.pincode
  LEFT JOIN shipping_methods new_sm ON new_sm.zone_id = sz.id AND new_sm.is_active = true
  WHERE ua_inner.shipping_method_id IS NOT NULL
    AND (
      sm.id IS NULL
      OR sm.zone_id != new_sm.zone_id
    )
) sub
WHERE ua.id = sub.id;

-- 3. Null out any remaining addresses where no active method exists for the pincode
UPDATE user_addresses
SET shipping_method_id = NULL
WHERE shipping_method_id IS NOT NULL
  AND pincode NOT IN (
    SELECT DISTINCT sz.pincode
    FROM shipping_zones sz
    JOIN shipping_methods sm ON sm.zone_id = sz.id AND sm.is_active = true
  );
