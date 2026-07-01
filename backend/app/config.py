from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    cognito_user_pool_id: str
    cognito_client_id: str
    cognito_region: str = "ap-northeast-1"

    class Config:
        env_file = ".env"

settings = Settings()
