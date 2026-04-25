// Tambahkan di bawah kode Dark Mode kamu
document.addEventListener('DOMContentLoaded', function() {
    const dropdowns = document.querySelectorAll('.dropdown');

    dropdowns.forEach(dropdown => {
        const link = dropdown.querySelector('.nav-link');
        
        link.addEventListener('click', function(e) {
            // Hanya aktifkan logika ini di layar HP (lebar < 600px)
            if (window.innerWidth < 600) {
                const content = dropdown.querySelector('.dropdown-content');
                
                // Jika dropdown belum terbuka, jangan pindah halaman dulu
                if (!content.classList.contains('show')) {
                    e.preventDefault(); 
                    
                    // Tutup dropdown lain yang mungkin lagi kebuka
                    document.querySelectorAll('.dropdown-content').forEach(d => {
                        if (d !== content) d.classList.remove('show');
                    });
                    
                    content.classList.toggle('show');
                }
                // Jika di-tap lagi saat sudah terbuka, baru dia akan lari ke href link utamanya
            }
        });
    });
});
