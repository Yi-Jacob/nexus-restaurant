import { getClient, query } from "./db.js";
import dotenv from "dotenv";

dotenv.config();

const sampleCuisines = [
  "Italian",
  "Thai",
  "Mexican",
  "Japanese",
  "American",
  "Indian",
  "Chinese",
  "Mediterranean",
  "French",
  "Korean"
];

const sampleTags = [
  "patio",
  "vegan",
  "vegetarian",
  "gluten-free",
  "delivery",
  "takeout",
  "reservations",
  "bar",
  "family-friendly",
  "romantic"
];

const sampleRestaurants = [
  {
    name: "Bella Italia",
    city: "San Francisco",
    state: "CA",
    latitude: 37.7749,
    longitude: -122.4194,
    cuisine: "Italian",
    price_range: "$$$",
    rating: 4.5,
    tags: ["patio", "reservations", "romantic"],
    notes: "Authentic Italian cuisine with fresh pasta"
  },
  {
    name: "Thai Garden",
    city: "San Francisco",
    state: "CA",
    latitude: 37.7849,
    longitude: -122.4094,
    cuisine: "Thai",
    price_range: "$$",
    rating: 4.3,
    tags: ["vegetarian", "delivery", "takeout"],
    notes: "Spicy and flavorful Thai dishes"
  },
  {
    name: "Taco Loco",
    city: "Austin",
    state: "TX",
    latitude: 30.2672,
    longitude: -97.7431,
    cuisine: "Mexican",
    price_range: "$",
    rating: 4.7,
    tags: ["patio", "family-friendly", "takeout"],
    notes: "Best tacos in Austin"
  },
  {
    name: "Sakura Sushi",
    city: "New York",
    state: "NY",
    latitude: 40.7128,
    longitude: -74.0060,
    cuisine: "Japanese",
    price_range: "$$$",
    rating: 4.8,
    tags: ["reservations", "bar", "romantic"],
    notes: "Premium sushi and sashimi"
  },
  {
    name: "Burger Palace",
    city: "Austin",
    state: "TX",
    latitude: 30.2772,
    longitude: -97.7531,
    cuisine: "American",
    price_range: "$$",
    rating: 4.2,
    tags: ["family-friendly", "patio", "takeout"],
    notes: "Classic American burgers and fries"
  },
  {
    name: "Spice Route",
    city: "Seattle",
    state: "WA",
    latitude: 47.6062,
    longitude: -122.3321,
    cuisine: "Indian",
    price_range: "$$",
    rating: 4.6,
    tags: ["vegetarian", "vegan", "gluten-free", "delivery"],
    notes: "Authentic Indian curries and naan"
  },
  {
    name: "Dragon Wok",
    city: "Los Angeles",
    state: "CA",
    latitude: 34.0522,
    longitude: -118.2437,
    cuisine: "Chinese",
    price_range: "$$",
    rating: 4.1,
    tags: ["delivery", "takeout", "family-friendly"],
    notes: "Traditional Chinese dishes"
  },
  {
    name: "Olive Grove",
    city: "Portland",
    state: "OR",
    latitude: 45.5152,
    longitude: -122.6784,
    cuisine: "Mediterranean",
    price_range: "$$$",
    rating: 4.4,
    tags: ["vegetarian", "patio", "reservations"],
    notes: "Fresh Mediterranean flavors"
  },
  {
    name: "Le Bistro",
    city: "Boston",
    state: "MA",
    latitude: 42.3601,
    longitude: -71.0589,
    cuisine: "French",
    price_range: "$$$$",
    rating: 4.9,
    tags: ["reservations", "romantic", "bar"],
    notes: "Fine French dining experience"
  },
  {
    name: "Seoul Kitchen",
    city: "Chicago",
    state: "IL",
    latitude: 41.8781,
    longitude: -87.6298,
    cuisine: "Korean",
    price_range: "$$",
    rating: 4.5,
    tags: ["bar", "family-friendly", "takeout"],
    notes: "Authentic Korean BBQ"
  },
  {
    name: "Pizza Corner",
    city: "New York",
    state: "NY",
    latitude: 40.7228,
    longitude: -74.0060,
    cuisine: "Italian",
    price_range: "$",
    rating: 4.0,
    tags: ["delivery", "takeout", "family-friendly"],
    notes: "NY style pizza by the slice"
  },
  {
    name: "Green Leaf Cafe",
    city: "Portland",
    state: "OR",
    latitude: 45.5252,
    longitude: -122.6884,
    cuisine: "American",
    price_range: "$$",
    rating: 4.3,
    tags: ["vegan", "vegetarian", "gluten-free", "patio"],
    notes: "Plant-based comfort food"
  }
];

async function seed(reset = false) {
  const client = await getClient();

  try {
    await client.query("BEGIN");

    if (reset) {
      console.log("🗑️  Truncating existing data...");
      await client.query("TRUNCATE cuisines, tags RESTART IDENTITY CASCADE");
      console.log("✅ Tables truncated");
      console.log("🔧 Ensuring unique constraint on restaurants...");
      await client.query("ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_name_city_state_key");
      await client.query("ALTER TABLE restaurants ADD CONSTRAINT restaurants_name_city_state_key UNIQUE (name, city, state)");
      console.log("✅ Constraint added");
    }

    console.log("🌱 Seeding cuisines...");
    const cuisineMap = {};
    for (const cuisine of sampleCuisines) {
      const result = await client.query(
        "INSERT INTO cuisines (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = excluded.name RETURNING id, name",
        [cuisine]
      );
      cuisineMap[cuisine] = result.rows[0].id;
    }
    console.log(`✅ Inserted ${sampleCuisines.length} cuisines`);

    console.log("🌱 Seeding tags...");
    const tagMap = {};
    for (const tag of sampleTags) {
      const result = await client.query(
        "INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = excluded.name RETURNING id, name",
        [tag]
      );
      tagMap[tag] = result.rows[0].id;
    }
    console.log(`✅ Inserted ${sampleTags.length} tags`);

    console.log("🌱 Seeding restaurants...");
    for (const restaurant of sampleRestaurants) {
      const cuisineId = cuisineMap[restaurant.cuisine];
      
      const result = await client.query(
        `INSERT INTO restaurants 
         (name, city, state, latitude, longitude, cuisine_id, price_range, rating, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (name, city, state) DO NOTHING
         RETURNING id`,
        [
          restaurant.name,
          restaurant.city,
          restaurant.state,
          restaurant.latitude,
          restaurant.longitude,
          cuisineId,
          restaurant.price_range,
          restaurant.rating,
          restaurant.notes
        ]
      );

      if (result.rows.length > 0) {
        const restaurantId = result.rows[0].id;
        
        for (const tagName of restaurant.tags) {
          const tagId = tagMap[tagName];
          if (tagId) {
            await client.query(
              "INSERT INTO restaurant_tags (restaurant_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
              [restaurantId, tagId]
            );
          }
        }
      }
    }
    console.log(`✅ Inserted ${sampleRestaurants.length} restaurants`);

    await client.query("COMMIT");
    console.log("🎉 Seeding complete!");
    
    const count = await query("SELECT COUNT(*) FROM restaurants");
    console.log(`📊 Total restaurants in database: ${count.rows[0].count}`);
    
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    client.release();
  }
}

const reset = process.argv.includes("--reset");
seed(reset)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
