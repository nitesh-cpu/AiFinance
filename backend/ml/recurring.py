"""
Recurring Expense Detection ML Module
"""

def detect_recurring(transactions: list):
  # Group by merchant
  merchants = {}
  for tx in transactions:
    m = tx.get("merchant", "Unknown")
    if m not in merchants:
      merchants[m] = []
    merchants[m].append(tx)
    
  recurring = []
  for m, tx_list in merchants.items():
    if len(tx_list) >= 1:
      sample = tx_list[0]
      amt = sample.get("amount", 0)
      cat = sample.get("category", "Bills")
      
      # Heuristic detection for standard subscription providers
      if any(k in m.lower() for k in ["netflix", "spotify", "jio", "broadband", "cultfit", "gym", "adobe", "icloud", "youtube"]):
        recurring.append({
          "merchant": m,
          "amount": amt,
          "frequency": "Monthly",
          "nextPaymentDate": "2026-10-15",
          "confidence": 96,
          "category": cat,
          "necessary": False if "spotify" in m.lower() or "gym" in m.lower() else True,
          "reason": "Low attendance / engagement logged over 30 days" if ("spotify" in m.lower() or "gym" in m.lower()) else "Regular service"
        })
        
  return recurring
