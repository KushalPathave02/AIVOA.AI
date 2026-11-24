from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://pharmaroot:pharmaroot@localhost:5432/pharmaroot"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "qwen/qwen3.8-27b"
    UPLOAD_DIR: str = "./uploads"

    class Config:
        env_file = ".env"


settings = Settings()
