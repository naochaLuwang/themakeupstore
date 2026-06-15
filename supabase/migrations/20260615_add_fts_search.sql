ALTER TABLE products ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name,'') || ' ' || coalesce(brand,'') || ' ' || coalesce(description,''))
  ) STORED;

CREATE INDEX IF NOT EXISTS products_search_idx ON products USING GIN (search_vector);
