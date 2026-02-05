-- Remove duplicate restaurants (keep the one with lowest id)
-- Run this if you have duplicates before adding the unique constraint
DELETE FROM restaurant_tags
WHERE restaurant_id IN (
  SELECT id FROM restaurants a
  WHERE EXISTS (
    SELECT 1 FROM restaurants b
    WHERE a.name = b.name AND a.city = b.city AND a.state = b.state AND a.id > b.id
  )
);

DELETE FROM restaurants a
USING restaurants b
WHERE a.name = b.name AND a.city = b.city AND a.state = b.state AND a.id > b.id;

-- Add unique constraint (safe to run multiple times)
ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_name_city_state_key;
ALTER TABLE restaurants ADD CONSTRAINT restaurants_name_city_state_key UNIQUE (name, city, state);
