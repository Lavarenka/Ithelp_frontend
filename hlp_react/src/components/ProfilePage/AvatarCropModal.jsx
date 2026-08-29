import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import { useTranslation } from "react-i18next";
import "./AvatarCropModal.css";

// Финальный размер стороны квадрата, в который ужимается кроп — этого более
// чем достаточно для аватарки (нигде на сайте она крупнее). Держим итоговый
// файл небольшим, чтобы не упираться в AVATAR_MAX_BYTES на ровном месте.
const OUTPUT_SIZE = 320;
const OUTPUT_QUALITY = 0.9;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Стандартный паттерн для react-easy-crop: croppedAreaPixels — это область
// в пикселях ИСХОДНОГО изображения (не превью), которую нужно вырезать и
// отмасштабировать до OUTPUT_SIZE x OUTPUT_SIZE. Круглая маска — только
// визуальная подсказка в самом кроппере; итоговый файл — обычный квадрат
// (как решили: круг применяется через CSS border-radius при показе, см.
// .profile-page_avatar-preview), поэтому тут просто квадратный canvas.
async function getCroppedImageDataUrl(imageSrc, croppedAreaPixels) {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");

  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE
  );

  return canvas.toDataURL("image/jpeg", OUTPUT_QUALITY);
}

// Модалка с редактором кропа — открывается сразу после выбора файла в
// ProfilePage (см. handleAvatarPick там). Не Bootstrap-модалка (той нужен
// DOM-элемент с фиксированным id в разметке заранее), а обычный React-оверлей
// поверх страницы — проще управлять открытием/закрытием через пропс open.
export default function AvatarCropModal({ imageSrc, onCancel, onConfirm }) {
  const { t } = useTranslation();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleCropComplete = useCallback((_croppedArea, croppedAreaPixelsValue) => {
    setCroppedAreaPixels(croppedAreaPixelsValue);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setIsSaving(true);
    try {
      const dataUrl = await getCroppedImageDataUrl(imageSrc, croppedAreaPixels);
      onConfirm(dataUrl);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="avatar-crop_overlay" role="dialog" aria-modal="true" aria-label={t("profile.cropTitle")}>
      <div className="avatar-crop_dialog">
        <div className="avatar-crop_header">
          <h5 className="avatar-crop_title">{t("profile.cropTitle")}</h5>
          <button
            type="button"
            className="btn-close"
            aria-label={t("common.cancel")}
            onClick={onCancel}
            disabled={isSaving}
          ></button>
        </div>

        <div className="avatar-crop_stage">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>

        <div className="avatar-crop_controls">
          <i className="fa-solid fa-magnifying-glass-minus avatar-crop_zoom-icon" aria-hidden="true"></i>
          <input
            type="range"
            className="form-range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label={t("profile.cropZoom")}
          />
          <i className="fa-solid fa-magnifying-glass-plus avatar-crop_zoom-icon" aria-hidden="true"></i>
        </div>

        <p className="avatar-crop_hint">{t("profile.cropHint")}</p>

        <div className="avatar-crop_actions">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onCancel} disabled={isSaving}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleConfirm}
            disabled={isSaving || !croppedAreaPixels}
          >
            {isSaving ? t("common.saving") : t("profile.cropConfirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
