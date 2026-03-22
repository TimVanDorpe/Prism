from dotenv import load_dotenv
load_dotenv()  # laadt .env in os.environ zodat LangChain de vars kan lezen
from fastapi import FastAPI
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from core.limiter import limiter
from api.routes import router

app = FastAPI(title="Prism Comparison Service", version="1.0.0")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(router)
