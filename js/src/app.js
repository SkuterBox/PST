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

    const contactForm = document.querySelector("#contact-form");
    if (contactForm) {
        const phoneInput = contactForm.querySelector('input[type="tel"]');
        const submitButton = contactForm.querySelector('button[type="submit"]');
        const captchaContainer = contactForm.querySelector("[data-lazy-recaptcha]");
        const captchaInput = contactForm.querySelector('[name="recaptcha_visible"]');
        let recaptchaScriptPromise;
        let recaptchaWidgetId = null;

        function loadRecaptchaApi() {
            if (window.grecaptcha && typeof window.grecaptcha.render === "function") {
                return Promise.resolve(window.grecaptcha);
            }

            if (!recaptchaScriptPromise) {
                recaptchaScriptPromise = new Promise(function(resolve, reject) {
                    let script = document.querySelector("script[data-recaptcha-api]");
                    const callbackName = "pstRecaptchaLoaded";
                    let readyAttempts = 0;

                    const resolveWhenReady = function() {
                        if (window.grecaptcha && typeof window.grecaptcha.render === "function") {
                            delete window[callbackName];
                            resolve(window.grecaptcha);
                            return;
                        }

                        readyAttempts += 1;
                        if (readyAttempts < 50) {
                            window.setTimeout(resolveWhenReady, 100);
                            return;
                        }

                        handleError(new Error("reCAPTCHA API loaded without grecaptcha.render"));
                    };
                    const handleError = function(error) {
                        if (script) script.remove();
                        delete window[callbackName];
                        recaptchaScriptPromise = null;
                        reject(error);
                    };

                    if (script) {
                        resolveWhenReady();
                        return;
                    }

                    window[callbackName] = resolveWhenReady;
                    script = document.createElement("script");
                    script.src = `https://www.google.com/recaptcha/api.js?render=explicit&onload=${callbackName}`;
                    script.async = true;
                    script.defer = true;
                    script.dataset.recaptchaApi = "true";
                    script.addEventListener("error", handleError, {once: true});
                    document.head.appendChild(script);
                });
            }

            return recaptchaScriptPromise;
        }

        function renderRecaptcha() {
            if (!captchaContainer || captchaContainer.dataset.recaptchaState) return;

            captchaContainer.dataset.recaptchaState = "loading";

            loadRecaptchaApi()
                .then(function(grecaptcha) {
                    if (!captchaContainer.isConnected) return;

                    recaptchaWidgetId = grecaptcha.render(captchaContainer, {
                        sitekey: captchaContainer.dataset.sitekey,
                        callback: function() {
                            captchaInput.value = "1";
                            captchaContainer.classList.remove("error");
                        },
                        "expired-callback": function() {
                            captchaInput.value = "";
                        },
                        "error-callback": function() {
                            captchaInput.value = "";
                            captchaContainer.classList.add("error");
                        }
                    });

                    captchaContainer.dataset.recaptchaState = "rendered";
                })
                .catch(function(error) {
                    delete captchaContainer.dataset.recaptchaState;
                    captchaContainer.classList.add("error");
                    console.error("Nie udało się załadować reCAPTCHA:", error);
                });
        }

        if (captchaContainer) {
            if ("IntersectionObserver" in window) {
                const captchaObserver = new IntersectionObserver(function(entries) {
                    entries.forEach(function(entry) {
                        if (!entry.isIntersecting) return;
                        captchaObserver.unobserve(entry.target);
                        renderRecaptcha();
                    });
                }, {rootMargin: "200px 0px"});

                captchaObserver.observe(captchaContainer);
            }
            else {
                renderRecaptcha();
            }

            contactForm.addEventListener("focusin", renderRecaptcha, {once: true});
            contactForm.addEventListener("pointerdown", renderRecaptcha, {once: true, passive: true});
        }

        function isValidPhone(value) {
            const phone = value.trim();
            if (!/^\+?[\d\s().-]+$/.test(phone)) return false;

            const digits = phone.replace(/\D/g, "");
            return digits.length >= 7 && digits.length <= 15;
        }

        function validatePhone() {
            const isValid = isValidPhone(phoneInput.value);
            phoneInput.setCustomValidity(isValid ? "" : "Podaj prawidłowy numer telefonu.");
            return isValid;
        }

        phoneInput.addEventListener("input", function() {
            phoneInput.setCustomValidity("");
        });

        contactForm.addEventListener("submit", async function(e) {
            e.preventDefault();

            validatePhone();
            if (!contactForm.checkValidity()) {
                contactForm.reportValidity();
                return;
            }

            if (!captchaInput.value) {
                captchaContainer.classList.add("error");
                renderRecaptcha();
                return;
            }

            const controller = new AbortController();
            const timeoutId = window.setTimeout(function() {
                controller.abort();
            }, 15000);

            submitButton.disabled = true;
            submitButton.classList.remove("is-error", "is-success");
            submitButton.textContent = "Wysyłanie...";

            try {
                const response = await fetch(contactForm.action, {
                    method: contactForm.method,
                    body: new FormData(contactForm),
                    signal: controller.signal
                });

                if (!response.ok) {
                    throw new Error(`Jotform HTTP ${response.status}`);
                }

                contactForm.reset();
                captchaInput.value = "";
                if (recaptchaWidgetId !== null) window.grecaptcha.reset(recaptchaWidgetId);
                submitButton.textContent = "Wiadomość wysłana";
                submitButton.classList.add("is-success");
            }
            catch (error) {
                submitButton.disabled = false;
                submitButton.textContent = "Spróbuj ponownie";
                submitButton.classList.add("is-error");
                captchaInput.value = "";
                if (recaptchaWidgetId !== null) window.grecaptcha.reset(recaptchaWidgetId);
                console.error("Nie udało się wysłać formularza:", error);
            }
            finally {
                window.clearTimeout(timeoutId);
            }
        });
    }
});
