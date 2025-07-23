import "./FooterSection.css";

export default function Footer() {
  return (
    <>
      <footer class="footer">
        <div class="container">
          <div class=" row my-4 py-4">
            <div class="col-md-6">
              <h5>it_hlp blog © 2024</h5>
            </div>

            <div class="col-md-6 d-flex justify-content-md-end ">
              <div class="me-2">
                <i class="fa-brands fa-square-facebook fa-xl"></i>
              </div>
              <div class="me-2">
                <i class="fa-brands fa-vk fa-xl"></i>
              </div>
              <div class="me-2">
                <i class="fa-brands fa-square-instagram fa-xl"></i>
              </div>
              <div class="">
                <i class="fa-brands fa-telegram fa-xl"></i>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
