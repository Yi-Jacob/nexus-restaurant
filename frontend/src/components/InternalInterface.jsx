import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

function buildQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) {
      search.set(key, value);
    }
  });
  return search.toString();
}

function formatTags(tags) {
  if (!Array.isArray(tags)) {
    return "";
  }
  return tags.join(", ");
}

function parseTags(value) {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

async function fetchInternalRestaurants({ apiBaseUrl, apiKey, filters }) {
  const query = buildQuery(filters);
  const response = await fetch(`${apiBaseUrl}/restaurants?${query}`, {
    headers: {
      "x-api-key": apiKey
    }
  });
  if (!response.ok) {
    throw new Error("Failed to load restaurants");
  }
  return response.json();
}

async function fetchSummary({ apiBaseUrl, apiKey }) {
  const response = await fetch(`${apiBaseUrl}/restaurants/summary`, {
    headers: {
      "x-api-key": apiKey
    }
  });
  if (!response.ok) {
    throw new Error("Failed to load summary");
  }
  return response.json();
}

async function createRestaurant({ apiBaseUrl, apiKey, payload }) {
  const response = await fetch(`${apiBaseUrl}/restaurants`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("Failed to create restaurant");
  }
  return response.json();
}

async function updateRestaurant({ apiBaseUrl, apiKey, id, payload }) {
  const response = await fetch(`${apiBaseUrl}/restaurants/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("Failed to update restaurant");
  }
  return response.json();
}

const defaultForm = {
  name: "",
  city: "",
  state: "",
  latitude: "",
  longitude: "",
  cuisine: "",
  price_range: "",
  tags: "",
  rating: "",
  notes: ""
};

export default function InternalInterface({ apiBaseUrl }) {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState("dev-internal-key");
  const [filters, setFilters] = useState({
    cuisine: "",
    city: "",
    min_rating: "",
    sort: "rating_desc"
  });
  const [formState, setFormState] = useState(defaultForm);
  const [editingId, setEditingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const filterQuery = useMemo(() => ({ ...filters }), [filters]);

  const restaurantsQuery = useQuery({
    queryKey: ["restaurants", apiKey, filterQuery],
    queryFn: () => fetchInternalRestaurants({ apiBaseUrl, apiKey, filters: filterQuery }),
    enabled: Boolean(apiKey)
  });

  const summaryQuery = useQuery({
    queryKey: ["restaurantsSummary", apiKey],
    queryFn: () => fetchSummary({ apiBaseUrl, apiKey }),
    enabled: Boolean(apiKey)
  });

  const mutation = useMutation({
    mutationFn: (payload) => {
      if (editingId) {
        return updateRestaurant({ apiBaseUrl, apiKey, id: editingId, payload });
      }
      return createRestaurant({ apiBaseUrl, apiKey, payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      queryClient.invalidateQueries({ queryKey: ["restaurantsSummary"] });
      setFormState(defaultForm);
      setEditingId(null);
      setErrorMessage("");
    },
    onError: (error) => {
      setErrorMessage(error.message);
    }
  });

  const isSaving = mutation.isPending;

  const cuisineOptions = useMemo(() => {
    if (!restaurantsQuery.data) {
      return [];
    }
    const set = new Set(restaurantsQuery.data.map((item) => item.cuisine));
    return Array.from(set);
  }, [restaurantsQuery.data]);

  const handleFormChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleFilterChange = (field) => (event) => {
    setFilters((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleEdit = (restaurant) => {
    setEditingId(restaurant.id);
    setFormState({
      name: restaurant.name || "",
      city: restaurant.city || "",
      state: restaurant.state || "",
      latitude: restaurant.latitude ?? "",
      longitude: restaurant.longitude ?? "",
      cuisine: restaurant.cuisine || "",
      price_range: restaurant.price_range || "",
      tags: formatTags(restaurant.tags),
      rating: restaurant.rating ?? "",
      notes: restaurant.notes || ""
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormState(defaultForm);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const payload = {
      name: formState.name.trim(),
      city: formState.city.trim(),
      state: formState.state.trim(),
      latitude: formState.latitude ? Number(formState.latitude) : null,
      longitude: formState.longitude ? Number(formState.longitude) : null,
      cuisine: formState.cuisine.trim(),
      price_range: formState.price_range.trim(),
      tags: parseTags(formState.tags),
      rating: formState.rating ? Number(formState.rating) : null,
      notes: formState.notes.trim()
    };
    mutation.mutate(payload);
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>Internal Interface</h2>
          <p>Manage restaurant data and review internal summaries.</p>
        </div>
        <div className="field">
          <label htmlFor="apiKey">API key</label>
          <input id="apiKey" value={apiKey} onChange={(event) => setApiKey(event.target.value)} />
        </div>
      </div>

      <div className="grid-2">
        <form className="card" onSubmit={handleSubmit}>
          <h3>{editingId ? "Edit Restaurant" : "Create Restaurant"}</h3>
          <p className="muted">Required fields: name, city, state, cuisine, price range.</p>
          <div className="form-grid">
            <div className="field">
              <label>Name</label>
              <input value={formState.name} onChange={handleFormChange("name")} required />
            </div>
            <div className="field">
              <label>City</label>
              <input value={formState.city} onChange={handleFormChange("city")} required />
            </div>
            <div className="field">
              <label>State</label>
              <input value={formState.state} onChange={handleFormChange("state")} required />
            </div>
            <div className="field">
              <label>Latitude</label>
              <input value={formState.latitude} onChange={handleFormChange("latitude")} />
            </div>
            <div className="field">
              <label>Longitude</label>
              <input value={formState.longitude} onChange={handleFormChange("longitude")} />
            </div>
            <div className="field">
              <label>Cuisine</label>
              <input value={formState.cuisine} onChange={handleFormChange("cuisine")} required />
            </div>
            <div className="field">
              <label>Price range</label>
              <input value={formState.price_range} onChange={handleFormChange("price_range")} required />
            </div>
            <div className="field">
              <label>Tags</label>
              <input value={formState.tags} onChange={handleFormChange("tags")} placeholder="patio, vegan" />
            </div>
            <div className="field">
              <label>Rating</label>
              <input value={formState.rating} onChange={handleFormChange("rating")} />
            </div>
            <div className="field">
              <label>Notes</label>
              <textarea value={formState.notes} onChange={handleFormChange("notes")} rows={3} />
            </div>
          </div>
          {errorMessage ? <div className="error">{errorMessage}</div> : null}
          <div className="button-row">
            <button type="submit" className="primary" disabled={isSaving}>
              {isSaving ? "Saving..." : editingId ? "Save changes" : "Add restaurant"}
            </button>
            {editingId ? (
              <button type="button" className="secondary" onClick={handleCancelEdit}>
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>

        <div className="card">
          <h3>Filters & Summaries</h3>
          <p className="muted">Filters apply instantly to the list.</p>
          <div className="form-grid">
            <div className="field">
              <label>Cuisine filter</label>
              <select value={filters.cuisine} onChange={handleFilterChange("cuisine")}>
                <option value="">All</option>
                {cuisineOptions.map((cuisine) => (
                  <option key={cuisine} value={cuisine}>
                    {cuisine}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>City filter</label>
              <input value={filters.city} onChange={handleFilterChange("city")} placeholder="Optional" />
            </div>
            <div className="field">
              <label>Minimum rating</label>
              <input value={filters.min_rating} onChange={handleFilterChange("min_rating")} />
            </div>
            <div className="field">
              <label>Sort</label>
              <select value={filters.sort} onChange={handleFilterChange("sort")}>
                <option value="rating_desc">Rating (high → low)</option>
                <option value="city_asc">City (A → Z)</option>
              </select>
            </div>
          </div>
          <div className="summary">
            <h4>Count by cuisine</h4>
            {summaryQuery.isLoading ? <p>Loading summary...</p> : null}
            {summaryQuery.isError ? <p className="error">{summaryQuery.error.message}</p> : null}
            {summaryQuery.data?.countByCuisine?.length ? (
              <ul>
                {summaryQuery.data.countByCuisine.map((row) => (
                  <li key={row.cuisine}>
                    {row.cuisine}: {row.count}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No summary yet.</p>
            )}
            <h4>Average rating by city</h4>
            {summaryQuery.data?.avgRatingByCity?.length ? (
              <ul>
                {summaryQuery.data.avgRatingByCity.map((row) => (
                  <li key={`${row.city}-${row.state}`}>
                    {row.city}, {row.state}: {row.avg_rating}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No ratings yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Restaurant list</h3>
        {restaurantsQuery.data ? (
          <p className="muted">Showing {restaurantsQuery.data.length} restaurants.</p>
        ) : null}
        {restaurantsQuery.isLoading ? <p>Loading restaurants...</p> : null}
        {restaurantsQuery.isError ? <p className="error">{restaurantsQuery.error.message}</p> : null}
        {restaurantsQuery.data?.length ? (
          <div className="table">
            <div className="table-row table-header">
              <span>Name</span>
              <span>Location</span>
              <span>Cuisine</span>
              <span>Price</span>
              <span>Rating</span>
              <span>Tags</span>
              <span></span>
            </div>
            {restaurantsQuery.data.map((restaurant) => (
              <div className="table-row" key={restaurant.id}>
                <span>{restaurant.name}</span>
                <span>
                  {restaurant.city}, {restaurant.state}
                </span>
                <span>{restaurant.cuisine}</span>
                <span>{restaurant.price_range}</span>
                <span>{restaurant.rating ?? "-"}</span>
                <span>{formatTags(restaurant.tags)}</span>
                <span>
                  <button type="button" className="link" onClick={() => handleEdit(restaurant)}>
                    Edit
                  </button>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No restaurants yet. Add one to get started.</p>
        )}
      </div>
    </div>
  );
}
