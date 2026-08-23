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
            </div>

            <div className="col-md-6 d-flex justify-content-md-end footer_socials">
              <div className="me-2">
                <i className="fa-brands fa-square-facebook fa-xl"></i>
              </div>
              <div className="me-2">
                <i className="fa-brands fa-vk fa-xl"></i>
              </div>
              <div className="me-2">
                <i className="fa-brands fa-square-instagram fa-xl"></i>
              </div>
              <div className="">
                <i className="fa-brands fa-telegram fa-xl"></i>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
