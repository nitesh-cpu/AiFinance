"""
Time-Series Forecasting ML Module
"""

def generate_forecast(
  current_spending: float,
  days_passed: int = 10,
  total_days: int = 30,
  historical_spending: list = None,
  horizon: int = 1
):
  if historical_spending and len(historical_spending) >= 2:
    values = [max(0.0, float(value)) for value in historical_spending[-6:]]
    count = len(values)
    x_mean = (count - 1) / 2
    y_mean = sum(values) / count
    denominator = sum((index - x_mean) ** 2 for index in range(count))
    slope = sum((index - x_mean) * (value - y_mean) for index, value in enumerate(values)) / denominator
    intercept = y_mean - slope * x_mean
    residuals = [value - (intercept + slope * index) for index, value in enumerate(values)]
    spread = (sum(residual ** 2 for residual in residuals) / count) ** 0.5
    forecasts = []

    for month in range(1, max(1, min(horizon, 3)) + 1):
      predicted = max(0.0, intercept + slope * (count - 1 + month))
      uncertainty = spread * (1 + month * 0.25)
      forecasts.append({
        "monthOffset": month,
        "predictedSpending": round(predicted, 2),
        "lowerBound": round(max(0.0, predicted - uncertainty), 2),
        "upperBound": round(predicted + uncertainty, 2),
        "confidence": max(35, min(90, round(90 - spread / max(y_mean, 1) * 100))),
      })

    first = forecasts[0]
    return {
      "currentSpending": current_spending,
      "predictedSpending": first["predictedSpending"],
      "lowerBound": first["lowerBound"],
      "upperBound": first["upperBound"],
      "confidence": first["confidence"] / 100,
      "factors": [f"Trend calculated from {count} completed months of your spending history"],
      "forecasts": forecasts,
    }

  if days_passed <= 0:
    days_passed = 10

  days_passed = min(days_passed, total_days)
  daily_velocity = current_spending / days_passed
  remaining_days = total_days - days_passed
  projected = current_spending + (daily_velocity * remaining_days)

  return {
    "currentSpending": current_spending,
    "predictedSpending": round(projected, 2),
    "lowerBound": round(projected - 1200, 2),
    "upperBound": round(projected + 1200, 2),
    "confidence": 0.92,
    "factors": [
      f"Your {days_passed}-day spending pace",
      f"{remaining_days} remaining calendar days in the current cycle"
    ]
  }
