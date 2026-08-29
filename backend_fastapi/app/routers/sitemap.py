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


def _url_entry(path: str, *, lastmod: str | None = None) -> str:
    """Один <url> с hreflang-алтернативами RU/EN — сайт двуязычный, но URL
    для обоих языков совпадает (?lang= не часть пути, см. api.js withLang()),
    поэтому alternate ссылки указывают на тот же path, разница только в
    hreflang. x-default — на русский, это язык по умолчанию для контента
    (см. models/article.py: title_ru обязателен, title_en — нет)."""
    loc = f"{settings.site_base_url}{path}"
    lastmod_tag = f"\n    <lastmod>{lastmod}</lastmod>" if lastmod else ""
    return (
        "  <url>\n"
        f"    <loc>{escape(loc)}</loc>{lastmod_tag}\n"
        f'    <xhtml:link rel="alternate" hreflang="ru" href="{escape(loc)}" />\n'
        f'    <xhtml:link rel="alternate" hreflang="en" href="{escape(loc)}" />\n'
        f'    <xhtml:link rel="alternate" hreflang="x-default" href="{escape(loc)}" />\n'
        "  </url>"
    )


@router.get("/sitemap.xml")
def sitemap(db: Session = Depends(get_db)):
    """Генерируется на лету из текущей БД (без кэша — трафика на sitemap.xml
    мало, а актуальность важнее). Отдаёт полный urlset: статичные страницы +
    все статьи + все теги, с hreflang-alternates для RU/EN (см. _url_entry)."""
    entries = [_url_entry(path) for path in STATIC_PATHS]

    articles = db.execute(select(Article.id, Article.created_at)).all()
    for article_id, created_at in articles:
        lastmod = created_at.date().isoformat() if created_at else None
        entries.append(_url_entry(f"/articles/{article_id}", lastmod=lastmod))

    tags = db.execute(select(Tag.slug)).scalars().all()
    for slug in tags:
        entries.append(_url_entry(f"/tags/{slug}"))

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
        'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
        + "\n".join(entries)
        + "\n</urlset>\n"
    )
    return Response(content=xml, media_type="application/xml")
