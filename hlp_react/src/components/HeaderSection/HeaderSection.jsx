import classes from "./Header.module.css";
import './header.css'

export default function Header() {
  return (
    <>
       <header class="header  mb-4 sticky-top " id="header-nav">
        <div class="container-fluid">
            <div class="row header_row align-items-center">
                <div class="col-4 col-lg-2 d-none d-sm-flex align-items-center justify-content-center logo d-flex  header_link order-2 order-lg-1">
                    <h1>
                        <a href="#">it_hlp</a>
                    </h1>
                </div>

                <div class="col-4 col-lg text-center d-flex align-items-center justify-content-center order-1 order-lg-2 ">
                    <nav class="navbar navbar-expand-lg " data-bs-theme="dark">
                        <div class="container-fluid">

                            <button class="navbar-toggler" type="button" data-bs-toggle="offcanvas"
                                    data-bs-target="#offcanvasNavbar" aria-controls="offcanvasNavbar"
                                    aria-expanded="false" aria-label="Toggle navigation">
                                <span class="navbar-toggler-icon"></span>
                            </button>
                            <div class="offcanvas offcanvas-start" id="offcanvasNavbar" tabindex="-1"
                                 aria-labelledby="offcanvasNavbarLabel">
                                <div class="offcanvas-header">
                                    <h5 class="offcanvas-title" id="offcanvasLabel">Меню</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="offcanvas"
                                            aria-label="Close"></button>
                                </div>
                                <div class="offcanvas-body ">
                                    <ul class="navbar-nav ">
                                        <li class="nav-item">
                                            <a class="nav-link text-underlined" aria-current="page" href="index.html">Главная</a>
                                        </li>
                                        <li class="nav-item">
                                            <a class="nav-link text-underlined" href="#">О нас</a>
                                        </li>
                                        <li class="nav-item dropdown ">
                                            <a class="nav-link dropdown-toggle text-underlined " href="#" role="button"
                                               data-bs-toggle="dropdown" aria-expanded="false">
                                                Frontend
                                            </a>
                                            <ul class="dropdown-menu">
                                                <li><a class="dropdown-item" href="#">Action</a></li>
                                                <li><a class="dropdown-item" href="#">Another action</a></li>
                                                <li>
                                                    {/* <hr class="dropdown-divider"> */}
                                                </li>
                                                <li><a class="dropdown-item" href="#">Something else here</a></li>
                                            </ul>
                                        </li>
                                        <li class="nav-item dropdown ">
                                            <a class="nav-link dropdown-toggle text-underlined" href="#" role="button"
                                               data-bs-toggle="dropdown" aria-expanded="false">
                                                Backend
                                            </a>
                                            <ul class="dropdown-menu">
                                                <li class="nav-item dropend">
                                                    <a class="dropdown-item dropdown-toggle" href="#" role="button"
                                                       data-bs-toggle="dropdown"
                                                       data-bs-auto-close="outside">Action</a>
                                                    <ul class="dropdown-menu dropdown-menu-end">
                                                        <li><a class="dropdown-item" href="#">Another action</a>
                                                        </li>
                                                        <li><a class="dropdown-item" href="#">Another action</a>
                                                        </li>
                                                    </ul>
                                                </li>
                                                <li><a class="dropdown-item" href="#">Another action</a></li>
                                                <li>
                                                    {/* <hr class="dropdown-divider"> */}
                                                </li>
                                                <li><a class="dropdown-item" href="#">Something else here</a></li>
                                            </ul>
                                        </li>
                                        <li class="nav-item dropdown">
                                            <a class="nav-link dropdown-toggle text-underlined" href="#" role="button"
                                               data-bs-toggle="dropdown" aria-expanded="false">
                                                Deploy
                                            </a>
                                            <ul class="dropdown-menu">
                                                <li><a class="dropdown-item" href="#">Action</a></li>
                                                <li><a class="dropdown-item" href="#">Another action</a></li>
                                                <li>
                                                    {/* <hr class="dropdown-divider"> */}
                                                </li>
                                                <li><a class="dropdown-item" href="#">Something else here</a></li>
                                            </ul>
                                        </li>
                                    </ul>
                                </div>


                            </div>
                        </div>
                    </nav>
                </div>

                <div class="col col-lg-2 d-flex align-items-center justify-content-center order-3 header_icons header_link">

                    <button type="button" class="btn header_search" data-bs-toggle="modal"
                            data-bs-target="#searchModal" title="Поиск">
                        <i class="fa-solid fa-magnifying-glass fa-rotate-90 fa-xl  "></i>
                    </button>
                    <button type="button" class="btn header_search" data-bs-toggle="modal"
                            data-bs-target="#loginModal" title="Авторизация">
                        <i class="fa-solid fa-key fa-xl"></i>
                    </button>


                </div> 
            </div> 
        </div>
    </header> 
     
    </>
  );
}
