import unittest

from anomaly import detect_anomaly
from forecast import generate_forecast


class AnomalyTests(unittest.TestCase):
    def test_requires_real_historical_baseline(self):
        result = detect_anomaly(900, "Market", "Food")
        self.assertFalse(result["is_anomaly"])
        self.assertTrue(result["insufficient_data"])

    def test_flags_spending_outside_personal_baseline(self):
        result = detect_anomaly(900, "Market", "Food", [100, 110, 120])
        self.assertTrue(result["is_anomaly"])
        self.assertEqual(result["usual_range"], "₹100 – ₹120")


class ForecastTests(unittest.TestCase):
    def test_projects_from_supplied_history_without_fixed_recurring_amount(self):
        result = generate_forecast(1200, historical_spending=[1000, 1100, 1200], horizon=3)
        self.assertEqual(
            [month["predictedSpending"] for month in result["forecasts"]],
            [1300.0, 1400.0, 1500.0],
        )
        self.assertEqual(result["factors"], ["Trend calculated from 3 completed months of your spending history"])

    def test_preserves_existing_in_progress_forecast_contract(self):
        result = generate_forecast(1000, days_passed=10, total_days=30)
        self.assertEqual(result["predictedSpending"], 3000.0)


if __name__ == "__main__":
    unittest.main()
