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
        if (
            burgerBtn &&
            burgerMenu &&
            burgerMenu.classList.contains("open") &&
            !burgerMenu.contains(e.target) &&
            !burgerBtn.contains(e.target)
        ) {
            setBurgerOpen(false);
        }
    });

    document.addEventListener("keydown", function(e) {
        if (e.key !== "Escape") return;
        setLanguageOpen(false);
        setBurgerOpen(false);
    });

    const contactSwitchButtons = Array.from(document.querySelectorAll("[data-contact-form-target]"));
    const contactForms = Array.from(document.querySelectorAll(".contact__form"));
    const multiselectStates = new WeakMap();
    let openMultiselect = null;

    function setMultiselectOpen(state, isOpen) {
        state.root.classList.toggle("open", isOpen);
        state.toggle.setAttribute("aria-expanded", String(isOpen));
        state.options.hidden = !isOpen;
        if (isOpen) {
            if (openMultiselect && openMultiselect !== state) {
                setMultiselectOpen(openMultiselect, false);
            }
            openMultiselect = state;
        }
        else if (openMultiselect === state) {
            openMultiselect = null;
        }
    }

    document.querySelectorAll("[data-multiselect]").forEach(function(root) {
        const toggle = root.querySelector(".contact-multiselect__toggle");
        const options = root.querySelector(".contact-multiselect__options");
        const label = root.querySelector("[data-multiselect-label]");
        const checkboxes = Array.from(root.querySelectorAll('input[type="checkbox"]'));

        if (!toggle || !options || !label || !checkboxes.length) return;

        const placeholder = label.textContent;
        const state = {
            root: root,
            toggle: toggle,
            options: options,
            checkboxes: checkboxes,
            validate: function() {
                const isValid = checkboxes.some(function(checkbox) {
                    return checkbox.checked;
                });
                checkboxes[0].setCustomValidity(isValid ? "" : root.closest("form").dataset.specializationError);
                root.classList.toggle("error", !isValid);
                if (!isValid) setMultiselectOpen(state, true);
                return isValid;
            }
        };

        function updateLabel() {
            const selectedLabels = checkboxes
                .filter(function(checkbox) {
                    return checkbox.checked;
                })
                .map(function(checkbox) {
                    return checkbox.nextElementSibling.textContent.trim();
                });

            label.textContent = selectedLabels.length ? selectedLabels.join(", ") : placeholder;
            toggle.title = selectedLabels.join(", ");
            if (selectedLabels.length) {
                checkboxes[0].setCustomValidity("");
                root.classList.remove("error");
            }
        }

        toggle.addEventListener("click", function() {
            setMultiselectOpen(state, options.hidden);
        });

        checkboxes.forEach(function(checkbox) {
            checkbox.addEventListener("change", updateLabel);
        });

        root.closest("form").addEventListener("reset", function() {
            window.setTimeout(updateLabel, 0);
        });

        multiselectStates.set(root.closest("form"), state);
        updateLabel();
    });

    document.addEventListener("click", function(e) {
        if (openMultiselect && !openMultiselect.root.contains(e.target)) {
            setMultiselectOpen(openMultiselect, false);
        }
    });

    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape" && openMultiselect) {
            const toggle = openMultiselect.toggle;
            setMultiselectOpen(openMultiselect, false);
            toggle.focus();
        }
    });

    function setActiveContactForm(formId) {
        contactForms.forEach(function(form) {
            const isActive = form.id === formId;
            form.hidden = !isActive;
            if (!isActive) {
                const state = multiselectStates.get(form);
                if (state) setMultiselectOpen(state, false);
            }
        });

        contactSwitchButtons.forEach(function(button) {
            const isActive = button.dataset.contactFormTarget === formId;
            button.classList.toggle("active", isActive);
            button.setAttribute("aria-selected", String(isActive));
            button.tabIndex = isActive ? 0 : -1;
        });
    }

    contactSwitchButtons.forEach(function(button, index) {
        button.addEventListener("click", function() {
            setActiveContactForm(button.dataset.contactFormTarget);
        });

        button.addEventListener("keydown", function(e) {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            e.preventDefault();
            const direction = e.key === "ArrowRight" ? 1 : -1;
            const nextIndex = (index + direction + contactSwitchButtons.length) % contactSwitchButtons.length;
            contactSwitchButtons[nextIndex].click();
            contactSwitchButtons[nextIndex].focus();
        });
    });

    const activeContactSwitch = contactSwitchButtons.find(function(button) {
        return button.classList.contains("active");
    });
    if (activeContactSwitch) {
        setActiveContactForm(activeContactSwitch.dataset.contactFormTarget);
    }

    let recaptchaScriptPromise;

    function loadRecaptchaApi() {
        if (window.grecaptcha && typeof window.grecaptcha.render === "function") {
            return Promise.resolve(window.grecaptcha);
        }

        if (!recaptchaScriptPromise) {
            recaptchaScriptPromise = new Promise(function(resolve, reject) {
                let script = document.querySelector("script[data-recaptcha-api]");
                const callbackName = "pstRecaptchaLoaded";
                let readyAttempts = 0;

                const handleError = function(error) {
                    if (script) script.remove();
                    delete window[callbackName];
                    recaptchaScriptPromise = null;
                    reject(error);
                };
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

    contactForms.forEach(function(contactForm) {
        const phoneInput = contactForm.querySelector('input[type="tel"]');
        const submitButton = contactForm.querySelector('button[type="submit"]');
        const captchaContainer = contactForm.querySelector("[data-lazy-recaptcha]");
        const captchaInput = contactForm.querySelector('[name="recaptcha_visible"]');
        const multiselectState = multiselectStates.get(contactForm);
        let recaptchaWidgetId = null;

        if (!submitButton || submitButton.disabled || !contactForm.hasAttribute("action")) {
            contactForm.addEventListener("submit", function(e) {
                e.preventDefault();
            });
            return;
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
            if (!phoneInput) return true;
            const isValid = isValidPhone(phoneInput.value);
            phoneInput.setCustomValidity(isValid ? "" : contactForm.dataset.phoneError);
            return isValid;
        }

        if (phoneInput) {
            phoneInput.addEventListener("input", function() {
                phoneInput.setCustomValidity("");
            });
        }

        contactForm.addEventListener("submit", async function(e) {
            e.preventDefault();

            validatePhone();
            if (multiselectState) multiselectState.validate();
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
    });
});
