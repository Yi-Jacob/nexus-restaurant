import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { getClient, query } from "./db.js";
import { matchAndRankRestaurants } from "./matchingService.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "dev-internal-key";

app.use(cors());
app.use(express.json());

function requireInternalAuth(req, res, next) {
  const apiKey = req.header("x-api-key");
  if (!apiKey || apiKey !== INTERNAL_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
}

function toNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function normalizeTags(tags) {
  if (!tags) {
    return [];
  }
  if (Array.isArray(tags)) {
    return Array.from(new Set(tags.filter(Boolean)));
  }
  return Array.from(
    new Set(
      String(tags)
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );
}

async function fetchRestaurants(filters = {}) {
  const conditions = [];
  const values = [];
  let orderBy = "r.name asc";

  if (filters.cuisine) {
    values.push(filters.cuisine);
    conditions.push(`c.name = $${values.length}`);
  }
  if (filters.city) {
    values.push(filters.city);
    conditions.push(`lower(r.city) = lower($${values.length})`);
  }
  if (filters.state) {
    values.push(filters.state);
    conditions.push(`lower(r.state) = lower($${values.length})`);
  }
  if (filters.minRating) {
    values.push(filters.minRating);
    conditions.push(`r.rating >= $${values.length}`);
  }

  if (filters.sort === "rating_desc") {
    orderBy = "r.rating desc nulls last";
  }
  if (filters.sort === "city_asc") {
    orderBy = "r.city asc, r.name asc";
  }

  const whereClause = conditions.length > 0 ? `where ${conditions.join(" and ")}` : "";
  const sql = `
    select
      r.*,
      c.name as cuisine,
      coalesce(tags.tags, '{}') as tags
    from restaurants r
    join cuisines c on r.cuisine_id = c.id
    left join lateral (
      select array_agg(t.name) as tags
      from restaurant_tags rt
      join tags t on t.id = rt.tag_id
      where rt.restaurant_id = r.id
    ) tags on true
    ${whereClause}
    order by ${orderBy}
  `;
  const result = await query(sql, values);
  return result.rows;
}

async function upsertCuisine(client, name) {
  const result = await client.query(
    "insert into cuisines (name) values ($1) on conflict (name) do update set name = excluded.name returning id",
    [name]
  );
  return result.rows[0].id;
}

async function upsertTags(client, tags) {
  const tagIds = [];
  for (const tag of tags) {
    const result = await client.query(
      "insert into tags (name) values ($1) on conflict (name) do update set name = excluded.name returning id",
      [tag]
    );
    tagIds.push(result.rows[0].id);
  }
  return tagIds;
}

app.post("/restaurants", requireInternalAuth, async (req, res) => {
  const {
    name,
    city,
    state,
    latitude,
    longitude,
    cuisine,
    price_range,
    tags,
    rating,
    notes
  } = req.body || {};

  if (!name || !city || !state || !cuisine || !price_range) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const client = await getClient();
  try {
    await client.query("begin");
    const cuisineId = await upsertCuisine(client, cuisine);
    const sql = `
      insert into restaurants
        (name, city, state, latitude, longitude, cuisine_id, price_range, rating, notes)
      values
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      returning *;
    `;
    const values = [
      name,
      city,
      state,
      toNumber(latitude),
      toNumber(longitude),
      cuisineId,
      price_range,
      toNumber(rating),
      notes || null
    ];

    const result = await client.query(sql, values);
    const restaurant = result.rows[0];
    const normalizedTags = normalizeTags(tags);
    const tagIds = await upsertTags(client, normalizedTags);
    for (const tagId of tagIds) {
      await client.query(
        "insert into restaurant_tags (restaurant_id, tag_id) values ($1, $2) on conflict do nothing",
        [restaurant.id, tagId]
      );
    }
    await client.query("commit");
    const created = await fetchRestaurants({}).then((rows) =>
      rows.find((row) => row.id === restaurant.id)
    );
    return res.status(201).json(created);
  } catch (error) {
    await client.query("rollback");
    return res.status(500).json({ error: "Failed to create restaurant" });
  } finally {
    client.release();
  }
});

app.put("/restaurants/:id", requireInternalAuth, async (req, res) => {
  const { id } = req.params;
  const {
    name,
    city,
    state,
    latitude,
    longitude,
    cuisine,
    price_range,
    tags,
    rating,
    notes
  } = req.body || {};

  const client = await getClient();
  try {
    await client.query("begin");
    const cuisineId = await upsertCuisine(client, cuisine);
    const sql = `
      update restaurants
      set
        name = $1,
        city = $2,
        state = $3,
        latitude = $4,
        longitude = $5,
        cuisine_id = $6,
        price_range = $7,
        rating = $8,
        notes = $9,
        updated_at = now()
      where id = $10
      returning *;
    `;

    const values = [
      name,
      city,
      state,
      toNumber(latitude),
      toNumber(longitude),
      cuisineId,
      price_range,
      toNumber(rating),
      notes || null,
      id
    ];

    const result = await client.query(sql, values);
    if (result.rows.length === 0) {
      await client.query("rollback");
      return res.status(404).json({ error: "Restaurant not found" });
    }

    await client.query("delete from restaurant_tags where restaurant_id = $1", [id]);
    const normalizedTags = normalizeTags(tags);
    const tagIds = await upsertTags(client, normalizedTags);
    for (const tagId of tagIds) {
      await client.query(
        "insert into restaurant_tags (restaurant_id, tag_id) values ($1, $2) on conflict do nothing",
        [id, tagId]
      );
    }
    await client.query("commit");
    const updated = await fetchRestaurants({}).then((rows) =>
      rows.find((row) => row.id === Number(id))
    );
    return res.json(updated);
  } catch (error) {
    await client.query("rollback");
    return res.status(500).json({ error: "Failed to update restaurant" });
  } finally {
    client.release();
  }
});

app.get("/restaurants", requireInternalAuth, async (req, res) => {
  const filters = {
    cuisine: req.query.cuisine,
    city: req.query.city,
    state: req.query.state,
    minRating: toNumber(req.query.min_rating),
    sort: req.query.sort
  };
  const rows = await fetchRestaurants(filters);
  return res.json(rows);
});

app.get("/restaurants/summary", requireInternalAuth, async (req, res) => {
  const cuisineSummary = await query(
    "select c.name as cuisine, count(*)::int as count from restaurants r join cuisines c on r.cuisine_id = c.id group by c.name order by count desc"
  );
  const ratingByCity = await query(
    "select city, state, round(avg(rating), 2) as avg_rating from restaurants where rating is not null group by city, state order by avg_rating desc nulls last"
  );

  return res.json({
    countByCuisine: cuisineSummary.rows,
    avgRatingByCity: ratingByCity.rows
  });
});

app.get("/best_match", async (req, res) => {
  const cuisine = req.query.cuisine || null;
  const priceRange = req.query.price_range || null;
  const tags = normalizeTags(req.query.tags);
  const city = req.query.city || null;
  const state = req.query.state || null;
  const latitude = toNumber(req.query.lat);
  const longitude = toNumber(req.query.lng);
  const radiusKm = toNumber(req.query.radius_km) || 25;

  const rows = await fetchRestaurants({
    cuisine: cuisine || undefined,
    city: city || undefined,
    state: state || undefined
  });

  const matches = matchAndRankRestaurants({
    restaurants: rows,
    criteria: {
      cuisine,
      priceRange,
      tags,
      latitude,
      longitude,
      radiusKm
    },
    weights: {
      attributeWeight: 0.55,
      distanceWeight: 0.2,
      ratingWeight: 0.25,
      cuisineWeight: 0.4,
      priceWeight: 0.2,
      tagWeight: 0.2
    }
  });

  return res.json({
    criteria: {
      cuisine,
      price_range: priceRange,
      tags,
      city,
      state,
      latitude,
      longitude,
      radius_km: radiusKm
    },
    count: matches.length,
    message: matches.length === 0 ? "No matches found for the provided criteria." : "Matches found.",
    results: matches
  });
});

app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Restaurant Insights API listening on ${port}`);
});
