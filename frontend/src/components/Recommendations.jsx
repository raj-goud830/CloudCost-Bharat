
import { useEffect, useMemo, useState } from "react";
import { fetchRecommendations } from "../services/recommendationService";
import RecommendationCard from "./RecommendationCard";

export default function Recommendations() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [priority, setPriority] = useState("All");
  const [sortOrder, setSortOrder] = useState("highest");

  useEffect(() => {
    async function loadRecommendations() {
      try {
        setLoading(true);
        const result = await fetchRecommendations();
        setData(result);
      } catch (err) {
        setError(err.message || "Unable to load recommendations");
      } finally {
        setLoading(false);
      }
    }

    loadRecommendations();
  }, []);

  const recommendations = data?.recommendations || [];

  const filteredRecommendations = useMemo(() => {
    let result = [...recommendations];

    if (priority !== "All") {
      result = result.filter(
        (item) =>
          item.priority?.toLowerCase() === priority.toLowerCase()
      );
    }

    result.sort((a, b) => {
      const savingsA = Number(a.estimated_monthly_savings || 0);
      const savingsB = Number(b.estimated_monthly_savings || 0);

      return sortOrder === "highest"
        ? savingsB - savingsA
        : savingsA - savingsB;
    });

    return result;
  }, [recommendations, priority, sortOrder]);

  const totalSavings = recommendations.reduce(
    (total, item) =>
      total + Number(item.estimated_monthly_savings || 0),
    0
  );

  if (loading) {
    return <p>Loading recommendations...</p>;
  }

  if (error) {
    return <p className="error-message">{error}</p>;
  }

  return (
    <section className="recommendations-section">
      <div className="recommendation-summary">
        <div className="summary-card">
          <span>Total recommendations</span>
          <h2>{recommendations.length}</h2>
        </div>

        <div className="summary-card">
          <span>Potential monthly savings</span>
          <h2>₹{totalSavings.toLocaleString("en-IN")}</h2>
        </div>
      </div>

      <div className="recommendation-controls">
        <div>
          <label htmlFor="priority-filter">Filter by priority</label>
          <select
            id="priority-filter"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="All">All priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <div>
          <label htmlFor="savings-sort">Sort by savings</label>
          <select
            id="savings-sort"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="highest">Highest savings first</option>
            <option value="lowest">Lowest savings first</option>
          </select>
        </div>
      </div>

      <p className="results-count">
        Showing {filteredRecommendations.length} of{" "}
        {recommendations.length} recommendations
      </p>

      {filteredRecommendations.length > 0 ? (
        <div className="recommendations-grid">
          {filteredRecommendations.map((item) => (
            <RecommendationCard key={item.resource_id} item={item} />
          ))}
        </div>
      ) : (
        <p className="empty-recommendations">
          No recommendations found for this priority.
        </p>
      )}

      <p className="demo-disclaimer">
        Demo mode: savings estimates are illustrative and are not actual
        AWS billing figures.
      </p>
    </section>
  );
}
