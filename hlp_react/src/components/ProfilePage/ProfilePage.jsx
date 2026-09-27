import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import AvatarCropModal from "./AvatarCropModal";
import SeoHead from "../SeoHead/SeoHead";
import "./ProfilePage.css";

// Должно совпадать с settings.avatar_max_bytes на бэкенде (app/config.py) —
// там это финальный источник правды (валидация всё равно на сервере), а
// здесь просто чтобы не заставлять пользователя ждать аплоада ради ошибки,
// которую можно было показать сразу на клиенте.
const AVATAR_MAX_BYTES = 1_500_000;
const AVATAR_ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Быстрая оценка размера base64 data-URI в байтах — без декодирования, чтобы
// не гонять большие строки через atob() ради простой проверки лимита. Формула
// стандартная для base64: 4 символа кодируют 3 байта, минус padding ('=').
function estimateDataUrlBytes(dataUrl) {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = (base64.match(/=+$/) || [""])[0].length;
  return Math.floor((base64.length * 3) / 4) - padding;
}

function formatDate(isoString, locale) {
  try {
    return new Date(isoString).toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return isoString;
  }
}

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, isLoading, updateProfile, changePassword, refreshUser } = useAuth();

  const [username, setUsername] = useState(user?.username ?? "");
  const [usernameState, setUsernameState] = useState("idle"); // idle | saving | saved | error
  const [usernameError, setUsernameError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordState, setPasswordState] = useState("idle"); // idle | saving | saved | error
  const [passwordError, setPasswordError] = useState("");

  // user изначально null (см. AuthContext: /auth/me ещё не ответил), поэтому
  // useState-инициализатор выше на первом рендере всегда получает "" — сама
  // страница ждёт isLoading и не показывает форму раньше времени, но hooks
  // всё равно вызываются на каждом рендере, включая тот самый первый. Раз
  // user.username меняется (загрузился/сохранили новый) — подхватываем его.
  useEffect(() => {
    if (user?.username !== undefined) setUsername(user.username);
  }, [user?.username]);

  const [avatarPreview, setAvatarPreview] = useState(null); // локальный предпросмотр до сохранения
  const [avatarState, setAvatarState] = useState("idle"); // idle | saving | saved | error
  const [avatarError, setAvatarError] = useState("");
  const [cropSource, setCropSource] = useState(null); // data-URL исходного файла, пока открыт редактор кропа
  const fileInputRef = useRef(null);

  // noindex — личный кабинет, персональные данные, не для индексации.
  if (isLoading) {
    return (
      <div className="layout_main">
        <div className="body_row">
          <div className="body">
            <SeoHead title={t("profile.title")} path="/profile" noindex />
            <p className="body_state">{t("common.loading")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="layout_main">
        <div className="body_row">
          <div className="body">
            <SeoHead title={t("profile.title")} path="/profile" noindex />
            <Link to="/" className="article_back mb-3 d-inline-block">
              {t("common.backToArticles")}
            </Link>
            <p className="body_state">{t("profile.guestNotice")}</p>
          </div>
        </div>
      </div>
    );
  }

  const currentAvatar = avatarPreview ?? user.avatar;

  const handleUsernameSubmit = async (event) => {
    event.preventDefault();
    const trimmed = username.trim();
    if (!trimmed || trimmed === user.username) return;

    setUsernameState("saving");
    setUsernameError("");
    try {
      await updateProfile({ username: trimmed });
      setUsernameState("saved");
    } catch (err) {
      setUsernameState("error");
      setUsernameError(err.message || t("auth.genericError"));
    }
  };

  // Смена пароля (или первичная установка — у OAuth-only пользователей
  // user.has_password === false, см. UserOut на бэкенде). currentPassword
  // не проверяется на клиенте, если поле не показывается вовсе — бэкенд
  // сам решает, обязателен ли он (PATCH /auth/me/password).
  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (newPassword !== newPasswordConfirm) {
      setPasswordState("error");
      setPasswordError(t("auth.passwordMismatch"));
      return;
    }

    setPasswordState("saving");
    setPasswordError("");
    try {
      await changePassword(user.has_password ? currentPassword : null, newPassword, newPasswordConfirm);
      setPasswordState("saved");
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      // has_password мог смениться false -> true (OAuth-only пользователь
      // только что впервые задал пароль) — перечитываем /auth/me, чтобы
      // форма сразу переключилась в обычный режим "текущий/новый пароль".
      refreshUser();
    } catch (err) {
      setPasswordState("error");
      setPasswordError(err.message || t("auth.genericError"));
    }
  };

  // Выбор файла больше не грузит его сразу — сначала открываем редактор
  // кропа (AvatarCropModal), и только после подтверждения там реальный
  // аплоад уходит в handleCropConfirm ниже. Проверки типа/размера — на
  // ИСХОДНОМ файле (до кропа): так пользователь сразу видит ошибку, не
  // тратя время на подгонку рамки под файл, который всё равно не примут.
  const handleAvatarPick = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    // Даём выбрать тот же файл повторно позже (например, после ошибки).
    event.target.value = "";

    setAvatarError("");
    setAvatarState("idle");

    if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
      setAvatarState("error");
      setAvatarError(t("profile.avatarTypeError"));
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarState("error");
      setAvatarError(t("profile.avatarSizeError", { maxMb: (AVATAR_MAX_BYTES / 1_000_000).toFixed(1) }));
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setCropSource(dataUrl);
    } catch (err) {
      setAvatarState("error");
      setAvatarError(err.message || t("auth.genericError"));
    }
  };

  const handleCropCancel = () => setCropSource(null);

  const handleCropConfirm = async (croppedDataUrl) => {
    setCropSource(null);

    // Кроп сжимает в JPEG заново (см. AvatarCropModal) — итог почти всегда
    // намного меньше исходника, но перепроверяем на всякий случай (та же
    // логика, что и для исходного файла в handleAvatarPick выше).
    if (estimateDataUrlBytes(croppedDataUrl) > AVATAR_MAX_BYTES) {
      setAvatarState("error");
      setAvatarError(t("profile.avatarSizeError", { maxMb: (AVATAR_MAX_BYTES / 1_000_000).toFixed(1) }));
      return;
    }

    setAvatarPreview(croppedDataUrl);
    setAvatarState("saving");
    try {
      await updateProfile({ avatar: croppedDataUrl });
      setAvatarState("saved");
    } catch (err) {
      setAvatarState("error");
      setAvatarError(err.message || t("auth.genericError"));
    }
  };

  const handleAvatarClear = async () => {
    setAvatarError("");
    setAvatarState("saving");
    try {
      await updateProfile({ clear_avatar: true });
      setAvatarPreview(null);
      setAvatarState("saved");
    } catch (err) {
      setAvatarState("error");
      setAvatarError(err.message || t("auth.genericError"));
    }
  };

  return (
    <div className="layout_main">
      <div className="body_row">
        <div className="body">
          <SeoHead title={t("profile.title")} path="/profile" noindex />
          <Link to="/" className="article_back mb-3 d-inline-block">
            {t("common.backToArticles")}
          </Link>
          <h1 className="tag_page_title">{t("profile.title")}</h1>

          <div className="profile-page">
            {/* --- Аватар --- */}
            <section className="profile-page_section">
              <h2 className="profile-page_section-title">{t("profile.avatarTitle")}</h2>
              <div className="profile-page_avatar-row">
                <div className="profile-page_avatar-preview">
                  {currentAvatar ? (
                    <img src={currentAvatar} alt={t("profile.avatarAlt")} />
                  ) : (
                    <i className="fa-solid fa-user" aria-hidden="true"></i>
                  )}
                </div>
                <div className="profile-page_avatar-actions">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarState === "saving"}
                  >
                    {t("profile.avatarUpload")}
                  </button>
                  {currentAvatar && (
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm ms-2"
                      onClick={handleAvatarClear}
                      disabled={avatarState === "saving"}
                    >
                      {t("profile.avatarRemove")}
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={AVATAR_ALLOWED_TYPES.join(",")}
                    className="d-none"
                    onChange={handleAvatarPick}
                  />
                  <p className="profile-page_hint">{t("profile.avatarHint")}</p>
                  {avatarState === "saving" && (
                    <p className="profile-page_status">{t("common.saving")}</p>
                  )}
                  {avatarState === "saved" && (
                    <p className="profile-page_status profile-page_status--ok">{t("profile.avatarSaved")}</p>
                  )}
                  {avatarState === "error" && (
                    <p className="profile-page_status profile-page_status--error">{avatarError}</p>
                  )}
                </div>
              </div>
            </section>

            {/* --- Имя пользователя --- */}
            <section className="profile-page_section">
              <h2 className="profile-page_section-title">{t("profile.usernameTitle")}</h2>
              <form className="profile-page_form" onSubmit={handleUsernameSubmit}>
                <input
                  type="text"
                  className="form-control"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setUsernameState("idle");
                  }}
                  minLength={3}
                  maxLength={50}
                  required
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm mt-2"
                  disabled={usernameState === "saving" || !username.trim() || username.trim() === user.username}
                >
                  {usernameState === "saving" ? t("common.saving") : t("common.save")}
                </button>
                {usernameState === "saved" && (
                  <p className="profile-page_status profile-page_status--ok">{t("profile.usernameSaved")}</p>
                )}
                {usernameState === "error" && (
                  <p className="profile-page_status profile-page_status--error">{usernameError}</p>
                )}
              </form>
            </section>

            {/* --- Смена пароля --- */}
            <section className="profile-page_section">
              <h2 className="profile-page_section-title">
                {user.has_password ? t("profile.passwordTitle") : t("profile.setPasswordTitle")}
              </h2>
              {!user.has_password && (
                <p className="profile-page_hint">{t("profile.setPasswordHint")}</p>
              )}
              <form className="profile-page_form" onSubmit={handlePasswordSubmit}>
                {user.has_password && (
                  <input
                    type="password"
                    className="form-control mb-2"
                    placeholder={t("profile.currentPassword")}
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      setPasswordState("idle");
                    }}
                    autoComplete="current-password"
                    required
                  />
                )}
                <input
                  type="password"
                  className="form-control mb-2"
                  placeholder={t("profile.newPassword")}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordState("idle");
                  }}
                  minLength={6}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                />
                <input
                  type="password"
                  className="form-control mb-2"
                  placeholder={t("profile.newPasswordConfirm")}
                  value={newPasswordConfirm}
                  onChange={(e) => {
                    setNewPasswordConfirm(e.target.value);
                    setPasswordState("idle");
                  }}
                  minLength={6}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={
                    passwordState === "saving" ||
                    !newPassword ||
                    !newPasswordConfirm ||
                    (user.has_password && !currentPassword)
                  }
                >
                  {passwordState === "saving"
                    ? t("common.saving")
                    : user.has_password
                    ? t("common.save")
                    : t("profile.passwordSetAction")}
                </button>
                {passwordState === "saved" && (
                  <p className="profile-page_status profile-page_status--ok">
                    {user.has_password ? t("profile.passwordSaved") : t("profile.passwordSet")}
                  </p>
                )}
                {passwordState === "error" && (
                  <p className="profile-page_status profile-page_status--error">{passwordError}</p>
                )}
              </form>
            </section>

            {/* --- Email + дата регистрации --- */}
            <section className="profile-page_section">
              <h2 className="profile-page_section-title">{t("profile.accountInfoTitle")}</h2>
              <dl className="profile-page_info">
                <dt>{t("auth.email")}</dt>
                <dd>
                  {user.email}{" "}
                  {user.email_verified ? (
                    <span className="profile-page_badge profile-page_badge--verified">
                      {t("profile.emailVerified")}
                    </span>
                  ) : (
                    <span className="profile-page_badge profile-page_badge--unverified">
                      {t("profile.emailUnverified")}
                    </span>
                  )}
                </dd>
                <dt>{t("profile.registeredAt")}</dt>
                <dd>{formatDate(user.created_at, i18n.language)}</dd>
              </dl>
            </section>
          </div>
        </div>
      </div>

      {cropSource && (
        <AvatarCropModal imageSrc={cropSource} onCancel={handleCropCancel} onConfirm={handleCropConfirm} />
      )}
    </div>
  );
}
