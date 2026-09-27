from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Официальный тестовый секретный ключ Google reCAPTCHA v2 — капча с ним
# пропускает всех. Используется по умолчанию, чтобы проект запускался
# локально без регистрации ключей. В продакшене обязательно задать свой
# RECAPTCHA_SECRET_KEY в .env (см. app/captcha.py, DEPLOY_CHECKLIST.md).
GOOGLE_RECAPTCHA_TEST_SECRET_KEY = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe"


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

    # --- Аватар профиля (см. app/routers/auth.py, update_profile) ---
    # Храним как data-URI (base64) прямо в колонке users.avatar, поэтому
    # ограничиваем итоговый размер строки на уровне схемы — иначе кто угодно
    # мог бы залить многомегабайтную "картинку" прямо в БД.
    avatar_max_bytes: int = 1_500_000  # ~1.5 МБ на исходный файл до base64

    # --- SEO (см. app/routers/sitemap.py) ---
    # Домен сайта для абсолютных ссылок в sitemap.xml (<loc>, hreflang alternates).
    # it-hlp.ru — временная заглушка, пока сайт не задеплоен на реальный домен
    # (см. также frontend/src/seoConfig.js — там та же заглушка для canonical/
    # og:url; при смене домена поменять нужно в ОБОИХ местах).
    site_base_url: str = "https://it-hlp.ru"

    # --- Google reCAPTCHA v2 (см. app/captcha.py) ---
    # Секретный ключ — только на бэкенде, на фронтенд не попадает никогда.
    recaptcha_secret_key: str = GOOGLE_RECAPTCHA_TEST_SECRET_KEY

    # --- Вход через Google / GitHub (см. app/routers/oauth.py) ---
    # Адрес самого бэкенда снаружи — из него собираются адреса возврата
    # (redirect URI) вида {backend_base_url}/auth/oauth/google/callback. Они
    # должны В ТОЧНОСТИ совпадать с тем, что указано в настройках приложения
    # у Google/GitHub, иначе те откажут с redirect_uri_mismatch.
    backend_base_url: str = "http://localhost:8000"
    # Пусто — провайдер выключен: кнопки входа через него на сайте не появятся.
    google_client_id: str = ""
    google_client_secret: str = ""
    github_client_id: str = ""
    github_client_secret: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_prefix="", case_sensitive=False)

    @field_validator("recaptcha_secret_key")
    @classmethod
    def _recaptcha_default_if_empty(cls, value: str) -> str:
        # Пустая строка в .env (RECAPTCHA_SECRET_KEY=) — то же самое, что
        # "не задано": берём тестовый ключ, а не отправляем в Google пустой
        # секрет, из-за которого любая капча считалась бы непройденной.
        return value.strip() or GOOGLE_RECAPTCHA_TEST_SECRET_KEY

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
