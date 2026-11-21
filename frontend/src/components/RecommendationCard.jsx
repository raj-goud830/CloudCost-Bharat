
function RecommendationCard({ item }) {
  const priorityClass = item.priority.toLowerCase();

  return (
    <div className="recommendation-card">
      <div className="recommendation-header">
        <div>
          <h3>{item.issue}</h3>
          <p>{item.resource_name}</p>
        </div>

        <span className={`priority-badge ${priorityClass}`}>
          {item.priority}
        </span>
      </div>

      <div className="recommendation-details">
        <p>Resource: {item.resource_type}</p>
        <p>Region: {item.region}</p>
        <p>
          Monthly cost: ₹
          {Number(item.monthly_cost).toLocaleString("en-IN")}
        </p>
      </div>

      <div className="estimated-savings">
        <span>Potential monthly savings</span>
        <strong>
          ₹{Number(item.estimated_monthly_savings).toLocaleString("en-IN")}
        </strong>
      </div>

      <p className="recommendation-action">
        {item.recommendation}
      </p>
    </div>
  );
}

export default RecommendationCard;
