import { useEffect, useState } from "react";
import "./Header.css";

const COMPACT_SCROLL_THRESHOLD = 40;

export default function Header() {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsCompact(window.scrollY > COMPACT_SCROLL_THRESHOLD);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
       <header
         className={`header mb-4 sticky-top ${isCompact ? "header--compact" : ""}`}
         id="header-nav"
       >
        <div className="container">
            <div className="row header_row align-items-center">
                <div className="col-4 col-lg-2 d-flex align-items-center justify-content-center logo header_link order-2 order-lg-1">
                    <h1>
                        <a href="#">it_hlp</a>
                    </h1>
                </div>

                <div className="col-4 col-lg text-center d-flex align-items-center justify-content-center order-1 order-lg-2 ">
                    <nav className="navbar navbar-expand-lg " data-bs-theme="dark">
                        <div className="container-fluid">

                            <button className="navbar-toggler" type="button" data-bs-toggle="offcanvas"
                                    data-bs-target="#offcanvasNavbar" aria-controls="offcanvasNavbar"
                                    aria-expanded="false" aria-label="Toggle navigation">
                                <span className="navbar-toggler-icon"></span>
                            </button>
                            <div className="offcanvas offcanvas-start" id="offcanvasNavbar" tabIndex="-1"
                                 aria-labelledby="offcanvasNavbarLabel">
                                <div className="offcanvas-header">
                                    <h5 className="offcanvas-title" id="offcanvasLabel">Меню</h5>
                                    <button type="button" className="btn-close" data-bs-dismiss="offcanvas"
                                            aria-label="Close"></button>
                                </div>
                                <div className="offcanvas-body ">
                                    <ul className="navbar-nav ">
                                        <li className="nav-item">
                                            <a className="nav-link text-underlined" aria-current="page" href="index.html">Главная</a>
                                        </li>
                                        <li className="nav-item">
                                            <a className="nav-link text-underlined" href="#">О нас</a>
                                        </li>
                                        <li className="nav-item dropdown ">
                                            <a className="nav-link dropdown-toggle text-underlined " href="#" role="button"
                                               data-bs-toggle="dropdown" aria-expanded="false">
                                                Frontend
                                            </a>
                                            <ul className="dropdown-menu">
                                                <li><a className="dropdown-item" href="#">Action</a></li>
                                                <li><a className="dropdown-item" href="#">Another action</a></li>
                                                <li>
                                                    {/* <hr className="dropdown-divider"> */}
                                                </li>
                                                <li><a className="dropdown-item" href="#">Something else here</a></li>
                                            </ul>
                                        </li>
                                        <li className="nav-item dropdown ">
                                            <a className="nav-link dropdown-toggle text-underlined" href="#" role="button"
                                               data-bs-toggle="dropdown" aria-expanded="false">
                                                Backend
                                            </a>
                                            <ul className="dropdown-menu">
                                                <li className="nav-item dropend">
                                                    <a className="dropdown-item dropdown-toggle" href="#" role="button"
                                                       data-bs-toggle="dropdown"
                                                       data-bs-auto-close="outside">Action</a>
                                                    <ul className="dropdown-menu dropdown-menu-end">
                                                        <li><a className="dropdown-item" href="#">Another action</a>
                                                        </li>
                                                        <li><a className="dropdown-item" href="#">Another action</a>
                                                        </li>
                                                    </ul>
                                                </li>
                                                <li><a className="dropdown-item" href="#">Another action</a></li>
                                                <li>
                                                    {/* <hr className="dropdown-divider"> */}
                                                </li>
                                                <li><a className="dropdown-item" href="#">Something else here</a></li>
                                            </ul>
                                        </li>
                                        <li className="nav-item dropdown">
                                            <a className="nav-link dropdown-toggle text-underlined" href="#" role="button"
                                               data-bs-toggle="dropdown" aria-expanded="false">
                                                Deploy
                                            </a>
                                            <ul className="dropdown-menu">
                                                <li><a className="dropdown-item" href="#">Action</a></li>
                                                <li><a className="dropdown-item" href="#">Another action</a></li>
                                                <li>
                                                    {/* <hr className="dropdown-divider"> */}
                                                </li>
                                                <li><a className="dropdown-item" href="#">Something else here</a></li>
                                            </ul>
                                        </li>
                                    </ul>
                                </div>


                            </div>
                        </div>
                    </nav>
                </div>

                <div className="col col-lg-2 d-flex align-items-center justify-content-center order-3 header_icons header_link">

                    <button type="button" className="btn header_search" data-bs-toggle="modal"
                            data-bs-target="#searchModal" title="Поиск">
                        <i className="fa-solid fa-magnifying-glass fa-rotate-90 fa-xl  "></i>
                    </button>
                    <button type="button" className="btn header_search" data-bs-toggle="modal"
                            data-bs-target="#loginModal" title="Авторизация">
                        <i className="fa-solid fa-key fa-xl"></i>
                    </button>


                </div>
            </div>
        </div>
    </header>

    </>
  );
}
