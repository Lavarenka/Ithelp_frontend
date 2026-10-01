import { useTranslation } from "react-i18next";
import "./FooterSection.css";

export default function Footer({ isEn }) {
  const { t } = useTranslation();
  return (
    <>
      <footer className={`footer ${!isEn ? "footer--ru" : ""}`}>
        <div className="container">
          <div className="row py-3 align-items-center footer_row">
            <div className="col-md-6">
              <h5 className="footer_title">{t("footer.brand")}</h5>
              <p className="footer_notice">{t("footer.devNotice")}</p>
            </div>

            <div className="col-md-6 d-flex justify-content-md-end footer_socials">
              {/* TODO: подставить реальные ссылки, когда их пришлют */}
              <a
                className="me-2"
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
              >
                <i className="fa-brands fa-square-github fa-xl"></i>
              </a>
              <a
                className="me-2"
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                <i className="fa-brands fa-square-instagram fa-xl"></i>
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram"
              >
                <i className="fa-brands fa-telegram fa-xl"></i>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
