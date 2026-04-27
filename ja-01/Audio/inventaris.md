---
layout: default
title: Inventory Control 🚀
---

<style>
    /* CSS Tambahan Khusus Inventaris yang Belum Ada di Main Style */
    :root {
        --primary-purple: #8B5CF6;
        --soft-purple: #EDE9FE;
        --card-radius: 24px;
    }

    /* HERO & FILTER */
    .hero { max-width: 1200px; margin: 20px auto; padding: 0 20px; }
    .hero h1 { font-size: 42px; font-weight: 800; line-height: 1.2; }
    .hero h1 span { transform: rotate(-2deg); background: #FFE066; padding: 0 10px; border-radius: 8px; display: inline-block; }
    .hero p { color: var(--text-gray); font-size: 16px; margin-top: 12px; line-height: 1.5; margin-bottom: 20px;}
    
    .filter-container { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
    .custom-input {
        padding: 12px 16px; border-radius: 100px; border: 2px solid #E5E7EB;
        font-family: inherit; font-size: 14px; font-weight: 600; outline: none;
        transition: all 0.3s ease; background: white; cursor: pointer;
    }
    .custom-input:focus { border-color: var(--primary-blue); box-shadow: 0 0 0 4px var(--soft-blue); }
    .search-bar { flex-grow: 1; min-width: 200px; cursor: text; }

    /* SECTIONS & GRID */
    .content-container { max-width: 1200px; margin: 0 auto; padding: 15px; }
    .grid-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }

    /* MISSION CARDS (Gen-Z Bento Style) */
    .mission-card {
        background: #ffffff; border: 2px solid #F0F0F0; border-radius: var(--card-radius);
        padding: 16px; transition: all 0.3s ease; height: 100%; position: relative;
        display: flex; flex-direction: column; cursor: pointer;
    }
    .mission-card:hover { border-color: #D1D5DB; transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.04); }

    .card-img {
        width: 100%; height: 160px; object-fit: cover; border-radius: 16px;
        margin-bottom: 15px; background: #F9FAFB;
    }
    
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
    .mission-card h3 { font-size: 18px; font-weight: 800; color: var(--text-dark); text-transform: uppercase; }
    .qty-badge { background: #1A1A1A; color: white; padding: 4px 10px; border-radius: 100px; font-size: 12px; font-weight: 800; }

    .tag-group { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
    .badge { font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 100px; letter-spacing: 0.5px; }
    
    /* Warna Badge Statis */
    .badge-green { background: #D1FAE5; color: #059669; }
    .badge-gray { background: #E5E7EB; color: #4B5563; }
    .badge-red { background: #FEE2E2; color: #DC2626; }

    /* MODAL STYLE */
    .modal-overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,0.85);
        display: none; align-items: center; justify-content: center; z-index: 1000; padding: 20px;
        backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px);
    }
    .modal-overlay.active { display: flex; }
    .modal-content {
        background: white; border-radius: var(--card-radius); max-width: 600px; width: 100%;
        padding: 20px; position: relative; max-height: 90vh; overflow-y: auto;
    }
    .modal-close { position: absolute; top: -40px; right: 0; background: none; border: none; font-size: 32px; color: white; cursor: pointer; }
    .modal-main-img { width: 100%; height: 300px; object-fit: contain; border-radius: 16px; background: #F4F5F7; }
    .modal-thumbs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 10px; }
    .modal-thumb { width: 100%; height: 70px; object-fit: cover; border-radius: 12px; cursor: pointer; border: 2px solid transparent; }
</style>

<section class="hero">
    <h1>Cek Logistik: <br><span>Ready for Action!</span> ⚡</h1>
    <p>Pantau ketersediaan barang tim Audio & Video secara real-time.</p>
    
    <div class="filter-container">
        <select id="filterTim" class="custom-input">
            <option value="">🎯 Semua Tim</option>
        </select>
        <select id="filterMilik" class="custom-input">
            <option value="">🏢 Semua Kepemilikan</option>
        </select>
        <input id="searchInput" type="text" placeholder="🔍 Cari nama barang..." class="custom-input search-bar">
    </div>
</section>

<div class="content-container">
    <p id="loading" style="text-align: center; font-weight: bold;">⏳ Sinkronisasi data ke satelit...</p>
    <div id="grid" class="grid-cards"></div>
</div>

<div id="modal" class="modal-overlay">
    <div class="modal-content">
        <button id="closeModal" class="modal-close">✕</button>
        <div style="text-align: center; margin-bottom: 15px;">
            <h2 id="modalName" style="font-weight: 800; text-transform: uppercase;">Nama Barang</h2>
            <div id="modalTags" class="tag-group" style="justify-content: center; margin-top: 10px;"></div>
        </div>
        <img id="modalImage" class="modal-main-img" src="" alt="Preview">
        <div id="modalThumbs" class="modal-thumbs"></div>
        <p id="modalDesc" style="margin-top: 15px; font-size: 14px; color: #6B7280; text-align: center; font-style: italic; background: #F4F5F7; padding: 10px; border-radius: 12px;"></p>
    </div>
</div>

<script>
    // Link API Google Sheets kamu
    const API_URL = "https://script.google.com/macros/s/AKfycbwNGJQ3nYwvKRZOFJtKSw39Aq7H3gNa1WRcsPaUCNkm_syiq5p_8eGpbiLnzo3Aj9rj/exec?action=api";

    // ... (Script JS kamu yang di bawah tetap sama, tinggal paste di sini) ...
</script>
