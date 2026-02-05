create table if not exists cuisines (
  id serial primary key,
  name text not null unique
);

create table if not exists tags (
  id serial primary key,
  name text not null unique
);

create table if not exists restaurants (
  id serial primary key,
  name text not null,
  city text not null,
  state text not null,
  unique (name, city, state),
  latitude numeric,
  longitude numeric,
  cuisine_id integer not null references cuisines(id),
  price_range text not null,
  rating numeric,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists restaurant_tags (
  restaurant_id integer not null references restaurants(id) on delete cascade,
  tag_id integer not null references tags(id) on delete cascade,
  primary key (restaurant_id, tag_id)
);

create index if not exists restaurants_city_state_idx on restaurants (city, state);
create index if not exists restaurants_cuisine_idx on restaurants (cuisine_id);
create index if not exists restaurants_rating_idx on restaurants (rating);
create index if not exists restaurants_location_idx on restaurants (latitude, longitude);
create index if not exists restaurant_tags_tag_idx on restaurant_tags (tag_id);
