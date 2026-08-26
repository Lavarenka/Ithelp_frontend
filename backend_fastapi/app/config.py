from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./hlp.db"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # JWT-авторизация. secret_key в проде обязательно переопределить через .env —
    # значение по умолчанию годится только для локальной разработки.
    secret_key: str = "dev-secret-key-change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 дней

    # --- Подтверждение email при регистрации (см. app/mailer.py) ---
    # SMTP не настроен по умолчанию — email просто не отправится (пишем в
    # лог и молча продолжаем, регистрация не должна падать из-за почты).
    smtp_host: str = ""
    smtp_port: int = 465
    smtp_username: str = ""
    smtp_password: str = ""
    # Адрес и имя отправителя в письме. Если пусто — используется smtp_username.
    smtp_from: str = ""
    smtp_from_name: str = "it_hlp"

    # Ссылка в письме ведёт на фронтенд, а не на бэкенд напрямую — страница
    # /verify-email там сама дёргает API и показывает результат пользователю.
    frontend_base_url: str = "http://localhost:5173"
    email_verification_expire_hours: int = 48

    model_config = SettingsConfigDict(env_file=".env", env_prefix="", case_sensitive=False)

    @property
    def smtp_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_username and self.smtp_password)

    @property
    def smtp_from_address(self) -> str:
        return self.smtp_from or self.smtp_username

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
