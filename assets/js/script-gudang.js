// ==========================================
// MESIN LOGIKA GUDANG (V.28.0 - FILTER LANJUTAN FIXED & UTUH)
// ==========================================

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxm4eJGQjBytrLTQgYrsfEXIQxLQ_Rq7NFVM__Y8AhRfzPe8q5FJhofecqrDJ5ywkeBEg/exec"; 

// HANYA ADMIN GUDANG DAN MASTER DEV
const VALID_PINS = ["a1b2c3", "v9t6c2"];
let allItems = []; let optionsData = { lokasi: [], tim: [] }; let userPin = localStorage.getItem("AV_INVENTORY_PIN") || ""; 
let html5QrCode = null; // Ganti ke object html5QrCode murni
let isAdminMode = false, isBulkMode = false, selectedRows = new Set(), lastScanTime = 0, activeFilterPill = 'all', currentViewMode = 'grid'; 
let pendingAddFotos = [];
let currentCameraFacing = "environment"; 
let isFlashlightOn = false;

window.onload = () => { checkAdminStatus(); loadData(); };

function checkAdminStatus() { if (userPin && VALID_PINS.includes(userPin)) { isAdminMode = true; document.body.classList.add("admin-mode-active"); document.getElementById("modeStatusText").innerHTML = "🔴 Admin Mode"; document.getElementById("btnUnlock").innerText = "🔓 Tutup Akses"; } else { isAdminMode = false; userPin = ""; document.body.classList.remove("admin-mode-active"); document.getElementById("modeStatusText").innerHTML = "🟢 Read-Only Mode"; document.getElementById("btnUnlock").innerText = "🔒 Buka Akses"; } }
function toggleAdminMode() { if (isAdminMode) { if(confirm("Tutup akses Admin? Memori PIN dihapus.")) { localStorage.removeItem("AV_INVENTORY_PIN"); userPin = ""; checkAdminStatus(); showToast("Mode Read-Only aktif."); applyFilters(); } } else { let input = prompt("Masukkan PIN Kapten / Admin Gudang:"); if (input) { let pinAttempt = input.trim().toLowerCase(); if (VALID_PINS.includes(pinAttempt)) { userPin = pinAttempt; localStorage.setItem("AV_INVENTORY_PIN", userPin); checkAdminStatus(); showToast("Akses Admin Terbuka!"); applyFilters(); } else { alert("⛔ AKSES DITOLAK! PIN tidak punya izin ke Gudang."); } } } }
function showToast(msg, isSuccess = true) { const t = document.getElementById("toastMsg"); if(!t) return; t.innerText = msg; t.className = "toast-msg show " + (isSuccess ? "toast-success" : "toast-error"); setTimeout(() => { t.classList.remove("show"); }, 4000); }

// 🔊 HAPTIC & AUDIO ENGINE (Dari Mission Control)
function triggerFeedback(type) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        if (type === 'success') {
            osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime);
            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            osc.start(); osc.stop(ctx.currentTime + 0.1);
            if(navigator.vibrate) navigator.vibrate(100);
        } else {
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, ctx.currentTime);
            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            osc.start(); osc.stop(ctx.currentTime + 0.3);
            if(navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]);
        }
    } catch(e) { console.log("Audio API not supported"); }
}

async function loadData() { try { document.getElementById("loading").style.display = "block"; const res = await fetch(SCRIPT_URL + "?action=api&nocache=" + new Date().getTime()); const data = await res.json(); allItems = (data.inventory || []).filter(item => item.nama_barang && item.nama_barang.toString().trim().toLowerCase() !== 'nama barang'); optionsData = data.dropdowns || { lokasi: [], tim: [] }; document.getElementById("loading").style.display = "none"; setupStickyHeader(); applyFilters(); } catch (e) { document.getElementById("loading").innerHTML = `<span style="color:red;">Gagal memuat data. Periksa koneksi internet.</span>`; } }

// 🌟 STICKY HEADER GUDANG
function setupStickyHeader() {
    let toolbar = document.querySelector(".toolbar-card");
    if(toolbar) {
        toolbar.style.position = "sticky";
        toolbar.style.top = "60px"; // Di bawah navbar
        toolbar.style.zIndex = "90";
        toolbar.style.background = "rgba(255, 255, 255, 0.95)";
        toolbar.style.backdropFilter = "blur(8px)";
        toolbar.style.padding = "10px";
        toolbar.style.margin = "0 -15px 15px -15px"; // Buat full width
        toolbar.style.borderBottom = "1px solid #e2e8f0";
        toolbar.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.05)";
        
        // Tambahkan Filter Dosa (Load-Out) - Diperbaiki agar warna berfungsi
        let pillsWrapper = document.querySelector(".filter-pills-wrapper");
        if(pillsWrapper && !pillsWrapper.innerHTML.includes("Di Lokasi Event")) {
            pillsWrapper.insertAdjacentHTML('beforeend', `<button class="pill-btn" data-filter="Di Lokasi Event" onclick="setFilterPill('Di Lokasi Event', this)" style="border-color:#f59e0b; color:#b45309; background:#fffbeb;">⚠️ Di Lokasi Event</button>`);
        }
    }
}

function toggleViewMode() { const btn = document.getElementById("btnViewToggle"); if (currentViewMode === 'grid') { currentViewMode = 'list'; btn.innerHTML = '🖼️ Grid View'; document.getElementById("dataContainer").className = "list-view-container"; } else { currentViewMode = 'grid'; btn.innerHTML = '📄 List View'; document.getElementById("dataContainer").className = "grid-cards"; } applyFilters(); }

function setFilterPill(status, btnElement) { 
    activeFilterPill = status; 
    document.querySelectorAll('.pill-btn').forEach(btn => btn.classList.remove('active')); 
    btnElement.classList.add('active'); 
    applyFilters(); 
}

// 🧠 MESIN FILTER UTAMA (Diperbarui untuk mengakomodasi Laci Lanjutan)
function getFilteredData() { 
    const q = document.getElementById("searchInput").value.toLowerCase(); 
    
    // BACA STATUS FILTER LANJUTAN
    const panelFilter = document.getElementById('panelFilterLanjutan');
    const isAdvancedOpen = panelFilter && panelFilter.style.display === 'block';
    let timAktif = [];
    let statusAktif = [];

    if (isAdvancedOpen) {
        timAktif = Array.from(document.querySelectorAll('.cek-tim:checked')).map(cb => cb.value.toLowerCase());
        statusAktif = Array.from(document.querySelectorAll('.cek-status:checked')).map(cb => cb.value);
    }

    return allItems.filter(i => { 
        const matchQ = i.nama_barang.toLowerCase().includes(q) || (i.kode_barang||"").toLowerCase().includes(q) || (i.kode_wadah||"").toLowerCase().includes(q); 
        let stat = i.status_digunakan || 'Di Gudang'; if(stat === 'FALSE') stat = 'Di Gudang'; 
        let lok = i.lokasi || '';
        let kategoriBarang = (i.kategori || i.tim || i.nama_barang || "").toLowerCase();
        
        let matchPill = false;
        if (activeFilterPill === 'all') matchPill = true;
        else if (activeFilterPill === 'Rusak') { matchPill = (i.kondisi === 'Rusak' || i.kondisi === 'Periksa'); }
        else if (activeFilterPill === 'Di Lokasi Event') { matchPill = (lok === 'Di Lokasi Event'); } 
        else matchPill = (stat === activeFilterPill);
        
        // LOGIKA FILTER LANJUTAN (Bekerja secara bersamaan)
        let matchAdvanced = true;
        if (isAdvancedOpen) {
            let matchTim = timAktif.length === 0 || timAktif.some(t => kategoriBarang.includes(t));
            let matchStatus = statusAktif.length === 0;
            if (!matchStatus) {
                if (statusAktif.includes('Gudang') && stat === 'Di Gudang') matchStatus = true;
                if (statusAktif.includes('Akan Dibawa') && stat === 'Akan Dibawa') matchStatus = true;
                if (statusAktif.includes('Lokasi Event') && lok === 'Di Lokasi Event') matchStatus = true;
            }
            matchAdvanced = matchTim && matchStatus;
        }

        return matchQ && matchPill && matchAdvanced; 
    }); 
}

function applyFilters() { render(getFilteredData()); }

// PERBAIKAN WARNA KARTU BADGE UNTUK DI LOKASI EVENT
function getStatusClass(status, lokasi) { 
    if(lokasi === 'Di Lokasi Event') return 'badge-status status-lokasi'; 
    if(status === 'Akan Dibawa') return 'badge-status status-keranjang'; 
    if(status === 'Sedang Dipakai') return 'badge-status status-dipakai'; 
    if(status.includes('Perjalanan')) return 'badge-status status-perjalanan'; 
    return 'badge-status status-gudang'; 
}

function render(data) {
    const container = document.getElementById("dataContainer"); container.innerHTML = "";
    data.forEach(item => {
        const card = document.createElement("div"); const isSelected = selectedRows.has(item.row_index); let stat = item.status_digunakan || "Di Gudang"; if(stat === 'FALSE') stat = "Di Gudang"; let lok = item.lokasi || "Gudang KC (SMG)";
        let badgeLokasiHtml = (lok.toLowerCase().includes("gudang") && stat === "Di Gudang") ? `<span class="badge-status status-gudang" style="display:inline-block; margin-top:4px; padding:3px 8px;">🏢 ${lok}</span>` : `<span class="badge-status status-lokasi" style="display:inline-block; margin-top:4px; margin-right:4px; padding:3px 8px;">📍 ${lok}</span><span class="${getStatusClass(stat, lok)}" style="display:inline-block; margin-top:4px; padding:3px 8px;">${stat}</span>`;
        let safeFileIds = item.file_ids || item.fotos || []; let firstFileId = safeFileIds.find(id => id && id.length > 5); let imageSrc = 'https://placehold.co/300x300/EEEEEE/999999?text=NO+IMAGE'; if (firstFileId) { imageSrc = firstFileId.includes("http") ? firstFileId : `https://drive.google.com/thumbnail?id=${firstFileId}&sz=w400`; }
        const kodeBadge = item.kode_barang ? `<span style="color:#ea580c; font-weight:900;">#${item.kode_barang}</span>` : ""; const timeBadge = item.timestamp ? `<div style="font-size:9px; color:gray; margin-bottom:6px;">⏱️ Update: ${item.timestamp}</div>` : "";
        let colorKondisi = item.kondisi && item.kondisi.toLowerCase() === 'bagus' ? '#16a34a' : '#dc2626'; let bgKondisi = item.kondisi && item.kondisi.toLowerCase() === 'bagus' ? '#f0fdf4' : '#fef2f2'; const kondisiBadge = `<span style="font-size:10px; padding:2px 6px; border-radius:4px; border:1px solid ${colorKondisi}; background:${bgKondisi}; color:${colorKondisi}; font-weight:bold; margin-left:6px;">${item.kondisi || 'Bagus'}</span>`;
        
        // Tambahkan Ikon Box jika dia merupakan isi dari Hardcase
        const boxBadge = item.kode_wadah ? `<span style="font-size:10px; color:#d97706; background:#fef3c7; border-radius:4px; padding:2px 6px; margin-left:6px; border:1px solid #fde68a;">🧰 IN-BOX</span>` : "";

        if (currentViewMode === 'grid') { card.className = "mission-card " + (isSelected ? "selected " : "") + (stat === 'Akan Dibawa' ? "card-siap-dibawa " : ""); card.innerHTML = `${isSelected ? '<div class="card-check">✓</div>' : ''}<div style="position:relative;"><img src="${imageSrc}" class="card-img" loading="lazy"><div style="position:absolute; bottom:12px; right:4px;"><span class="badge-qty">Qty: ${item.jumlah || 0}</span></div></div><h4 class="card-title">${item.nama_barang}</h4>${timeBadge} <div class="card-codes" style="display:flex; align-items:center; flex-wrap:wrap; gap:4px;">${kodeBadge} ${kondisiBadge} ${boxBadge}</div> <div>${badgeLokasiHtml}</div>`;
        } else { card.className = "list-item " + (isSelected ? "selected " : "") + (stat === 'Akan Dibawa' ? "card-siap-dibawa " : ""); card.innerHTML = `${isSelected ? '<div class="card-check" style="top:50%; transform:translateY(-50%); right:15px;">✓</div>' : ''}<img src="${imageSrc}" class="list-img" loading="lazy"><div class="list-info"><h4 class="list-title">${item.nama_barang}</h4>${timeBadge}<div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center; font-size:10px;">${kodeBadge} ${kondisiBadge} ${boxBadge} ${badgeLokasiHtml} <span class="badge-qty">Qty: ${item.jumlah || 0}</span></div></div>`; }
        card.onclick = () => { if (isBulkMode) toggleSelection(item.row_index); else openDetailModal(item); }; container.appendChild(card);
    });
}
function openZoomModal(imgUrl) { document.getElementById("zoomImgSrc").src = imgUrl; document.getElementById("zoomModal").classList.add("active"); }
function closeZoomModal() { document.getElementById("zoomModal").classList.remove("active"); setTimeout(() => { document.getElementById("zoomImgSrc").src = ""; }, 300); }

/// ==========================================
// POP-UP DETAIL (THUMBNAIL WADAH + AUTO-TRACK)
// ==========================================
function openDetailModal(item) {
    const oldModal = document.getElementById("detailModal"); if(oldModal) oldModal.remove();
    let stat = item.status_digunakan || "Di Gudang"; if(stat === 'FALSE') stat = "Di Gudang"; let lok = item.lokasi || "Gudang KC (SMG)";
    let galleryHtml = `<div class="detail-gallery">`; let adaFoto = false; let safeFileIds = item.file_ids || item.fotos || [];
    safeFileIds.forEach((fileId, i) => { if(fileId && fileId.length > 5) { let thumbUrl = fileId.includes("http") ? fileId : `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`; let highResUrl = fileId.includes("http") ? fileId.replace('sz=800', 'sz=s2000') : `https://drive.google.com/thumbnail?id=${fileId}&sz=s2000`; if(i < 3) { galleryHtml += `<img src="${thumbUrl}" class="gallery-img" onclick="openZoomModal('${highResUrl}')">`; } else { galleryHtml += `<div class="gallery-box"><img src="${thumbUrl}" class="gallery-img" style="border:2px solid #ea580c;" onclick="openZoomModal('${highResUrl}')"><span class="badge-wadah">📦 WADAH</span></div>`; } adaFoto = true; } });
    if(!adaFoto) galleryHtml += `<img src="https://placehold.co/300x200/EEEEEE/999999?text=Tidak+Ada+Foto" class="gallery-img" style="width:100%;">`; galleryHtml += `</div>`;
    
    let badgeWadahHtml = item.kode_wadah ? `<span onclick="document.getElementById('detailModal').remove(); document.getElementById('searchInput').value='${item.kode_wadah}'; applyFilters();" style="cursor:pointer; display:inline-block; margin-left:5px; background:#fef3c7; color:#d97706; padding:2px 8px; border-radius:4px; border:1px solid #fde68a;">🧰 Lihat Wadah: ${item.kode_wadah} 🔍</span>` : `<span style="color:gray; margin-left:5px;">📦 Wadah: -</span>`;
    
    // 💡 PERBAIKAN: SUB-WADAH MENGGUNAKAN THUMBNAIL
    let isiWadahHtml = ""; 
    if (item.kode_barang) { 
        let isiWadah = allItems.filter(i => i.kode_wadah && i.kode_wadah.toLowerCase() === item.kode_barang.toLowerCase()); 
        if (isiWadah.length > 0) { 
            let listHtml = isiWadah.map(w => {
                let safeFileIdsW = w.file_ids || w.fotos || []; 
                let firstFileIdW = safeFileIdsW.find(id => id && id.length > 5); 
                let thumbW = firstFileIdW ? (firstFileIdW.includes("http") ? firstFileIdW : `https://drive.google.com/thumbnail?id=${firstFileIdW}&sz=w100`) : 'https://placehold.co/100x100/EEEEEE/999999?text=NO+IMG';
                return `
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px; padding:6px; background:#fff; border:1px solid #dcfce7; border-radius:6px; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,0.05);" onclick="document.getElementById('searchInput').value='${w.kode_barang}'; applyFilters(); document.getElementById('detailModal').remove();">
                    <img src="${thumbW}" style="width:45px; height:45px; object-fit:cover; border-radius:6px; border:1px solid #e2e8f0;">
                    <div style="flex:1; line-height:1.2;">
                        <div style="font-size:11px; font-weight:bold; color:#1e293b;">${w.nama_barang}</div>
                        <div style="font-size:10px; color:#ea580c; font-weight:bold; margin-top:2px;">#${w.kode_barang || '-'} <span style="color:#64748b; font-weight:normal;">• Qty: ${w.jumlah||0}</span></div>
                    </div>
                </div>`;
            }).join('');
            isiWadahHtml = `<div style="text-align:left; margin-top:10px; background:#f0fdf4; padding:10px; border-radius:8px; border:1px solid #bbf7d0;"><div style="font-size:11px; font-weight:bold; color:#16a34a; margin-bottom:8px;">🧰 Isi di dalam wadah ini (${isiWadah.length} jenis):</div>${listHtml}</div>`; 
        } 
    }
    
    // 💡 FITUR BARU: AUTO-TRACK STOK BARANG SEJENIS
    let similarItems = allItems.filter(i => i.nama_barang.toLowerCase() === item.nama_barang.toLowerCase());
    let totalSimilarQty = similarItems.reduce((sum, curr) => sum + (parseInt(curr.jumlah) || 1), 0);
    let statusCounts = {};
    similarItems.forEach(i => {
        let s = (i.status_digunakan && i.status_digunakan !== 'FALSE') ? i.status_digunakan : "Di Gudang";
        statusCounts[s] = (statusCounts[s] || 0) + (parseInt(i.jumlah) || 1);
    });
    
    let similarHtml = "";
    if (similarItems.length > 1 || totalSimilarQty > 1) {
        let badgeHtml = Object.keys(statusCounts).map(status => {
            let bgCol = status.includes('Gudang') ? '#dcfce7' : (status.includes('Dipakai') || status.includes('Event') ? '#fef08a' : '#e2e8f0');
            let txtCol = status.includes('Gudang') ? '#166534' : (status.includes('Dipakai') || status.includes('Event') ? '#854d0e' : '#334155');
            return `<span style="display:inline-block; margin-right:4px; margin-bottom:4px; padding:4px 8px; border-radius:6px; font-size:10px; background:${bgCol}; color:${txtCol}; font-weight:bold; border:1px solid #cbd5e1;">${status}: ${statusCounts[status]}</span>`;
        }).join('');
        
        similarHtml = `
        <div style="text-align:left; margin-top:10px; background:#eff6ff; padding:12px; border-radius:8px; border:1px solid #bfdbfe;">
            <div style="font-size:12px; font-weight:900; color:#1d4ed8; margin-bottom:4px;">📊 Cek Silang Stok '${item.nama_barang}':</div>
            <div style="font-size:11px; color:#1e293b; margin-bottom:8px;">Sistem mendeteksi ada total <b>${totalSimilarQty} Pcs</b> alat ini di database. Berikut sebarannya:</div>
            <div style="display:flex; flex-wrap:wrap;">${badgeHtml}</div>
        </div>`;
    }

    let logHtml = `<div style="text-align:left; margin-top:10px; background:#f1f5f9; padding:8px; border-radius:6px; font-size:10px; color:#475569; max-height:80px; overflow-y:auto; white-space:pre-wrap; border:1px solid #cbd5e1;"><b>📜 Histori Log:</b><br>${item.log || 'Belum ada histori.'}</div>`;

    let optionsLokasi = `<option value="Gudang KC (SMG)" ${lok.includes('Gudang') ? 'selected':''}>🏢 Gudang KC (SMG)</option><option value="Gudang KC (JKT)" ${lok === 'Gudang KC (JKT)' ? 'selected':''}>🏢 Gudang KC (JKT)</option><option value="Gedung UTC" ${lok === 'Gedung UTC' ? 'selected':''}>🏢 Gedung UTC</option><option value="Dalam Perjalanan" ${lok === 'Dalam Perjalanan' ? 'selected':''}>🚚 Dalam Perjalanan</option><option value="Di Lokasi Event" ${lok === 'Di Lokasi Event' ? 'selected':''}>📍 Di Lokasi Event</option>`; 
    let optionsStatus = `<option value="Di Gudang" ${stat === 'Di Gudang' ? 'selected':''}>📦 Standby / Di Gudang</option><option value="Akan Dibawa" ${stat === 'Akan Dibawa' ? 'selected':''}>🛒 Akan Dibawa (Packing)</option><option value="Sedang Dipakai" ${stat === 'Sedang Dipakai' ? 'selected':''}>🔌 Sedang Dipakai / Aktivasi</option><option value="Sedang Diservis" ${stat === 'Sedang Diservis' ? 'selected':''}>🛠️ Sedang Diservis</option>`;
    
    let actionButtons = isAdminMode ? `<button onclick='openEditFullModal(${JSON.stringify(item).replace(/'/g, "&#39;")})' style="width:100%; padding:10px; background:#f59e0b; color:white; border:none; border-radius:8px; font-weight:bold; margin-bottom:15px;">✏️ EDIT DATA & FOTO LENGKAP</button><div style="text-align:left; border-top:1px dashed #ccc; padding-top:15px;"><label style="font-size:11px; font-weight:bold; color:gray; display:block; margin-bottom:4px;">📍 Update Lokasi (Cell O):</label><select id="editLokasi" style="width:100%; padding:8px; border-radius:8px; border:1px solid #ccc; margin-bottom:12px;">${optionsLokasi}</select><label style="font-size:11px; font-weight:bold; color:gray; display:block; margin-bottom:4px;">🔌 Update Status (Cell R):</label><select id="editStatus" style="width:100%; padding:8px; border-radius:8px; border:1px solid #ccc; margin-bottom:12px; font-weight:bold;">${optionsStatus}</select><button onclick="saveEditLokasiStatus(${item.row_index})" style="width:100%; padding:12px; background:#ea580c; color:white; border:none; border-radius:8px; font-weight:bold;">💾 SIMPAN STATUS</button></div>` : `<div style="margin-top:15px; padding:10px; background:#f1f5f9; border-radius:8px; font-size:12px; color:#64748b;">🔒 Login Akses untuk mengubah status/lokasi.</div>`;
    
    const modalHtml = `<div id="detailModal" class="modal-overlay active"><div class="modal-content" style="max-width:400px; background:white; padding:20px; border-radius:15px; text-align:center; position:relative;"><button onclick="document.getElementById('detailModal').remove()" style="position:absolute; top:15px; right:15px; border:none; background:#f1f5f9; width:30px; height:30px; border-radius:50%; font-weight:bold; cursor:pointer; z-index:10;">✕</button>${galleryHtml}<h3 style="margin:0; font-weight:900; color:#1e293b; font-size:18px;">${item.nama_barang}</h3><div style="font-size:10px; color:gray; margin-bottom:8px;">⏱️ Update: ${item.timestamp || '-'}</div><p style="margin:5px 0 10px 0; font-size:12px; color:#ea580c; font-weight:bold;">#${item.kode_barang || '-'} ${badgeWadahHtml}</p><div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px; text-align:left; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0;"><div><span style="color:gray;">Item Ini:</span> <br><b>${item.jumlah || 0} Pcs</b></div><div><span style="color:gray;">Kondisi:</span> <br><b>${item.kondisi || '-'}</b></div><div><span style="color:gray;">📍 Lokasi:</span> <br><b>${lok}</b></div><div><span style="color:gray;">🔌 Status:</span> <br><b>${stat}</b></div></div>${similarHtml}${isiWadahHtml}<div style="text-align:left; margin-top:10px; font-size:11px; color:#475569; background:#fff7ed; padding:8px; border-radius:6px; border:1px solid #fed7aa; margin-bottom:5px;"><b>📝 Ket:</b> ${item.keterangan_ref || 'Tidak ada catatan.'}</div><div style="text-align:left; font-size:11px; margin-bottom:15px; color:#3b82f6;"><b>🎯 Tujuan (Event):</b> ${item.tujuan || '-'}</div>${logHtml}${actionButtons}</div></div>`; 
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}
// ==========================================
// PRINT SURAT JALAN / MANIFEST (CHECKLIST WADAH)
// ==========================================
function printSuratJalan() { 
    let bawaData = allItems.filter(i => i.status_digunakan === 'Akan Dibawa'); 
    if(bawaData.length === 0) return alert("Belum ada barang dengan status '🛒 Akan Dibawa' (Packing)."); 
    
    let eventName = bawaData[0].tujuan || "____________________"; 
    
    // 🧠 LOGIKA PENGELOMPOKKAN WADAH
    let grouped = {};
    let lepasan = [];
    
    bawaData.forEach(item => {
        let wadah = (item.kode_wadah || "").toUpperCase().trim();
        if (wadah) {
            if (!grouped[wadah]) grouped[wadah] = [];
            grouped[wadah].push(item);
        } else {
            lepasan.push(item);
        }
    });

    let printWin = window.open('', '', 'width=800,height=800'); 
    
    // 🎨 TEMPLATE HTML SURAT JALAN (Gaya Checklist Loading)
    let html = `
    <html><head><title>Manifest - ${eventName}</title>
    <style>
        body { font-family: 'Arial', sans-serif; padding: 20px; color: #000; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .event-info { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 20px; }
        
        .box-group { border: 2px solid #000; border-radius: 6px; margin-bottom: 15px; page-break-inside: avoid; }
        .box-header { background: #f0f0f0; padding: 10px 15px; font-weight: bold; font-size: 14px; display: flex; align-items: center; border-bottom: 2px solid #000; }
        
        .checkbox { display: inline-block; width: 18px; height: 18px; border: 2px solid #000; border-radius: 4px; margin-right: 12px; }
        .item-list { list-style: none; padding: 0; margin: 0; }
        .item-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 15px; border-bottom: 1px dashed #aaa; font-size: 13px; margin-left: 20px;}
        .item-row:last-child { border-bottom: none; }
        
        .qty { font-weight: bold; font-size: 14px; }
        .signatures { display: flex; justify-content: space-between; margin-top: 50px; padding: 0 40px; text-align: center; font-size: 14px; page-break-inside: avoid; }
        .sign-box { margin-top: 70px; border-top: 1px solid black; padding-top: 5px; width: 220px; }
        
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
    </head><body onload="window.print()">
    
    <div class="header">
        <h2 style="margin:0;">MANIFEST LOGISTIK / SURAT JALAN</h2>
        <p style="margin:5px 0 0 0; color:#444; font-size:14px;">Checklist Pengeluaran Gudang (Load-In)</p>
    </div>
    
    <div class="event-info">
        <div><b>Tujuan / Event:</b> <span style="font-size:16px;">${eventName.toUpperCase()}</span></div>
        <div><b>Tanggal Cetak:</b> ${new Date().toLocaleString('id-ID')}</div>
    </div>`;

    // 1. RENDER WADAH / HARDCASE
    if (Object.keys(grouped).length > 0) {
        html += `<h4 style="margin-bottom:10px; border-bottom:2px solid #000; display:inline-block;">📦 PAKET HARDCASE / BOX</h4>`;
        for (let wadah in grouped) {
            let boxItem = allItems.find(i => i.kode_barang && i.kode_barang.toUpperCase() === wadah);
            let boxName = boxItem ? boxItem.nama_barang.toUpperCase() : `WADAH #${wadah}`;
            
            html += `
            <div class="box-group">
                <div class="box-header">
                    <div class="checkbox"></div> 🧰 ${boxName} 
                    <span style="margin-left:auto; font-weight:normal; font-size:12px; color:#333;">#${wadah}</span>
                </div>
                <ul class="item-list">`;
            
            // Isi detail di dalam wadah
            grouped[wadah].forEach(item => {
                html += `
                    <li class="item-row">
                        <span>- ${item.nama_barang} ${item.kode_barang ? ` <i style="color:#555; font-size:11px;">(#${item.kode_barang})</i>` : ''}</span>
                        <span class="qty">${item.jumlah} Pcs</span>
                    </li>`;
            });
            
            html += `</ul></div>`;
        }
    }

    // 2. RENDER BARANG LEPASAN (TIDAK ADA WADAH)
    if (lepasan.length > 0) {
        html += `<h4 style="margin-top:20px; margin-bottom:10px; border-bottom:2px solid #000; display:inline-block;">📌 BARANG LEPASAN (TANPA BOX)</h4>`;
        html += `<div class="box-group"><ul class="item-list">`;
        lepasan.forEach(item => {
            html += `
                <li class="item-row" style="padding:10px 15px; margin-left:0;">
                    <div style="display:flex; align-items:center;">
                        <div class="checkbox"></div> 
                        <span><b>${item.nama_barang.toUpperCase()}</b> ${item.kode_barang ? ` <i style="color:#555; font-size:11px;">(#${item.kode_barang})</i>` : ''}</span>
                    </div>
                    <span class="qty">${item.jumlah} Pcs</span>
                </li>`;
        });
        html += `</ul></div>`;
    }

    html += `
    <div class="signatures">
        <div>
            <b>Disiapkan Oleh (Gudang):</b>
            <div class="sign-box">( Nama & Tanda Tangan )</div>
        </div>
        <div>
            <b>Dicek & Dimuat Oleh (Loader):</b>
            <div class="sign-box">( Nama & Tanda Tangan )</div>
        </div>
    </div>
    
    </body></html>`;

    printWin.document.write(html); 
    printWin.document.close(); 
}
// ==========================================
// KERANJANG & BULK UPDATE 
// ==========================================
function toggleBulkMode() { isBulkMode = !isBulkMode; let bar = document.getElementById("bulkBar"); if(!bar) { document.body.insertAdjacentHTML('beforeend', `<div id="bulkBar" class="bulk-bar" style="position:fixed; bottom:0; left:0; width:100%; background:#1e293b; color:white; padding:15px; z-index:99; display:none; justify-content:space-between; align-items:center;"><span id="bulkCount" class="bulk-info" style="font-weight:bold;">0 Terpilih</span><div style="display:flex; gap:8px;"><button onclick="selectAllVisible()" style="background:#e2e8f0; color:#334155; border:none; padding:8px 12px; border-radius:8px; font-weight:bold; font-size:12px;">☑️ Semua</button><button onclick="openBulkUpdateModal()" class="btn-bulk-process" style="padding:8px 12px; font-size:12px; background:#ea580c; color:white; border:none; border-radius:8px; font-weight:bold;">Ubah Massal</button></div></div>`); bar = document.getElementById("bulkBar"); } const btnMode = document.getElementById("btnBulkMode"); if (isBulkMode) { btnMode.innerHTML = `❌ Batal Massal`; btnMode.style.background = "#ef4444"; bar.style.display = "flex"; } else { btnMode.innerHTML = `🛒 Mode Massal`; btnMode.style.background = "#ea580c"; bar.style.display = "none"; selectedRows.clear(); document.getElementById("bulkCount").innerText = `0 Terpilih`; } applyFilters(); }
function toggleSelection(rowIndex) { if (selectedRows.has(rowIndex)) selectedRows.delete(rowIndex); else selectedRows.add(rowIndex); document.getElementById("bulkCount").innerText = `${selectedRows.size} Terpilih`; applyFilters(); }
function selectAllVisible() { getFilteredData().forEach(item => selectedRows.add(item.row_index)); document.getElementById("bulkCount").innerText = `${selectedRows.size} Terpilih`; applyFilters(); }

function openBulkUpdateModal() { 
    if (selectedRows.size === 0) { alert("Pilih minimal 1 barang!"); return; } 
    const modalHtml = `<div id="bulkModal" class="modal-overlay active"><div class="modal-content" style="max-width:350px; padding:20px; background:white; border-radius:15px; position:relative;"><button onclick="document.getElementById('bulkModal').remove()" style="position:absolute; top:15px; right:15px; border:none; background:#f1f5f9; width:30px; height:30px; border-radius:50%; font-weight:bold;">✕</button><h3 style="margin-top:0;">Ubah Massal (${selectedRows.size} Alat)</h3>
    <div style="text-align:left; margin-bottom:12px;"><label style="font-size:11px; font-weight:bold; color:gray; display:block; margin-bottom:4px;">🎯 Nama Event / Tujuan (Kolom P):</label><input type="text" id="bulkNewTujuan" placeholder="Biarkan kosong jika tidak diubah..." style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc; font-weight:bold;"></div>
    <div style="text-align:left; margin-bottom:12px;"><label style="font-size:11px; font-weight:bold; color:gray; display:block; margin-bottom:4px;">📍 Ubah Lokasi (Kolom O):</label><select id="bulkNewLokasi" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc; font-weight:bold;"><option value="TETAP">-- Jangan Ubah Lokasi --</option><option value="Gudang KC (SMG)">🏢 Gudang KC (SMG)</option><option value="Gudang KC (JKT)">🏢 Gudang KC (JKT)</option><option value="Gedung UTC">🏢 Gedung UTC</option><option value="Dalam Perjalanan">🚚 Dalam Perjalanan</option><option value="Di Lokasi Event">📍 Di Lokasi Event</option></select></div>
    <div style="text-align:left; margin-bottom:15px;"><label style="font-size:11px; font-weight:bold; color:gray; display:block; margin-bottom:4px;">🔌 Ubah Status (Kolom R):</label><select id="bulkNewStatus" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc; font-weight:bold;"><option value="TETAP">-- Jangan Ubah Status --</option><option value="Akan Dibawa">🛒 Akan Dibawa (Packing)</option><option value="Sedang Dipakai">🔌 Sedang Dipakai / Aktivasi</option><option value="Di Gudang">📦 Standby / Di Gudang</option></select></div>
    <button onclick="processBulkUpdate(this)" style="width:100%; padding:12px; background:#ea580c; color:white; border:none; border-radius:8px; font-weight:bold;">PROSES UPDATE MASSAL</button></div></div>`; document.body.insertAdjacentHTML('beforeend', modalHtml); 
}

async function processBulkUpdate(btn) { const newLokasi = document.getElementById("bulkNewLokasi").value; const newStatus = document.getElementById("bulkNewStatus").value; const newTujuan = document.getElementById("bulkNewTujuan").value; if (newLokasi === "TETAP" && newStatus === "TETAP" && newTujuan === "") { alert("Isi atau pilih minimal satu perubahan!"); return; } btn.disabled = true; btn.innerText = "MEMPROSES... (JANGAN DITUTUP)"; try { const payload = { action: "update_status_lokasi", pin: userPin, rows: Array.from(selectedRows), new_lokasi: newLokasi !== "TETAP" ? newLokasi : null, new_status: newStatus !== "TETAP" ? newStatus : null, new_tujuan: newTujuan || "TETAP" }; const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) }); const data = await response.json(); if(data.status === "success") { document.getElementById('bulkModal').remove(); toggleBulkMode(); loadData(); showToast("✅ Update massal berhasil!"); } else { alert("Gagal:\n" + data.message); } } catch (e) { alert("Error Sistem:\n" + e.message); } finally { btn.disabled = false; btn.innerText = "PROSES UPDATE MASSAL"; } }

// ==========================================
// FORM TAMBAH / EDIT
// ==========================================
function openAddModal() { if(!isAdminMode) return; document.getElementById("formAdd").reset(); pendingAddFotos = []; renderPreviewAddFotos(); document.getElementById("modalAdd").classList.add("active"); }
function closeAddModal() { document.getElementById("modalAdd").classList.remove("active"); }
function handleNewFotos(input) { if (!input.files || input.files.length === 0) return; for (let i = 0; i < input.files.length; i++) { if (pendingAddFotos.length < 3) pendingAddFotos.push(input.files[i]); } input.value = ""; renderPreviewAddFotos(); }
function removeAddFoto(index) { pendingAddFotos.splice(index, 1); renderPreviewAddFotos(); }
function renderPreviewAddFotos() { const container = document.getElementById("previewAddFotos"); container.innerHTML = ""; if (pendingAddFotos.length === 0) { container.innerHTML = `<span style="font-size:11px; color:gray;">Belum ada foto terpilih.</span>`; return; } pendingAddFotos.forEach((file, index) => { const reader = new FileReader(); reader.onload = (e) => { container.innerHTML += `<div style="position:relative; width:70px; height:70px; border-radius:8px; overflow:hidden; border:1px solid #ccc;"><img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;"><button type="button" onclick="removeAddFoto(${index})" style="position:absolute; top:2px; right:2px; background:#ef4444; color:white; border:none; border-radius:50%; width:20px; height:20px; font-size:10px; font-weight:bold; cursor:pointer;">✕</button></div>`; }; reader.readAsDataURL(file); }); }
function compressImage(file, maxWidth = 1000) { return new Promise((resolve) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = (event) => { const img = new Image(); img.src = event.target.result; img.onload = () => { const canvas = document.createElement('canvas'); const scaleSize = maxWidth / img.width; canvas.width = maxWidth; canvas.height = img.height * scaleSize; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/jpeg', 0.6)); }; }; }); }
async function submitNewItem(e) { e.preventDefault(); const btn = document.getElementById("btnSubmitAdd"); btn.innerText = "MENGOMPRES & UPLOAD..."; btn.disabled = true; try { let base64Fotos = ["", "", ""]; let maxFiles = Math.min(pendingAddFotos.length, 3); for (let i = 0; i < maxFiles; i++) { base64Fotos[i] = await compressImage(pendingAddFotos[i]); } const payload = { action: "add_item", pin: userPin, nama: document.getElementById("addNama").value, kode_barang: document.getElementById("addKode").value, kode_wadah: document.getElementById("addWadah").value, jumlah: document.getElementById("addJumlah").value, kondisi: document.getElementById("addKondisi").value, keterangan_ref: document.getElementById("addKet").value, fotos: base64Fotos }; const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) }); const data = await response.json(); if (data.status === "success") { showToast("✅ Alat Tersimpan!"); closeAddModal(); loadData(); } else { alert("Gagal:\n" + data.message); } } catch (err) { alert("Error Sistem:\n" + err.message); } finally { btn.innerText = "💾 SIMPAN ALAT"; btn.disabled = false; } }

function openEditFullModal(item) { document.getElementById('detailModal').remove(); document.getElementById('modalEditFull').classList.add("active"); document.getElementById("editRowIndex").value = item.row_index; document.getElementById("editNama").value = item.nama_barang; document.getElementById("editKode").value = item.barang || item.kode_barang || ""; document.getElementById("editWadah").value = item.kode_wadah || ""; document.getElementById("editJumlah").value = item.jumlah || 0; document.getElementById("editKondisi").value = item.kondisi || "Bagus"; document.getElementById("editKet").value = item.keterangan_ref || ""; let safeFileIds = item.file_ids || item.fotos || []; for(let i=0; i<3; i++) { let fileId = safeFileIds[i]; let preview = document.getElementById("previewFoto" + i); let btnRemove = document.getElementById("btnRemove" + i); let btnUpload = document.getElementById("btnUpload" + i); let existInput = document.getElementById("existingId" + i); let fileInput = document.getElementById("editFoto" + i); fileInput.value = ""; if (fileId && fileId.length > 5) { preview.src = fileId.includes("http") ? fileId : `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`; preview.style.display = "block"; btnRemove.style.display = "block"; btnUpload.style.display = "none"; existInput.value = fileId; } else { preview.style.display = "none"; btnRemove.style.display = "none"; btnUpload.style.display = "block"; existInput.value = ""; } } }
function closeEditFullModal() { document.getElementById('modalEditFull').classList.remove("active"); }
function removeFotoEdit(index) { document.getElementById("previewFoto" + index).style.display = "none"; document.getElementById("btnRemove" + index).style.display = "none"; document.getElementById("btnUpload" + index).style.display = "block"; document.getElementById("existingId" + index).value = ""; document.getElementById("editFoto" + index).value = ""; }
function previewNewFoto(index) { let fileInput = document.getElementById("editFoto" + index); if(fileInput.files.length > 0) { let reader = new FileReader(); reader.onload = function(e) { document.getElementById("previewFoto" + index).src = e.target.result; document.getElementById("previewFoto" + index).style.display = "block"; document.getElementById("btnRemove" + index).style.display = "block"; document.getElementById("btnUpload" + index).style.display = "none"; document.getElementById("existingId" + index).value = "NEW_BASE64"; }; reader.readAsDataURL(fileInput.files[0]); } }
async function submitEditFull(e) { e.preventDefault(); const btn = document.getElementById("btnSubmitEditFull"); btn.innerText = "MENYIMPAN..."; btn.disabled = true; try { let finalFotos = ["", "", ""]; for(let i=0; i<3; i++) { let existVal = document.getElementById("existingId" + i).value; let fileInput = document.getElementById("editFoto" + i); if (existVal === "NEW_BASE64" && fileInput.files.length > 0) { finalFotos[i] = await compressImage(fileInput.files[0]); } else if (existVal && existVal.length > 5) { finalFotos[i] = existVal; } else { finalFotos[i] = ""; } } const payload = { action: "full_edit_item", pin: userPin, row_index: document.getElementById("editRowIndex").value, nama: document.getElementById("editNama").value, kode_barang: document.getElementById("editKode").value, kode_wadah: document.getElementById("editWadah").value, jumlah: document.getElementById("editJumlah").value, kondisi: document.getElementById("editKondisi").value, keterangan_ref: document.getElementById("editKet").value, fotos: finalFotos }; const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) }); const data = await response.json(); if (data.status === "success") { showToast("✅ Data Diperbarui!"); closeEditFullModal(); loadData(); } else { alert("Gagal:\n" + data.message); } } catch (err) { alert("Error Sistem:\n" + err.message); } finally { btn.innerText = "💾 UPDATE DATA & FOTO"; btn.disabled = false; } }

// ==========================================
// THE ULTIMATE SCANNER V.11 (GUDANG EDITION)
// ==========================================
function openScannerModal() { 
    let modal = document.createElement("div"); modal.id = "tempScannerModal"; modal.className = "modal-overlay active"; 
    modal.innerHTML = `
        <div class="modal-content" style="max-width:400px; background:white; padding:15px; border-radius:15px; text-align:center; position:relative;">
            <button onclick="closeScannerModal()" style="position:absolute; top:10px; right:10px; border:none; background:#fef2f2; color:#dc2626; width:35px; height:35px; border-radius:50%; font-weight:bold; cursor:pointer; z-index:9999;">✕</button>
            <h3 style="margin:0 0 5px 0; font-size:16px;">📸 Scan QR / Barcode</h3>
            <p style="font-size:11px; color:#64748b; margin-bottom:10px;">Arahkan kamera ke kode barang atau wadah</p>
            <div id="qr-reader" style="width:100%; border-radius:10px; overflow:hidden; background:black;"></div>
            
            <div class="scanner-controls" style="display:flex; gap:10px; justify-content:center; margin-top:15px;">
                <button class="btn-scanner-action" style="padding:10px 15px; border-radius:8px; border:none; background:#e2e8f0; font-weight:bold; cursor:pointer; flex:1;" onclick="toggleCameraFacing()">🔄 Kamera</button>
                <button class="btn-scanner-action" id="btnFlashlight" style="padding:10px 15px; border-radius:8px; border:none; background:#e2e8f0; font-weight:bold; cursor:pointer; flex:1;" onclick="toggleFlashlight()">🔦 Senter</button>
            </div>
        </div>`; 
    document.body.appendChild(modal); 
    isFlashlightOn = false;
    startScanner();
}

function startScanner() {
    if(html5QrCode) { html5QrCode.stop().catch(e=>console.log(e)); html5QrCode = null; }
    html5QrCode = new Html5Qrcode("qr-reader");
    let config = { fps: 15, qrbox: { width: 250, height: 250 } };
    
    html5QrCode.start({ facingMode: currentCameraFacing }, config, 
        (decodedText) => { 
            const now = Date.now(); 
            if (now - lastScanTime < 2000) return; // Prevent double scan
            lastScanTime = now; 
            
            let scanResult = decodedText.trim(); 
            triggerFeedback('success'); // Suara & Getar Sukses
            
            if (isBulkMode) { 
                const foundItem = allItems.find(i => (i.kode_barang||"").toString().toLowerCase() === scanResult.toLowerCase() || (i.kode_wadah||"").toString().toLowerCase() === scanResult.toLowerCase()); 
                if (foundItem) { 
                    if (!selectedRows.has(foundItem.row_index)) { 
                        selectedRows.add(foundItem.row_index); 
                        document.getElementById("bulkCount").innerText = `${selectedRows.size} Terpilih`; 
                        applyFilters(); 
                        showToast(`✅ ${foundItem.nama_barang} ditambahkan!`); 
                    } 
                } else { 
                    triggerFeedback('error');
                    showToast(`❌ Kode tidak ada di database!`, false); 
                } 
            } else { 
                closeScannerModal(); 
                document.getElementById('searchInput').value = scanResult; 
                applyFilters(); 
                const foundItem = allItems.find(i => (i.kode_barang||"").toString().toLowerCase() === scanResult.toLowerCase() || (i.kode_wadah||"").toString().toLowerCase() === scanResult.toLowerCase()); 
                if (foundItem) openDetailModal(foundItem); 
            } 
        }, 
        (err) => {}
    ).catch(err => { alert("Gagal membuka kamera: " + err); });
}

function toggleCameraFacing() {
    currentCameraFacing = currentCameraFacing === "environment" ? "user" : "environment";
    showToast("Mengganti kamera...", true);
    setTimeout(() => { closeScannerModal(); showToast("Silakan buka SCAN kembali", true); }, 500);
}

function toggleFlashlight() {
    if (!html5QrCode) return;
    isFlashlightOn = !isFlashlightOn;
    html5QrCode.applyVideoConstraints({
        advanced: [{ torch: isFlashlightOn }]
    }).then(() => {
        document.getElementById("btnFlashlight").style.background = isFlashlightOn ? "#fef08a" : "#e2e8f0"; // Warna kuning jika nyala
    }).catch(err => {
        showToast("Senter tidak didukung/kamera depan aktif.", false);
        isFlashlightOn = false;
        document.getElementById("btnFlashlight").style.background = "#e2e8f0";
    });
}

function closeScannerModal() { 
    if (html5QrCode) { html5QrCode.stop().catch(e=>console.log(e)); html5QrCode = null; } 
    const m = document.getElementById("tempScannerModal"); if(m) m.remove(); 
}

/* ==========================================
   TAMBAHAN JS: LOGIKA FILTER LANJUTAN (ANTI-BLANK)
   ========================================== */
const btnBukaFilter = document.getElementById('btnBukaFilter');
const panelFilter = document.getElementById('panelFilterLanjutan');
const semuaCekbox = document.querySelectorAll('.cek-tim, .cek-status');

// Fungsi buka/tutup laci filter
btnBukaFilter.addEventListener('click', () => {
    if (panelFilter.style.display === 'none') {
        panelFilter.style.display = 'block';
        btnBukaFilter.innerHTML = '❌ TUTUP FILTER';
        btnBukaFilter.style.background = '#ef4444';
    } else {
        panelFilter.style.display = 'none';
        btnBukaFilter.innerHTML = '⚙️ FILTER LANJUTAN';
        btnBukaFilter.style.background = '#334155';
        
        // Reset centang saat ditutup agar kembali ke "Semua Alat"
        semuaCekbox.forEach(cek => cek.checked = false);
        applyFilters(); 
    }
});

// Panggil ulang render otomatis saat checkbox dicentang!
semuaCekbox.forEach(cek => {
    cek.addEventListener('change', () => {
        applyFilters();
    });
});
