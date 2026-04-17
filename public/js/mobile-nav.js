// Mobile Navigation Handler
(function () {
    'use strict';

    function initMobileNav() {
        const hamburger = document.getElementById('hamburgerMenu');
        const navMenu = document.getElementById('navMenu');

        if (!hamburger || !navMenu) {
            console.log('Hamburger or navMenu not found, retrying...');
            return false;
        }

        console.log('Mobile nav initialized');

        // Remove existing listeners (cloning is a simple way to do this)
        const newHamburger = hamburger.cloneNode(true);
        hamburger.parentNode.replaceChild(newHamburger, hamburger);

        // Toggle menu
        newHamburger.addEventListener('click', function (e) {
            e.stopPropagation();
            e.preventDefault();

            navMenu.classList.toggle('active');
            newHamburger.classList.toggle('active');

            console.log('Menu toggled. Active:', navMenu.classList.contains('active'));

            // Toggle icon
            const icon = newHamburger.querySelector('i');
            if (icon) {
                if (navMenu.classList.contains('active')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });

        // Close menu when clicking nav items
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', function () {
                if (window.innerWidth <= 768) {
                    navMenu.classList.remove('active');
                    newHamburger.classList.remove('active');
                    const icon = newHamburger.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fa-times');
                        icon.classList.add('fa-bars');
                    }
                }
            });
        });

        // Close menu when clicking outside (or on the overlay)
        document.addEventListener('click', function (event) {
            const isClickInsideMenu = navMenu.contains(event.target);
            const isClickOnHamburger = newHamburger.contains(event.target);

            if (!isClickInsideMenu && !isClickOnHamburger && navMenu.classList.contains('active')) {
                console.log('Clicked outside, closing menu');
                navMenu.classList.remove('active');
                newHamburger.classList.remove('active');
                const icon = newHamburger.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });

        return true;
    }

    function syncUserName() {
        const desktopName = document.getElementById('navUserName');
        const mobileName = document.getElementById('navUserNameMobile');
        if (desktopName && mobileName) {
            mobileName.textContent = desktopName.textContent;
        }
    }

    function syncLogoutButtons() {
        const btnLogout = document.getElementById('btnLogout');
        const btnLogoutMobile = document.getElementById('btnLogoutMobile');

        if (btnLogout && btnLogoutMobile) {
            // Remove old listeners
            const newBtn = btnLogoutMobile.cloneNode(true);
            btnLogoutMobile.parentNode.replaceChild(newBtn, btnLogoutMobile);

            newBtn.addEventListener('click', function () {
                btnLogout.click();
            });
        }
    }

    // Initialize when components are loaded
    document.addEventListener('componentsLoaded', function () {
        console.log('Components loaded, initializing mobile nav...');

        // Try to initialize immediately
        if (!initMobileNav()) {
            // If failed, retry after a short delay
            setTimeout(function () {
                initMobileNav();
            }, 100);
        }

        // Sync user info
        syncUserName();
        syncLogoutButtons();

        // Watch for changes in user name
        const observer = new MutationObserver(syncUserName);
        const desktopName = document.getElementById('navUserName');
        if (desktopName) {
            observer.observe(desktopName, {
                childList: true,
                characterData: true,
                subtree: true
            });
        }
    });

    // Also try on DOMContentLoaded as fallback
    document.addEventListener('DOMContentLoaded', function () {
        console.log('DOM loaded, attempting mobile nav init...');
        setTimeout(function () {
            initMobileNav();
            syncUserName();
            syncLogoutButtons();
        }, 500);
    });
})();
