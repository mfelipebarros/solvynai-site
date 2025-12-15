document.addEventListener('DOMContentLoaded', function() {

    const availablePlugins = [ScrollTrigger];
    const hasSplitText = typeof SplitText !== 'undefined';
    if (hasSplitText) availablePlugins.push(SplitText);
    gsap.registerPlugin(...availablePlugins);

    // Button micro-interaction using GSAP SplitText
    const buttons = document.querySelectorAll('.btn-primary, .btn-secondary, .lang-toggle');
    const buttonSplits = new WeakMap();
    const buttonTimelines = new WeakMap();

    const splitButtonText = hasSplitText ? function(button) {
        // Skip splitting for lang-toggle to preserve language text
        if (button.classList.contains('lang-toggle')) {
            return null;
        }
        const label = button.querySelector('span') || button;
        const existingSplit = buttonSplits.get(button);
        if (existingSplit) existingSplit.revert();
        const split = new SplitText(label, { type: 'chars' });
        buttonSplits.set(button, split);
        return split;
    } : () => null;

    const resetButtonState = hasSplitText ? function(button) {
        const split = buttonSplits.get(button);
        if (split) {
            split.revert();
            buttonSplits.delete(button);
        }
        return splitButtonText(button);
    } : () => null;

    const animateButton = hasSplitText ? function(button) {
        const split = buttonSplits.get(button) || splitButtonText(button);
        if (!split) return;
        const chars = split.chars;

        gsap.killTweensOf(chars);
        const tl = gsap.timeline({
            onComplete: () => buttonTimelines.delete(button)
        })
            .to(chars, {
                yPercent: -40,
                rotation: -6,
                opacity: 0,
                duration: 0.22,
                stagger: 0.015,
                ease: 'power2.in'
            })
            .fromTo(chars, {
                yPercent: 60,
                rotation: 6,
                opacity: 0
            }, {
                yPercent: 0,
                rotation: 0,
                opacity: 1,
                duration: 0.26,
                stagger: 0.015,
                ease: 'power2.out'
            }, '<0.08');
        buttonTimelines.set(button, tl);
    } : () => {};

    if (hasSplitText) {
        buttons.forEach(button => {
            splitButtonText(button);
            button.addEventListener('mouseenter', () => animateButton(button));
            button.addEventListener('mouseleave', () => {
                const activeTl = buttonTimelines.get(button);
                if (activeTl) {
                    activeTl.kill();
                    buttonTimelines.delete(button);
                }
                const split = buttonSplits.get(button);
                if (!split) return;
                gsap.killTweensOf(split.chars);
                gsap.set(split.chars, { clearProps: 'all' });
                resetButtonState(button);
            });
        });
    } else {
        console.warn('SplitText plugin not found. Button micro-interaction skipped.');
    }

    // Hero animations
    const nav = document.querySelector('nav');
    const heroH1 = document.querySelector('.hero h1');
    const heroP = document.querySelector('.hero p');
    const heroBtnPrimary = document.querySelector('.hero .btn-primary');
    const heroBtnSecondary = document.querySelector('.hero .btn-secondary');
    const heroLargeText = document.querySelector('.hero-large-text');

    // Animate nav
    if (nav) {
        gsap.set(nav, { y: -50 });
        gsap.to(nav, {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "power3.out",
            delay: 0.2
        });
    }

    // Animate hero content elements sequentially
    const heroElements = [heroH1, heroP, heroBtnPrimary, heroBtnSecondary].filter(el => el);

    heroElements.forEach((element, index) => {
        gsap.set(element, { opacity: 0, y: -30 });
        gsap.to(element, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power3.out",
            delay: 0.4 + (index * 0.15)
        });
    });

    // Animate large text
    if (heroLargeText) {
        const text = heroLargeText.textContent;
        heroLargeText.innerHTML = text.split('').map(char =>
            `<span class="char">${char}</span>`
        ).join('');

        // Make text visible now that it's split
        heroLargeText.classList.add('ready');

        const chars = heroLargeText.querySelectorAll('.char');

        gsap.set(chars, {
            opacity: 0,
            y: 100
        });

        gsap.to(chars, {
            opacity: 1,
            y: 0,
            duration: 1,
            stagger: 0.05,
            ease: "power3.out",
            delay: 0.5
        });
    }

    const langDropdown = document.querySelector('.lang-dropdown');
    const langText = document.querySelector('.lang-text');

    function switchLanguage(lang) {
        // First, revert all button splits to restore original text
        if (hasSplitText) {
            buttons.forEach(button => {
                const split = buttonSplits.get(button);
                if (split) {
                    split.revert();
                    buttonSplits.delete(button);
                }
            });
        }

        const elements = document.querySelectorAll('[data-en][data-pt]');
        elements.forEach(element => {
            // Skip the language selector text
            if (element.classList.contains('lang-text')) {
                return;
            }
            if (lang === 'en') {
                element.textContent = element.getAttribute('data-en');
            } else if (lang === 'pt-br') {
                element.textContent = element.getAttribute('data-pt');
            }
        });

        // Handle placeholder attributes for inputs
        const placeholderElements = document.querySelectorAll('[data-placeholder-en][data-placeholder-pt]');
        placeholderElements.forEach(element => {
            if (lang === 'en') {
                element.placeholder = element.getAttribute('data-placeholder-en');
            } else if (lang === 'pt-br') {
                element.placeholder = element.getAttribute('data-placeholder-pt');
            }
        });

        // Handle title attributes for buttons
        const titleElements = document.querySelectorAll('[data-title-en][data-title-pt]');
        titleElements.forEach(element => {
            if (lang === 'en') {
                element.title = element.getAttribute('data-title-en');
            } else if (lang === 'pt-br') {
                element.title = element.getAttribute('data-title-pt');
            }
        });

        // Update chat placeholder text in chat.js if processing
        const chatInput = document.getElementById('chatInput');
        if (chatInput && window.chatAgent) {
            if (chatInput.disabled && chatInput.placeholder === 'Processing...') {
                chatInput.placeholder = lang === 'pt-br' ? 'Processando...' : 'Processing...';
            } else if (chatInput.disabled && chatInput.placeholder.includes('Recording')) {
                chatInput.placeholder = lang === 'pt-br' ? 'Gravando... Clique para parar' : 'Recording... Click to stop';
            }
        }

        // Re-split button labels to keep the hover micro-interaction in sync
        if (hasSplitText) {
            buttons.forEach(button => {
                splitButtonText(button);
            });
        }
    }

    function getLanguageFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const lang = urlParams.get('lang');
        return lang === 'pt' || lang === 'pt-br' ? 'pt-br' : 'en';
    }

    function setLanguageInURL(lang) {
        const url = new URL(window.location);
        url.searchParams.set('lang', lang === 'pt-br' ? 'pt' : 'en');
        window.history.pushState({}, '', url);
    }

    const currentLang = getLanguageFromURL();
    switchLanguage(currentLang);
    langText.textContent = currentLang === 'pt-br' ? 'pt-br' : 'en';

    // Handle get-in-touch links with language parameter
    document.querySelectorAll('.get-in-touch-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const urlParams = new URLSearchParams(window.location.search);
            const lang = urlParams.get('lang') || 'en';
            window.location.href = `get-in-touch.html?lang=${lang}`;
        });
    });

    if (langDropdown) {
        langDropdown.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                e.preventDefault();
                const selectedLang = e.target.getAttribute('data-lang');
                const selectedText = selectedLang === 'en' ? 'en' : 'pt-br';

                setLanguageInURL(selectedLang);
                switchLanguage(selectedLang);
                langText.textContent = selectedText;
                console.log('Language changed to:', selectedLang);
            }
        });
    }

    // Handle anchor links with smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#' || href === '#contact') return;

            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Scroll animations for sections after chat
    gsap.registerPlugin(ScrollTrigger);

    // Process section animations
    gsap.from('.process-section .section-title', {
        scrollTrigger: {
            trigger: '.process-section',
            start: 'top 80%',
        },
        y: 50,
        opacity: 0,
        duration: 1,
        ease: 'power3.out'
    });

    gsap.from('.process-card', {
        scrollTrigger: {
            trigger: '.process-grid',
            start: 'top 80%',
        },
        y: 80,
        opacity: 0,
        duration: 1,
        stagger: 0.2,
        ease: 'power3.out'
    });

    // Services section animations
    gsap.from('.services-section .section-title', {
        scrollTrigger: {
            trigger: '.services-section',
            start: 'top 80%',
        },
        y: 50,
        opacity: 0,
        duration: 1,
        ease: 'power3.out'
    });

    gsap.from('.services-section .section-subtitle', {
        scrollTrigger: {
            trigger: '.services-section',
            start: 'top 80%',
        },
        y: 30,
        opacity: 0,
        duration: 1,
        delay: 0.2,
        ease: 'power3.out'
    });

    gsap.from('.service-card', {
        scrollTrigger: {
            trigger: '.services-grid',
            start: 'top 80%',
        },
        y: 80,
        opacity: 0,
        duration: 1,
        stagger: 0.15,
        ease: 'power3.out'
    });

    // Ticker section animation
    gsap.from('.ticker-section .section-title', {
        scrollTrigger: {
            trigger: '.ticker-section',
            start: 'top 80%',
        },
        y: 50,
        opacity: 0,
        duration: 1,
        ease: 'power3.out'
    });

    gsap.from('.ticker-wrapper', {
        scrollTrigger: {
            trigger: '.ticker-section',
            start: 'top 80%',
        },
        opacity: 0,
        duration: 1,
        delay: 0.3,
        ease: 'power3.out'
    });

    // CTA section animation
    gsap.from('.cta-container', {
        scrollTrigger: {
            trigger: '.cta-section',
            start: 'top 80%',
        },
        scale: 0.9,
        opacity: 0,
        duration: 1,
        ease: 'power3.out'
    });

    // Footer animation
    gsap.from('.footer-content', {
        scrollTrigger: {
            trigger: '.footer',
            start: 'top 90%',
        },
        y: 30,
        opacity: 0,
        duration: 1,
        ease: 'power3.out'
    });
});
