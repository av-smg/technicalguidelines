// ==========================================
// MESIN LOGIKA GUDANG (V.15 - RADAR TERTINGGAL & SURAT JALAN PINTAR)
// ==========================================

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxm4eJGQjBytrLTQgYrsfEXIQxLQ_Rq7NFVM__Y8AhRfzPe8q5FJhofecqrDJ5ywkeBEg/exec"; 
const API_BACKEND_PIN = "a1b2c3"; 

let allItems = []; let allMissions = []; let optionsData = { lokasi: [], tim: [] }; 
let html5QrCode = null; 
let isAdminMode = false, isBulkMode = false, selectedRows = new Set(), lastScanTime = 0, activeFilterPill = 'all', currentViewMode = 'grid'; 
let pendingAddFotos = []; let pendingEditFotos = []; 
let currentCameraFacing = "environment"; let isFlashlightOn = false;

window.onload = () => { injectGudangDarkModeCSS(); checkAdminStatus(); injectLightbox(); loadData(); };

function injectGudangDarkModeCSS() {
    if(document.getElementById('gudangDarkModeCss')) return;
    const style = document.createElement('style'); style.id = 'gudangDarkModeCss';
    style.innerHTML = `
        @keyframes pulseAlert { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.05); } 100% { opacity: 1; transform: scale(1); } }
        body.dark-mode, [data-theme="dark"] { background-color: #0f172a !important; color: #e2e8f0 !important; }
        body.dark-mode .toolbar-card { background: #1e293b !important; border-color: #334155 !important; }
        body.dark-mode .pill-btn { background: #334155 !important; color: #94a3b8 !important; border-color: #475569 !important; }
        body.dark-mode .pill-btn.active { background: #ea580c !important; color: white !important; border-color: #c2410c !important; }
        body.dark-mode .mission-card, body.dark-mode .list-item { background: #1e293b !important; border-color: #334155 !important; }
        body.dark-mode .card-title, body.dark-mode .list-title { color: #f8fafc !important; }
        body.dark-mode .modal-content { background: #1e293b !important; color: #e2e8f0 !important; border: 1px solid #334155 !important; }
        body.dark-mode .modal-content h3 { color: #f8fafc !important; }
        body.dark-mode div[style*="background:#f8fafc"], body.dark-mode div[style*="background:#f1f5f9"], body.dark-mode div[style*="background:#eff6ff"], body.dark-mode div[style*="background:#f0fdf4"], body.dark-mode div[style*="background:#fff"], body.dark-mode div[style*="background:#fff7ed"], body.dark-mode div[style*="background:white"], body.dark-mode div[style*="background:#fef2f2"], body.dark-mode div[style*="background:#fffbeb"] { background: #0f172a !important; border-color: #334155 !important; color: #cbd5e1 !important; }
        body.dark-mode div[style*="color:#1e293b"] { color: #f8fafc !important; }
        body.dark-mode div[style*="color:#1d4ed8"], body.dark-mode div[style*="color:#16a34a"] { color: #60a5fa !important; }
        body.dark-mode span[style*="color:gray"], body.dark-mode label[style*="color:gray"], body.dark-mode div[style*="color:gray"], body.dark-mode p[style*="color:gray"] { color: #94a3b8 !important; }
        body.dark-mode select, body.dark-mode input { background: #1e293b !important; color: #f8fafc !important; border-color: #475569 !important; }
        body.dark-mode .bulk-bar { background: #0f172a !important; border-top: 1px solid #334155 !important; }
        body.dark-mode .bulk-info { color: #f8fafc !important; }
        body.dark-mode .badge-status.status-gudang { background: #064e3b !important; color: #34d399 !important; border-color: #047857 !important; }
        body.dark-mode .badge-status.status-lokasi { background: #78350f !important; color: #fbbf24 !important; border-color: #92400e !important; }
        body.dark-mode .badge-status.status-dipakai { background: #1e3a8a !important; color: #93c5fd !important; border-color: #1e40af !important; }
        body.dark-mode .badge-status.status-keranjang { background: #4c1d95 !important; color: #a78bfa !important; border-color: #5b21b6 !important; }
        body.dark-mode .badge-status.status-perjalanan { background: #374151 !important; color: #cbd5e1 !important; border-color: #475569 !important; }
        body.dark-mode span[style*="background:#f0fdf4"] { background: #064e3b !important; color: #34d399 !important; border-color: #047857 !important; }
        body.dark-mode span[style*="background:#fef2f2"] { background: #7f1d1d !important; color: #fca5a5 !important; border-color: #991b1b !important; }
        body.dark-mode span[style*="background:#fef3c7"] { background: #78350f !important; color: #fbbf24 !important; border-color: #92400e !important; }
        body.dark-mode .gallery-box { background: transparent !important; }
    `;
    document.head.appendChild(style);
}

let lbImages = []; let lbIndex = 0;
function injectLightbox() {
    if(document.getElementById('customLightbox')) return;
    document.body.insertAdjacentHTML('beforeend', `
        <div id="customLightbox" class="modal-overlay" style="z-index:10000; display:none; flex-direction:column; align-items:center; justify-content:center; background:rgba(15,23,42,0.95); backdrop-filter:blur(5px);">
            <button onclick="closeLightbox()" style="position:absolute; top:20px; right:20px; background:#ef4444; color:white; border:none; border-radius:50%; width:40px; height:40px; font-weight:bold; font-size:16px; cursor:pointer;">✕</button>
            <div style="display:flex; align-items:center; justify-content:center; width:100%; max-width:800px; gap:15px; padding:0 10px; box-sizing:border-box;">
                <button onclick="prevLightbox()" style="background:rgba(255,255,255,0.2); color:white; border:none; border-radius:50%; width:45px; height:45px; font-weight:bold; font-size:20px; cursor:pointer; flex-shrink:0;">❮</button>
                <img id="lightboxImg" src="" style="max-width:100%; max-height:75vh; border-radius:12px; object-fit:contain; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
                <button onclick="nextLightbox()" style="background:rgba(255,255,255,0.2); color:white; border:none; border-radius:50%; width:45px; height:45px; font-weight:bold; font-size:20px; cursor:pointer; flex-shrink:0;">❯</button>
            </div>
            <div id="lightboxCounter" style="color:#cbd5e1; margin-top:15px; font-size:14px; font-weight:bold; background:rgba(0,0,0,0.5); padding:5px 15px; border-radius:20px;"></div>
        </div>
    `);
}
function openCustomLightbox(index, imgArrayStr) { lbImages = JSON.parse(decodeURIComponent(imgArrayStr)); lbIndex = index; updateLightboxUI(); document.getElementById('customLightbox').style.display = 'flex'; }
function closeLightbox() { document.getElementById('customLightbox').style.display = 'none'; }
function nextLightbox() { lbIndex = (lbIndex + 1) % lbImages.length; updateLightboxUI(); }
function prevLightbox() { lbIndex = (lbIndex - 1 + lbImages.length) % lbImages.length; updateLightboxUI(); }
function updateLightboxUI() { document.getElementById('lightboxImg').src = lbImages[lbIndex]; document.getElementById('lightboxCounter').innerText = `Foto ${lbIndex + 1} dari ${lbImages.length}`; }

function checkAdminStatus() { 
    const currentUserRole = localStorage.getItem('av_session_role');
    if (currentUserRole === "Master" || currentUserRole === "Kru") { isAdminMode = true; document.body.classList.add("admin-mode-active"); } 
    else { isAdminMode = false; document.body.classList.remove("admin-mode-active"); } 
    const btnMode = document.getElementById("btnBulkMode"); if(btnMode && !isBulkMode) btnMode.innerHTML = `☑️ Mode Pilih`;
}

function showToast(msg, isSuccess = true) { const t = document.getElementById("toastMsg"); if(!t) return; t.innerText = msg; t.className = "toast-msg show " + (isSuccess ? "toast-success" : "toast-error"); setTimeout(() => { t.classList.remove("show"); }, 4000); }
function triggerFeedback(type) { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); if (type === 'success') { osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime); gain.gain.setValueAtTime(0.5, ctx.currentTime); osc.start(); osc.stop(ctx.currentTime + 0.1); if(navigator.vibrate) navigator.vibrate(100); } else { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, ctx.currentTime); gain.gain.setValueAtTime(0.5, ctx.currentTime); osc.start(); osc.stop(ctx.currentTime + 0.3); if(navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]); } } catch(e) { console.log("Audio API not supported"); } }

async function loadData() { 
    try { 
        document.getElementById("loading").style.display = "block"; 
        const res = await fetch(SCRIPT_URL + "?action=api&nocache=" + new Date().getTime()); 
        const data = await res.json(); 
        let rawItems = (data.inventory || []).filter(item => item.nama_barang && item.nama_barang.toString().trim().toLowerCase() !== 'nama barang'); 
        
        // --- SMART SORTING: A-Z by Nama, Lalu 1-10 by Kode Barang ---
        rawItems.sort((a, b) => {
            let nameA = (a.nama_barang || "").toLowerCase(); let nameB = (b.nama_barang || "").toLowerCase();
            if (nameA < nameB) return -1; if (nameA > nameB) return 1;
            let kodeA = (a.kode_barang || "").toLowerCase(); let kodeB = (b.kode_barang || "").toLowerCase();
            return kodeA.localeCompare(kodeB, undefined, {numeric: true, sensitivity: 'base'});
        });
        allItems = rawItems;
        allMissions = data.missions || []; // Simpan data misi global
        optionsData = data.dropdowns || { lokasi: [], tim: [] }; 
        
        populateFilterTim(); document.getElementById("loading").style.display = "none"; 
        setupStickyHeader(); applyFilters(); 
    } catch (e) { document.getElementById("loading").innerHTML = `<span style="color:red;">Gagal memuat data satelit. Periksa koneksi internet.</span>`; } 
}

function populateFilterTim() {
    const container = document.querySelector('#panelFilterLanjutan div'); if(!container) return;
    let daftarTim = new Set();
    allItems.forEach(item => { let tim = item.tim || item["Tim"] || ""; if (tim && tim.trim() !== "") daftarTim.add(tim.trim()); });
    if(daftarTim.size > 0) {
        container.innerHTML = ""; 
        daftarTim.forEach(tim => { let val = tim.toLowerCase(); container.innerHTML += `<label><input type="checkbox" class="cek-tim" value="${val}" onchange="applyFilters()"> ${tim}</label>`; });
    }
}

function setupStickyHeader() {
    let toolbar = document.querySelector(".toolbar-card");
    if(toolbar) {
        toolbar.style.position = "sticky"; toolbar.style.top = "0px"; toolbar.style.zIndex = "99";
        toolbar.style.background = "rgba(255, 255, 255, 0.95)"; toolbar.style.backdropFilter = "blur(8px)"; toolbar.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.05)";
        
        let pillsWrapper = document.querySelector(".filter-pills-wrapper");
        if(pillsWrapper && !pillsWrapper.innerHTML.includes("Di Lokasi Event")) {
            pillsWrapper.insertAdjacentHTML('beforeend', `
                <button class="pill-btn" data-filter="Di Lokasi Event" onclick="setFilterPill('Di Lokasi Event', this)">⚠️ Event</button>
                <button class="pill-btn" data-filter="Gudang Kanguru" onclick="setFilterPill('Gudang Kanguru', this)" style="border-left: 2px solid #cbd5e1; margin-left:5px;">🏢 Kanguru</button>
                <button class="pill-btn" data-filter="Gudang Mrican" onclick="setFilterPill('Gudang Mrican', this)">🏢 Mrican</button>
            `);
        }
    }
}

function toggleViewMode() { const btn = document.getElementById("btnViewToggle"); if (currentViewMode === 'grid') { currentViewMode = 'list'; btn.innerHTML = '🖼️ Grid View'; document.getElementById("dataContainer").className = "list-view-container"; } else { currentViewMode = 'grid'; btn.innerHTML = '📄 List View'; document.getElementById("dataContainer").className = "grid-cards"; } applyFilters(); }
function setFilterPill(status, btnElement) { activeFilterPill = status; document.querySelectorAll('.pill-btn').forEach(btn => btn.classList.remove('active')); btnElement.classList.add('active'); applyFilters(); }

function getFilteredData() { 
    const q = document.getElementById("searchInput").value.toLowerCase(); 
    let timAktif = Array.from(document.querySelectorAll('.cek-tim:checked')).map(cb => cb.value.toLowerCase());

    return allItems.filter(i => { 
        const matchQ = (i.nama_barang||"").toLowerCase().includes(q) || (i.kode_barang||"").toLowerCase().includes(q) || (i.kode_wadah||"").toLowerCase().includes(q); 
        let stat = i.status_digunakan || 'Di Gudang'; if(stat === 'FALSE') stat = 'Di Gudang'; 
        let lok = i.lokasi_saat_ini || i.lokasi || i["Lokasi Saat Ini"] || '';
        
        let matchPill = false;
        if (activeFilterPill === 'all') matchPill = true;
        else if (activeFilterPill === 'Rusak') matchPill = ((i.kondisi||"").toLowerCase() === 'rusak' || (i.kondisi||"").toLowerCase() === 'periksa');
        else if (activeFilterPill === 'Di Lokasi Event') matchPill = (lok === 'Di Lokasi Event'); 
        else if (activeFilterPill === 'Gudang Kanguru') matchPill = (lok.includes('Kanguru'));
        else if (activeFilterPill === 'Gudang Mrican') matchPill = (lok.includes('Mrican'));
        else matchPill = (stat === activeFilterPill);
        
        let itemTim = String(i.tim || i["Tim"] || "").toLowerCase();
        let matchAdvanced = timAktif.length === 0 || timAktif.some(t => itemTim === t || itemTim.includes(t));
        
        return matchQ && matchPill && matchAdvanced; 
    }); 
}

function applyFilters() { render(getFilteredData()); }
function getStatusClass(status, lokasi) { if(lokasi === 'Di Lokasi Event') return 'badge-status status-lokasi'; if(status === 'Akan Dibawa') return 'badge-status status-keranjang'; if(status === 'Sedang Dipakai') return 'badge-status status-dipakai'; if(status.includes('Perjalanan')) return 'badge-status status-perjalanan'; return 'badge-status status-gudang'; }

function render(data) {
    const container = document.getElementById("dataContainer"); container.innerHTML = "";
    data.forEach(item => {
        const card = document.createElement("div"); const isSelected = selectedRows.has(item.row_index); let stat = item.status_digunakan || "Di Gudang"; if(stat === 'FALSE') stat = "Di Gudang"; let lok = item.lokasi_saat_ini || item.lokasi || item["Lokasi Saat Ini"] || "Gudang Kanguru";
        
        // 🔥 RADAR BARANG TERTINGGAL
        let isNyangkut = false;
        if (lok === 'Di Lokasi Event') {
             // Cek apakah ada misi aktif yang melibatkan alat ini (atau wadahnya)
             let targetKode = (item.kode_barang || "").toLowerCase();
             let targetWadah = (item.kode_wadah || "").toLowerCase();
             
             let adaMisiAktif = allMissions.some(m => {
                 if (m.status_misi === 'Selesai') return false; // Abaikan misi selesai
                 let kodeMisi = (m.kode_barang || "").toLowerCase();
                 let matchBarang = targetKode !== "" && kodeMisi.includes(targetKode);
                 let matchWadah = targetWadah !== "" && kodeMisi.includes(targetWadah);
                 return matchBarang || matchWadah;
             });
             // Jika ada di lokasi event TAPI tidak ada misi aktif yang mempertanggungjawabkannya = NYANGKUT!
             if (!adaMisiAktif) isNyangkut = true;
        }

        let badgeLokasiHtml = (lok.toLowerCase().includes("gudang") && stat === "Di Gudang") ? `<span class="badge-status status-gudang">🏢 ${lok}</span>` : `<span class="badge-status status-lokasi">📍 ${lok}</span><span class="${getStatusClass(stat, lok)}">${stat}</span>`;
        let alertBadge = isNyangkut ? `<span style="background:#ef4444; color:white; font-size:9px; font-weight:900; padding:3px 6px; border-radius:4px; border:1px solid #7f1d1d; animation: pulseAlert 1.5s infinite; letter-spacing:0.5px;">🚨 TERTINGGAL</span>` : "";

        let safeFileIds = item.file_ids || item.fotos || []; let firstFileId = safeFileIds.find(id => id && id.length > 5); let imageSrc = 'https://placehold.co/300x300/EEEEEE/999999?text=NO+IMAGE'; if (firstFileId) { imageSrc = firstFileId.includes("http") ? firstFileId : `https://drive.google.com/thumbnail?id=${firstFileId}&sz=w400`; }
        const kodeBadge = item.kode_barang ? `<span style="color:#ea580c; font-weight:900; font-size:9px;">#${item.kode_barang}</span>` : ""; 
        const timeBadge = item.timestamp ? `<div style="font-size:8px; color:#94a3b8;">⏱️ ${item.timestamp}</div>` : "";
        let colorKondisi = item.kondisi && item.kondisi.toLowerCase() === 'bagus' ? '#16a34a' : '#dc2626'; let bgKondisi = item.kondisi && item.kondisi.toLowerCase() === 'bagus' ? '#f0fdf4' : '#fef2f2'; 
        const kondisiBadge = `<span style="font-size:9px; padding:2px 4px; border-radius:4px; border:1px solid ${colorKondisi}; background:${bgKondisi}; color:${colorKondisi}; font-weight:bold;">${item.kondisi || 'Bagus'}</span>`;
        const boxBadge = item.kode_wadah ? `<span style="font-size:9px; color:#d97706; background:#fef3c7; border-radius:4px; padding:2px 4px; border:1px solid #fde68a;">🧰 IN-BOX</span>` : "";

        if (currentViewMode === 'grid') { 
            card.className = "mission-card " + (isSelected ? "selected " : "") + (stat === 'Akan Dibawa' ? "card-siap-dibawa " : "") + (isNyangkut ? "nyangkut-alert" : "");
            if (isNyangkut) card.style.border = "2px solid #ef4444";
            card.innerHTML = `${isSelected ? '<div class="card-check">✓</div>' : ''}<div style="position:relative;"><img src="${imageSrc}" class="card-img" loading="lazy"><div style="position:absolute; bottom:12px; right:4px;"><span class="badge-qty">Qty: ${item.jumlah || 0}</span></div></div><h4 class="card-title">${item.nama_barang}</h4><div style="display:flex; align-items:center; flex-wrap:wrap; gap:4px; margin-bottom:4px;">${kodeBadge} ${kondisiBadge} ${boxBadge} ${alertBadge}</div><div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:auto;">${badgeLokasiHtml}</div>`;
        } else { 
            card.className = "list-item " + (isSelected ? "selected " : "") + (stat === 'Akan Dibawa' ? "card-siap-dibawa " : "") + (isNyangkut ? "nyangkut-alert" : ""); 
            if (isNyangkut) card.style.borderLeft = "4px solid #ef4444";
            card.innerHTML = `${isSelected ? '<div class="card-check" style="top:50%; transform:translateY(-50%); right:10px;">✓</div>' : ''}<img src="${imageSrc}" class="list-img" loading="lazy"><div class="list-info"><div style="display:flex; justify-content:space-between; align-items:flex-start;"><h4 class="list-title" style="flex:1;">${item.nama_barang}</h4><span class="badge-qty" style="margin-left:4px;">Qty: ${item.jumlah || 0}</span></div>${timeBadge}<div style="display:flex; gap:4px; flex-wrap:wrap; align-items:center; margin-top:3px;">${kodeBadge} ${kondisiBadge} ${boxBadge} ${alertBadge}</div><div style="display:flex; gap:4px; flex-wrap:wrap; align-items:center; margin-top:3px;">${badgeLokasiHtml}</div></div>`; 
        }
        card.onclick = () => { if (isBulkMode) toggleSelection(item.row_index); else openDetailModal(item); }; container.appendChild(card);
    });
}

function openDetailModal(item) {
    const oldModal = document.getElementById("detailModal"); if(oldModal) oldModal.remove();
    let stat = item.status_digunakan || "Di Gudang"; if(stat === 'FALSE') stat = "Di Gudang"; let lok = item.lokasi_saat_ini || item.lokasi || item["Lokasi Saat Ini"] || "Gudang Kanguru";
    
    let safeFileIds = item.file_ids || item.fotos || [];
    let validHighResUrls = []; let galleryHtml = `<div class="detail-gallery">`; let adaFoto = false;
    
    safeFileIds.forEach((fileId, i) => { 
        if(fileId && fileId.length > 5) { 
            let thumbUrl = fileId.includes("http") ? fileId : `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`; let highResUrl = fileId.includes("http") ? fileId.replace('sz=800', 'sz=s2000') : `https://drive.google.com/thumbnail?id=${fileId}&sz=s2000`; 
            validHighResUrls.push(highResUrl); let arrayStr = encodeURIComponent(JSON.stringify(validHighResUrls));
            if(i < 3) { galleryHtml += `<img src="${thumbUrl}" class="gallery-img" onclick="openCustomLightbox(${validHighResUrls.length - 1}, '${arrayStr}')">`; } adaFoto = true; 
        } 
    });

    let badgeWadahHtml = ""; let wadahHeaderHtml = ""; let kodeWadah = item.kode_wadah ? item.kode_wadah.toString().trim() : "";

    if (kodeWadah !== "") {
        let wadahItem = allItems.find(w => w.kode_barang && w.kode_barang.toString().trim().toLowerCase() === kodeWadah.toLowerCase());
        if (wadahItem) {
            let wFotos = wadahItem.file_ids || wadahItem.fotos || []; let firstWFoto = wFotos.find(id => id && id.toString().trim().length > 5);
            let thumbWUrl = firstWFoto ? (firstWFoto.includes("http") ? firstWFoto : `https://drive.google.com/thumbnail?id=${firstWFoto}&sz=w400`) : 'https://placehold.co/400x400/EEEEEE/999999?text=NO+FOTO+WADAH';
            let highResWUrl = firstWFoto ? (firstWFoto.includes("http") ? firstWFoto.replace('sz=800', 'sz=s2000') : `https://drive.google.com/thumbnail?id=${firstWFoto}&sz=s2000`) : thumbWUrl;
            
            validHighResUrls.push(highResWUrl); let arrayStrUpdated = encodeURIComponent(JSON.stringify(validHighResUrls));
            
            galleryHtml += `
            <div style="position:relative; display:inline-block; vertical-align:top; flex-shrink:0;">
                <img src="${thumbWUrl}" class="gallery-img" style="border:3px solid #ea580c; box-sizing:border-box;" onclick="openCustomLightbox(${validHighResUrls.length - 1}, '${arrayStrUpdated}')">
                <span style="position:absolute; bottom:8px; left:50%; transform:translateX(-50%); background:#ea580c; color:white; font-size:10px; font-weight:900; padding:2px 8px; border-radius:4px; letter-spacing:1px; border:1px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.5); pointer-events:none;">WADAH</span>
            </div>`; adaFoto = true;
            
            wadahHeaderHtml = `<span style="display:inline-block; margin-left:5px; background:#fef3c7; color:#d97706; padding:2px 8px; border-radius:4px; border:1px solid #fde68a; font-size:9px;">🧰 IN-BOX</span>`;
            badgeWadahHtml = `<div style="margin-top:10px; margin-bottom:10px; cursor:pointer;" onclick="document.getElementById('searchInput').value='${kodeWadah}'; applyFilters(); document.getElementById('detailModal').remove();"><span style="display:inline-block; background:#fffbeb; color:#d97706; padding:6px 12px; border-radius:8px; border:1px solid #fde68a; font-size:11px; font-weight:bold;">🧰 Disimpan di: ${wadahItem.nama_barang} (#${kodeWadah})</span></div>`;
        } else {
            wadahHeaderHtml = `<span style="display:inline-block; margin-left:5px; background:#f1f5f9; color:#64748b; padding:2px 8px; border-radius:4px; border:1px dashed #cbd5e1; font-size:9px;">🧰 Menunggu wadah: #${kodeWadah}</span>`;
            badgeWadahHtml = `<div style="margin-top:10px; margin-bottom:10px;"><span style="display:inline-block; background:#f1f5f9; color:#64748b; padding:6px 12px; border-radius:8px; border:1px dashed #cbd5e1; font-size:11px; font-weight:bold;">🧰 Menunggu data wadah: #${kodeWadah}</span></div>`;
        }
    }
    
    let finalArrayStr = encodeURIComponent(JSON.stringify(validHighResUrls));
    galleryHtml = galleryHtml.replace(/openCustomLightbox\(\d+,\s*'.*?'\)/g, function(match) { return match.replace(/'.*'/, `'${finalArrayStr}'`); });

    if(!adaFoto) galleryHtml += `<img src="https://placehold.co/300x200/EEEEEE/999999?text=Tidak+Ada+Foto" class="gallery-img" style="width:100%;">`; 
    galleryHtml += `</div>`;
    
    let isiWadahHtml = ""; 
    if (item.kode_barang) { 
        let isiWadah = allItems.filter(i => i.kode_wadah && i.kode_wadah.toLowerCase() === item.kode_barang.toLowerCase()); 
        if (isiWadah.length > 0) { 
            let listHtml = isiWadah.map(w => {
                let safeFileIdsW = w.file_ids || w.fotos || []; let firstFileIdW = safeFileIdsW.find(id => id && id.length > 5); let thumbW = firstFileIdW ? (firstFileIdW.includes("http") ? firstFileIdW : `https://drive.google.com/thumbnail?id=${firstFileIdW}&sz=w100`) : 'https://placehold.co/100x100/EEEEEE/999999?text=NO+IMG';
                return `<div style="display:flex; align-items:center; gap:10px; margin-bottom:6px; padding:6px; background:#fff; border:1px solid #dcfce7; border-radius:6px; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,0.05);" onclick="document.getElementById('searchInput').value='${w.kode_barang}'; applyFilters(); document.getElementById('detailModal').remove();"><img src="${thumbW}" style="width:45px; height:45px; object-fit:cover; border-radius:6px; border:1px solid #e2e8f0;"><div style="flex:1; line-height:1.2;"><div style="font-size:11px; font-weight:bold; color:#1e293b;">${w.nama_barang}</div><div style="font-size:10px; color:#ea580c; font-weight:bold; margin-top:2px;">#${w.kode_barang || '-'} <span style="color:#64748b; font-weight:normal;">• Qty: ${w.jumlah||0}</span></div></div></div>`;
            }).join('');
            isiWadahHtml = `<div style="text-align:left; margin-top:10px; background:#f0fdf4; padding:10px; border-radius:8px; border:1px solid #bbf7d0;"><div style="font-size:11px; font-weight:bold; color:#16a34a; margin-bottom:8px;">🧰 Isi di dalam wadah ini (${isiWadah.length} jenis):</div>${listHtml}</div>`; 
        } 
    }
    
    let similarItems = allItems.filter(i => i.nama_barang.toLowerCase() === item.nama_barang.toLowerCase());
    let totalSimilarQty = similarItems.reduce((sum, curr) => sum + (parseInt(curr.jumlah) || 1), 0);
    let statusCounts = {};
    similarItems.forEach(i => { let s = (i.status_digunakan && i.status_digunakan !== 'FALSE') ? i.status_digunakan : "Di Gudang"; statusCounts[s] = (statusCounts[s] || 0) + (parseInt(i.jumlah) || 1); });
    
    let similarHtml = "";
    if (similarItems.length > 1 || totalSimilarQty > 1) {
        let badgeHtml = Object.keys(statusCounts).map(status => {
            let bgCol = status.includes('Gudang') ? '#dcfce7' : (status.includes('Dipakai') || status.includes('Event') ? '#fef08a' : '#e2e8f0');
            let txtCol = status.includes('Gudang') ? '#166534' : (status.includes('Dipakai') || status.includes('Event') ? '#854d0e' : '#334155');
            return `<span style="display:inline-block; margin-right:4px; margin-bottom:4px; padding:4px 8px; border-radius:6px; font-size:10px; background:${bgCol}; color:${txtCol}; font-weight:bold; border:1px solid #cbd5e1;">${status}: ${statusCounts[status]}</span>`;
        }).join('');
        similarHtml = `<div style="text-align:left; margin-top:10px; background:#eff6ff; padding:12px; border-radius:8px; border:1px solid #bfdbfe;"><div style="font-size:12px; font-weight:900; color:#1d4ed8; margin-bottom:4px;">📊 Cek Silang Stok '${item.nama_barang}':</div><div style="font-size:11px; color:#1e293b; margin-bottom:8px;">Sistem mendeteksi total <b>${totalSimilarQty} Pcs</b> alat ini. Sebaran:</div><div style="display:flex; flex-wrap:wrap;">${badgeHtml}</div></div>`;
    }

    let logHtml = `<div style="text-align:left; margin-top:10px; background:#f1f5f9; padding:8px; border-radius:6px; font-size:10px; color:#475569; max-height:80px; overflow-y:auto; white-space:pre-wrap; border:1px solid #cbd5e1;"><b>📜 Histori Log:</b><br>${item.log || 'Belum ada histori.'}</div>`;

    let optionsLokasi = `<option value="Gudang Kanguru" ${lok.includes('Kanguru') ? 'selected':''}>🏢 Gudang Kanguru</option><option value="Gudang Mrican" ${lok.includes('Mrican') ? 'selected':''}>🏢 Gudang Mrican</option><option value="Dalam Perjalanan" ${lok === 'Dalam Perjalanan' ? 'selected':''}>🚚 Dalam Perjalanan</option><option value="Di Lokasi Event" ${lok === 'Di Lokasi Event' ? 'selected':''}>📍 Di Lokasi Event</option>`; 
    let optionsStatus = `<option value="Di Gudang" ${stat === 'Di Gudang' ? 'selected':''}>📦 Standby / Di Gudang</option><option value="Akan Dibawa" ${stat === 'Akan Dibawa' ? 'selected':''}>🛒 Akan Dibawa (Packing)</option><option value="Sedang Dipakai" ${stat === 'Sedang Dipakai' ? 'selected':''}>🔌 Sedang Dipakai / Aktivasi</option><option value="Sedang Diservis" ${stat === 'Sedang Diservis' ? 'selected':''}>🛠️ Sedang Diservis</option>`;
    
    let actionButtons = isAdminMode ? `<button onclick='openEditFullModal(${JSON.stringify(item).replace(/'/g, "&#39;")})' style="width:100%; padding:10px; background:#f59e0b; color:white; border:none; border-radius:8px; font-weight:bold; margin-bottom:15px;">✏️ EDIT DATA / FOTO</button><div style="text-align:left; border-top:1px dashed #ccc; padding-top:15px;"><label style="font-size:11px; font-weight:bold; color:gray; display:block; margin-bottom:4px;">📍 Update Lokasi:</label><select id="editLokasi" style="width:100%; padding:8px; border-radius:8px; border:1px solid #ccc; margin-bottom:12px;">${optionsLokasi}</select><label style="font-size:11px; font-weight:bold; color:gray; display:block; margin-bottom:4px;">🔌 Update Status:</label><select id="editStatus" style="width:100%; padding:8px; border-radius:8px; border:1px solid #ccc; margin-bottom:12px; font-weight:bold;">${optionsStatus}</select><button onclick="saveEditLokasiStatus(${item.row_index})" style="width:100%; padding:12px; background:#ea580c; color:white; border:none; border-radius:8px; font-weight:bold;">💾 SIMPAN STATUS</button></div>` : `<div style="margin-top:15px; padding:10px; background:#f1f5f9; border-radius:8px; font-size:12px; color:#64748b;">🔒 Login Akses untuk mengubah status/lokasi.</div>`;
    
    const modalHtml = `<div id="detailModal" class="modal-overlay active"><div class="modal-content" style="max-width:400px; max-height:90vh; overflow-y:auto; background:white; padding:20px; border-radius:15px; text-align:center; position:relative;"><button onclick="document.getElementById('detailModal').remove()" style="position:absolute; top:15px; right:15px; border:none; background:#f1f5f9; width:30px; height:30px; border-radius:50%; font-weight:bold; cursor:pointer; z-index:10;">✕</button>${galleryHtml}<h3 style="margin:0; font-weight:900; color:#1e293b; font-size:18px;">${item.nama_barang}</h3><div style="font-size:10px; color:gray; margin-bottom:8px;">⏱️ Update: ${item.timestamp || '-'}</div><p style="margin:5px 0 5px 0; font-size:12px; color:#ea580c; font-weight:bold;">#${item.kode_barang || '-'} ${wadahHeaderHtml}</p>${badgeWadahHtml}<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px; text-align:left; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0;"><div><span style="color:gray;">Item Ini:</span> <br><b>${item.jumlah || 0} Pcs</b></div><div><span style="color:gray;">Kondisi:</span> <br><b>${item.kondisi || '-'}</b></div><div><span style="color:gray;">📍 Lokasi:</span> <br><b>${lok}</b></div><div><span style="color:gray;">🔌 Status:</span> <br><b>${stat}</b></div></div>${similarHtml}${isiWadahHtml}<div style="text-align:left; margin-top:10px; font-size:11px; color:#475569; background:#fff7ed; padding:8px; border-radius:6px; border:1px solid #fed7aa; margin-bottom:5px;"><b>📝 Ket:</b> ${item.keterangan_ref || 'Tidak ada catatan.'}</div><div style="text-align:left; font-size:11px; margin-bottom:15px; color:#3b82f6;"><b>🎯 Tujuan (Event):</b> ${item.tujuan || '-'}</div>${logHtml}${actionButtons}</div></div>`; 
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 🖨️ CETAK SURAT JALAN PINTAR (PAGE BREAK PER GUDANG & CHECKBOX SMART)
function printSuratJalan() { 
    let currentData = getFilteredData();
    let bawaData = currentData.filter(i => i.status_digunakan === 'Akan Dibawa'); 
    
    if(bawaData.length === 0) return alert("Kosong! Belum ada barang dengan status '🛒 Akan Dibawa' pada filter lokasi saat ini."); 
    
    let eventName = bawaData[0].tujuan || "____________________"; 
    bawaData.sort((a, b) => (a.nama_barang || "").localeCompare(b.nama_barang || ""));
    
    // Kelompokkan Berdasarkan LOKASI GUDANG dulu!
    let lokasiGroups = {};
    bawaData.forEach(item => {
        let lok = item.lokasi_saat_ini || item.lokasi || item["Lokasi Saat Ini"] || "Gudang Tidak Diketahui";
        if (!lokasiGroups[lok]) lokasiGroups[lok] = [];
        lokasiGroups[lok].push(item);
    });

    let printWin = window.open('', '', 'width=800,height=800'); 
    let html = `<html><head><title>Manifest - ${eventName}</title><style>@page { size: A4; margin: 15mm; } body { font-family: 'Arial', sans-serif; padding: 0; color: #000; margin: 0; } .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; } .event-info { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 20px; } .box-group { border: 1px solid #000; margin-bottom: 12px; page-break-inside: avoid; } .box-header { background: #f0f0f0; padding: 6px 12px; font-weight: bold; font-size: 13px; display: flex; align-items: center; border-bottom: 1px solid #000; } .checkbox { display: inline-block; width: 14px; height: 14px; border: 1px solid #000; margin-right: 8px; flex-shrink: 0; } .item-list { list-style: none; padding: 0; margin: 0; } .item-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 4px 12px; border-bottom: 1px dashed #ccc; font-size: 12px; margin-left: 10px;} .item-row:last-child { border-bottom: none; } .qty { font-weight: bold; font-size: 12px; flex-shrink:0; margin-left:10px; } .notes-area { margin-top: 30px; border: 1px solid #000; min-height: 150px; padding: 10px; font-size: 14px; } .page-break { page-break-before: always; } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }</style></head><body onload="window.print()">`;

    let isFirstPage = true;

    for (let lok in lokasiGroups) {
        if (!isFirstPage) { html += `<div class="page-break"></div>`; } // Pisah Halaman per Gudang!
        isFirstPage = false;

        html += `<div class="header"><h2 style="margin:0;">MANIFEST LOGISTIK / SURAT JALAN</h2><p style="margin:5px 0 0 0; color:#444; font-size:12px;">Daftar Pengeluaran - Sumber: <b style="font-size:14px; padding:2px 6px; background:#ddd;">📍 ${lok.toUpperCase()}</b></p></div>`;
        html += `<div class="event-info"><div><b>Tujuan / Event:</b> <span style="font-size:15px;">${eventName.toUpperCase()}</span></div><div><b>Tanggal Cetak:</b> ${new Date().toLocaleString('id-ID')}</div></div>`;

        let itemsInLok = lokasiGroups[lok];
        let groupedWadah = {}; let lepasan = [];
        
        itemsInLok.forEach(item => { 
            let wadah = (item.kode_wadah || "").toUpperCase().trim(); 
            if (wadah) { if (!groupedWadah[wadah]) groupedWadah[wadah] = []; groupedWadah[wadah].push(item); } 
            else { lepasan.push(item); } 
        });

        if (Object.keys(groupedWadah).length > 0) {
            html += `<h4 style="margin-bottom:8px; border-bottom:2px solid #000; display:inline-block; font-size:14px;">📦 PAKET HARDCASE / BOX</h4>`;
            for (let wadah in groupedWadah) { 
                let boxItem = allItems.find(i => i.kode_barang && i.kode_barang.toUpperCase() === wadah); 
                let boxName = boxItem ? boxItem.nama_barang.toUpperCase() : `WADAH #${wadah}`; 
                // CHECKBOX HANYA UNTUK KOTAK BESAR (WADAH)
                html += `<div class="box-group"><div class="box-header"><div class="checkbox"></div> 🧰 ${boxName}  <span style="margin-left:auto; font-weight:normal; font-size:11px; color:#333;">#${wadah}</span></div><ul class="item-list">`; 
                groupedWadah[wadah].forEach(item => { 
                    // ISINYA TANPA CHECKBOX (Hanya bullet point)
                    html += `<li class="item-row"><span>• ${item.nama_barang} ${item.kode_barang ? ` <i style="color:#555; font-size:10px;">(#${item.kode_barang})</i>` : ''}</span><span class="qty">${item.jumlah} Pcs</span></li>`; 
                }); 
                html += `</ul></div>`; 
            }
        }

        if (lepasan.length > 0) {
            html += `<h4 style="margin-top:15px; margin-bottom:8px; border-bottom:2px solid #000; display:inline-block; font-size:14px;">📌 BARANG LEPASAN (TANPA BOX)</h4><div class="box-group"><ul class="item-list">`;
            lepasan.forEach(item => { 
                // CHECKBOX UNTUK MASING-MASING BARANG LEPASAN
                html += `<li class="item-row" style="padding:6px 12px; margin-left:0;"><div style="display:flex; align-items:flex-start;"><div class="checkbox"></div> <span><b>${item.nama_barang.toUpperCase()}</b> ${item.kode_barang ? ` <i style="color:#555; font-size:10px;">(#${item.kode_barang})</i>` : ''}</span></div><span class="qty">${item.jumlah} Pcs</span></li>`; 
            }); 
            html += `</ul></div>`;
        }
        
        html += `<div class="notes-area"><b>📝 Catatan Tambahan Lapangan (Supir/Kru):</b></div>`;
    }
    
    html += `</body></html>`;
    printWin.document.write(html); printWin.document.close(); 
}

function toggleBulkMode() { 
    isBulkMode = !isBulkMode; let bar = document.getElementById("bulkBar"); 
    if(!bar) { 
        document.body.insertAdjacentHTML('beforeend', `
        <div id="bulkBar" class="bulk-bar" style="position:fixed; bottom:0; left:0; right:0; background:#1e293b; color:white; padding:12px 15px; z-index:9000; display:none; justify-content:space-between; align-items:center;">
            <span id="bulkCount" class="bulk-info" style="font-weight:bold; font-size:12px;">0 Terpilih</span>
            <div style="display:flex; gap:6px;">
                <button onclick="selectAllVisible()" style="background:#e2e8f0; color:#334155; border:none; padding:8px 10px; border-radius:6px; font-weight:bold; font-size:11px;">☑️</button>
                <button onclick="openAssignMissionModal()" style="padding:8px 10px; font-size:11px; background:#2563eb; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">🎯 Misi/Event</button>
                <button onclick="openBulkUpdateModal()" class="btn-bulk-process" style="padding:8px 10px; font-size:11px; background:#ea580c; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">⚙️ Status/Lokasi</button>
            </div>
        </div>`); 
        bar = document.getElementById("bulkBar"); 
    } 
    const btnMode = document.getElementById("btnBulkMode"); 
    if (isBulkMode) { 
        if(btnMode) { btnMode.innerHTML = `❌ Batal Pilih`; btnMode.style.background = "#ef4444"; } bar.style.display = "flex"; 
    } else { 
        if(btnMode) { btnMode.innerHTML = `☑️ Mode Pilih`; btnMode.style.background = "#ea580c"; } bar.style.display = "none"; selectedRows.clear(); document.getElementById("bulkCount").innerText = `0 Terpilih`; 
    } 
    applyFilters(); 
}

function toggleSelection(rowIndex) { if (selectedRows.has(rowIndex)) selectedRows.delete(rowIndex); else selectedRows.add(rowIndex); document.getElementById("bulkCount").innerText = `${selectedRows.size} Terpilih`; applyFilters(); }
function selectAllVisible() { getFilteredData().forEach(item => selectedRows.add(item.row_index)); document.getElementById("bulkCount").innerText = `${selectedRows.size} Terpilih`; applyFilters(); }

function openBulkUpdateModal() { 
    if (selectedRows.size === 0) { alert("Pilih minimal 1 barang!"); return; } 
    const modalHtml = `<div id="bulkModal" class="modal-overlay active"><div class="modal-content" style="max-width:350px; padding:20px; background:white; border-radius:15px; position:relative;"><button onclick="document.getElementById('bulkModal').remove()" style="position:absolute; top:15px; right:15px; border:none; background:#f1f5f9; width:30px; height:30px; border-radius:50%; font-weight:bold; cursor:pointer;">✕</button><h3 style="margin:0; color:#ea580c; font-size:18px;">⚙️ Update Status & Lokasi</h3><div style="font-size:12px; color:#64748b; margin-top:5px; margin-bottom:15px; font-weight:bold;">${selectedRows.size} Alat Terpilih</div><div style="text-align:left; margin-bottom:12px;"><label style="font-size:11px; font-weight:bold; color:gray; display:block; margin-bottom:4px;">📍 Ubah Lokasi:</label><select id="bulkNewLokasi" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc; font-weight:bold;"><option value="TETAP">-- Jangan Ubah Lokasi --</option><option value="Gudang Kanguru">🏢 Gudang Kanguru</option><option value="Gudang Mrican">🏢 Gudang Mrican</option><option value="Dalam Perjalanan">🚚 Dalam Perjalanan</option><option value="Di Lokasi Event">📍 Di Lokasi Event</option></select></div><div style="text-align:left; margin-bottom:15px;"><label style="font-size:11px; font-weight:bold; color:gray; display:block; margin-bottom:4px;">🔌 Ubah Status:</label><select id="bulkNewStatus" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc; font-weight:bold;"><option value="TETAP">-- Jangan Ubah Status --</option><option value="Akan Dibawa">🛒 Akan Dibawa (Packing)</option><option value="Sedang Dipakai">🔌 Sedang Dipakai / Aktivasi</option><option value="Di Gudang">📦 Standby / Di Gudang</option></select></div><button onclick="processBulkUpdate(this)" style="width:100%; padding:12px; background:#ea580c; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">PROSES UPDATE MASSAL</button></div></div>`; 
    document.body.insertAdjacentHTML('beforeend', modalHtml); 
}

async function processBulkUpdate(btn) { 
    const newLokasi = document.getElementById("bulkNewLokasi").value; const newStatus = document.getElementById("bulkNewStatus").value; 
    if (newLokasi === "TETAP" && newStatus === "TETAP") { alert("Pilih minimal satu perubahan!"); return; } 
    btn.disabled = true; btn.innerText = "MEMPROSES... (JANGAN DITUTUP)"; 
    try { 
        const payload = { action: "update_status_lokasi", pin: API_BACKEND_PIN, user_name: localStorage.getItem('av_session_nama') || "Kru Tanpa Nama", rows: Array.from(selectedRows), new_lokasi: newLokasi !== "TETAP" ? newLokasi : null, new_status: newStatus !== "TETAP" ? newStatus : null, new_tujuan: "TETAP" }; 
        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) }); const data = await response.json(); 
        if(data.status === "success") { document.getElementById('bulkModal').remove(); toggleBulkMode(); loadData(); showToast("✅ Update massal & Efek Domino berhasil!"); } else { alert("Gagal:\n" + data.message); } 
    } catch (e) { alert("Error Sistem:\n" + e.message); } finally { btn.disabled = false; btn.innerText = "PROSES UPDATE MASSAL"; } 
}

async function saveEditLokasiStatus(rowIndex) {
    const btn = event.target; const newLokasi = document.getElementById("editLokasi").value; const newStatus = document.getElementById("editStatus").value;
    btn.disabled = true; btn.innerText = "MENYIMPAN...";
    try {
        const payload = { action: "update_status_lokasi", pin: API_BACKEND_PIN, user_name: localStorage.getItem('av_session_nama') || "Kru Tanpa Nama", rows: [rowIndex], new_lokasi: newLokasi, new_status: newStatus, new_tujuan: "TETAP" };
        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) }); const data = await response.json();
        if(data.status === "success") { document.getElementById('detailModal').remove(); loadData(); showToast("✅ Status & Efek Domino Diperbarui!"); } else { alert("Gagal:\n" + data.message); }
    } catch (e) { alert("Error Sistem:\n" + e.message); } finally { btn.disabled = false; btn.innerText = "💾 SIMPAN STATUS"; }
}

function openAssignMissionModal() { 
    if (selectedRows.size === 0) { alert("Pilih minimal 1 barang!"); return; } 
    const modalHtml = `<div id="assignModal" class="modal-overlay active"><div class="modal-content" style="max-width:350px; padding:20px; background:white; border-radius:15px; position:relative;"><button onclick="document.getElementById('assignModal').remove()" style="position:absolute; top:15px; right:15px; border:none; background:#f1f5f9; width:30px; height:30px; border-radius:50%; font-weight:bold; cursor:pointer;">✕</button><h3 style="margin:0; color:#2563eb; font-size:18px;">🎯 Tugas Misi & Event</h3><div style="font-size:12px; color:#64748b; margin-top:5px; margin-bottom:15px; font-weight:bold;">${selectedRows.size} Alat Terpilih</div><div style="text-align:left; margin-bottom:12px;"><label style="font-size:11px; font-weight:bold; color:gray; display:block; margin-bottom:4px;">🎪 Nama Event / Tujuan:</label><input type="text" id="assignNewTujuan" placeholder="Pertemuan Wilayah Oktober 2026 - Semarang" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc; font-weight:bold; box-sizing:border-box;"></div><div style="background:#eff6ff; border:1px solid #bfdbfe; padding:15px; border-radius:10px; margin-bottom:15px;"><label style="font-size:11px; font-weight:bold; color:#1d4ed8; display:block; margin-bottom:6px;">🎯 ID Misi Lapangan (Opsional):</label><input type="text" id="assignMissionId" placeholder="Ketik ID Misi (Contoh: M-001)" style="width:100%; padding:10px; border-radius:8px; border:1px solid #93c5fd; font-weight:bold; text-transform:uppercase; margin-bottom:8px; box-sizing:border-box;"></div><button onclick="processAssignMission(this)" style="width:100%; padding:12px; background:#2563eb; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">KIRIM UPDATE 🚀</button></div></div>`; 
    document.body.insertAdjacentHTML('beforeend', modalHtml); 
}

async function processAssignMission(btn) {
    const missionId = document.getElementById("assignMissionId").value.trim().toUpperCase(); const eventName = document.getElementById("assignNewTujuan").value;
    if (!missionId && !eventName) { alert("Isi Nama Event atau ID Misi!"); return; }
    let selectedCodes = []; Array.from(selectedRows).forEach(rowIndex => { let item = allItems.find(i => i.row_index === rowIndex); if (item) { let codeToPush = item.kode_wadah ? item.kode_wadah : item.kode_barang; if (codeToPush && codeToPush.trim() !== "") selectedCodes.push(codeToPush); } });
    selectedCodes = [...new Set(selectedCodes)]; 
    if (missionId && selectedCodes.length === 0) { alert("Alat yang dipilih tidak memiliki Kode Barang/Wadah!"); return; }

    btn.disabled = true; btn.innerText = "MENGIRIM KE SERVER... 🚀"; 
    try { 
        const payload = { action: "assign_to_mission", pin: API_BACKEND_PIN, user_name: localStorage.getItem('av_session_nama') || "Kru Tanpa Nama", id_misi: missionId, new_tujuan: eventName, rows: Array.from(selectedRows), kode_barang_array: selectedCodes }; 
        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) }); const data = await response.json(); 
        if(data.status === "success") { document.getElementById('assignModal').remove(); toggleBulkMode(); showToast(`✅ Sukses Misi & Efek Domino Wadah!`); loadData(); } else { alert("Gagal:\n" + data.message); } 
    } catch (e) { alert("Error Sistem:\n" + e.message); } finally { btn.disabled = false; btn.innerText = "KIRIM UPDATE 🚀"; }
}

function openAddModal() { if(!isAdminMode) return; document.getElementById("formAdd").reset(); pendingAddFotos = []; renderPreviewAddFotos(); document.getElementById("modalAdd").classList.add("active"); }
function closeAddModal() { document.getElementById("modalAdd").classList.remove("active"); }
function handleNewFotos(input) { if (!input.files || input.files.length === 0) return; for (let i = 0; i < input.files.length; i++) { if (pendingAddFotos.length < 3) pendingAddFotos.push(input.files[i]); } input.value = ""; renderPreviewAddFotos(); }
function removeAddFoto(index) { pendingAddFotos.splice(index, 1); renderPreviewAddFotos(); }
function renderPreviewAddFotos() { const container = document.getElementById("previewAddFotos"); container.innerHTML = ""; if (pendingAddFotos.length === 0) { container.innerHTML = `<span style="font-size:11px; color:gray;">Belum ada foto terpilih.</span>`; return; } pendingAddFotos.forEach((file, index) => { const reader = new FileReader(); reader.onload = (e) => { container.innerHTML += `<div style="position:relative; width:70px; height:70px; border-radius:8px; overflow:hidden; border:1px solid #ccc;"><img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;"><button type="button" onclick="removeAddFoto(${index})" style="position:absolute; top:2px; right:2px; background:#ef4444; color:white; border:none; border-radius:50%; width:20px; height:20px; font-size:10px; font-weight:bold; cursor:pointer;">✕</button></div>`; }; reader.readAsDataURL(file); }); }
function compressImage(file, maxWidth = 800) { return new Promise((resolve) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = (event) => { const img = new Image(); img.src = event.target.result; img.onload = () => { const canvas = document.createElement('canvas'); const scaleSize = maxWidth / img.width; canvas.width = maxWidth; canvas.height = img.height * scaleSize; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/jpeg', 0.6)); }; }; }); }

async function submitNewItem(e) { 
    e.preventDefault(); const btn = document.getElementById("btnSubmitAdd"); btn.innerHTML = "⏳ MENGOMPRES FOTO... MOHON TUNGGU"; btn.style.background = "#94a3b8"; btn.disabled = true; await new Promise(r => setTimeout(r, 100));
    try { 
        let base64Fotos = ["", "", ""]; let maxFiles = Math.min(pendingAddFotos.length, 3); for (let i = 0; i < maxFiles; i++) { base64Fotos[i] = await compressImage(pendingAddFotos[i]); } 
        btn.innerHTML = "🚀 MENGIRIM KE SATELIT...";
        const payload = { action: "add_item", pin: API_BACKEND_PIN, user_name: localStorage.getItem('av_session_nama') || "Kru Tanpa Nama", nama: document.getElementById("addNama").value, kode_barang: document.getElementById("addKode").value, kode_wadah: document.getElementById("addWadah").value, jumlah: document.getElementById("addJumlah").value, kondisi: document.getElementById("addKondisi").value, keterangan_ref: document.getElementById("addKet").value, lokasi: document.getElementById("addLokasi") ? document.getElementById("addLokasi").value : "Gudang Kanguru", fotos: base64Fotos }; 
        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) }); const data = await response.json(); 
        if (data.status === "success") { showToast("✅ Alat Tersimpan!"); closeAddModal(); loadData(); } else { alert("Gagal:\n" + data.message); } 
    } catch (err) { alert("Error Sistem:\n" + err.message); } finally { btn.innerHTML = "💾 SIMPAN ALAT"; btn.style.background = "#16a34a"; btn.disabled = false; } 
}

function openEditFullModal(item) { 
    document.getElementById('detailModal').remove(); document.getElementById('modalEditFull').classList.add("active"); document.getElementById("editRowIndex").value = item.row_index; document.getElementById("editNama").value = item.nama_barang; document.getElementById("editKode").value = item.barang || item.kode_barang || ""; document.getElementById("editWadah").value = item.kode_wadah || ""; document.getElementById("editJumlah").value = item.jumlah || 0; document.getElementById("editKondisi").value = item.kondisi || "Bagus"; document.getElementById("editKet").value = item.keterangan_ref || ""; 
    pendingEditFotos = []; let safeFileIds = item.file_ids || item.fotos || []; 
    for(let i = 0; i < 3; i++) { let fileId = safeFileIds[i]; if (fileId && fileId.length > 5) { let imgUrl = fileId.includes("http") ? fileId : `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`; pendingEditFotos.push({ status: 'existing', url: imgUrl, originalId: fileId }); } } renderPreviewEditFotos();
}
function closeEditFullModal() { document.getElementById('modalEditFull').classList.remove("active"); }
function renderPreviewEditFotos() {
    const container = document.getElementById("previewEditFotos"); const btnContainer = document.getElementById("btnContainerEditFoto"); container.innerHTML = "";
    if (pendingEditFotos.length === 0) { container.innerHTML = `<span style="font-size:11px; color:gray;">Belum ada foto tersimpan.</span>`; } else {
        pendingEditFotos.forEach((item, index) => {
            let div = document.createElement('div'); div.style.cssText = "position:relative; width:75px; height:75px; border-radius:8px; overflow:hidden; border:1px solid #ccc;";
            if (item.status === 'existing') { div.innerHTML = `<img src="${item.url}" style="width:100%; height:100%; object-fit:cover;"><button type="button" onclick="removeEditFoto(${index})" style="position:absolute; top:2px; right:2px; background:#ef4444; color:white; border:none; border-radius:50%; width:20px; height:20px; font-size:10px; font-weight:bold; cursor:pointer;">✕</button>`; container.appendChild(div);
            } else if (item.status === 'new') { div.style.border = "2px solid #3b82f6"; container.appendChild(div); const reader = new FileReader(); reader.onload = (e) => { div.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;"><button type="button" onclick="removeEditFoto(${index})" style="position:absolute; top:2px; right:2px; background:#ef4444; color:white; border:none; border-radius:50%; width:20px; height:20px; font-size:10px; font-weight:bold; cursor:pointer;">✕</button>`; }; reader.readAsDataURL(item.file); }
        });
    }
    btnContainer.style.display = pendingEditFotos.length >= 3 ? "none" : "flex";
}
function handleNewEditFotos(input) { if (!input.files || input.files.length === 0) return; for (let i = 0; i < input.files.length; i++) { if (pendingEditFotos.length < 3) { pendingEditFotos.push({ status: 'new', file: input.files[i] }); } } input.value = ""; renderPreviewEditFotos(); }
function removeEditFoto(index) { pendingEditFotos.splice(index, 1); renderPreviewEditFotos(); }

async function submitEditFull(e) { 
    e.preventDefault(); const btn = document.getElementById("btnSubmitEditFull"); btn.innerHTML = "⏳ MENGOMPRES FOTO... MOHON TUNGGU"; btn.style.background = "#94a3b8"; btn.disabled = true; await new Promise(r => setTimeout(r, 100));
    try { 
        let finalFotos = ["", "", ""]; for(let i = 0; i < 3; i++) { let photoItem = pendingEditFotos[i]; if (photoItem) { if (photoItem.status === 'new') { finalFotos[i] = await compressImage(photoItem.file); } else if (photoItem.status === 'existing') { finalFotos[i] = photoItem.originalId; } } else { finalFotos[i] = ""; } } 
        btn.innerHTML = "🚀 MENGIRIM KE SATELIT...";
        const payload = { action: "full_edit_item", pin: API_BACKEND_PIN, user_name: localStorage.getItem('av_session_nama') || "Kru Tanpa Nama", row_index: document.getElementById("editRowIndex").value, nama: document.getElementById("editNama").value, kode_barang: document.getElementById("editKode").value, kode_wadah: document.getElementById("editWadah").value, jumlah: document.getElementById("editJumlah").value, kondisi: document.getElementById("editKondisi").value, keterangan_ref: document.getElementById("editKet").value, lokasi: document.getElementById("editLokasi") ? document.getElementById("editLokasi").value : "", fotos: finalFotos }; 
        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) }); const data = await response.json(); 
        if (data.status === "success") { showToast("✅ Data Diperbarui!"); closeEditFullModal(); loadData(); } else { alert("Gagal:\n" + data.message); } 
    } catch (err) { alert("Error Sistem:\n" + err.message); } finally { btn.innerHTML = "💾 UPDATE DATA & FOTO"; btn.style.background = "#ea580c"; btn.disabled = false; } 
}

function openScannerModal() { 
    let modal = document.createElement("div"); modal.id = "tempScannerModal"; modal.className = "modal-overlay active"; modal.innerHTML = `<div class="modal-content" style="max-width:400px; background:white; padding:15px; border-radius:15px; text-align:center; position:relative;"><button onclick="closeScannerModal()" style="position:absolute; top:10px; right:10px; border:none; background:#fef2f2; color:#dc2626; width:35px; height:35px; border-radius:50%; font-weight:bold; cursor:pointer; z-index:9999;">✕</button><h3 style="margin:0 0 5px 0; font-size:16px;">📸 Scan QR / Barcode</h3><p style="font-size:11px; color:#64748b; margin-bottom:10px;">Arahkan kamera ke kode barang atau wadah</p><div id="qr-reader" style="width:100%; border-radius:10px; overflow:hidden; background:black;"></div><div class="scanner-controls" style="display:flex; gap:10px; justify-content:center; margin-top:15px;"><button class="btn-scanner-action" style="padding:10px 15px; border-radius:8px; border:none; background:#e2e8f0; font-weight:bold; cursor:pointer; flex:1;" onclick="toggleCameraFacing()">🔄 Kamera</button><button class="btn-scanner-action" id="btnFlashlight" style="padding:10px 15px; border-radius:8px; border:none; background:#e2e8f0; font-weight:bold; cursor:pointer; flex:1;" onclick="toggleFlashlight()">🔦 Senter</button></div></div>`; document.body.appendChild(modal); isFlashlightOn = false; startScanner();
}
function startScanner() {
    if(html5QrCode) { html5QrCode.stop().catch(e=>console.log(e)); html5QrCode = null; } html5QrCode = new Html5Qrcode("qr-reader"); let config = { fps: 15, qrbox: { width: 250, height: 250 } };
    html5QrCode.start({ facingMode: currentCameraFacing }, config, 
        (decodedText) => { 
            const now = Date.now(); if (now - lastScanTime < 2000) return; lastScanTime = now; let scanResult = decodedText.trim(); triggerFeedback('success'); 
            if (isBulkMode) { const foundItem = allItems.find(i => (i.kode_barang||"").toString().toLowerCase() === scanResult.toLowerCase() || (i.kode_wadah||"").toString().toLowerCase() === scanResult.toLowerCase()); if (foundItem) { if (!selectedRows.has(foundItem.row_index)) { selectedRows.add(foundItem.row_index); document.getElementById("bulkCount").innerText = `${selectedRows.size} Terpilih`; applyFilters(); showToast(`✅ ${foundItem.nama_barang} ditambahkan!`); } } else { triggerFeedback('error'); showToast(`❌ Kode tidak ada di database!`, false); } } else { closeScannerModal(); document.getElementById('searchInput').value = scanResult; applyFilters(); const foundItem = allItems.find(i => (i.kode_barang||"").toString().toLowerCase() === scanResult.toLowerCase() || (i.kode_wadah||"").toString().toLowerCase() === scanResult.toLowerCase()); if (foundItem) openDetailModal(foundItem); } 
        }, 
        (err) => {}
    ).catch(err => { alert("Gagal membuka kamera: " + err); });
}
function toggleCameraFacing() { currentCameraFacing = currentCameraFacing === "environment" ? "user" : "environment"; showToast("Mengganti kamera...", true); setTimeout(() => { closeScannerModal(); showToast("Silakan buka SCAN kembali", true); }, 500); }
function toggleFlashlight() { if (!html5QrCode) return; isFlashlightOn = !isFlashlightOn; html5QrCode.applyVideoConstraints({ advanced: [{ torch: isFlashlightOn }] }).then(() => { document.getElementById("btnFlashlight").style.background = isFlashlightOn ? "#fef08a" : "#e2e8f0"; }).catch(err => { showToast("Senter tidak didukung/kamera depan aktif.", false); isFlashlightOn = false; document.getElementById("btnFlashlight").style.background = "#e2e8f0"; }); }
function closeScannerModal() { if (html5QrCode) { html5QrCode.stop().catch(e=>console.log(e)); html5QrCode = null; } const m = document.getElementById("tempScannerModal"); if(m) m.remove(); }

const btnBukaFilter = document.getElementById('btnBukaFilter'); const panelFilter = document.getElementById('panelFilterLanjutan');
if (btnBukaFilter && panelFilter) { btnBukaFilter.replaceWith(btnBukaFilter.cloneNode(true)); const newBtnBukaFilter = document.getElementById('btnBukaFilter'); newBtnBukaFilter.addEventListener('click', () => { if (panelFilter.style.display === 'none') { panelFilter.style.display = 'block'; newBtnBukaFilter.innerHTML = '❌ TUTUP FILTER'; newBtnBukaFilter.style.background = '#ef4444'; } else { panelFilter.style.display = 'none'; newBtnBukaFilter.innerHTML = '⚙️ FILTER TIM'; newBtnBukaFilter.style.background = '#334155'; } }); }

function exportToExcel() {
    if (!allItems || allItems.length === 0) { alert("⚠️ Data inventaris belum selesai dimuat dari satelit!"); return; }
    const selectLokasi = document.getElementById('exportLokasi'); const selectTim = document.getElementById('exportTim'); selectLokasi.innerHTML = '<option value="ALL">📦 Semua Gudang / Lokasi</option>'; selectTim.innerHTML = '<option value="ALL">👥 Semua Tim</option>';
    let daftarGudang = new Set(); let daftarTim = new Set();
    allItems.forEach(item => { let lok = item.lokasi_saat_ini || item.lokasi || item["Lokasi Saat Ini"] || ""; if (lok && lok.trim() !== "") { daftarGudang.add(lok.trim()); } let tim = item.tim || item["Tim"] || ""; if (tim && tim.trim() !== "") { daftarTim.add(tim.trim()); } });
    if(daftarGudang.size === 0) { daftarGudang.add("Gudang Kanguru"); daftarGudang.add("Gudang Mrican"); daftarGudang.add("Gedung UTC"); daftarGudang.add("Di Lokasi Event"); }
    daftarGudang.forEach(gudang => { let opt = document.createElement('option'); opt.value = gudang; opt.text = `📍 ${gudang}`; selectLokasi.appendChild(opt); }); daftarTim.forEach(tim => { let opt = document.createElement('option'); opt.value = tim; opt.text = `🏷️ ${tim}`; selectTim.appendChild(opt); });
    const modal = document.getElementById('modalExport'); if(modal) { modal.style.display = 'flex'; modal.classList.add('active'); }
}
function closeExportModal() { const modal = document.getElementById('modalExport'); if(modal) { modal.style.display = 'none'; modal.classList.remove('active'); } }
function executeCustomExport() {
    let dataToExport = getFilteredData(); if (dataToExport.length === 0) { alert("❌ Kosong! Tidak ada barang yang tampil di layar."); return; }
    let csvContent = "data:text/csv;charset=utf-8,Kode Barang,Nama Alat,Wadah,Kondisi,Lokasi Gudang,Status Pemakaian,Total Qty,Tim Terkait\n";
    dataToExport.forEach(row => { let nama = `"${(row.nama_barang || "").replace(/"/g, '""')}"`; let kode = `"${row.kode_barang || "-"}"`; let wadah = `"${row.kode_wadah || "-"}"`; let kondisi = `"${row.kondisi || "Bagus"}"`; let lokasi = `"${row.lokasi_saat_ini || row.lokasi || row["Lokasi Saat Ini"] || "Gudang Kanguru"}"`; let status = `"${row.status_digunakan && row.status_digunakan !== 'FALSE' ? row.status_digunakan : 'Di Gudang'}"`; let qty = `"${row.jumlah || 1}"`; let tim = `"${row.tim || "-"}"`; csvContent += `${kode},${nama},${wadah},${kondisi},${lokasi},${status},${qty},${tim}\n`; });
    let encodedUri = encodeURI(csvContent); let link = document.createElement("a"); link.setAttribute("href", encodedUri); let dateStr = new Date().toISOString().slice(0,10); link.setAttribute("download", `Laporan_GudangAV_${dateStr}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); closeExportModal(); showToast(`✅ SUKSES: ${dataToExport.length} data diekspor!`);
}
