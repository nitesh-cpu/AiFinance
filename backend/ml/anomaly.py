"""Historical transaction-baseline anomaly detection."""

def detect_anomaly(amount: float, merchant: str, category: str, historical_amounts: list = None):
  historical_amounts = [value for value in (historical_amounts or []) if value > 0]
  if len(historical_amounts) < 3:
    return {
      "is_anomaly": False,
      "score": 0.0,
      "confidence": 0,
      "severity": "Low",
      "usual_range": "Insufficient transaction history",
      "difference_percentage": "+0%",
      "reasons": [],
      "insufficient_data": True
    }

  avg_amount = sum(historical_amounts) / len(historical_amounts)
  ratio = amount / max(avg_amount, 1.0)
  
  if ratio >= 3.0:
    diff_pct = int((ratio - 1) * 100)
    return {
      "is_anomaly": True,
      "score": round(min(0.99, 0.70 + (ratio * 0.05)), 2),
      "confidence": 94,
      "severity": "High" if ratio > 5 else "Medium",
      "usual_range": f"₹{int(min(historical_amounts))} – ₹{int(max(historical_amounts))}",
      "difference_percentage": f"+{diff_pct}%",
      "reasons": [
        f"Amount ({amount}) is significantly higher than your normal {merchant} baseline ({int(avg_amount)}).",
        f"Similar transactions usually range between ₹{int(min(historical_amounts))} and ₹{int(max(historical_amounts))}.",
        f"Compared with {len(historical_amounts)} prior {category} transactions."
      ]
    }
    
  return {
    "is_anomaly": False,
    "score": 0.1,
    "confidence": 95,
    "severity": "Low",
    "usual_range": f"₹{int(min(historical_amounts))} – ₹{int(max(historical_amounts))}",
    "difference_percentage": "+0%",
    "reasons": []
  }
