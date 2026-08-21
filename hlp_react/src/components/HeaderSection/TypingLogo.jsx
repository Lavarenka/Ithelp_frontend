import { useEffect, useState } from "react";

const FULL_TEXT = "it_hlp";
const TYPE_SPEED_MS = 150;
const ERASE_SPEED_MS = 90;
const PAUSE_AFTER_TYPE_MS = 1800;
const PAUSE_AFTER_ERASE_MS = 500;

/**
 * Лого "it_hlp" с эффектом печатающегося текста, как в терминале:
 * символы появляются по одному, в конце мигает курсор "_", затем текст
 * стирается и печатается заново — бесконечный цикл.
 */
export default function TypingLogo() {
  const [displayedLength, setDisplayedLength] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timeoutId;

    if (!isDeleting && displayedLength < FULL_TEXT.length) {
      // Печатаем следующий символ
      timeoutId = setTimeout(() => {
        setDisplayedLength((len) => len + 1);
      }, TYPE_SPEED_MS);
    } else if (!isDeleting && displayedLength === FULL_TEXT.length) {
      // Текст напечатан полностью — пауза перед стиранием
      timeoutId = setTimeout(() => {
        setIsDeleting(true);
      }, PAUSE_AFTER_TYPE_MS);
    } else if (isDeleting && displayedLength > 0) {
      // Стираем по символу
      timeoutId = setTimeout(() => {
        setDisplayedLength((len) => len - 1);
      }, ERASE_SPEED_MS);
    } else if (isDeleting && displayedLength === 0) {
      // Стёрли всё — пауза перед новым циклом печати
      timeoutId = setTimeout(() => {
        setIsDeleting(false);
      }, PAUSE_AFTER_ERASE_MS);
    }

    return () => clearTimeout(timeoutId);
  }, [displayedLength, isDeleting]);

  return (
    <span className="typing-logo" aria-label={FULL_TEXT}>
      {FULL_TEXT.slice(0, displayedLength)}
      <span className="typing-logo_cursor">_</span>
    </span>
  );
}
