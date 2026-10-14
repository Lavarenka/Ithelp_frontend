from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Article, Tag

router = APIRouter(tags=["sitemap"])

# Статичные страницы сайта, которые стоит индексировать (см. решение по SEO —
# "только мета-теги и техничка"). /favorites, /profile, /verify-email сюда
# намеренно не входят — они noindex (см. SeoHead noindex в соответствующих
# компонентах фронтенда), персональный/служебный контент.
STATIC_PATHS = ["/", "/about"]


def _loc(path: str, lang: str) -> str:
    """Адрес страницы на нужном языке. Английская версия — основная и
    открывается без параметров (так сайт выглядит для поисковика: у него нет
    куки с языком), русская — тот же путь с ?lang=ru (см. i18n/index.js на
    фронтенде: параметр в адресе важнее куки). Должно совпадать с pageUrl()
    в hlp_react/src/seoConfig.js — иначе canonical на странице и адрес в
    sitemap разойдутся."""
    base = f"{settings.site_base_url}{path}"
    return base if lang == "en" else f"{base}?lang={lang}"


def _url_entries(path: str, *, has_en: bool = True, lastmod: str | None = None) -> list[str]:
    """<url>-записи для одной страницы. Если есть английский перевод — две
    записи (EN и RU), и каждая перечисляет обе языковые версии через hreflang
    плюс x-default на английскую (так требует Google: языковые версии должны
    ссылаться друг на друга). Если перевода нет (en-поля пустые, роутер
    отдаёт русский текст как запасной вариант), в sitemap попадает только
    русский адрес и без hreflang — иначе поисковик получил бы два адреса с
    одним и тем же русским текстом."""
    langs = ["en", "ru"] if has_en else ["ru"]
    lastmod_tag = f"\n    <lastmod>{lastmod}</lastmod>" if lastmod else ""
    alternates = ""
    if has_en:
        alternates = "".join(
            f'\n    <xhtml:link rel="alternate" hreflang="{lang}" href="{escape(_loc(path, lang))}" />'
            for lang in langs
        )
        alternates += (
            f'\n    <xhtml:link rel="alternate" hreflang="x-default" '
            f'href="{escape(_loc(path, "en"))}" />'
        )
    return [
        f"  <url>\n    <loc>{escape(_loc(path, lang))}</loc>{lastmod_tag}{alternates}\n  </url>"
        for lang in langs
    ]


# GET и HEAD: FastAPI сам HEAD для @router.get не добавляет, а curl -I и часть
# проверялок шлют именно его — без этого они получали бы 405.
@router.api_route("/sitemap.xml", methods=["GET", "HEAD"])
def sitemap(db: Session = Depends(get_db)):
    """Генерируется на лету из текущей БД (без кэша — трафика на sitemap.xml
    мало, а актуальность важнее). Отдаёт полный urlset: статичные страницы +
    все статьи + все теги, каждая страница — в EN- и RU-версии с
    hreflang-alternates (см. _url_entries).

    Снаружи отдаётся с основного домена (https://it-hlp.com/sitemap.xml) —
    nginx проксирует этот путь на бэкенд (см. deploy/nginx/user_conf.d/site.conf).
    Sitemap обязан лежать на том же домене, что и страницы в нём, иначе Google
    его не примет."""
    entries: list[str] = []
    for path in STATIC_PATHS:
        entries += _url_entries(path)

    articles = db.execute(
        select(Article.id, Article.created_at, Article.title_en, Article.content_en)
    ).all()
    for article_id, created_at, title_en, content_en in articles:
        lastmod = created_at.date().isoformat() if created_at else None
        entries += _url_entries(
            f"/articles/{article_id}",
            has_en=bool(title_en and content_en),
            lastmod=lastmod,
        )

    tags = db.execute(select(Tag.slug, Tag.name_en)).all()
    for slug, name_en in tags:
        entries += _url_entries(f"/tags/{slug}", has_en=bool(name_en))

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
        'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
        + "\n".join(entries)
        + "\n</urlset>\n"
    )
    return Response(content=xml, media_type="application/xml")
