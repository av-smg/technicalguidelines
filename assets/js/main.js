/**
 * MAIN JAVASCRIPT - TECHNICAL GUIDELINES
 * Gabungan: Dark Mode, Navigasi, & Global Search Indexing
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // ==========================================
    // 1. PENGATURAN DARK MODE (SINKRON)
    // ==========================================
    const body = document.body;
    const themeIcons = document.querySelectorAll('.theme-icon-status');

    function updateIcons(isDark) {
        themeIcons.forEach(icon => {
            icon.innerText = isDark ? '☀️' : '🌙';
        });
    }

    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-mode');
        updateIcons(true);
    }

    window.toggleTheme = function() {
        body.classList.toggle('dark-mode');
        const isDark = body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateIcons(isDark);
    };

    // ==========================================
    // 2. NAVIGASI HAMBURGER (MOBILE)
    // ==========================================
    const menuDrawer = document.getElementById('side-menu-drawer');
    const openBtn = document.getElementById('menu-open-btn');
    const closeBtn = document.getElementById('menu-close-btn');

    if (openBtn) openBtn.onclick = () => menuDrawer.classList.add('active');
    if (closeBtn) closeBtn.onclick = () => menuDrawer.classList.remove('active');

    // ==========================================
    // 3. INTERAKSI SEARCH BAR (NAVBAR)
    // ==========================================
    const deskContainer = document.getElementById('search-desktop-container');
    const deskTrigger = document.getElementById('search-trigger-global');
    const mobTrigger = document.getElementById('mobile-search-trigger-btn');
    const mobDropdown = document.getElementById('search-mobile-dropdown');
    const mobClose = document.getElementById('search-close-mobile');

    // Handler Desktop (Expand)
    if (deskTrigger) {
        deskTrigger.onclick = (e) => {
            e.stopPropagation();
            deskContainer.classList.toggle('active');
            if (deskContainer.classList.contains('active')) {
                document.getElementById('missionSearch').focus();
            }
        };
    }

    // Handler Mobile (Dropdown)
    if (mobTrigger) {
        mobTrigger.onclick = (e) => {
            e.stopPropagation();
            mobDropdown.classList.toggle('active');
            if (mobDropdown.classList.contains('active')) {
                document.getElementById('missionSearchMobile').focus();
            }
        };
    }

    if (mobClose) {
        mobClose.onclick = () => mobDropdown.classList.remove('active');
    }

    // Klik Luar untuk Tutup Semuanya
    window.onclick = (e) => {
        if (deskContainer && !deskContainer.contains(e.target)) {
            deskContainer.classList.remove('active');
        }
        if (mobDropdown && !mobDropdown.contains(e.target) && e.target !== mobTrigger) {
            mobDropdown.classList.remove('active');
        }
        if (menuDrawer && !menuDrawer.contains(e.target) && !openBtn.contains(e.target)) {
            menuDrawer.classList.remove('active');
        }
    };

    // ==========================================
    // 4. LOGIKA ENTER KE HALAMAN SEARCH
    // ==========================================
    window.handleSearchEnter = function(event) {
        if (event.key === 'Enter' || event.keyCode === 13) {
            const query = event.target.value;
            if (query.length >= 2) {
                window.location.href = '/search.html?q=' + encodeURIComponent(query);
            }
        }
    };

    // ==========================================
    // 5. LOGIKA HALAMAN HASIL (search.html)
    // ==========================================
    if (window.location.pathname.includes('search.html')) {
        const params = new URLSearchParams(window.location.search);
        const query = params.get('q');
        const queryDisplay = document.getElementById('search-query-text');
        const resultsContainer = document.getElementById('search-results-page-list');

        if (query && resultsContainer) {
            queryDisplay.innerText = `"${query}"`;
            
            const jsonPath = window.location.pathname.includes('/nama-repo') 
                 ? '/nama-repo/search.json' 
                 : '/search.json';

fetch(jsonPath)
    .then(res => res.json())
    .then(data => {
        searchIndex = data;
        console.log("Index loaded from:", jsonPath);
    });

                    // Cari di Judul atau Konten
                    const matches = cleanData.filter(item => {
                        const sTitle = item.title.toLowerCase();
                        const sContent = item.content.toLowerCase();
                        const q = query.toLowerCase();
                        return sTitle.includes(q) || sContent.includes(q);
                    });

                    if (matches.length > 0) {
                    resultsContainer.innerHTML = matches.map(item => {
                        // Tentukan warna badge kategori berdasarkan folder
                        const catColor = item.category === 'Audio' ? '#ff9800' : 
                     item.category === 'Video' ? '#2196f3' : 
                     item.category === 'It' ? '#4caf50' : 
                     item.category === 'Podium' ? '#9c27b0' : '#9e9e9e';

    // --- WARNA LOKASI (JW-08, JA-01, DLL) ---
    // Di sini kita tentukan warna background kapsul lokasinya
    const locColor = item.location === 'JW-08' ? '#E91E63' : 
                     item.location === 'JA-01' ? '#673AB7' : 
                     '#607D8B'; // Abu-abu kebiruan untuk default

    return `
        <a href="${item.url}" class="search-page-item">
            <div class="search-item-header">
                <span class="badge-loc" style="background: ${locColor}; color: white;">${item.location || 'GLOBAL'}</span>
                <span class="badge-cat" style="background: ${catColor}; color: white;">${item.category || 'General'}</span>
            </div>
            <div class="res-page-title">${item.title}</div>
            <div class="res-page-snippet">${item.content.substring(0, 160)}...</div>
            <div class="search-item-footer">Buka Panduan Lengkap →</div>
        </a>
    `;
}).join('');
                } else {
                    resultsContainer.innerHTML = `
                        <div style="text-align:center; padding: 50px;">
                            <p>Materi tentang <b>"${query}"</b> tidak ditemukan.</p>
                            <a href="/" style="color: var(--primary-blue); text-decoration: underline;">Kembali ke Beranda</a>
                        </div>`;
                }
                })
                .catch(err => {
                    console.error("Error loading search index:", err);
                    resultsContainer.innerHTML = "<p>Gagal memuat index data. Silakan coba lagi.</p>";
                });
        }
    }
});



// ==========================================
// 6. FUNGSI FILTER REAL-TIME (HOME/NAVBAR)
// ==========================================
function filterMissions() {
    const q = document.getElementById('missionSearch').value.toLowerCase();
    applyFilter(q);
}
function filterMissionsMobile() {
    const q = document.getElementById('missionSearchMobile').value.toLowerCase();
    applyFilter(q);
}
function applyFilter(query) {
    const cards = document.querySelectorAll('.card-link, .location-main-card-link');
    cards.forEach(card => {
        card.style.display = card.innerText.toLowerCase().includes(query) ? "" : "none";
    });
}
