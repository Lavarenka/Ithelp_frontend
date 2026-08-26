"""Простая капча "реши пример" — без сторонних сервисов и API-ключей.

Как это работает:
1. Фронтенд запрашивает GET /auth/captcha — получает {id, question}.
2. Ответ (число) хранится только на сервере, в памяти процесса, привязанный
   к id и с TTL в несколько минут — клиенту он никогда не отправляется.
3. При регистрации/логине клиент присылает {captcha_id, captcha_answer};
   verify_captcha сверяет с сохранённым ответом и одноразово "сжигает" challenge
   (повторно использовать тот же id нельзя — защита от повторной отправки формы).

Это осознанно не "настоящая" капча уровня reCAPTCHA — она не отличит человека
от продвинутого бота, читающего JS. Но контрольная проверка на бэкенде (а не
только чекбокс на фронте) уже отсекает самый частый случай: прямой POST-запрос
на /auth/register в обход формы, который не подтягивает вопрос и не решает его.

Хранилище — простой dict в памяти процесса. Для одного uvicorn-воркера (как тут)
этого достаточно; при масштабировании на несколько процессов/машин потребуется
вынести в Redis или БД — но для этого проекта это избыточно.
"""

import random
import string
import time
from threading import Lock

CAPTCHA_TTL_SECONDS = 5 * 60  # challenge живёт 5 минут, потом протухает
_MAX_STORE_SIZE = 5000  # защита от неограниченного роста памяти, если challenge никто не решает

_store: dict[str, tuple[int, float]] = {}  # captcha_id -> (answer, expires_at)
_lock = Lock()


def _generate_id() -> str:
    return "".join(random.choices(string.ascii_letters + string.digits, k=24))


def _purge_expired(now: float) -> None:
    expired = [cid for cid, (_, exp) in _store.items() if exp < now]
    for cid in expired:
        _store.pop(cid, None)


def create_captcha() -> tuple[str, str, int]:
    """Возвращает (captcha_id, question, answer). answer наружу (в HTTP-ответ)
    не идёт — только question; answer нужен только вызывающему коду в тестах."""
    a = random.randint(1, 9)
    b = random.randint(1, 9)
    answer = a + b
    question = f"{a} + {b}"

    now = time.time()
    with _lock:
        if len(_store) >= _MAX_STORE_SIZE:
            _purge_expired(now)
        captcha_id = _generate_id()
        _store[captcha_id] = (answer, now + CAPTCHA_TTL_SECONDS)

    return captcha_id, question, answer


def verify_captcha(captcha_id: str | None, answer: int | None) -> bool:
    """Одноразовая проверка: challenge удаляется независимо от результата —
    повторно предъявить тот же captcha_id (даже с верным ответом) нельзя."""
    if not captcha_id or answer is None:
        return False

    now = time.time()
    with _lock:
        entry = _store.pop(captcha_id, None)

    if entry is None:
        return False
    expected_answer, expires_at = entry
    if expires_at < now:
        return False
    return answer == expected_answer
