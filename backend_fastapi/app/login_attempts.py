"""Учёт неудачных попыток входа — чтобы решить, когда логину пора начать
требовать капчу (после нескольких подряд неверных попыток для одного и того
же логина/email). Не токен блокировки и не бан — просто триггер для капчи.

Как и капча, хранится в памяти процесса (dict), не в БД: это временные
данные для одного uvicorn-воркера, переживать перезапуск сервера им не нужно.
Для многопроцессного/многомашинного деплоя потребовался бы Redis — здесь это
избыточно.

Ключ — нормализованный (lowercased/trimmed) username_or_email, а не user.id,
потому что список неудачных попыток должен расти и для логинов, которых
вообще не существует в базе (иначе капчу можно было бы обойти, просто
подбирая несуществующие имена — тогда счётчик никогда бы не заводился).
"""

import time
from threading import Lock

# После скольких неудачных попыток подряд для одного логина требуем капчу.
LOGIN_CAPTCHA_THRESHOLD = 3

# Окно, в течение которого подряд идущие неудачи считаются одной серией.
# Если пользователь долго не пытался — счётчик обнуляется сам по себе.
ATTEMPTS_WINDOW_SECONDS = 15 * 60

_MAX_STORE_SIZE = 5000

_attempts: dict[str, tuple[int, float]] = {}  # key -> (count, last_attempt_at)
_lock = Lock()


def _normalize(username_or_email: str) -> str:
    return username_or_email.strip().lower()


def _purge_stale(now: float) -> None:
    stale = [
        key
        for key, (_, last_at) in _attempts.items()
        if now - last_at > ATTEMPTS_WINDOW_SECONDS
    ]
    for key in stale:
        _attempts.pop(key, None)


def needs_captcha(username_or_email: str) -> bool:
    key = _normalize(username_or_email)
    now = time.time()
    with _lock:
        entry = _attempts.get(key)
        if entry is None:
            return False
        count, last_at = entry
        if now - last_at > ATTEMPTS_WINDOW_SECONDS:
            return False
        return count >= LOGIN_CAPTCHA_THRESHOLD


def record_failure(username_or_email: str) -> None:
    key = _normalize(username_or_email)
    now = time.time()
    with _lock:
        if len(_attempts) >= _MAX_STORE_SIZE:
            _purge_stale(now)
        count, last_at = _attempts.get(key, (0, now))
        if now - last_at > ATTEMPTS_WINDOW_SECONDS:
            count = 0
        _attempts[key] = (count + 1, now)


def record_success(username_or_email: str) -> None:
    key = _normalize(username_or_email)
    with _lock:
        _attempts.pop(key, None)
