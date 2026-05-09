from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql://postgres:postgres@localhost:5432/racketmatch"
    supabase_jwt_secret: str = ""
    supabase_url: str = ""
    mock_auth_user_id: str | None = None
    cors_origins: str = "http://localhost:8081,http://127.0.0.1:8081"

    @property
    def supabase_jwks_url(self) -> str | None:
        if not self.supabase_url:
            return None
        base = self.supabase_url.rstrip("/")
        return f"{base}/auth/v1/.well-known/jwks.json"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
