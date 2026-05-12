/**
 * AV-SMG Technical Guidelines - Integrated Script
 * Menggabungkan Search, Theme Toggle, dan UI Navigation
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // --- 1. SEARCH SYSTEM (Fokus Utama) ---
    const searchBtn = document.querySelector('.search-toggle');
    const searchWrapper = document.querySelector('.search-wrapper');
    const searchInput = document.querySelector('#search-input');

    if (searchBtn && searchWrapper) {
        searchBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            searchWrapper.classList.toggle('active');
            
            if (searchWrapper.classList.contains('active')) {
                searchWrapper.style.display = 'block';
                setTimeout(() => searchInput && searchInput.focus(), 200);
            }
        });
    }

    // --- 2. DARK / LIGHT MODE TOGGLE ---
    const themeToggle = document.querySelector('#theme-toggle');
    const currentTheme = localStorage.getItem('theme');

    // Cek preferensi tema yang tersimpan
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
            let theme = 'light';
            if (document.body.classList.contains('dark-mode')) {
                theme = 'dark';
            }
            localStorage.setItem('theme', theme);
        });
    }

    // --- 3. MOBILE NAVIGATION (Hamburger Menu) ---
    const menuBtn = document.querySelector('.menu-icon');
    const navLinks = document.querySelector('.nav-links');

    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('nav-active');
        });
    }

    // --- 4. SCROLL TO TOP & NAVBAR SHADOW ---
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar?.classList.add('navbar-scrolled');
        } else {
            navbar?.classList.remove('navbar-scrolled');
        }
    });

    // --- 5. AUTOMATIC ACTIVE LINK ---
    // Menandai menu mana yang sedang dibuka berdasarkan URL
    const currentPath = window.location.pathname;
    document.querySelectorAll('.nav-links a').forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active-page');
        }
    });

    // --- 6. CLOSE ALL OVERLAYS ON GLOBAL CLICK ---
    document.addEventListener('click', function(e) {
        // Tutup search jika klik di luar
        if (searchWrapper && !searchWrapper.contains(e.target) && !searchBtn.contains(e.target)) {
            searchWrapper.classList.remove('active');
            searchWrapper.style.display = 'none';
        }
    });
});
