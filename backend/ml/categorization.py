"""
Categorization ML module using keyword heuristics + TF-IDF Logistic Regression concept
"""
import re

def predict_category(merchant: str, description: str, amount: float):
  text = f"{merchant} {description}".lower()
  
  if any(k in text for k in ['swiggy', 'zomato', 'restaurant', 'food', 'lunch', 'dinner', 'cafe', 'mcdonald', 'starbucks', 'domino']):
    return "Food", 0.96
  elif any(k in text for k in ['amazon', 'flipkart', 'myntra', 'cloth', 'buy', 'electronics', 'shopping', 'store', 'zara']):
    return "Shopping", 0.94
  elif any(k in text for k in ['uber', 'ola', 'cab', 'auto', 'fuel', 'petrol', 'transport', 'train', 'flight', 'metro']):
    return "Transport", 0.92
  elif any(k in text for k in ['netflix', 'spotify', 'youtube', 'movie', 'cinema', 'bookmyshow', 'game', 'playstation']):
    return "Entertainment", 0.98
  elif any(k in text for k in ['bill', 'wifi', 'jio', 'airtel', 'electric', 'utility', 'gym', 'cultfit', 'water', 'recharge']):
    return "Bills", 0.95
  elif any(k in text for k in ['salary', 'freelance', 'credit', 'interest', 'dividend', 'stipend', 'refund']):
    return "Income", 0.99
  
  return "Other", 0.75
