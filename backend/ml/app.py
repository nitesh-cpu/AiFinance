import hmac
import logging
import math
import os
from contextlib import asynccontextmanager

from fastapi import Body, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional

from categorization import predict_category
from anomaly import detect_anomaly
from recurring import detect_recurring
from forecast import generate_forecast

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO").upper())
logger = logging.getLogger("spendsense.ml")


@asynccontextmanager
async def lifespan(_app):
    logger.info("ML service started")
    yield


app = FastAPI(title="SpendSense ML Microservice", version="1.0.0", lifespan=lifespan)

allowed_origins = [
    origin.strip()
    for origin in os.getenv("ML_ALLOWED_ORIGINS", "http://localhost:5174").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CategorizeRequest(BaseModel):
    merchant: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default="", max_length=500)
    amount: float = Field(gt=0, le=1_000_000_000)

class AnomalyRequest(BaseModel):
    merchant: str = Field(min_length=1, max_length=200)
    amount: float = Field(gt=0, le=1_000_000_000)
    category: str = Field(min_length=1, max_length=100)
    historical_amounts: Optional[List[float]] = Field(default=None, max_length=120)

class ForecastRequest(BaseModel):
    currentSpending: float = Field(ge=0, le=1_000_000_000)
    daysPassed: Optional[int] = Field(default=10, ge=1, le=31)
    historicalSpending: Optional[List[float]] = Field(default=None, max_length=6)
    horizon: Optional[int] = Field(default=1, ge=1, le=3)


@app.middleware("http")
async def protect_service_requests(request: Request, call_next):
    if request.method == "GET" and request.url.path == "/":
        return await call_next(request)

    service_key = os.getenv("ML_API_KEY")
    supplied_key = request.headers.get("X-ML-Service-Key", "")
    if os.getenv("NODE_ENV") == "production" and (
        not service_key or len(service_key) < 32
    ):
        logger.error("A 32-character ML_API_KEY is required in production")
        return JSONResponse(status_code=503, content={"detail": "ML service is not configured"})
    if service_key and not hmac.compare_digest(supplied_key, service_key):
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    try:
        return await call_next(request)
    except Exception as error:
        logger.error(
            "ML request failed method=%s path=%s error=%s",
            request.method,
            request.url.path,
            type(error).__name__,
        )
        return JSONResponse(status_code=500, content={"detail": "ML request failed"})

@app.get("/")
def health_check():
    return {"status": "ok", "service": "SpendSense FastAPI ML Engine"}

@app.post("/ml/categorize")
def api_categorize(req: CategorizeRequest):
    category, confidence = predict_category(req.merchant, req.description or "", req.amount)
    return {"category": category, "confidence": confidence}

@app.post("/ml/anomaly")
def api_anomaly(req: AnomalyRequest):
    if req.historical_amounts is not None and any(
        not math.isfinite(amount) or amount <= 0 for amount in req.historical_amounts
    ):
        return JSONResponse(status_code=422, content={"detail": "Historical amounts must be finite positive numbers"})
    res = detect_anomaly(req.amount, req.merchant, req.category, req.historical_amounts)
    return res

@app.post("/ml/recurring")
def api_recurring(transactions: List[dict] = Body(max_length=1000)):
    for transaction in transactions:
        merchant = transaction.get("merchant", transaction.get("description", ""))
        amount = transaction.get("amount")
        category = transaction.get("category", "")
        if (
            not isinstance(merchant, str)
            or not merchant.strip()
            or len(merchant) > 200
            or not isinstance(amount, (int, float))
            or not math.isfinite(amount)
            or amount <= 0
            or not isinstance(category, str)
            or len(category) > 100
        ):
            return JSONResponse(status_code=422, content={"detail": "Recurring transaction data is invalid"})
    res = detect_recurring(transactions)
    return {"recurring": res}

@app.post("/ml/forecast")
def api_forecast(req: ForecastRequest):
    if req.historicalSpending is not None and any(
        not math.isfinite(amount) or amount < 0 for amount in req.historicalSpending
    ):
        return JSONResponse(status_code=422, content={"detail": "Historical spending must be finite non-negative numbers"})
    res = generate_forecast(
        req.currentSpending,
        req.daysPassed or 10,
        historical_spending=req.historicalSpending,
        horizon=req.horizon or 1,
    )
    return res

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8001")))
