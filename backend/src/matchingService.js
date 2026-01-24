function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function buildExplanation({
  cuisineMatch,
  priceMatch,
  tagMatches,
  distanceKm,
  rating
}) {
  const parts = [];
  if (cuisineMatch) {
    parts.push("Cuisine matches");
  }
  if (priceMatch) {
    parts.push("Price range matches");
  }
  if (tagMatches.length > 0) {
    parts.push(`Tags matched: ${tagMatches.join(", ")}`);
  }
  if (distanceKm !== null) {
    parts.push(`Within ${distanceKm.toFixed(1)} km`);
  }
  if (rating !== null) {
    parts.push(`Rating ${rating.toFixed(1)}`);
  }
  return parts.length > 0 ? parts.join(" • ") : "Matches your criteria";
}

export function matchAndRankRestaurants({
  restaurants,
  criteria,
  weights
}) {
  const {
    cuisine,
    priceRange,
    tags,
    latitude,
    longitude,
    radiusKm
  } = criteria;

  const {
    attributeWeight,
    distanceWeight,
    ratingWeight,
    cuisineWeight,
    priceWeight,
    tagWeight
  } = weights;

  // Attribute filtering is the gating step before any scoring.
  const filtered = restaurants
    .map((row) => {
      const distanceKm =
        latitude !== null && longitude !== null && row.latitude !== null && row.longitude !== null
          ? haversineKm(latitude, longitude, row.latitude, row.longitude)
          : null;

      const withinRadius = distanceKm === null ? true : distanceKm <= radiusKm;
      const cuisineMatch = cuisine ? row.cuisine === cuisine : true;
      const priceMatch = priceRange ? row.price_range === priceRange : true;
      const tagMatches = tags.filter((tag) => (row.tags || []).includes(tag));
      const tagsMatch = tags.length > 0 ? tagMatches.length > 0 : true;

      if (!withinRadius || !cuisineMatch || !priceMatch || !tagsMatch) {
        return null;
      }

      return {
        row,
        distanceKm,
        cuisineMatch,
        priceMatch,
        tagMatches
      };
    })
    .filter(Boolean);

  // Score is a weighted combination of attribute match, distance, and rating.
  return filtered
    .map(({ row, distanceKm, cuisineMatch, priceMatch, tagMatches }) => {
      const ratingScore = row.rating ? row.rating / 5 : 0;
      const tagScore = tags.length > 0 ? tagMatches.length / tags.length : 0.5;
      const distanceScore = distanceKm === null ? 0.5 : Math.max(0, 1 - distanceKm / radiusKm);
      const attributeScore =
        (cuisineMatch ? 1 : 0) * cuisineWeight +
        (priceMatch ? 1 : 0) * priceWeight +
        tagScore * tagWeight;

      const totalScore =
        attributeScore * attributeWeight +
        distanceScore * distanceWeight +
        ratingScore * ratingWeight;

      return {
        ...row,
        distance_km: distanceKm,
        score: Number(totalScore.toFixed(3)),
        explanation: buildExplanation({
          cuisineMatch,
          priceMatch,
          tagMatches,
          distanceKm,
          rating: row.rating
        })
      };
    })
    .sort((a, b) => b.score - a.score);
}
