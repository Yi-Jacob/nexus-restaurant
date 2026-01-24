import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

function buildQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) {
      search.set(key, value);
    }
  });
  return search.toString();
}

async function fetchBestMatch({ apiBaseUrl, query }) {
  const response = await fetch(`${apiBaseUrl}/best_match?${query}`);
  if (!response.ok) {
    throw new Error("Failed to load matches");
  }
  return response.json();
}

const defaultSearch = {
  city: "",
  state: "",
  lat: "",
  lng: "",
  radius_km: "25",
  cuisine: "",
  price_range: "",
  tags: ""
};

export default function ExternalInterface({ apiBaseUrl }) {
  const [formState, setFormState] = useState(defaultSearch);
  const [searchParams, setSearchParams] = useState(null);

  const queryString = useMemo(() => {
    if (!searchParams) {
      return "";
    }
    // Cache key includes all criteria so new inputs trigger a new fetch.
    return buildQuery(searchParams);
  }, [searchParams]);

  const matchesQuery = useQuery({
    // Query key is built from location + attributes for deterministic caching.
    queryKey: ["bestMatch", queryString],
    queryFn: () => fetchBestMatch({ apiBaseUrl, query: queryString }),
    // Disabled until user submits, preventing cache noise from typing.
    enabled: Boolean(queryString)
  });

  const handleChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const payload = {
      ...formState,
      city: formState.city.trim(),
      state: formState.state.trim(),
      cuisine: formState.cuisine.trim(),
      price_range: formState.price_range.trim(),
      tags: formState.tags.trim()
    };
    // New payload updates query key and invalidates previous cache entry.
    setSearchParams(payload);
  };

  const hasResults = matchesQuery.data?.results?.length > 0;
  const showEmptyState =
    matchesQuery.isSuccess && matchesQuery.data && matchesQuery.data.results.length === 0;

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>External Interface</h2>
          <p>Search the best matches based on location and preferences.</p>
        </div>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <h3>Search criteria</h3>
        <p className="muted">
          Enter a city/state or coordinates, plus optional cuisine and price preferences.
        </p>
        <div className="form-grid">
          <div className="field">
            <label>City (optional)</label>
            <input value={formState.city} onChange={handleChange("city")} placeholder="Optional" />
          </div>
          <div className="field">
            <label>State (optional)</label>
            <input value={formState.state} onChange={handleChange("state")} placeholder="Optional" />
          </div>
          <div className="field">
            <label>Latitude (optional)</label>
            <input value={formState.lat} onChange={handleChange("lat")} placeholder="Optional" />
          </div>
          <div className="field">
            <label>Longitude (optional)</label>
            <input value={formState.lng} onChange={handleChange("lng")} placeholder="Optional" />
          </div>
          <div className="field">
            <label>Radius (km)</label>
            <input value={formState.radius_km} onChange={handleChange("radius_km")} />
          </div>
          <div className="field">
            <label>Cuisine</label>
            <input value={formState.cuisine} onChange={handleChange("cuisine")} placeholder="e.g. Thai" />
          </div>
          <div className="field">
            <label>Price range</label>
            <input
              value={formState.price_range}
              onChange={handleChange("price_range")}
              placeholder="e.g. $$"
            />
          </div>
          <div className="field">
            <label>Tags</label>
            <input value={formState.tags} onChange={handleChange("tags")} placeholder="patio, vegan" />
          </div>
        </div>
        <button type="submit" className="primary">
          Find matches
        </button>
      </form>

      <div className="card">
        <h3>Results</h3>
        {!searchParams ? <p className="muted">Enter search criteria, then press Find matches.</p> : null}
        {matchesQuery.isLoading ? <p>Searching for matches...</p> : null}
        {matchesQuery.isError ? <p className="error">{matchesQuery.error.message}</p> : null}
        {showEmptyState ? (
          <p className="muted">
            No matches found. Try widening the radius or removing a filter.
          </p>
        ) : null}
        {hasResults ? (
          <div className="result-list">
            {matchesQuery.data.results.map((item) => (
              <div className="result-card" key={item.id}>
                <div className="result-header">
                  <h4>{item.name}</h4>
                  <span className="score">Score {item.score}</span>
                </div>
                <p className="muted">
                  {item.city}, {item.state} • {item.cuisine} • {item.price_range}
                </p>
                <p>Why this matched: {item.explanation}</p>
                <div className="tag-row">
                  {(item.tags || []).map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
