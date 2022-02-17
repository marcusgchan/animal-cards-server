CREATE TABLE cards (
  id BIGSERIAL PRIMARY KEY NOT NULL,
  name VARCHAR(100) NOT NULL,
  latin_name VARCHAR(100),
  animal_type VARCHAR(100),
  habitat VARCHAR(100),
  lifespan INTEGER,
  min_weight INTEGER,
  max_weight INTEGER,
  min_card_height DOUBLE PRECISION,
  min_card_width DOUBLE PRECISION,
  card_color VARCHAR(7)
);
