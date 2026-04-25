/**
 * AV-SMG Technical Guidelines - Main JS
 * Clean version to fix SyntaxError
 */

document.addEventListener('DOMContentLoaded', function() {
    // --- 1. SEARCH FUNCTIONALITY ---
    const searchTrigger = document.querySelector('.search-toggle'); // Sesuaikan class gambar kaca pembesar
    const searchOverlay = document.querySelector('.search-overlay'); // Sesuaikan class container search
    const searchInput = document.querySelector('#search-input');

    if (searchTrigger && searchOverlay) {
        searchTrigger.addEventListener('click', function(e) {
            e.preventDefault();
            searchOverlay.classList.toggle('active');
            
            // Fokuskan ke input jika search terbuka
            if (searchOverlay.classList.contains('active')) {
                setTimeout(() => searchInput.focus(), 200);
            }
        });
    }

    // --- 2. THEME TOGGLE (Jika ada) ---
    const themeBtn = document.querySelector('#theme-btn');
    if (themeBtn) {
        themeBtn.addEventListener('click', function() {
            document.body.classList.toggle('dark-theme');
            const isDark = document.body.classList.contains('dark-theme');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }

    // --- 3. MOBILE MENU ---
    const menuBtn = document.querySelector('.menu-btn');
    const navbar = document.querySelector('.navbar-links');
    if (menuBtn && navbar) {
        menuBtn.addEventListener('click', function() {
            navbar.classList.toggle('show');
        });
    }
});

// Fungsi pencarian (Logika Liquid/Jekyll search.json)
function executeSearch(query) {
    // Pastikan fungsi ini tidak punya syntax error seperti titik ganda
    if (!query) return;
    console.log("Searching for: " + query);
    // Masukkan logika fetch search.json kamu di sini jika diperlukan
}
