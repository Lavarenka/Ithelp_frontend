import "./FooterSection.css";

export default function Footer() {
  return (
    <>
      <footer className="footer">
        <div className="container">
          <div className="row py-3 align-items-center">
            <div className="col-md-6">
              <h5 className="footer_title">it_hlp blog © 2024</h5>
            </div>

            <div className="col-md-6 d-flex justify-content-md-end ">
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
