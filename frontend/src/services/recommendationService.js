
const API_BASE_URL = "http://localhost:8000";

export async function fetchRecommendations() {
  const response = await fetch(
    `${API_BASE_URL}/api/recommendations`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch recommendations");
  }

  return await response.json();
}
