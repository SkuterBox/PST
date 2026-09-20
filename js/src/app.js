document.addEventListener("DOMContentLoaded", function(){
    const languageBtn = document.querySelector(".header__language");
    if (languageBtn) {
        languageBtn.addEventListener("click", function () {
            languageBtn.classList.toggle("open");
        });
    }
    const languagesList = document.querySelector(".header__languages");
    if (languagesList) {
        languagesList.addEventListener("click", function (e) {
            e.stopPropagation();
            if (e.target.classList.contains("header__languages")) {
                languageBtn.classList.remove("open");
            }
        })
    }
    const burgerBtn = document.querySelector(".header__burger-btn");
    const burgerMenu = document.querySelector(".header__burger");
    if (burgerBtn && burgerMenu) {
        burgerBtn.addEventListener("click", function(){
            burgerMenu.classList.toggle("open");
        });
    }
});
