from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.6-flash"
    replicate_api_token: str = ""
    # Free, key-less AI image generation (Flux-backed) used when no Replicate
    # token is configured. Set to "false" to disable and only use placeholders.
    use_pollinations: bool = True
    database_url: str = "sqlite+aiosqlite:///./design_studio.db"
    asset_storage_dir: str = "./storage"
    frontend_origin: str = "http://localhost:5173"


settings = Settings()
