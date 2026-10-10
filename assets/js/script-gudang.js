// ==========================================
// MESIN LOGIKA GUDANG (V.66.0 - KEBUTUHAN TIM, HARDCASE FIX & LEPASAN)
// ==========================================

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxm4eJGQjBytrLTQgYrsfEXIQxLQ_Rq7NFVM__Y8AhRfzPe8q5FJhofecqrDJ5ywkeBEg/exec"; 
const API_BACKEND_PIN = "a1b2c3"; 

let allItems = []; let allMissions = []; let optionsData = { lokasi: [], tim: [] }; 
let html5QrCode = null; 
let isAdminMode = false, isBulkMode = false, selectedRows = new Set(), lastScanTime = 0, currentViewMode = 'grid'; 

// Status toggle wadah
let showOnlyWadah = false; 

// Mission Builder Cart
let builderCart = []; 

let pendingAddFotos = []; let pendingEditFotos = []; 
let currentCameraFacing = "environment"; let isFlashlightOn = false;

window.onload = () => { injectGudangDarkModeCSS(); checkAdminStatus(); injectFeedbackUI(); injectPrintModalUI(); loadData(); };

// ==========================================
// TEMA & CSS
// ==========================================
function injectGudangDarkModeCSS() {
    if(document.getElementById('gudangDarkModeCss')) return;
    const style = document.createElement('style'); style.id = 'gudangDarkModeCss';
    style.innerHTML = `
        body.dark-mode, [data-theme="dark"] { background-color: #0f172a !important; color: #e2e8f0 !important; }
        body.dark-mode .toolbar-card { background: #1e293b !important; border-color: #334155 !important; }
        body.dark-mode .pill-btn { background: #334155 !important; color: #94a3b8 !important; border-color: #475569 !important; }
        body.dark-mode .pill-btn.active { background: #ea580c !important; color: white !important; border-color: #c2410c !important; }
        body.dark-mode .mission-card, body.dark-mode .list-item { background: #1e293b !important; border-color: #334155 !important; }
        body.dark-mode .card-title, body.dark-mode .list-title { color: #f8fafc !important; }
        body.dark-mode .modal-content { background: #1e293b !important; color: #e2e8f0 !important; border: 1px solid #334155 !important; }
        body.dark-mode .modal-content h3 { color: #f8fafc !important; }
        body.dark-mode div[style*="background:#f8fafc"] { background: #0f172a !important; border-color: #334155 !important; color: #cbd5e1 !important; }
        body.dark-mode div[style*="color:#1e293b"] { color: #f8fafc !important; }
        body.dark-mode div[style*="color:#1d4ed8"], body.dark-mode div[style*="color:#16a34a"] { color: #60a5fa !important; }
        body.dark-mode span[style*="color:gray"], body.dark-mode label[style*="color:gray"], body.dark-mode div[style*="color:gray"], body.dark-mode p[style*="color:gray"] { color: #94a3b8 !important; }
        body.dark-mode select, body.dark-mode input, body.dark-mode textarea { background: #1e293b !important; color: #f8fafc !important; border-color: #475569 !important; }
        body.dark-mode .bulk-bar { background: #0f172a !important; border-top: 1px solid #334155 !important; }
        body.dark-mode .bulk-info { color: #f8fafc !important; }
    `;
    document.head.appendChild(style);
}

// ==========================================
// SISTEM ZOOM GALERI
// ==========================================
window.currentZoomUrls = []; window.currentZoomIndex = 0;
function openZoomModalIndex(index) { window.currentZoomIndex = index; const zoomModal = document.getElementById("zoomModal"); const zoomImg = document.getElementById("zoomImgSrc"); if (!document.getElementById("btnNextZoom")) { zoomModal.insertAdjacentHTML('beforeend', `<button id="btnPrevZoom" onclick="event.stopPropagation(); prevZoom()" style="position:absolute; left:15px; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.6); color:white; border:none; border-radius:50%; width:45px; height:45px; font-weight:bold; font-size:20px; cursor:pointer; z-index:1000001; backdrop-filter:blur(4px);">❮</button><button id="btnNextZoom" onclick="event.stopPropagation(); nextZoom()" style="position:absolute; right:15px; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.6); color:white; border:none; border-radius:50%; width:45px; height:45px; font-weight:bold; font-size:20px; cursor:pointer; z-index:1000001; backdrop-filter:blur(4px);">❯</button><div id="zoomCounter" style="position:absolute; bottom:25px; left:50%; transform:translateX(-50%); color:#f8fafc; font-size:14px; font-weight:bold; background:rgba(0,0,0,0.7); padding:6px 16px; border-radius:20px; z-index:1000001; backdrop-filter:blur(4px);"></div>`); } zoomImg.src = window.currentZoomUrls[window.currentZoomIndex]; if(window.currentZoomUrls.length > 1) { document.getElementById("btnPrevZoom").style.display = "block"; document.getElementById("btnNextZoom").style.display = "block"; document.getElementById("zoomCounter").style.display = "block"; document.getElementById("zoomCounter").innerText = `Foto ${window.currentZoomIndex + 1} dari ${window.currentZoomUrls.length}`; } else { document.getElementById("btnPrevZoom").style.display = "none"; document.getElementById("btnNextZoom").style.display = "none"; document.getElementById("zoomCounter").style.display = "none"; } zoomModal.classList.add("active"); }
function nextZoom() { window.currentZoomIndex = (window.currentZoomIndex + 1) % window.currentZoomUrls.length; document.getElementById("zoomImgSrc").src = window.currentZoomUrls[window.currentZoomIndex]; document.getElementById("zoomCounter").innerText = `Foto ${window.currentZoomIndex + 1} dari ${window.currentZoomUrls.length}`; }
function prevZoom() { window.currentZoomIndex = (window.currentZoomIndex - 1 + window.currentZoomUrls.length) % window.currentZoomUrls.length; document.getElementById("zoomImgSrc").src = window.currentZoomUrls[window.currentZoomIndex]; document.getElementById("zoomCounter").innerText = `Foto ${window.currentZoomIndex + 1} dari ${window.currentZoomUrls.length}`; }
function closeZoomModal() { const m = document.getElementById("zoomModal"); if(m) m.classList.remove("active"); setTimeout(() => { const img = document.getElementById("zoomImgSrc"); if(img) img.src = ""; }, 300); }

// ==========================================
// UTILITIES
// ==========================================
function checkAdminStatus() { const currentUserRole = localStorage.getItem('av_session_role'); if (currentUserRole === "Master" || currentUserRole === "Kru") { isAdminMode = true; document.body.classList.add("admin-mode-active"); } else { isAdminMode = false; document.body.classList.remove("admin-mode-active"); } const btnMode = document.getElementById("btnBulkMode"); if(btnMode && !isBulkMode) btnMode.innerHTML = `☑️ Mode Pilih`; }
function showToast(msg, isSuccess = true) { const t = document.getElementById("toastMsg"); if(!t) return; t.innerText = msg; t.className = "toast-msg show " + (isSuccess ? "toast-success" : "toast-error"); setTimeout(() => { t.classList.remove("show"); }, 4000); }

// ==========================================
// LOAD DATA DATABASE DARI SATELIT
// ==========================================
async function loadData() { 
    try { 
        document.getElementById("loading").style.display = "block"; 
        const res = await fetch(SCRIPT_URL + "?action=api&nocache=" + new Date().getTime()); 
        const data = await res.json(); 
        let rawItems = (data.inventory || []).filter(item => item.nama_barang && item.nama_barang.toString().trim().toLowerCase() !== 'nama barang'); 
        
        rawItems.sort((a, b) => { 
            let kodeA = String(a.kode_barang || "").trim().toUpperCase(); let kodeB = String(b.kode_barang || "").trim().toUpperCase(); 
            if (kodeA && !kodeB) return -1; if (!kodeA && kodeB) return 1; 
            if (kodeA && kodeB) { let cmpKode = kodeA.localeCompare(kodeB, undefined, {numeric: true, sensitivity: 'base'}); if (cmpKode !== 0) return cmpKode; } 
            let nameA = String(a.nama_barang || "").trim().toUpperCase(); let nameB = String(b.nama_barang || "").trim().toUpperCase(); return nameA.localeCompare(nameB, undefined, {numeric: true, sensitivity: 'base'}); 
        });
        
        allItems = rawItems; allMissions = data.missions || []; optionsData = data.dropdowns || { lokasi: [], tim: [] }; 
        populateFilterTim(); document.getElementById("loading").style.display = "none"; setupStickyHeader(); applyFilters(); 
    } catch (e) { document.getElementById("loading").innerHTML = `<span style="color:red;">Gagal memuat data satelit. Periksa koneksi internet.</span>`; } 
}

function populateFilterTim() { const container = document.querySelector('#panelFilterLanjutan div'); if(!container) return; let daftarTim = new Set(); allItems.forEach(item => { let tim = item.tim || item["Tim"] || ""; if (tim && tim.trim() !== "") daftarTim.add(tim.trim()); }); if(daftarTim.size > 0) { container.innerHTML = ""; daftarTim.forEach(tim => { let val = tim.toLowerCase(); container.innerHTML += `<label><input type="checkbox" class="cek-tim" value="${val}" onchange="applyFilters()"> ${tim}</label>`; }); } }

// ==============================================================
// 🎨 UI REVAMP: PENYEDERHANAAN HEADER & LOGIKA TOMBOL TIM
// ==============================================================
function setupStickyHeader() { 
    let toolbar = document.querySelector(".toolbar-card"); 
    if(toolbar) { 
        toolbar.style.position = "sticky"; 
        toolbar.style.top = "0px"; 
        toolbar.style.zIndex = "99"; 
        
        let pillsWrapper = document.querySelector(".filter-pills-wrapper"); 
        if(pillsWrapper) {
            pillsWrapper.remove();
        }

        const btnBukaFilter = document.getElementById('btnBukaFilter'); 
        const panelFilter = document.getElementById('panelFilterLanjutan'); 
        if (btnBukaFilter && panelFilter) { 
            btnBukaFilter.replaceWith(btnBukaFilter.cloneNode(true)); 
            const newBtnBukaFilter = document.getElementById('btnBukaFilter'); 
            
            newBtnBukaFilter.addEventListener('click', () => { 
                if (panelFilter.style.display === 'none') { 
                    panelFilter.style.display = 'block'; 
                    newBtnBukaFilter.innerHTML = '❌ TUTUP FILTER'; 
                    newBtnBukaFilter.style.background = '#ef4444'; 
                } else { 
                    panelFilter.style.display = 'none'; 
                    newBtnBukaFilter.innerHTML = '⚙️ TIM'; 
                    newBtnBukaFilter.style.background = '#334155'; 
                } 
            }); 
        }
    } 
}

// ==============================================================
// LOGIKA TOMBOL WADAH, FILTER & VIEW 
// ==============================================================
function toggleViewMode() { const btn = document.getElementById("btnViewToggle"); if (currentViewMode === 'grid') { currentViewMode = 'list'; btn.innerHTML = '🖼️ Grid View'; document.getElementById("dataContainer").className = "list-view-container"; } else { currentViewMode = 'grid'; btn.innerHTML = '📄 List View'; document.getElementById("dataContainer").className = "grid-cards"; } applyFilters(); }
function toggleWadahMode() { showOnlyWadah = !showOnlyWadah; const btn = document.getElementById("btnWadahToggle"); if (showOnlyWadah) { btn.innerHTML = '📦 Tampilkan Semua'; btn.style.background = '#ea580c'; btn.style.color = 'white'; btn.style.border = '1px solid #ea580c'; } else { btn.innerHTML = '🧰 Hanya Wadah'; btn.style.background = '#f1f5f9'; btn.style.color = '#334155'; btn.style.border = '1px solid #ccc'; } applyFilters(); }

function setFilterPill(triggerData) { 
    applyFilters(); 
}

function getFilteredData() { 
    const q = document.getElementById("searchInput").value.toLowerCase(); 
    let timAktif = Array.from(document.querySelectorAll('.cek-tim:checked')).map(cb => cb.value.toLowerCase());
    
    let filterStatus = document.getElementById("filterStatusDropdown") ? document.getElementById("filterStatusDropdown").value : "all";
    let filterLokasi = document.getElementById("filterLokasiDropdown") ? document.getElementById("filterLokasiDropdown").value : "all";

    return allItems.filter(i => { 
       const matchQ = (i.nama_barang||"").toLowerCase().includes(q) || 
                      (i.kode_barang||"").toLowerCase().includes(q) || 
                      (i.kode_wadah||"").toLowerCase().includes(q) || 
                      (i.paket_zona||"").toLowerCase().includes(q); 
                      
        let stat = i.status_digunakan || 'Di Gudang'; if(stat === 'FALSE') stat = 'Di Gudang'; 
        let lok = i.lokasi_saat_ini || i.lokasi || i["Lokasi Saat Ini"] || '';
        let kondisi = (i.kondisi||"").toLowerCase();

        let matchStatus = true;
        if (filterStatus === 'Rusak') {
            matchStatus = (kondisi === 'rusak' || kondisi === 'periksa');
        } else if (filterStatus !== 'all') {
            matchStatus = (stat === filterStatus);
            if (matchStatus && (kondisi === 'rusak' || kondisi === 'periksa')) matchStatus = false;
        }

        let matchLokasi = true;
        if (filterLokasi !== 'all') {
            if (filterLokasi === 'Semarang | Di Lokasi Event') {
                matchLokasi = (lok.includes('Semarang') && (lok.includes('Event') || stat === 'Sedang Dipakai'));
            } else if (filterLokasi === 'Yogyakarta | Di Lokasi Event') {
                matchLokasi = (lok.includes('Yogya') && (lok.includes('Event') || stat === 'Sedang Dipakai'));
            } else {
                matchLokasi = lok.includes(filterLokasi);
            }
        }
        
        let itemTim = String(i.tim || i["Tim"] || "").toLowerCase();
        let matchAdvanced = timAktif.length === 0 || timAktif.some(t => itemTim === t || itemTim.includes(t));
        
        let matchWadah = true;
        if (showOnlyWadah) {
            let isWadah = false;
            if (i.kode_barang) isWadah = allItems.some(child => (child.kode_wadah||"").toLowerCase() === i.kode_barang.toLowerCase());
            if (!isWadah) { let nm = (i.nama_barang||"").toLowerCase(); isWadah = nm.includes('hardcase') || nm.includes('koper') || nm.includes('wadah') || nm.includes('box') || nm.includes('tas'); }
            matchWadah = isWadah;
        }
        return matchQ && matchStatus && matchLokasi && matchAdvanced && matchWadah; 
    }); 
}

function applyFilters() { render(getFilteredData()); }
function getStatusClass(status, lokasi) { if(lokasi === 'Di Lokasi Event') return 'badge-status status-lokasi'; if(status === 'Akan Dibawa') return 'badge-status status-keranjang'; if(status === 'Sedang Dipakai') return 'badge-status status-dipakai'; if(status.includes('Perjalanan')) return 'badge-status status-perjalanan'; return 'badge-status status-gudang'; }

// ==========================================
// RENDER TAMPILAN KARTU 
// ==========================================
function render(data) {
    const container = document.getElementById("dataContainer"); container.innerHTML = "";
    data.forEach(item => {
        const card = document.createElement("div"); const isSelected = selectedRows.has(item.row_index); 
        let stat = item.status_digunakan || "Di Gudang"; if(stat === 'FALSE') stat = "Di Gudang"; 
        let lok = item.lokasi_saat_ini || item.lokasi || item["Lokasi Saat Ini"] || "Gudang Kanguru";
        let badgeLokasiHtml = (lok.toLowerCase().includes("gudang") && stat === "Di Gudang") ? `<span class="badge-status status-gudang">🏢 ${lok}</span>` : `<span class="badge-status status-lokasi">📍 ${lok}</span><span class="${getStatusClass(stat, lok)}">${stat}</span>`;
        let safeFileIds = item.file_ids || item.fotos || []; let firstFileId = safeFileIds.find(id => id && id.length > 5); 
        let imageSrc = 'https://placehold.co/300x300/EEEEEE/999999?text=NO+IMAGE'; if (firstFileId) { imageSrc = firstFileId.includes("http") ? firstFileId : `https://drive.google.com/thumbnail?id=${firstFileId}&sz=w400`; }
        const kodeBadge = item.kode_barang ? `<span style="color:#ea580c; font-weight:900; font-size:9px;">#${item.kode_barang}</span>` : ""; 
        const timeBadge = item.timestamp ? `<div style="font-size:8px; color:#94a3b8;">⏱ ${item.timestamp}</div>` : "";
        let colorKondisi = item.kondisi && item.kondisi.toLowerCase() === 'bagus' ? '#16a34a' : '#dc2626'; let bgKondisi = item.kondisi && item.kondisi.toLowerCase() === 'bagus' ? '#f0fdf4' : '#fef2f2'; 
        const kondisiBadge = `<span style="font-size:9px; padding:2px 4px; border-radius:4px; border:1px solid ${colorKondisi}; background:${bgKondisi}; color:${colorKondisi}; font-weight:bold;">${item.kondisi || 'Bagus'}</span>`;
        const boxBadge = item.kode_wadah ? `<span style="font-size:9px; color:#d97706; background:#fef3c7; border-radius:4px; padding:2px 4px; border:1px solid #fde68a;">🧰 IN-BOX</span>` : "";
        const zonaBadge = item.paket_zona ? `<span style="font-size:9px; color:#4338ca; background:#e0e7ff; border-radius:4px; padding:2px 4px; border:1px solid #c7d2fe; font-weight:bold;">📦 ${item.paket_zona}</span>` : "";
        
        if (currentViewMode === 'grid') { 
            card.className = "mission-card " + (isSelected ? "selected " : "") + (stat === 'Akan Dibawa' ? "card-siap-dibawa " : ""); 
            card.innerHTML = `${isSelected ? '<div class="card-check">✓</div>' : ''}<div style="position:relative;"><img src="${imageSrc}" class="card-img" loading="lazy"><div style="position:absolute; bottom:12px; right:4px;"><span class="badge-qty">Qty: ${item.jumlah || 0}</span></div></div><h4 class="card-title">${item.nama_barang}</h4><div style="display:flex; align-items:center; flex-wrap:wrap; gap:4px; margin-bottom:4px;">${kodeBadge} ${kondisiBadge} ${boxBadge} ${zonaBadge}</div><div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:auto;">${badgeLokasiHtml}</div>`;
        } else { 
            card.className = "list-item " + (isSelected ? "selected " : "") + (stat === 'Akan Dibawa' ? "card-siap-dibawa " : ""); 
            card.innerHTML = `${isSelected ? '<div class="card-check" style="top:50%; transform:translateY(-50%); right:10px;">✓</div>' : ''}<img src="${imageSrc}" class="list-img" loading="lazy"><div class="list-info"><div style="display:flex; justify-content:space-between; align-items:flex-start;"><h4 class="list-title" style="flex:1;">${item.nama_barang}</h4><span class="badge-qty" style="margin-left:4px;">Qty: ${item.jumlah || 0}</span></div>${timeBadge}<div style="display:flex; gap:4px; flex-wrap:wrap; align-items:center; margin-top:3px;">${kodeBadge} ${kondisiBadge} ${boxBadge} ${zonaBadge}</div><div style="display:flex; gap:4px; flex-wrap:wrap; align-items:center; margin-top:3px;">${badgeLokasiHtml}</div></div>`; 
        }
        card.onclick = () => { if (isBulkMode) toggleSelection(item.row_index); else openDetailModal(item); }; 
        container.appendChild(card);
    });
}

function openDetailModal(item) {
    const oldModal = document.getElementById("detailModal"); if(oldModal) oldModal.remove();
    let stat = item.status_digunakan || "Di Gudang"; if(stat === 'FALSE') stat = "Di Gudang"; let lok = item.lokasi_saat_ini || item.lokasi || item["Lokasi Saat Ini"] || "Gudang Kanguru";
    let safeFileIds = item.file_ids || item.fotos || []; window.currentZoomUrls = []; let validThumbs = []; 
    safeFileIds.forEach((fileId, i) => { if(fileId && fileId.length > 5) { let thumbUrl = fileId.includes("http") ? fileId : `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`; let highResUrl = fileId.includes("http") ? fileId.replace('sz=800', 'sz=s2000') : `https://drive.google.com/thumbnail?id=${fileId}&sz=s2000`; if(i < 3) { window.currentZoomUrls.push(highResUrl); validThumbs.push({ url: thumbUrl, type: 'alat' }); } } });

    let badgeWadahHtml = ""; let wadahHeaderHtml = ""; let kodeWadah = item.kode_wadah ? item.kode_wadah.toString().trim() : "";
    if (kodeWadah !== "") {
        let wadahItem = allItems.find(w => w.kode_barang && w.kode_barang.toString().trim().toLowerCase() === kodeWadah.toLowerCase());
        if (wadahItem) {
            let wFotos = wadahItem.file_ids || wadahItem.fotos || []; let firstWFoto = wFotos.find(id => id && id.toString().trim().length > 5); 
            let thumbWUrl = firstWFoto ? (firstWFoto.includes("http") ? firstWFoto : `https://drive.google.com/thumbnail?id=${firstWFoto}&sz=w400`) : 'https://placehold.co/400x400/EEEEEE/999999?text=NO+FOTO+WADAH'; 
            let highResWUrl = firstWFoto ? (firstWFoto.includes("http") ? firstWFoto.replace('sz=800', 'sz=s2000') : `https://drive.google.com/thumbnail?id=${firstWFoto}&sz=s2000`) : thumbWUrl;
            window.currentZoomUrls.push(highResWUrl); validThumbs.push({ url: thumbWUrl, type: 'wadah' });
            wadahHeaderHtml = `<span style="display:inline-block; margin-left:5px; background:#fef3c7; color:#d97706; padding:2px 8px; border-radius:4px; border:1px solid #fde68a; font-size:9px;">🧰 IN-BOX</span>`; 
            badgeWadahHtml = `<div style="margin-top:10px; margin-bottom:10px; cursor:pointer;" onclick="document.getElementById('searchInput').value='${kodeWadah}'; applyFilters(); document.getElementById('detailModal').remove();"><span style="display:inline-block; background:#fffbeb; color:#d97706; padding:6px 12px; border-radius:8px; border:1px solid #fde68a; font-size:11px; font-weight:bold;">🧰 Disimpan di: ${wadahItem.nama_barang} (#${kodeWadah})</span></div>`;
        } else {
            wadahHeaderHtml = `<span style="display:inline-block; margin-left:5px; background:#f1f5f9; color:#64748b; padding:2px 8px; border-radius:4px; border:1px dashed #cbd5e1; font-size:9px;">🧰 Menunggu wadah: #${kodeWadah}</span>`; 
            badgeWadahHtml = `<div style="margin-top:10px; margin-bottom:10px;"><span style="display:inline-block; background:#f1f5f9; color:#64748b; padding:6px 12px; border-radius:8px; border:1px dashed #cbd5e1; font-size:11px; font-weight:bold;">🧰 Menunggu data wadah: #${kodeWadah}</span></div>`;
        }
    }
    
    let detailZonaBadgeHtml = item.paket_zona ? `<p style="margin:5px 0 5px 0; font-size:11px; color:#4338ca; font-weight:bold;">📦 Masuk dalam ${item.paket_zona}</p>` : "";

    let galleryHtml = `<div class="detail-gallery">`;
    if (validThumbs.length > 0) { validThumbs.forEach((tObj, index) => { if (tObj.type === 'alat') { galleryHtml += `<img src="${tObj.url}" class="gallery-img" onclick="openZoomModalIndex(${index})">`; } else { galleryHtml += `<div class="gallery-box"><img src="${tObj.url}" class="gallery-img" style="border:3px solid #ea580c; box-sizing:border-box;" onclick="openZoomModalIndex(${index})"><span class="badge-wadah">WADAH</span></div>`; } }); } else { galleryHtml += `<img src="https://placehold.co/300x200/EEEEEE/999999?text=Tidak+Ada+Foto" class="gallery-img" style="width:100%;">`; } galleryHtml += `</div>`;
    
    let isiWadahHtml = ""; 
    if (item.kode_barang) { 
        let isiWadah = allItems.filter(i => i.kode_wadah && i.kode_wadah.toLowerCase() === item.kode_barang.toLowerCase()); 
        if (isiWadah.length > 0) { 
            let listHtml = isiWadah.map(w => { let safeFileIdsW = w.file_ids || w.fotos || []; let firstFileIdW = safeFileIdsW.find(id => id && id.length > 5); let thumbW = firstFileIdW ? (firstFileIdW.includes("http") ? firstFileIdW : `https://drive.google.com/thumbnail?id=${firstFileIdW}&sz=w100`) : 'https://placehold.co/100x100/EEEEEE/999999?text=NO+IMG'; return `<div style="display:flex; align-items:center; gap:10px; margin-bottom:6px; padding:6px; background:#fff; border:1px solid #dcfce7; border-radius:6px; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,0.05);" onclick="document.getElementById('searchInput').value='${w.kode_barang}'; applyFilters(); document.getElementById('detailModal').remove();"><img src="${thumbW}" style="width:45px; height:45px; object-fit:cover; border-radius:6px; border:1px solid #e2e8f0;"><div style="flex:1; line-height:1.2;"><div style="font-size:11px; font-weight:bold; color:#1e293b;">${w.nama_barang}</div><div style="font-size:10px; color:#ea580c; font-weight:bold; margin-top:2px;">#${w.kode_barang || '-'} <span style="color:#64748b; font-weight:normal;">• Qty: ${w.jumlah||0}</span></div></div></div>`; }).join('');
            isiWadahHtml = `<div style="text-align:left; margin-top:10px; background:#f0fdf4; padding:10px; border-radius:8px; border:1px solid #bbf7d0;"><div style="font-size:11px; font-weight:bold; color:#16a34a; margin-bottom:8px;">🧰 Isi di dalam wadah ini (${isiWadah.length} jenis):</div>${listHtml}</div>`; 
        } 
    }
    
    let similarItems = allItems.filter(i => i.nama_barang.toLowerCase() === item.nama_barang.toLowerCase());
    let totalSimilarQty = similarItems.reduce((sum, curr) => sum + (parseInt(curr.jumlah) || 1), 0);
    let statusCounts = {}; similarItems.forEach(i => { let s = (i.status_digunakan && i.status_digunakan !== 'FALSE') ? i.status_digunakan : "Di Gudang"; statusCounts[s] = (statusCounts[s] || 0) + (parseInt(i.jumlah) || 1); });
    
    let similarHtml = "";
    if (similarItems.length > 1 || totalSimilarQty > 1) {
        let badgeHtml = Object.keys(statusCounts).map(status => { let bgCol = status.includes('Gudang') ? '#dcfce7' : (status.includes('Dipakai') || status.includes('Event') ? '#fef08a' : '#e2e8f0'); let txtCol = status.includes('Gudang') ? '#166534' : (status.includes('Dipakai') || status.includes('Event') ? '#854d0e' : '#334155'); return `<span style="display:inline-block; margin-right:4px; margin-bottom:4px; padding:4px 8px; border-radius:6px; font-size:10px; background:${bgCol}; color:${txtCol}; font-weight:bold; border:1px solid #cbd5e1;">${status}: ${statusCounts[status]}</span>`; }).join('');
        similarHtml = `<div style="text-align:left; margin-top:10px; background:#eff6ff; padding:12px; border-radius:8px; border:1px solid #bfdbfe;"><div style="font-size:12px; font-weight:900; color:#1d4ed8; margin-bottom:4px;">📊 Cek Silang Stok '${item.nama_barang}':</div><div style="font-size:11px; color:#1e293b; margin-bottom:8px;">Sistem mendeteksi total <b>${totalSimilarQty} Pcs</b> alat ini. Sebaran:</div><div style="display:flex; flex-wrap:wrap;">${badgeHtml}</div></div>`;
    }

    let logHtml = `<div style="text-align:left; margin-top:10px; background:#f1f5f9; padding:8px; border-radius:6px; font-size:10px; color:#475569; max-height:80px; overflow-y:auto; white-space:pre-wrap; border:1px solid #cbd5e1;"><b>📜 Histori Log:</b><br>${item.log || 'Belum ada histori.'}</div>`;
    let optionsLokasi = `<option value="Gudang Kanguru" ${lok.includes('Kanguru') ? 'selected':''}>🏢 Gudang Kanguru</option><option value="Gudang Mrican" ${lok.includes('Mrican') ? 'selected':''}>🏢 Gudang Mrican</option><option value="Dalam Perjalanan" ${lok === 'Dalam Perjalanan' ? 'selected':''}>🚚 Dalam Perjalanan</option><option value="Semarang | Di Lokasi Event" ${(lok.includes('Semarang') || lok === 'Di Lokasi Event') && !lok.includes('Yogya') ? 'selected':''}>📍 Event Semarang</option><option value="Yogyakarta | Di Lokasi Event" ${lok.includes('Yogya') ? 'selected':''}>🚩 Event Yogyakarta</option>`;
    let optionsStatus = `<option value="Di Gudang" ${stat === 'Di Gudang' ? 'selected':''}>📦 Standby / Di Gudang</option><option value="Akan Dibawa" ${stat === 'Akan Dibawa' ? 'selected':''}>🛒 Akan Dibawa (Packing)</option><option value="Sedang Dipakai" ${stat === 'Sedang Dipakai' ? 'selected':''}>🔌 Sedang Dipakai / Aktivasi</option><option value="Sedang Diservis" ${stat === 'Sedang Diservis' ? 'selected':''}>🛠️ Sedang Diservis</option>`;
    
    let actionButtons = isAdminMode ? `
        <button onclick="duplicateItem(${item.row_index})" style="width:100%; padding:10px; background:#8b5cf6; color:white; border:none; border-radius:8px; font-weight:bold; margin-bottom:8px; cursor:pointer;">📋 Duplikat Alat</button>
        <button onclick='openEditFullModal(${JSON.stringify(item).replace(/'/g, "&#39;")})' style="width:100%; padding:10px; background:#f59e0b; color:white; border:none; border-radius:8px; font-weight:bold; margin-bottom:15px;">✏️ EDIT DATA / FOTO</button>
        <div style="text-align:left; border-top:1px dashed #ccc; padding-top:15px;">
            <label style="font-size:11px; font-weight:bold; color:gray; display:block; margin-bottom:4px;">📍 Update Lokasi:</label>
            <select id="editLokasi" style="width:100%; padding:8px; border-radius:8px; border:1px solid #ccc; margin-bottom:12px;">${optionsLokasi}</select>
            <label style="font-size:11px; font-weight:bold; color:gray; display:block; margin-bottom:4px;">🔌 Update Status:</label>
            <select id="editStatus" style="width:100%; padding:8px; border-radius:8px; border:1px solid #ccc; margin-bottom:12px; font-weight:bold;">${optionsStatus}</select>
            <button onclick="saveEditLokasiStatus(${item.row_index})" style="width:100%; padding:12px; background:#ea580c; color:white; border:none; border-radius:8px; font-weight:bold;">💾 SIMPAN STATUS</button>
        </div>` : `<div style="margin-top:15px; padding:10px; background:#f1f5f9; border-radius:8px; font-size:12px; color:#64748b;">🔒 Login Akses untuk mengubah status/lokasi.</div>`;
    
    const modalHtml = `<div id="detailModal" class="modal-overlay active"><div class="modal-content" style="max-width:400px; max-height:90vh; overflow-y:auto; background:white; padding:20px; border-radius:15px; text-align:center; position:relative;"><button onclick="document.getElementById('detailModal').remove()" style="position:absolute; top:15px; right:15px; border:none; background:#f1f5f9; width:30px; height:30px; border-radius:50%; font-weight:bold; cursor:pointer; z-index:10;">✕</button>${galleryHtml}<h3 style="margin:0; font-weight:900; color:#1e293b; font-size:18px;">${item.nama_barang}</h3><div style="font-size:10px; color:gray; margin-bottom:8px;">⏱️ Update: ${item.timestamp || '-'}</div><p style="margin:5px 0 0 0; font-size:12px; color:#ea580c; font-weight:bold;">#${item.kode_barang || '-'} ${wadahHeaderHtml}</p>${detailZonaBadgeHtml}${badgeWadahHtml}<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px; text-align:left; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0;"><div><span style="color:gray;">Item Ini:</span> <br><b>${item.jumlah || 0} Pcs</b></div><div><span style="color:gray;">Kondisi:</span> <br><b>${item.kondisi || '-'}</b></div><div><span style="color:gray;">📍 Lokasi:</span> <br><b>${lok}</b></div><div><span style="color:gray;">🔌 Status:</span> <br><b>${stat}</b></div></div>${similarHtml}${isiWadahHtml}<div style="text-align:left; margin-top:10px; font-size:11px; color:#475569; background:#fff7ed; padding:8px; border-radius:6px; border:1px solid #fed7aa; margin-bottom:5px;"><b>📝 Ket:</b> ${item.keterangan_ref || 'Tidak ada catatan.'}</div><div style="text-align:left; font-size:11px; margin-bottom:15px; color:#3b82f6;"><b>🎯 Tujuan (Event):</b> ${item.tujuan || '-'}</div>${logHtml}${actionButtons}</div></div>`; 
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// ==========================================
// 🚀 MISSION BUILDER (ZONA-FIRST + RADAR BENTROK)
// ==========================================
function openMissionBuilder() {
    builderCart = [];
    const modalHtml = `
    <div id="builderModal" class="modal-overlay active" style="align-items:flex-start; padding-top:2vh;">
        <div class="modal-content" style="max-width:900px; width:95%; max-height:96vh; overflow-y:auto; background:#f8fafc; padding:20px; border-radius:15px; position:relative; text-align:left;">
            <button onclick="document.getElementById('builderModal').remove()" style="position:absolute; top:15px; right:15px; border:none; background:#fef2f2; color:#dc2626; width:35px; height:35px; border-radius:50%; font-weight:bold; cursor:pointer; font-size:16px;">✕</button>
            <h3 style="margin:0 0 5px 0; color:#4f46e5; font-size:22px; font-weight:900;">🛠️ MISSION BUILDER</h3>
            <p style="font-size:12px; color:#64748b; margin-bottom:20px; padding-bottom:10px; border-bottom:2px solid #e2e8f0;">Rancang keranjang zona dan amankan dari bentrok jadwal.</p>
            
            <div style="display:flex; flex-wrap:wrap; gap:20px;">
                <!-- PANEL KIRI: INFO MISI -->
                <div style="flex:1; min-width:280px; background:white; padding:15px; border-radius:12px; border:1px solid #e2e8f0;">
                    <h4 style="margin:0 0 10px 0; color:#1e293b;">1. Tentukan Jadwal & Lokasi</h4>
                    <label style="font-size:11px; font-weight:bold; color:gray; display:block; margin-bottom:4px;">📍 Pilih Kota:</label>
                    <select id="bmDbKota" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc; font-weight:bold; margin-bottom:12px; background:#eff6ff;">
                        <option value="Database_Misi_Semarang">Event Semarang (Otomatis Buat DB)</option>
                        <option value="Database_Misi_Yogya">Event Yogyakarta (Otomatis Buat DB)</option>
                    </select>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
                        <div><label style="font-size:11px; font-weight:bold; color:gray; display:block;">📅 Tgl Mulai:</label><input type="date" id="bmTglMulai" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc; box-sizing:border-box; font-size:12px;" onchange="renderBuilderSearch()"></div>
                        <div><label style="font-size:11px; font-weight:bold; color:gray; display:block;">📅 Tgl Selesai:</label><input type="date" id="bmTglSelesai" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc; box-sizing:border-box; font-size:12px;" onchange="renderBuilderSearch()"></div>
                    </div>

                    <label style="font-size:11px; font-weight:bold; color:gray; display:block; margin-bottom:4px;">🏷️ ID Misi & Paket Zona:</label>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
                        <input type="text" id="bmMissionId" placeholder="M-SMG-01" style="width:100%; padding:10px; border-radius:8px; border:1px solid #93c5fd; font-weight:bold; text-transform:uppercase; box-sizing:border-box;">
                        <input type="text" id="bmZona" placeholder="Zona VVIP" style="width:100%; padding:10px; border-radius:8px; border:1px solid #93c5fd; font-weight:bold; box-sizing:border-box;">
                    </div>
                </div>

                <!-- PANEL KANAN: KERANJANG & PENCARIAN -->
                <div style="flex:1; min-width:320px;">
                    <div style="background:white; padding:15px; border-radius:12px; border:1px solid #e2e8f0; margin-bottom:15px;">
                        <h4 style="margin:0 0 10px 0; color:#ea580c;">2. Keranjang Zona Ini</h4>
                        <div id="bmCartContainer" style="max-height:150px; overflow-y:auto; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:8px; padding:10px; font-size:12px; color:gray;">Keranjang masih kosong. Cari barang di bawah.</div>
                    </div>

                    <div style="background:white; padding:15px; border-radius:12px; border:1px solid #e2e8f0;">
                        <h4 style="margin:0 0 10px 0; color:#16a34a;">3. Cari & Tambah Barang</h4>
                        <div style="font-size:10px; color:#ef4444; margin-bottom:8px;">*Wajib isi Tanggal Mulai & Selesai di panel kiri sebelum mencari agar Radar Aktif.</div>
                        <input type="text" id="bmSearchInput" placeholder="Ketik nama / kode alat (Contoh: Kabel RCA)" onkeyup="renderBuilderSearch()" style="width:100%; padding:10px; border-radius:8px; border:2px solid #16a34a; font-weight:bold; margin-bottom:10px; box-sizing:border-box;">
                        <div id="bmSearchResult" style="max-height:200px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; padding:5px;"></div>
                    </div>
                </div>
            </div>

            <div style="margin-top:20px; text-align:right;">
                <button onclick="submitMissionBuilder(this)" style="padding:15px 30px; background:#4f46e5; color:white; border:none; border-radius:10px; font-weight:900; cursor:pointer; font-size:16px; box-shadow:0 4px 6px rgba(79, 70, 229, 0.3);">🚀 SIMPAN & TERBITKAN MISI</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    renderBuilderSearch();
}

function checkBentrokJadwal(itemKode, tglMulaiWeb, tglSelesaiWeb) {
    if(!itemKode || !tglMulaiWeb || !tglSelesaiWeb) return false;
    let startA = new Date(tglMulaiWeb).getTime();
    let endA = new Date(tglSelesaiWeb).getTime();
    if(isNaN(startA) || isNaN(endA)) return false;

    for (let m of allMissions) {
        if(!m.tgl_mulai || !m.tgl_selesai) continue;
        let startB = new Date(m.tgl_mulai).getTime();
        let endB = new Date(m.tgl_selesai).getTime();
        
        let kodes = (m.kode_barang || "").toLowerCase().split(',').map(k=>k.trim());
        if(kodes.includes(itemKode.toLowerCase())) {
            if (startA <= endB && endA >= startB) return m.id_misi; 
        }
    }
    return false;
}

function renderBuilderSearch() {
    const q = document.getElementById("bmSearchInput").value.toLowerCase();
    const tglM = document.getElementById("bmTglMulai").value;
    const tglS = document.getElementById("bmTglSelesai").value;
    const container = document.getElementById("bmSearchResult");
    
    if(!tglM || !tglS) { container.innerHTML = `<div style="padding:10px; text-align:center; color:#ef4444; font-size:11px; font-weight:bold;">Isi Tanggal Mulai dan Selesai dulu di sebelah kiri!</div>`; return; }
    if(q.length < 2) { container.innerHTML = `<div style="padding:10px; text-align:center; color:#94a3b8; font-size:11px;">Ketik minimal 2 huruf untuk mencari barang gudang.</div>`; return; }
    
    let results = allItems.filter(i => (i.nama_barang||"").toLowerCase().includes(q) || (i.kode_barang||"").toLowerCase().includes(q) || (i.kode_wadah||"").toLowerCase().includes(q));
    
    if(results.length === 0) { container.innerHTML = `<div style="padding:10px; text-align:center; color:#ef4444; font-size:11px;">Barang tidak ditemukan.</div>`; return; }

    let html = "";
    results.forEach(i => {
        let kode = i.kode_barang || "-";
        let wadahText = i.kode_wadah ? `[Wadah: ${i.kode_wadah}]` : "";
        let inCart = builderCart.some(c => c.kode === kode);
        
        let bentrokMisi = checkBentrokJadwal(kode, tglM, tglS);
        
        if (bentrokMisi) {
            html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:10px; margin-bottom:5px; background:#fef2f2; border:1px solid #fecaca; border-radius:8px; opacity:0.7;">
                <div><div style="font-weight:bold; font-size:12px; color:#991b1b;">${i.nama_barang}</div><div style="font-size:10px; color:#dc2626;">#${kode} ${wadahText} <br>🔒 BENTROK (Misi: ${bentrokMisi})</div></div>
                <button disabled style="background:#fca5a5; color:white; border:none; padding:6px 12px; border-radius:6px; font-weight:bold; font-size:11px;">Terkunci</button>
            </div>`;
        } else if (inCart) {
            html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:10px; margin-bottom:5px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px;">
                <div><div style="font-weight:bold; font-size:12px; color:#166534;">${i.nama_barang}</div><div style="font-size:10px; color:#16a34a;">#${kode} ${wadahText}</div></div>
                <button onclick="removeFromCart('${kode}')" style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:6px; font-weight:bold; font-size:11px; cursor:pointer;">Batal</button>
            </div>`;
        } else {
            html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:10px; margin-bottom:5px; background:white; border:1px solid #cbd5e1; border-radius:8px;">
                <div><div style="font-weight:bold; font-size:12px; color:#1e293b;">${i.nama_barang}</div><div style="font-size:10px; color:#64748b;">#${kode} ${wadahText}</div></div>
                <button onclick="addToCart('${kode}', '${i.nama_barang.replace(/'/g, "\\'")}')" style="background:#16a34a; color:white; border:none; padding:6px 12px; border-radius:6px; font-weight:bold; font-size:11px; cursor:pointer;">+ Tambah</button>
            </div>`;
        }
    });
    container.innerHTML = html;
}

function addToCart(kode, nama) { 
    if(kode === "-") { alert("Barang tidak memiliki kode unik!"); return; }
    builderCart.push({kode: kode, nama: nama}); 
    renderBuilderCart(); renderBuilderSearch(); 
}
function removeFromCart(kode) { 
    builderCart = builderCart.filter(c => c.kode !== kode); 
    renderBuilderCart(); renderBuilderSearch(); 
}
function renderBuilderCart() {
    const container = document.getElementById("bmCartContainer");
    if(builderCart.length === 0) { container.innerHTML = "Keranjang masih kosong. Cari barang di bawah."; return; }
    let html = "";
    builderCart.forEach(c => {
        html += `<div style="display:inline-block; background:#ea580c; color:white; padding:4px 8px; border-radius:6px; margin:2px; font-size:10px; font-weight:bold;">${c.nama} (#${c.kode}) <span onclick="removeFromCart('${c.kode}')" style="margin-left:5px; cursor:pointer; color:#fef08a;">✖</span></div>`;
    });
    container.innerHTML = html;
}

async function submitMissionBuilder(btn) {
    const dbKota = document.getElementById("bmDbKota").value;
    const tglMulai = document.getElementById("bmTglMulai").value;
    const tglSelesai = document.getElementById("bmTglSelesai").value;
    const idMisi = document.getElementById("bmMissionId").value.trim().toUpperCase();
    const zona = document.getElementById("bmZona").value.trim();

    if(!tglMulai || !tglSelesai) { alert("⚠️ Tanggal Mulai dan Selesai wajib diisi!"); return; }
    if(!idMisi || !zona) { alert("⚠️ ID Misi dan Zona wajib diisi!"); return; }
    if(builderCart.length === 0) { alert("⚠️ Keranjang Zona masih kosong!"); return; }

    let selectedCodes = builderCart.map(c => c.kode);

    btn.disabled = true; btn.innerText = "MENGIRIM KE SERVER... 🚀";
    try {
        const payload = { 
            action: "build_mission", pin: API_BACKEND_PIN, user_name: localStorage.getItem('av_session_nama') || "Kru Tanpa Nama", 
            id_misi: idMisi, db_kota: dbKota, tgl_mulai: tglMulai, tgl_selesai: tglSelesai, zona_misi: zona, 
            kodes: selectedCodes 
        }; 
        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) }); 
        const data = await response.json(); 
        if(data.status === "success") { 
            document.getElementById('builderModal').remove(); 
            showToast(`✅ ${data.message}`); 
            loadData(); 
        } else { alert("Gagal:\n" + data.message); } 
    } catch (e) { alert("Error Sistem:\n" + e.message); } finally { if(document.body.contains(btn)) { btn.disabled = false; btn.innerText = "🚀 SIMPAN & TERBITKAN MISI"; } }
}

// ==========================================
// FUNGSI GUDANG MASSAL (BULK UPDATE)
// ==========================================
function toggleBulkMode() { isBulkMode = !isBulkMode; let bar = document.getElementById("bulkBar"); if(!bar) { document.body.insertAdjacentHTML('beforeend', `<div id="bulkBar" class="bulk-bar" style="position:fixed; bottom:0; left:0; right:0; background:#1e293b; color:white; padding:12px 15px; z-index:9000; display:none; justify-content:space-between; align-items:center;"><span id="bulkCount" class="bulk-info" style="font-weight:bold; font-size:12px;">0 Terpilih</span><div style="display:flex; gap:6px;"><button onclick="selectAllVisible()" style="background:#e2e8f0; color:#334155; border:none; padding:8px 10px; border-radius:6px; font-weight:bold; font-size:11px;">☑️</button><button onclick="openAssignMissionModal()" style="padding:8px 10px; font-size:11px; background:#2563eb; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">🎯 Misi Cepat</button><button onclick="openBulkUpdateModal()" class="btn-bulk-process" style="padding:8px 10px; font-size:11px; background:#ea580c; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">⚙️ Ubah Status/Lokasi</button></div></div>`); bar = document.getElementById("bulkBar"); } const btnMode = document.getElementById("btnBulkMode"); if (isBulkMode) { if(btnMode) { btnMode.innerHTML = `❌ Batal Pilih`; btnMode.style.background = "#ef4444"; } bar.style.display = "flex"; } else { if(btnMode) { btnMode.innerHTML = `☑️ Mode Pilih`; btnMode.style.background = "#ea580c"; } bar.style.display = "none"; selectedRows.clear(); document.getElementById("bulkCount").innerText = `0 Terpilih`; } applyFilters(); }
function toggleSelection(rowIndex) { if (selectedRows.has(rowIndex)) selectedRows.delete(rowIndex); else selectedRows.add(rowIndex); document.getElementById("bulkCount").innerText = `${selectedRows.size} Terpilih`; applyFilters(); }
function selectAllVisible() { getFilteredData().forEach(item => selectedRows.add(item.row_index)); document.getElementById("bulkCount").innerText = `${selectedRows.size} Terpilih`; applyFilters(); }

function openBulkUpdateModal() { 
    if (selectedRows.size === 0) { alert("Pilih minimal 1 barang!"); return; } 
    const modalHtml = `
    <div id="bulkModal" class="modal-overlay active">
        <div class="modal-content" style="max-width:350px; padding:20px; background:white; border-radius:15px; position:relative;">
            <button onclick="document.getElementById('bulkModal').remove()" style="position:absolute; top:15px; right:15px; border:none; background:#f1f5f9; width:30px; height:30px; border-radius:50%; font-weight:bold; cursor:pointer;">✕</button>
            <h3 style="margin:0; color:#ea580c; font-size:18px;">⚙️ Update Status & Lokasi</h3>
            <div style="font-size:12px; color:#64748b; margin-top:5px; margin-bottom:15px; font-weight:bold;">${selectedRows.size} Alat Terpilih</div>
            
            <div style="text-align:left; margin-bottom:12px;">
                <label style="font-size:11px; font-weight:bold; color:gray; display:block; margin-bottom:4px;">📍 Ubah Lokasi:</label>
                <select id="bulkNewLokasi" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc; font-weight:bold;">
                    <option value="TETAP">-- Jangan Ubah Lokasi --</option>
                    <option value="Gudang Kanguru">🏢 Gudang Kanguru</option>
                    <option value="Gudang Mrican">🏢 Gudang Mrican</option>
                    <option value="Dalam Perjalanan">🚚 Dalam Perjalanan</option>
                    <option value="Semarang | Di Lokasi Event">📍 Event Semarang</option>
                    <option value="Yogyakarta | Di Lokasi Event">🚩 Event Yogyakarta</option>
                </select>
            </div>
            
            <div style="text-align:left; margin-bottom:15px;">
                <label style="font-size:11px; font-weight:bold; color:gray; display:block; margin-bottom:4px;">🔌 Ubah Status:</label>
                <select id="bulkNewStatus" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc; font-weight:bold;">
                    <option value="TETAP">-- Jangan Ubah Status --</option>
                    <option value="Akan Dibawa">🛒 Akan Dibawa (Packing)</option>
                    <option value="Sedang Dipakai">🔌 Sedang Dipakai / Aktivasi</option>
                    <option value="Di Gudang">📦 Standby / Di Gudang</option>
                </select>
            </div>
            
            <button onclick="processBulkUpdate(this)" style="width:100%; padding:12px; background:#ea580c; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">PROSES UPDATE MASSAL</button>
        </div>
    </div>`; 
    document.body.insertAdjacentHTML('beforeend', modalHtml); 
}

async function processBulkUpdate(btn) { 
    const newLokasi = document.getElementById("bulkNewLokasi").value; 
    const newStatus = document.getElementById("bulkNewStatus").value; 
    if (newLokasi === "TETAP" && newStatus === "TETAP") { alert("Pilih minimal satu perubahan!"); return; } 
    btn.disabled = true; btn.innerText = "MEMPROSES... (JANGAN DITUTUP)"; 
    try { 
        const payload = { action: "update_status_lokasi", pin: API_BACKEND_PIN, user_name: localStorage.getItem('av_session_nama') || "Kru Tanpa Nama", rows: Array.from(selectedRows), new_lokasi: newLokasi !== "TETAP" ? newLokasi : null, new_status: newStatus !== "TETAP" ? newStatus : null, new_tujuan: "TETAP" }; 
        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) }); 
        const data = await response.json(); 
        if(data.status === "success") { document.getElementById('bulkModal').remove(); toggleBulkMode(); loadData(); showToast("✅ Update massal & Efek Domino berhasil!"); } else { alert("Gagal:\n" + data.message); } 
    } catch (e) { alert("Error Sistem:\n" + e.message); } finally { btn.disabled = false; btn.innerText = "PROSES UPDATE MASSAL"; } 
}

async function saveEditLokasiStatus(rowIndex) { 
    const btn = event.target; const newLokasi = document.getElementById("editLokasi").value; const newStatus = document.getElementById("editStatus").value; 
    btn.disabled = true; btn.innerText = "MENYIMPAN..."; 
    try { 
        const payload = { action: "update_status_lokasi", pin: API_BACKEND_PIN, user_name: localStorage.getItem('av_session_nama') || "Kru Tanpa Nama", rows: [rowIndex], new_lokasi: newLokasi, new_status: newStatus, new_tujuan: "TETAP" }; 
        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) }); 
        const data = await response.json(); 
        if(data.status === "success") { document.getElementById('detailModal').remove(); loadData(); showToast("✅ Status & Efek Domino Diperbarui!"); } else { alert("Gagal:\n" + data.message); } 
    } catch (e) { alert("Error Sistem:\n" + e.message); } finally { btn.disabled = false; btn.innerText = "💾 SIMPAN STATUS"; } 
}

function openAssignMissionModal() { 
    if (selectedRows.size === 0) { alert("Pilih minimal 1 barang!"); return; } 
    const modalHtml = `
    <div id="assignModal" class="modal-overlay active">
        <div class="modal-content" style="max-width:400px; padding:25px; background:white; border-radius:15px; position:relative; text-align:left;">
            <button onclick="document.getElementById('assignModal').remove()" style="position:absolute; top:15px; right:15px; border:none; background:#fef2f2; color:#dc2626; width:30px; height:30px; border-radius:50%; font-weight:bold; cursor:pointer;">✕</button>
            <h3 style="margin:0 0 10px 0; color:#2563eb; font-size:18px; font-weight:900;">🎯 Misi Cepat Lapangan</h3>
            <div style="font-size:11px; color:#64748b; margin-bottom:15px; padding-bottom:10px; border-bottom:1px solid #e2e8f0;">(Legacy) Menugaskan <b>${selectedRows.size} Alat</b> secara massal.</div>
            
            <label style="font-size:11px; font-weight:bold; color:#1e293b; display:block; margin-bottom:4px;">📍 Pilih Database Kota:</label>
            <select id="assignDbKota" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc; font-weight:bold; margin-bottom:12px; background:#f8fafc;">
                <option value="Database_Misi_Semarang">Event Semarang</option>
                <option value="Database_Misi_Yogya">Event Yogyakarta</option>
            </select>

            <label style="font-size:11px; font-weight:bold; color:#1e293b; display:block; margin-bottom:4px;">🏷️ ID Misi Lapangan:</label>
            <input type="text" id="assignMissionId" placeholder="Contoh: M-SMG-01" style="width:100%; padding:10px; border-radius:8px; border:1px solid #93c5fd; font-weight:bold; text-transform:uppercase; margin-bottom:12px; background:#eff6ff; box-sizing:border-box;">
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
                <div>
                    <label style="font-size:11px; font-weight:bold; color:#1e293b; display:block; margin-bottom:4px;">📦 Paket Zona:</label>
                    <input type="text" id="assignZonaMisi" placeholder="Contoh: Zona A" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc; box-sizing:border-box; font-size:12px;">
                </div>
                <div>
                    <label style="font-size:11px; font-weight:bold; color:#1e293b; display:block; margin-bottom:4px;">👥 Tim Tugas:</label>
                    <input type="text" id="assignTimMisi" placeholder="Contoh: Tim Audio" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc; box-sizing:border-box; font-size:12px;">
                </div>
            </div>

            <button onclick="processAssignMission(this)" style="width:100%; padding:14px; background:#2563eb; color:white; border:none; border-radius:10px; font-weight:900; cursor:pointer; box-shadow:0 4px 6px rgba(37, 99, 235, 0.2);">🚀 TERBITKAN MISI</button>
        </div>
    </div>`; 
    document.body.insertAdjacentHTML('beforeend', modalHtml); 
}

async function processAssignMission(btn) { 
    const missionId = document.getElementById("assignMissionId").value.trim().toUpperCase(); 
    const dbKota = document.getElementById("assignDbKota").value; 
    const zonaMisi = document.getElementById("assignZonaMisi").value.trim(); 
    const timMisi = document.getElementById("assignTimMisi").value.trim(); 
    
    if (!missionId) { alert("⚠️ ID Misi Wajib Diisi!"); return; } 
    
    let selectedCodes = []; 
    Array.from(selectedRows).forEach(rowIndex => { let item = allItems.find(i => i.row_index === rowIndex); if (item) { let codeToPush = item.kode_wadah ? item.kode_wadah : item.kode_barang; if (codeToPush && codeToPush.trim() !== "") selectedCodes.push(codeToPush); } }); 
    selectedCodes = [...new Set(selectedCodes)]; 
    if (selectedCodes.length === 0) { alert("Alat yang dipilih tidak memiliki Kode Barang/Wadah!"); return; } 
    
    btn.disabled = true; btn.innerText = "MENGIRIM KE SERVER... 🚀"; 
    try { 
        const payload = { 
            action: "assign_to_mission", pin: API_BACKEND_PIN, user_name: localStorage.getItem('av_session_nama') || "Kru Tanpa Nama", 
            id_misi: missionId, db_kota: dbKota, zona_misi: zonaMisi, tim_misi: timMisi, 
            new_tujuan: "Misi: " + missionId, rows: Array.from(selectedRows), kode_barang_array: selectedCodes 
        }; 
        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) }); 
        const data = await response.json(); 
        if(data.status === "success") { 
            document.getElementById('assignModal').remove(); 
            toggleBulkMode(); 
            showToast(`✅ ${data.message}`); 
            loadData(); 
        } else { alert("Gagal:\n" + data.message); } 
    } catch (e) { alert("Error Sistem:\n" + e.message); } finally { if(document.body.contains(btn)) { btn.disabled = false; btn.innerText = "🚀 TERBITKAN MISI"; } }
}

// ==========================================
// TAMBAH ALAT BARU (FORM)
// ==========================================
function openAddModal() { if(!isAdminMode) return; document.getElementById("formAdd").reset(); pendingAddFotos = []; renderPreviewAddFotos(); document.getElementById("modalAdd").classList.add("active"); }
function closeAddModal() { document.getElementById("modalAdd").classList.remove("active"); }
function handleNewFotos(input) { if (!input.files || input.files.length === 0) return; for (let i = 0; i < input.files.length; i++) { if (pendingAddFotos.length < 3) pendingAddFotos.push(input.files[i]); } input.value = ""; renderPreviewAddFotos(); }
function removeAddFoto(index) { pendingAddFotos.splice(index, 1); renderPreviewAddFotos(); }
function renderPreviewAddFotos() { 
    const container = document.getElementById("previewAddFotos"); container.innerHTML = ""; 
    if (pendingAddFotos.length === 0) { container.innerHTML = `<span style="font-size:11px; color:gray;">Belum ada foto terpilih.</span>`; return; } 
    pendingAddFotos.forEach((file, index) => { const reader = new FileReader(); reader.onload = (e) => { container.innerHTML += `<div style="position:relative; width:70px; height:70px; border-radius:8px; overflow:hidden; border:1px solid #ccc;"><img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;"><button type="button" onclick="removeAddFoto(${index})" style="position:absolute; top:2px; right:2px; background:#ef4444; color:white; border:none; border-radius:50%; width:20px; height:20px; font-size:10px; font-weight:bold; cursor:pointer;">✕</button></div>`; }; reader.readAsDataURL(file); }); 
}

function compressImage(file, maxWidth = 800) { 
    return new Promise((resolve) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = (event) => { const img = new Image(); img.src = event.target.result; img.onload = () => { const canvas = document.createElement('canvas'); const scaleSize = maxWidth / img.width; canvas.width = maxWidth; canvas.height = img.height * scaleSize; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/jpeg', 0.6)); }; }; }); 
}

async function submitNewItem(e) { 
    e.preventDefault(); const btn = document.getElementById("btnSubmitAdd"); btn.innerHTML = "⏳ MENGOMPRES FOTO..."; btn.style.background = "#94a3b8"; btn.disabled = true; await new Promise(r => setTimeout(r, 100)); 
    try { 
        let base64Fotos = ["", "", ""]; let maxFiles = Math.min(pendingAddFotos.length, 3); 
        for (let i = 0; i < maxFiles; i++) { base64Fotos[i] = await compressImage(pendingAddFotos[i]); } 
        btn.innerHTML = "🚀 MENGIRIM KE SATELIT..."; 
        const payload = { action: "add_item", pin: API_BACKEND_PIN, user_name: localStorage.getItem('av_session_nama') || "Kru Tanpa Nama", nama: document.getElementById("addNama").value, kode_barang: document.getElementById("addKode").value, kode_wadah: document.getElementById("addWadah").value, jumlah: document.getElementById("addJumlah").value, kondisi: document.getElementById("addKondisi").value, keterangan_ref: document.getElementById("addKet").value, lokasi: document.getElementById("addLokasi") ? document.getElementById("addLokasi").value : "Gudang Kanguru", fotos: base64Fotos }; 
        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) }); const data = await response.json(); 
        if (data.status === "success") { showToast("✅ Alat Tersimpan!"); closeAddModal(); loadData(); } else { alert("Gagal:\n" + data.message); } 
    } catch (err) { alert("Error Sistem:\n" + err.message); } finally { btn.innerHTML = "💾 SIMPAN ALAT"; btn.style.background = "#16a34a"; btn.disabled = false; } 
}

// ==========================================
// EDIT ALAT (FORM FULL)
// ==========================================
function openEditFullModal(item) { 
    document.getElementById('detailModal').remove(); document.getElementById('modalEditFull').classList.add("active"); document.getElementById("editRowIndex").value = item.row_index; document.getElementById("editNama").value = item.nama_barang; document.getElementById("editKode").value = item.barang || item.kode_barang || ""; document.getElementById("editWadah").value = item.kode_wadah || ""; document.getElementById("editJumlah").value = item.jumlah || 0; document.getElementById("editKondisi").value = item.kondisi || "Bagus"; document.getElementById("editKet").value = item.keterangan_ref || ""; pendingEditFotos = []; let safeFileIds = item.file_ids || item.fotos || []; 
    for(let i = 0; i < 3; i++) { let fileId = safeFileIds[i]; if (fileId && fileId.length > 5) { let imgUrl = fileId.includes("http") ? fileId : `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`; pendingEditFotos.push({ status: 'existing', url: imgUrl, originalId: fileId }); } } 
    renderPreviewEditFotos(); 
}

function closeEditFullModal() { document.getElementById('modalEditFull').classList.remove("active"); }

function renderPreviewEditFotos() { 
    const container = document.getElementById("previewEditFotos"); const btnContainer = document.getElementById("btnContainerEditFoto"); container.innerHTML = ""; 
    if (pendingEditFotos.length === 0) { container.innerHTML = `<span style="font-size:11px; color:gray;">Belum ada foto tersimpan.</span>`; } else { 
        pendingEditFotos.forEach((item, index) => { 
            let div = document.createElement('div'); div.style.cssText = "position:relative; width:75px; height:75px; border-radius:8px; overflow:hidden; border:1px solid #ccc;"; 
            if (item.status === 'existing') { div.innerHTML = `<img src="${item.url}" style="width:100%; height:100%; object-fit:cover;"><button type="button" onclick="removeEditFoto(${index})" style="position:absolute; top:2px; right:2px; background:#ef4444; color:white; border:none; border-radius:50%; width:20px; height:20px; font-size:10px; font-weight:bold; cursor:pointer;">✕</button>`; container.appendChild(div); } 
            else if (item.status === 'new') { div.style.border = "2px solid #3b82f6"; container.appendChild(div); const reader = new FileReader(); reader.onload = (e) => { div.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;"><button type="button" onclick="removeEditFoto(${index})" style="position:absolute; top:2px; right:2px; background:#ef4444; color:white; border:none; border-radius:50%; width:20px; height:20px; font-size:10px; font-weight:bold; cursor:pointer;">✕</button>`; }; reader.readAsDataURL(item.file); } 
        }); 
    } 
    btnContainer.style.display = pendingEditFotos.length >= 3 ? "none" : "flex"; 
}

function handleNewEditFotos(input) { if (!input.files || input.files.length === 0) return; for (let i = 0; i < input.files.length; i++) { if (pendingEditFotos.length < 3) { pendingEditFotos.push({ status: 'new', file: input.files[i] }); } } input.value = ""; renderPreviewEditFotos(); }
function removeEditFoto(index) { pendingEditFotos.splice(index, 1); renderPreviewEditFotos(); }

async function submitEditFull(e) { 
    e.preventDefault(); const btn = document.getElementById("btnSubmitEditFull"); btn.innerHTML = "⏳ MENGOMPRES FOTO..."; btn.style.background = "#94a3b8"; btn.disabled = true; await new Promise(r => setTimeout(r, 100)); 
    try { 
        let finalFotos = ["", "", ""]; 
        for(let i = 0; i < 3; i++) { let photoItem = pendingEditFotos[i]; if (photoItem) { if (photoItem.status === 'new') { finalFotos[i] = await compressImage(photoItem.file); } else if (photoItem.status === 'existing') { finalFotos[i] = photoItem.originalId; } } else { finalFotos[i] = ""; } } 
        btn.innerHTML = "🚀 MENGIRIM KE SATELIT..."; 
        const payload = { action: "full_edit_item", pin: API_BACKEND_PIN, user_name: localStorage.getItem('av_session_nama') || "Kru Tanpa Nama", row_index: document.getElementById("editRowIndex").value, nama: document.getElementById("editNama").value, kode_barang: document.getElementById("editKode").value, kode_wadah: document.getElementById("editWadah").value, jumlah: document.getElementById("editJumlah").value, kondisi: document.getElementById("editKondisi").value, keterangan_ref: document.getElementById("editKet").value, lokasi: document.getElementById("editLokasi") ? document.getElementById("editLokasi").value : "", fotos: finalFotos }; 
        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) }); const data = await response.json(); 
        if (data.status === "success") { showToast("✅ Data Diperbarui!"); closeEditFullModal(); loadData(); } else { alert("Gagal:\n" + data.message); } 
    } catch (err) { alert("Error Sistem:\n" + err.message); } finally { btn.innerHTML = "💾 UPDATE DATA & FOTO"; btn.style.background = "#ea580c"; btn.disabled = false; } 
}

// ==========================================
// DUPLIKAT MASSAL DARI KARTU (SMART DUPLICATOR)
// ==========================================
async function duplicateItem(rowIndex) {
    let qtyInput = prompt("📦 Berapa banyak duplikat yang ingin dibuat?\n(Ketik angka, maksimal 50. Contoh: 5)", "1");
    if (qtyInput === null || qtyInput.trim() === "") return;

    let qty = parseInt(qtyInput);
    if (isNaN(qty) || qty <= 0 || qty > 50) {
        alert("⚠️ Jumlah tidak valid! Masukkan angka antara 1 hingga 50.");
        return;
    }

    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = `⏳ MEMPROSES ${qty} DUPLIKAT...`;
    btn.disabled = true;
    btn.style.background = "#94a3b8";

    try {
        const payload = {
            action: "duplicate_item",
            pin: API_BACKEND_PIN,
            user_name: localStorage.getItem('av_session_nama') || "Kru Tanpa Nama",
            row_index: rowIndex,
            qty: qty 
        };

        const response = await fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (data.status === "success") {
            document.getElementById('detailModal').remove();
            showToast(`✅ Sukses! ${qty} alat berhasil diduplikat.`);
            loadData(); 
        } else {
            alert("Gagal:\n" + data.message);
        }
    } catch (err) {
        alert("Error Sistem:\n" + err.message);
    } finally {
        if (document.body.contains(btn)) {
            btn.innerHTML = originalText;
            btn.disabled = false;
            btn.style.background = "#8b5cf6";
        }
    }
}

// ==========================================
// FITUR LAPOR DEVELOPER (UI) & PRINT ENGINE
// ==========================================
function injectFeedbackUI() {
    if (document.getElementById("btnFeedbackFloat")) return;
    const fabHtml = `<button id="btnFeedbackFloat" onclick="openFeedbackModal()" style="position:fixed; bottom:20px; right:20px; width:50px; height:50px; border-radius:50%; background:#ea580c; color:white; font-size:24px; border:none; box-shadow:0 4px 15px rgba(234,88,12,0.4); cursor:pointer; z-index:8000;">🐞</button>`;
    const modalHtml = `<div id="feedbackModal" class="modal-overlay"><div class="modal-content" style="max-width:400px; background:white; padding:20px; border-radius:15px; text-align:left; position:relative;"><button type="button" onclick="closeFeedbackModal()" style="position:absolute; top:15px; right:15px; border:none; background:#f1f5f9; width:30px; height:30px; border-radius:50%; font-weight:bold; cursor:pointer;">✕</button><h3 style="margin:0 0 5px 0; color:#0f172a;">Form Laporan 💡</h3><p style="font-size:11px; color:#64748b; margin-bottom:15px;">Kirim pesan ke meja Developer.</p><form id="formFeedback" onsubmit="submitFeedback(event)"><select id="fbTipe" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc; margin-bottom:12px; font-size:12px;" required><option value="Bug">🐞 Lapor Error</option></select><textarea id="fbPesan" rows="4" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc; margin-bottom:12px; font-size:12px; box-sizing:border-box;" required></textarea><input type="text" id="fbNama" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc; margin-bottom:15px; font-size:12px; box-sizing:border-box;" required><button type="submit" id="btnSubmitFb" style="width:100%; padding:12px; background:#10b981; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">🚀 KIRIM</button></form></div></div>`;
    document.body.insertAdjacentHTML('beforeend', fabHtml + modalHtml);
}
function openFeedbackModal() { const currentUser = localStorage.getItem('av_session_nama'); if(currentUser) document.getElementById('fbNama').value = currentUser; document.getElementById('feedbackModal').classList.add('active'); }
function closeFeedbackModal() { document.getElementById('feedbackModal').classList.remove('active'); }
async function submitFeedback(e) { e.preventDefault(); const btn = document.getElementById("btnSubmitFb"); btn.disabled = true; btn.innerHTML = "⏳ MENGIRIM..."; setTimeout(() => { showToast("✅ Laporan Terekam!"); document.getElementById("formFeedback").reset(); closeFeedbackModal(); btn.disabled = false; btn.innerHTML = "🚀 KIRIM"; }, 1000); }

function printSuratJalan() { openPrintModal(); }
function printFormCO31() { openPrintModal(); }

// ==========================================
// FITUR PRINT ENGINE (V.66.0 - KEBUTUHAN TIM, HARDCASE FIX & LEPASAN)
// ==========================================
function injectPrintModalUI() {
    if (document.getElementById("modalPrintSettings")) document.getElementById("modalPrintSettings").remove();
    const modalHtml = `
    <div id="modalPrintSettings" class="modal-overlay">
        <div class="modal-content" style="max-width:400px; background:white; padding:25px; border-radius:15px; text-align:left; position:relative;">
            <button type="button" onclick="closePrintModal()" style="position:absolute; top:15px; right:15px; border:none; background:#f1f5f9; width:30px; height:30px; border-radius:50%; font-weight:bold; cursor:pointer;">✕</button>
            <h3 style="margin:0 0 5px 0; color:#2563eb; font-weight:900; font-size:18px;">🖨️ Pusat Cetak Dokumen</h3>
            <p style="font-size:11px; color:#64748b; margin-bottom:15px;">Pilih sumber data dan format laporan.</p>
            
            <label style="font-size:11px; font-weight:bold; color:#1e293b; display:block; margin-bottom:6px;">📍 Sumber Data:</label>
            <select id="printSource" style="width:100%; padding:10px; border-radius:8px; border:1px solid #cbd5e1; margin-bottom:15px; font-size:12px; font-weight:bold; background:#f8fafc; color:#ea580c;">
                <option value="semua">Semua</option>
                <option value="bawa">Akan Dibawa</option>
                <option value="gudang">Data di Gudang</option>
                <option value="event">Di Lokasi Gedung</option>
            </select>
            
            <label style="font-size:11px; font-weight:bold; color:#1e293b; display:block; margin-bottom:6px;">📊 Format Cetak:</label>
            <select id="printFormat" style="width:100%; padding:10px; border-radius:8px; border:1px solid #cbd5e1; margin-bottom:25px; font-size:12px; font-weight:bold; background:#f8fafc;">
                <option value="co31">CO-31 (Daftar Detail per Wadah)</option>
                <option value="hardcase">Checklist Tiap Wadah (Format Tempel / Hardcase)</option>
                <option value="rekap">Rekap Gabungan Total Alat</option>
                <option value="kebutuhan_tim">Daftar Kebutuhan per Tim (Dari Misi)</option>
            </select>
            
            <button onclick="executePrint()" style="width:100%; padding:14px; background:#3b82f6; color:white; border:none; border-radius:10px; font-weight:900; cursor:pointer;">🚀 CETAK DOKUMEN</button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function openPrintModal() { 
    if(allItems.length === 0) return alert("Satelit belum selesai memuat data!"); 
    document.getElementById("modalPrintSettings").classList.add("active"); 
}

function closePrintModal() { 
    document.getElementById("modalPrintSettings").classList.remove("active"); 
}

function executePrint() {
    const source = document.getElementById("printSource").value; 
    const format = document.getElementById("printFormat").value;
    
    // 1. FILTERING DATA BERDASARKAN SUMBER
    let filteredData = [];
    allItems.forEach(i => {
        let stat = i.status_digunakan || 'Di Gudang'; if(stat === 'FALSE') stat = 'Di Gudang';
        let lok = i.lokasi_saat_ini || i.lokasi || i["Lokasi Saat Ini"] || '';
        let kondisi = (i.kondisi || "").toLowerCase();

        if (kondisi === 'rusak' || kondisi === 'periksa') return;

        if (source === "semua") {
            filteredData.push(i);
        } else if (source === "bawa" && stat === 'Akan Dibawa') {
            filteredData.push(i);
        } else if (source === "gudang" && stat === 'Di Gudang' && lok.includes('Gudang')) {
            filteredData.push(i);
        } else if (source === "event" && (lok.includes('Event') || stat === 'Sedang Dipakai')) {
            filteredData.push(i);
        }
    });

    if (filteredData.length === 0) { alert(`❌ Kosong! Tidak ditemukan barang untuk sumber data yang dipilih.`); return; }

    let titleContextText = "";
    if (source === "semua") titleContextText = "Semua";
    if (source === "bawa") titleContextText = "Akan Dibawa";
    if (source === "gudang") titleContextText = "Data di Gudang";
    if (source === "event") titleContextText = "Di Lokasi Gedung";

    // 2. MULAI MENGGAMBAR DOKUMEN CETAK
    let printWin = window.open('', '', 'width=900,height=800');
    
    let html = `<html><head><title>Print - ${titleContextText}</title><style>
        @page { size: A4 portrait; margin: 15mm; } 
        body { font-family: 'Arial', sans-serif; font-size:12px; color:#000; } 
        
        table { width: 100%; border-collapse: collapse; margin-top: 5px; margin-bottom: 20px;} 
        th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; vertical-align: top;} 
        th { background: #f0f0f0; } 
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
        
        .page-break { break-before: page; page-break-before: always; }
        .no-break-inside { break-inside: avoid; page-break-inside: avoid; }
        
        /* CSS Label Hardcase Fix Border */
        .hardcase-wrapper { width: 100%; border: 2px solid #0f172a; border-radius: 8px; font-family: 'Arial', sans-serif; background: #fff; box-shadow: 2px 2px 0px #0f172a; margin-bottom:20px; padding:15px; box-sizing:border-box;}
        .hardcase-header { text-align: center; border-bottom: 3px double #0f172a; padding-bottom: 10px; margin-bottom: 15px; }
        .hardcase-title { margin: 0; font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase;}
        .hardcase-kode { margin: 5px 0 0 0; font-size: 14px; font-weight: bold; color: #475569; }
        .hardcase-lokasi { display: inline-block; margin-top: 10px; padding: 5px 12px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 11px; font-weight: bold; color: #0f172a; }
        .hardcase-box { width: 18px; height: 18px; border: 1.5px solid #0f172a; margin: 0 auto; border-radius: 3px; }
        .hardcase-footer { margin-top: 15px; padding-top: 10px; border-top: 1px dashed #94a3b8; font-size: 11px; display: flex; justify-content: space-between; align-items: flex-end; }
        .inner-table { width: 100%; border-collapse: collapse; margin-bottom:0; }
        .inner-table th, .inner-table td { border: 1px solid #0f172a; padding: 6px 8px; }
        .inner-table th { background: #f8fafc; font-size: 12px; text-transform: uppercase; }
        
        .alat-nama { font-weight: bold; color: black; font-size: 11px; }
        .alat-kode { color: gray; font-size: 9px; margin-left: 5px; }
    </style></head><body onload="window.print()">`;
    
    // ==========================================
    // FORMAT 1: CO-31 (Daftar Detail per Wadah)
    // ==========================================
    if (format === "co31") {
        html += `<div class="header"><h2 style="margin:0;">LAMPIRAN DAFTAR BARANG (CO-31)</h2><p style="margin:5px 0 0 0; color:#444; font-size:13px;">Konteks Data: <b>${titleContextText.toUpperCase()}</b></p></div>`;
        
        let groupedWadah = {}; let lepasan = [];
        filteredData.forEach(item => { 
            let wadah = (item.kode_wadah || "").toUpperCase().trim(); 
            if (wadah && wadah !== "-") { 
                if (!groupedWadah[wadah]) groupedWadah[wadah] = []; 
                groupedWadah[wadah].push(item); 
            } else { 
                lepasan.push(item); 
            } 
        });

        if (Object.keys(groupedWadah).length > 0) {
            html += `<table>`;
            html += `<thead><tr><th style="width:12%; text-align:center;">Jumlah</th><th style="width:58%;">Uraian Detail Barang (Wadah & Isi)</th><th style="width:30%;">Checklist</th></tr></thead><tbody>`;
            for (let wadah in groupedWadah) {
                let boxItem = allItems.find(i => i.kode_barang && i.kode_barang.toUpperCase() === wadah); 
                let boxName = boxItem ? boxItem.nama_barang.toUpperCase() : `WADAH #${wadah}`;
                html += `<tr class="no-break-inside" style="background-color:#f1f5f9;"><td style="text-align:center; font-weight:bold; font-size:12px; border-bottom:1px solid #ccc;">1 Pcs</td><td style="font-weight:bold; font-size:12px; border-bottom:1px solid #ccc;">🧰 ${boxName} (#${wadah})</td><td style="border-bottom:1px solid #ccc;">[ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]</td></tr>`;
                groupedWadah[wadah].forEach(item => { 
                    html += `<tr class="no-break-inside"><td style="text-align:center; font-size:10px; color:#555; border-bottom:1px dashed #e2e8f0;">${item.jumlah} Pcs</td><td style="padding-left:15px; border-bottom:1px dashed #e2e8f0;"><span class="alat-nama">- ${item.nama_barang}</span> ${item.kode_barang ? '<span class="alat-kode">(#'+item.kode_barang+')</span>' : ''}</td><td style="border-bottom:1px dashed #e2e8f0;"></td></tr>`; 
                });
            }
            html += `</tbody></table>`;
        }

        if (lepasan.length > 0) {
            if (Object.keys(groupedWadah).length > 0) html += `<div class="page-break"></div>`; 
            html += `<div class="header"><h2 style="margin:0;">LAMPIRAN DAFTAR BARANG (CO-31)</h2><p style="margin:5px 0 0 0; color:#444; font-size:13px;">Konteks Data: <b>${titleContextText.toUpperCase()}</b></p></div>`;
            html += `<h3 style="background:#e2e8f0; padding:8px; border-left:4px solid #475569; font-size:14px; text-transform:uppercase;">Daftar Barang Lepasan (Tanpa Wadah)</h3>`;
            html += `<table>`;
            html += `<thead><tr><th style="width:12%; text-align:center;">Jumlah</th><th style="width:58%;">Uraian Detail Barang</th><th style="width:30%;">Checklist</th></tr></thead><tbody>`;
            lepasan.forEach(item => { 
                html += `<tr class="no-break-inside"><td style="text-align:center; font-weight:bold; font-size:12px;">${item.jumlah} Pcs</td><td><span class="alat-nama">${item.nama_barang.toUpperCase()}</span> ${item.kode_barang ? '<span class="alat-kode">(#'+item.kode_barang+')</span>' : ''}</td><td>[ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]</td></tr>`; 
            });
            html += `</tbody></table>`;
        }
    }
    
    // ==========================================
    // FORMAT 2: CHECKLIST TIAP WADAH (HARDCASE)
    // ==========================================
    else if (format === "hardcase") {
        let groupedWadah = {};
        filteredData.forEach(item => {
            let wadah = (item.kode_wadah || "").toUpperCase().trim();
            if (wadah && wadah !== "-") {
                if (!groupedWadah[wadah]) groupedWadah[wadah] = [];
                groupedWadah[wadah].push(item);
            }
        });

        if (Object.keys(groupedWadah).length === 0) {
             printWin.close();
             alert("Tidak ada barang boks/hardcase di dalam sumber data yang dipilih.");
             return;
        }

        let isFirst = true;
        for (let wadah in groupedWadah) {
            let boxItem = allItems.find(i => i.kode_barang && i.kode_barang.toUpperCase() === wadah); 
            let boxName = boxItem ? boxItem.nama_barang : `WADAH #${wadah}`;
            
            let firstItem = groupedWadah[wadah][0];
            let infoLokasi = firstItem.lokasi_saat_ini || firstItem.lokasi || "Gudang Kanguru";
            let infoTujuan = firstItem.tujuan || "";
            
            let teksPosisi = infoLokasi;
            if (infoTujuan && infoTujuan !== "TETAP" && infoTujuan !== "-" && infoLokasi.toLowerCase() !== infoTujuan.toLowerCase()) { 
                teksPosisi += ` - ${infoTujuan}`; 
            }

            let pBreak = isFirst ? "" : "page-break";
            isFirst = false;
            
            html += `<div class="hardcase-wrapper ${pBreak}">`;
            html += `   <div class="hardcase-header">`;
            html += `       <h2 class="hardcase-title">🧰 ${boxName}</h2>`;
            html += `       <p class="hardcase-kode">ID WADAH: #${wadah}</p>`;
            html += `       <div class="hardcase-lokasi">📍 Posisi: ${teksPosisi}</div>`;
            html += `   </div>`;
            
            html += `   <table class="inner-table">`;
            html += `       <thead><tr>`;
            html += `           <th style="width:10%; text-align:center;">QTY</th>`;
            html += `           <th style="width:60%;">NAMA ALAT (ISI HARDCASE)</th>`;
            html += `           <th style="width:15%; text-align:center; background:#fee2e2; color:#991b1b; font-size:14px;">OUT 📤</th>`;
            html += `           <th style="width:15%; text-align:center; background:#dcfce7; color:#166534; font-size:14px;">IN 📥</th>`;
            html += `       </tr></thead><tbody>`;
            
            groupedWadah[wadah].forEach(item => { 
                html += `   <tr class="no-break-inside">`;
                html += `       <td style="text-align:center; font-weight:bold; font-size:13px;">${item.jumlah}</td>`;
                html += `       <td><span class="alat-nama">${item.nama_barang}</span> <span class="alat-kode">${item.kode_barang ? '#'+item.kode_barang : ''}</span></td>`;
                html += `       <td style="text-align:center; vertical-align:middle;"><div class="hardcase-box"></div></td>`;
                html += `       <td style="text-align:center; vertical-align:middle;"><div class="hardcase-box"></div></td>`;
                html += `   </tr>`;
            });
            
            html += `       </tbody></table>`;
            html += `   <div class="hardcase-footer no-break-inside">`;
            html += `       <div><b>Dicetak:</b> ${new Date().toLocaleDateString('id-ID')} | <b>Status:</b> ${titleContextText}</div>`;
            html += `       <div style="text-align:right;"><b>Paraf OUT:</b> ____________ &nbsp;&nbsp;&nbsp; <b>Paraf IN:</b> ____________</div>`;
            html += `   </div>`;
            html += `</div>`; 
        }
    }
    
    // ==========================================
    // FORMAT 3: REKAP GABUNGAN TOTAL ALAT
    // ==========================================
    else if (format === "rekap") {
        html += `<div class="header"><h2 style="margin:0;">REKAP GABUNGAN TOTAL ALAT</h2><p style="margin:5px 0 0 0; color:#444; font-size:13px;">Konteks Data: <b>${titleContextText.toUpperCase()}</b></p></div>`;
        let grouped = {}; 
        filteredData.forEach(i => { 
            let nama = (i.nama_barang || "Tanpa Nama").toUpperCase(); 
            if(!grouped[nama]) grouped[nama] = 0; 
            grouped[nama] += parseInt(i.jumlah || 1); 
        });
        let sortedNames = Object.keys(grouped).sort();
        
        html += `<table>`;
        html += `<thead><tr><th style="width:8%; text-align:center;">No</th><th style="width:72%;">Nama Alat (Data Gabungan)</th><th style="width:20%; text-align:center;">Total (Qty)</th></tr></thead><tbody>`;
        sortedNames.forEach((nama, idx) => { 
            html += `<tr class="no-break-inside"><td style="text-align:center;">${idx+1}</td><td><span class="alat-nama">${nama}</span></td><td style="text-align:center; font-weight:bold;">${grouped[nama]} Pcs</td></tr>`; 
        });
        html += `</tbody></table>`;
    }
    
    // ==========================================
    // FORMAT 4: DAFTAR KEBUTUHAN PER TIM (MISI)
    // ==========================================
    else if (format === "kebutuhan_tim") {
        html += `<div class="header"><h2 style="margin:0;">DAFTAR KEBUTUHAN BARANG PER TIM</h2><p style="margin:5px 0 0 0; color:#444; font-size:13px;">Konteks Data: <b>${titleContextText.toUpperCase()}</b></p></div>`;
        let timData = {};
        
        let allowedCodes = new Set();
        filteredData.forEach(i => {
            if (i.kode_barang) allowedCodes.add(i.kode_barang.toLowerCase());
            if (i.kode_wadah) allowedCodes.add(i.kode_wadah.toLowerCase());
        });

        allMissions.forEach(m => {
            let timName = (m.tim || "UMUM").toUpperCase();
            let codes = String(m.kode_barang || "").split(',').map(c => c.trim().toLowerCase()).filter(c => c);
            
            codes.forEach(code => {
                if (allowedCodes.has(code)) {
                    if (!timData[timName]) timData[timName] = {};
                    let invItem = allItems.find(i => i.kode_barang && i.kode_barang.toLowerCase() === code);
                    let namaAlat = invItem ? invItem.nama_barang : `Alat #${code.toUpperCase()}`;
                    
                    if (!timData[timName][namaAlat]) timData[timName][namaAlat] = { qty: 0, codes: [] };
                    timData[timName][namaAlat].qty += 1;
                    timData[timName][namaAlat].codes.push(code.toUpperCase());
                }
            });
        });

        if (Object.keys(timData).length === 0) {
            html += `<div style="text-align:center; margin-top:50px;"><h3>Tidak ada barang yang terhubung ke Misi Tim pada sumber data ini.</h3></div>`;
        } else {
            let isFirstTim = true;
            for (let tim in timData) {
                let pBreak = !isFirstTim ? 'page-break' : '';
                isFirstTim = false;
                
                html += `<div class="${pBreak}">`;
                html += `<h3 style="margin-top:20px; margin-bottom:5px; color:#4f46e5; font-size:15px; font-weight:900; background:#e0e7ff; padding:8px 12px; border-left:5px solid #4f46e5; text-transform:uppercase;">👥 KEBUTUHAN TIM: ${tim}</h3>`;
                html += `<table><thead><tr><th style="width:10%; text-align:center;">Total Qty</th><th style="width:50%;">Nama Barang</th><th style="width:40%;">Daftar Lengkap Kode Alat</th></tr></thead><tbody>`;
                
                let sortedItems = Object.keys(timData[tim]).sort();
                sortedItems.forEach(nama => {
                    let info = timData[tim][nama];
                    let codesStr = info.codes.join(', ');
                    html += `<tr class="no-break-inside"><td style="text-align:center; font-weight:bold; font-size:12px;">${info.qty} Pcs</td><td><span class="alat-nama">${nama}</span></td><td style="font-size:10px; color:#64748b;">${codesStr}</td></tr>`;
                });
                
                html += `</tbody></table></div>`;
            }
        }
    }

    if (format !== "hardcase") {
        html += `<div style="margin-top: 20px; font-size:10px; color:#555; text-align:right;"><i>Dicetak pada: ${new Date().toLocaleString('id-ID')}</i></div>`;
    }
    
    html += `</body></html>`;
    
    printWin.document.write(html); printWin.document.close(); closePrintModal(); 
}

// === SCANNER QR ===
function openScannerModal() { const oldModal = document.getElementById("tempScannerModal"); if(oldModal) oldModal.remove(); let modal = document.createElement("div"); modal.id = "tempScannerModal"; modal.className = "modal-overlay active"; modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.9); z-index: 999999; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px);"; modal.innerHTML = `<div class="modal-content" style="width: 90%; max-width: 400px; background: white; padding: 25px 20px; border-radius: 20px; text-align: center; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.5);"><button onclick="closeScannerModal()" style="position: absolute; top: 15px; right: 15px; border: none; background: #fef2f2; color: #dc2626; width: 35px; height: 35px; border-radius: 50%; font-weight: bold; cursor: pointer; z-index: 9999; font-size: 16px;">✕</button><h3 style="margin: 0 0 5px 0; font-size: 18px; color: #0f172a; font-weight: 800;">📸 Scan Barcode</h3><div id="qr-reader" style="width: 100%; border-radius: 12px; overflow: hidden; border: 2px solid #e2e8f0; min-height: 250px; background: #1e293b;"></div><div class="scanner-controls" style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;"><button class="btn-scanner-action" style="padding: 12px; border-radius: 12px; border: none; background: #f1f5f9; color:#0f172a; font-weight: bold; cursor: pointer; flex: 1;" onclick="toggleCameraFacing()">🔄 Balik Kamera</button><button class="btn-scanner-action" id="btnFlashlight" style="padding: 12px; border-radius: 12px; border: none; background: #f1f5f9; color:#0f172a; font-weight: bold; cursor: pointer; flex: 1;" onclick="toggleFlashlight()">🔦 Senter</button></div></div>`; document.body.appendChild(modal); isFlashlightOn = false; startScanner(); }
function startScanner() { if(html5QrCode) { html5QrCode.stop().catch(e=>console.log(e)); html5QrCode = null; } html5QrCode = new Html5Qrcode("qr-reader"); let config = { fps: 10, qrbox: { width: 220, height: 220 } }; html5QrCode.start({ facingMode: currentCameraFacing }, config, (decodedText) => { const now = Date.now(); if (now - lastScanTime < 1500) return; lastScanTime = now; let scanResult = decodedText.trim(); try { if ("vibrate" in navigator) navigator.vibrate([200]); } catch(e){} if (isBulkMode) { const foundItem = allItems.find(i => (i.kode_barang||"").toString().toLowerCase() === scanResult.toLowerCase() || (i.kode_wadah||"").toString().toLowerCase() === scanResult.toLowerCase()); if (foundItem) { if (!selectedRows.has(foundItem.row_index)) { selectedRows.add(foundItem.row_index); document.getElementById("bulkCount").innerText = `${selectedRows.size} Terpilih`; applyFilters(); showToast(`✅ ${foundItem.nama_barang} ditambahkan!`); } else { showToast(`⚠️ ${foundItem.nama_barang} sudah terpilih!`); } } else { try { if ("vibrate" in navigator) navigator.vibrate([300, 100, 300]); } catch(e){} showToast(`❌ Kode [${scanResult}] tidak ada di database!`, false); } } else { closeScannerModal(); const searchBox = document.getElementById('searchInput'); if(searchBox) { searchBox.value = scanResult; setFilterPill('all', document.querySelector('.pill-btn[data-filter="all"]')); applyFilters(); const foundItem = allItems.find(i => (i.kode_barang||"").toString().toLowerCase() === scanResult.toLowerCase() || (i.kode_wadah||"").toString().toLowerCase() === scanResult.toLowerCase()); if (foundItem) { setTimeout(() => openDetailModal(foundItem), 300); } else { showToast(`❌ Barang [${scanResult}] tidak ditemukan!`, false); } } } }, (errorMessage) => { } ).catch(err => { alert("Gagal membuka kamera: " + err); closeScannerModal(); }); }
function toggleCameraFacing() { currentCameraFacing = currentCameraFacing === "environment" ? "user" : "environment"; showToast("Mengganti kamera...", true); if (html5QrCode) { html5QrCode.stop().then(() => { setTimeout(startScanner, 300); }).catch(err => console.log(err)); } }
function toggleFlashlight() { if (!html5QrCode) return; isFlashlightOn = !isFlashlightOn; html5QrCode.applyVideoConstraints({ advanced: [{ torch: isFlashlightOn }] }).then(() => { document.getElementById("btnFlashlight").style.background = isFlashlightOn ? "#fef08a" : "#f1f5f9"; }).catch(err => { showToast("Senter tidak didukung.", false); isFlashlightOn = false; document.getElementById("btnFlashlight").style.background = "#f1f5f9"; }); }
function closeScannerModal() { if (html5QrCode) { html5QrCode.stop().catch(e=>console.log(e)); html5QrCode = null; } const m = document.getElementById("tempScannerModal"); if(m) m.remove(); }
