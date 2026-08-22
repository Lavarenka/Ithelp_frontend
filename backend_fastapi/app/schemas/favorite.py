from pydantic import BaseModel


class FavoriteStatusOut(BaseModel):
    """Ответ на добавление/удаление из избранного — фронту достаточно знать
    итоговое состояние и актуальный счётчик, без похода за всей статьёй заново."""

    is_favorited: bool
    favorites_count: int
