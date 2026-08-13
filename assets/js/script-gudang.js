// ==========================================
// MESIN LOGIKA GUDANG (V.6 - ZOOM & PISAH LOKASI/STATUS)
// ==========================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyg6ntp8BPWPP8qm9IfpN62Rwd272tAEiTM0Qgl1GQQkUqJGcViG-FnewlFqFTjZ4w-Zg/exec"; 

let allItems = [], optionsData = { lokasi: [], tim: [] };
let userPin = localStorage.getItem("AV_INVENTORY_PIN") || ""; 
let html5QrcodeScanner = null, isAdminMode = false, isBulkMode = false, selectedRows = new Set(), activeFilterPill = 'all';

window.onload = () => { checkAdminStatus(); loadData(); };

function checkAdminStatus() {
    if (userPin) {
        isAdminMode = true; document.body.classList.add("admin-mode-active");
        document.getElementById("modeStatusText").innerHTML = "🔴 Admin Mode";
        document.getElementById("btnUnlock").innerText = "🔓 Tutup Akses";
    } else {
        isAdminMode = false; document.body.classList.remove("admin-mode-active");
        document.getElementById("modeStatusText").innerHTML = "🟢 Read-Only Mode";
        document.getElementById("btnUnlock").innerText = "🔒 Buka Akses";
    }
}
function toggleAdminMode() {
    if (isAdminMode) {
        if(confirm("Tutup akses Admin?")) { localStorage.removeItem("AV_INVENTORY_PIN"); userPin = ""; checkAdminStatus(); }
    } else {
        let input = prompt("Masukkan PIN Kapten / Admin:");
        if (input) { localStorage.setItem("AV_INVENTORY_PIN", input.trim().toLowerCase()); checkAdminStatus(); }
    }
}

function showToast(msg, isSuccess = true) {
    const t = document.getElementById("toastMsg"); if(!t) return;
    t.innerText = msg; t.className = "toast-msg show " + (isSuccess ? "toast-success" : "toast-error");
    setTimeout(() => { t.classList.remove("show"); }, 2200);
}

async function loadData() {
    try {
        const res = await fetch(SCRIPT_URL + "?action=api&nocache=" + new Date().getTime());
        const data = await res.json();
        allItems = data.inventory || [];
        optionsData = data.dropdowns || { lokasi: [], tim: [] };
        document.getElementById("loading").style.display = "none";
        applyFilters();
    } catch (e) { document.getElementById("loading").innerHTML = `<span style="color:red;">Gagal memuat data.</span>`; }
}

function setFilterPill(status, btnElement) {
    activeFilterPill = status;
    document.querySelectorAll('.pill-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active'); applyFilters();
}

function getFilteredData() {
    const q = document.getElementById("searchInput").value.toLowerCase();
    return allItems.filter(i => {
        const matchQ = i.nama_barang.toLowerCase().includes(q) || (i.kode_barang||"").toLowerCase().includes(q) || (i.kode_wadah||"").toLowerCase().includes(q);
        let stat = i.status_digunakan || 'Di Gudang'; if(stat === 'FALSE') stat = 'Di Gudang';
        let matchPill = (activeFilterPill === 'all') ? true : (stat === activeFilterPill);
        if (stat === 'Akan Dibuang' && activeFilterPill !== 'Akan Dibuang') return false; 
        return matchQ && matchPill;
    });
}
function applyFilters() { render(getFilteredData()); }

function getStatusClass(status) {
    if(status === 'Siap Dibawa') return 'badge-status status-keranjang';
    if(status === 'Sedang Dipakai') return 'badge-status status-dipakai';
    return 'badge-status status-gudang'; 
}

function render(data) {
    const container = document.getElementById("dataContainer"); container.innerHTML = "";
    data.forEach(item => {
        const card = document.createElement("div");
        let stat = item.status_digunakan || "Di Gudang"; if(stat === 'FALSE') stat = "Di Gudang";
        const isSelected = selectedRows.has(item.row_index);
        card.className = "mission-card " + (isSelected ? "selected " : "") + (stat === 'Siap Dibawa' ? "card-siap-dibawa " : "");
        
        let validPhotos = item.fotos.filter(f => f && f.includes("http"));
        const imageSrc = validPhotos.length > 0 ? validPhotos[0] : 'https://placehold.co/300x300/EEEEEE/999999?text=NO+IMAGE';
        const kodeBadge = item.kode_barang ? `<span style="color:#ea580c;">#${item.kode_barang}</span>` : "";

        card.innerHTML = `
            ${isSelected ? '<div class="card-check">✓</div>' : ''}
            <div style="position:relative;"><img src="${imageSrc}" class="card-img" loading="lazy">
            <div style="position:absolute; bottom:12px; right:4px;"><span class="badge-qty">${item.jumlah || 0} Pcs</span></div></div>
            <h4 class="card-title">${item.nama_barang}</h4>
            <div class="card-codes">${kodeBadge} <span>📍 ${item.lokasi || "Gudang"}</span></div>
            <span class="${getStatusClass(stat)}">${stat}</span>
        `;
        card.onclick = () => { if (isBulkMode) toggleSelection(item.row_index); else openDetailModal(item); };
        container.appendChild(card);
    });
}

// --- POP-UP DETAIL & ZOOM ---
function openDetailModal(item) {
    const oldModal = document.getElementById("detailModal"); if(oldModal) oldModal.remove();
    let stat = item.status_digunakan || "Di Gudang"; if(stat === 'FALSE') stat = "Di Gudang";
    let lok = item.lokasi || "Gudang";

    // MERAKIT GALERI (BISA DI-KLIK ZOOM)
    let galleryHtml = `<div class="detail-gallery">`;
    let adaFoto = false;
    item.fotos.forEach((foto, i) => {
        if(foto && foto.includes("http")) {
            if(i < 3) {
                galleryHtml += `<img src="${foto}" class="gallery-img" onclick="openZoomModal('${foto}')">`;
            } else {
                galleryHtml += `<div class="gallery-box"><img src="${foto}" class="gallery-img" style="border:2px solid #ea580c;" onclick="openZoomModal('${foto}')"><span class="badge-wadah">📦 WADAH</span></div>`;
            }
            adaFoto = true;
        }
    });
    if(!adaFoto) galleryHtml += `<img src="https://placehold.co/300x200/EEEEEE/999999?text=Tidak+Ada+Foto" class="gallery-img" style="width:100%;">`;
    galleryHtml += `</div>`;

    // DROPDOWN LOKASI & STATUS (TERPISAH!)
    let optionsLokasi = `<option value="Gudang KC" ${lok.includes('Gudang') ? 'selected':''}>Gudang KC</option><option value="Dalam Perjalanan" ${lok === 'Dalam Perjalanan' ? 'selected':''}>🚚 Dalam Perjalanan</option><option value="Di Lokasi Event" ${lok.includes('Event') ? 'selected':''}>📍 Di Lokasi Event</option>`;
    let optionsStatus = `<option value="Di Gudang" ${stat === 'Di Gudang' ? 'selected':''}>📦 Standby / Di Gudang</option><option value="Siap Dibawa" ${stat === 'Siap Dibawa' ? 'selected':''}>🛒 Siap Dibawa (Packing)</option><option value="Sedang Dipakai" ${stat === 'Sedang Dipakai' ? 'selected':''}>🔌 Sedang Dipakai / Aktivasi</option><option value="Sedang Diservis" ${stat === 'Sedang Diservis' ? 'selected':''}>🛠️ Sedang Diservis</option>`;

    let actionButtons = isAdminMode ? `
        <div style="margin-top:15px; text-align:left; border-top:1px dashed #ccc; padding-top:15px;">
            <label style="font-size:11px; font-weight:bold; color:gray;">📍 Ubah Lokasi Alat:</label>
            <select id="editLokasi" style="width:100%; padding:8px; border-radius:8px; border:1px solid #ccc; margin-bottom:10px;">${optionsLokasi}</select>
            
            <label style="font-size:11px; font-weight:bold; color:gray;">🔌 Ubah Status Penggunaan:</label>
            <select id="editStatus" style="width:100%; padding:8px; border-radius:8px; border:1px solid #ccc; margin-bottom:10px; font-weight:bold;">${optionsStatus}</select>
            
            <button onclick="saveEditLokasiStatus(${item.row_index})" style="width:100%; padding:10px; background:#ea580c; color:white; border:none; border-radius:8px; font-weight:bold;">SIMPAN PERUBAHAN</button>
        </div>` : `<div style="margin-top:15px; padding:10px; background:#f1f5f9; border-radius:8px; font-size:12px; color:#64748b;">🔒 Login Akses untuk mengubah data.</div>`;

    const modalHtml = `
    <div id="detailModal" class="modal-overlay active">
        <div class="modal-content" style="max-width:400px; background:white; padding:20px; border-radius:15px; text-align:center; position:relative;">
            <button onclick="document.getElementById('detailModal').remove()" style="position:absolute; top:15px; right:15px; border:none; background:#f1f5f9; width:30px; height:30px; border-radius:50%; font-weight:bold; cursor:pointer; z-index:10;">✕</button>
            ${galleryHtml}
            <h3 style="margin:0; font-weight:900; color:#1e293b; font-size:18px;">${item.nama_barang}</h3>
            <p style="margin:5px 0 15px 0; font-size:13px; color:#ea580c; font-weight:bold;">#${item.kode_barang || '-'} | 📦 Wadah: ${item.kode_wadah || '-'}</p>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px; text-align:left; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">
                <div><span style="color:gray;">Total Qty:</span> <br><b>${item.jumlah || 0} Pcs</b></div>
                <div><span style="color:gray;">Tim:</span> <br><b>${item.tim || '-'}</b></div>
                <div><span style="color:gray;">📍 Lokasi Saat Ini:</span> <br><b>${lok}</b></div>
                <div><span style="color:gray;">🔌 Status:</span> <br><b>${stat}</b></div>
            </div>
            ${actionButtons}
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// FUNGSI ZOOM GAMBAR (FULL SCREEN)
function openZoomModal(imgUrl) {
    document.getElementById("zoomImgSrc").src = imgUrl;
    document.getElementById("zoomModal").classList.add("active");
}
function closeZoomModal() {
    document.getElementById("zoomModal").classList.remove("active");
    setTimeout(() => { document.getElementById("zoomImgSrc").src = ""; }, 300);
}

async function saveEditLokasiStatus(rowIndex) {
    const nLok = document.getElementById("editLokasi").value;
    const nStat = document.getElementById("editStatus").value;
    event.target.innerText = "MEMPROSES..."; event.target.disabled = true;
    try {
        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "update_status_lokasi", pin: userPin, rows: [rowIndex], new_lokasi: nLok, new_status: nStat }) });
        const data = await response.json();
        if(data.status === "success") { showToast("Lokasi & Status diupdate!"); document.getElementById('detailModal').remove(); loadData(); }
    } catch(e) { alert("Error koneksi!"); }
}

// --- TAMBAH BARANG (3 FOTO SAJA) ---
function openAddModal() { if(!isAdminMode) return; document.getElementById("formAdd").reset(); document.getElementById("modalAdd").classList.add("active"); }
function closeAddModal() { document.getElementById("modalAdd").classList.remove("active"); }

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result); reader.onerror = error => reject(error);
    });
}

async function submitNewItem(e) {
    e.preventDefault();
    const btn = document.getElementById("btnSubmitAdd"); btn.innerText = "MENGUPLOAD... TUNGGU"; btn.disabled = true;
    try {
        let base64Fotos = ["", "", ""]; // Hanya ambil 3 foto dari form
        for (let i = 1; i <= 3; i++) {
            const fileInput = document.getElementById("addFoto" + i);
            if (fileInput && fileInput.files.length > 0) { base64Fotos[i-1] = await getBase64(fileInput.files[0]); }
        }
        const payload = {
            action: "add_item", pin: userPin,
            nama: document.getElementById("addNama").value, kode_barang: document.getElementById("addKode").value,
            kode_wadah: document.getElementById("addWadah").value, jumlah: document.getElementById("addJumlah").value,
            kondisi: document.getElementById("addKondisi").value, keterangan_ref: document.getElementById("addKet").value,
            fotos: base64Fotos
        };
        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
        const data = await response.json();
        if (data.status === "success") { showToast("✅ Tersimpan!"); closeAddModal(); loadData(); } 
    } catch (err) { alert("Error Upload!"); } finally { btn.innerText = "💾 SIMPAN ALAT"; btn.disabled = false; }
}

// --- SCANNER PUBLIK ---
function openScannerModal() {
    let modal = document.createElement("div"); modal.id = "tempScannerModal"; modal.className = "modal-overlay active";
    modal.innerHTML = `<div class="modal-content" style="max-width:400px; background:white; padding:15px; border-radius:15px; text-align:center; position:relative;"><button onclick="closeScannerModal()" style="position:absolute; top:10px; right:10px; border:none; background:#fef2f2; color:#dc2626; width:35px; height:35px; border-radius:50%; font-weight:bold; cursor:pointer; z-index:9999;">✕</button><h3 style="margin:0 0 10px 0; font-size:16px;">Scan Barcode / QR</h3><div id="qr-reader" style="width:100%; border-radius:10px; overflow:hidden;"></div></div>`;
    document.body.appendChild(modal);
    html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: {width: 250, height: 250}, aspectRatio: 1.0, facingMode: "environment" }, false);
    html5QrcodeScanner.render((decodedText) => {
        const now = Date.now(); if (now - lastScanTime < 2000) return; lastScanTime = now;
        const foundItem = allItems.find(i => i.kode_barang === decodedText || i.kode_wadah === decodedText);
        if (foundItem) { closeScannerModal(); document.getElementById('searchInput').value = decodedText; applyFilters(); openDetailModal(foundItem); } 
        else { showToast(`❌ Kode tidak dikenali!`, false); }
    });
}
function closeScannerModal() { if (html5QrcodeScanner) { html5QrcodeScanner.clear().catch(e=>console.log(e)); } const m = document.getElementById("tempScannerModal"); if(m) m.remove(); }
