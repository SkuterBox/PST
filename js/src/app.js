document.addEventListener("DOMContentLoaded", function(){
    const languageBtn = document.querySelector(".header__language");
    const languageToggle = document.querySelector(".header__language-active");
    const languagesList = document.querySelector(".header__languages");
    const burgerBtn = document.querySelector(".header__burger-btn");
    const burgerMenu = document.querySelector(".header__burger");

    function setLanguageOpen(isOpen) {
        if (!languageBtn || !languageToggle) return;
        languageBtn.classList.toggle("open", isOpen);
        languageToggle.setAttribute("aria-expanded", String(isOpen));
    }

    function setBurgerOpen(isOpen) {
        if (!burgerBtn || !burgerMenu) return;
        burgerMenu.classList.toggle("open", isOpen);
        burgerBtn.setAttribute("aria-expanded", String(isOpen));
        if (!isOpen) setLanguageOpen(false);
    }

    if (languageToggle) {
        languageToggle.addEventListener("click", function () {
            setLanguageOpen(!languageBtn.classList.contains("open"));
        });
    }
    if (languagesList && languageBtn) {
        languagesList.addEventListener("click", function (e) {
            e.stopPropagation();
            if (e.target.classList.contains("header__languages")) {
                setLanguageOpen(false);
            }
        });
    }
    if (burgerBtn && burgerMenu) {
        burgerBtn.addEventListener("click", function(){
            setBurgerOpen(!burgerMenu.classList.contains("open"));
        });

        burgerMenu.querySelectorAll(".header-menu a").forEach(function(link) {
            link.addEventListener("click", function() {
                setBurgerOpen(false);
            });
        });
    }

    document.addEventListener("click", function(e) {
        if (languageBtn && !languageBtn.contains(e.target)) {
            setLanguageOpen(false);
        }
    });

    document.addEventListener("keydown", function(e) {
        if (e.key !== "Escape") return;
        setLanguageOpen(false);
        setBurgerOpen(false);
    });

    const contactForm = document.querySelector("#contact-form");
    if (contactForm) {
        const phoneInput = contactForm.querySelector('input[type="tel"]');
        const submitButton = contactForm.querySelector('button[type="submit"]');
        const captchaContainer = contactForm.querySelector("[data-lazy-recaptcha]");
        const captchaInput = contactForm.querySelector('[name="recaptcha_visible"]');

        if (!submitButton || submitButton.disabled || !contactForm.hasAttribute("action")) {
            contactForm.addEventListener("submit", function(e) {
                e.preventDefault();
            });
            return;
        }

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
            phoneInput.setCustomValidity(isValid ? "" : contactForm.dataset.phoneError);
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
            submitButton.textContent = contactForm.dataset.sendingLabel;

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
                submitButton.textContent = contactForm.dataset.successLabel;
                submitButton.classList.add("is-success");
            }
            catch (error) {
                submitButton.disabled = false;
                submitButton.textContent = contactForm.dataset.retryLabel;
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
