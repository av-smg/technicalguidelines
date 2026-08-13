// ==========================================
// MESIN LOGIKA GUDANG (V.17.0 - UI TOAST & DUAL LOGIC)
// ==========================================

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyGB8q5JIt8uQME2Sl7qJNgYFw2An6VY-CNNAwTGehxE26A7MkWk8xZFxLUjN2X_nZXDw/exec"; 

const VALID_PINS = ["a1b2c3", "v9t6c2", "123456"];

let allItems = [];
let optionsData = { lokasi: [], tim: [] };
let userPin = localStorage.getItem("AV_INVENTORY_PIN") || ""; 
let html5QrcodeScanner = null;
let isAdminMode = false, isBulkMode = false, selectedRows = new Set(), lastScanTime = 0, activeFilterPill = 'all', currentViewMode = 'grid'; 

window.onload = () => { checkAdminStatus(); loadData(); };

// ==========================================
// SISTEM LOGIN & TOAST
// ==========================================
function checkAdminStatus() {
    if (userPin && VALID_PINS.includes(userPin)) {
        isAdminMode = true; document.body.classList.add("admin-mode-active");
        document.getElementById("modeStatusText").innerHTML = "🔴 Admin Mode"; document.getElementById("btnUnlock").innerText = "🔓 Tutup Akses";
    } else {
        isAdminMode = false; userPin = ""; document.body.classList.remove("admin-mode-active");
        document.getElementById("modeStatusText").innerHTML = "🟢 Read-Only Mode"; document.getElementById("btnUnlock").innerText = "🔒 Buka Akses";
    }
}

function toggleAdminMode() {
    if (isAdminMode) {
        if(confirm("Tutup akses Admin? Memori PIN akan dihapus.")) { localStorage.removeItem("AV_INVENTORY_PIN"); userPin = ""; checkAdminStatus(); showToast("Mode Read-Only aktif."); applyFilters(); }
    } else {
        let input = prompt("Masukkan PIN Kapten / Admin:");
        if (input) { 
            let pinAttempt = input.trim().toLowerCase();
            if (VALID_PINS.includes(pinAttempt)) { userPin = pinAttempt; localStorage.setItem("AV_INVENTORY_PIN", userPin); checkAdminStatus(); showToast("Akses Admin Terbuka!"); applyFilters(); } 
            else { alert("⛔ AKSES DITOLAK! PIN yang Anda masukkan salah."); }
        }
    }
}

// FIX: DURASI TOAST DIPERPANJANG JADI 4 DETIK (4000ms) AGAR TERBACA
function showToast(msg, isSuccess = true) {
    const t = document.getElementById("toastMsg"); if(!t) return;
    t.innerText = msg; t.className = "toast-msg show " + (isSuccess ? "toast-success" : "toast-error");
    setTimeout(() => { t.classList.remove("show"); }, 4000); 
}

// ==========================================
// DATA & FILTER
// ==========================================
async function loadData() {
    try {
        document.getElementById("loading").style.display = "block";
        const res = await fetch(SCRIPT_URL + "?action=api&nocache=" + new Date().getTime()); const data = await res.json();
        let rawInventory = data.inventory || [];
        allItems = rawInventory.filter(item => item.nama_barang && item.nama_barang.toString().trim().toLowerCase() !== 'nama barang');
        optionsData = data.dropdowns || { lokasi: [], tim: [] };
        document.getElementById("loading").style.display = "none"; applyFilters();
    } catch (e) { document.getElementById("loading").innerHTML = `<span style="color:red;">Gagal memuat data. Periksa koneksi internet.</span>`; }
}

function toggleViewMode() {
    const btn = document.getElementById("btnViewToggle");
    if (currentViewMode === 'grid') { currentViewMode = 'list'; btn.innerHTML = '🖼️ Grid View'; document.getElementById("dataContainer").className = "list-view-container";
    } else { currentViewMode = 'grid'; btn.innerHTML = '📄 List View'; document.getElementById("dataContainer").className = "grid-cards"; }
    applyFilters();
}

function setFilterPill(status, btnElement) { activeFilterPill = status; document.querySelectorAll('.pill-btn').forEach(btn => btn.classList.remove('active')); btnElement.classList.add('active'); applyFilters(); }

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

// ==========================================
// RENDER KARTU
// ==========================================
function getStatusClass(status) {
    if(status === 'Akan Dibawa') return 'badge-status status-keranjang';
    if(status === 'Sedang Dipakai') return 'badge-status status-dipakai';
    if(status.includes('Perjalanan')) return 'badge-status status-perjalanan';
    return 'badge-status status-gudang'; 
}

function render(data) {
    const container = document.getElementById("dataContainer"); container.innerHTML = "";
    data.forEach(item => {
        const card = document.createElement("div"); const isSelected = selectedRows.has(item.row_index);
        let stat = item.status_digunakan || "Di Gudang"; if(stat === 'FALSE') stat = "Di Gudang"; let lok = item.lokasi || "Gudang KC";

        let isGudangOnly = (lok.includes("Gudang") && stat === "Di Gudang");
        let badgeLokasiHtml = isGudangOnly 
            ? `<span class="badge-status status-gudang" style="display:inline-block; margin-top:4px; padding:3px 8px;">🏢 ${lok} (Standby)</span>`
            : `<span class="badge-status status-lokasi" style="display:inline-block; margin-top:4px; margin-right:4px; padding:3px 8px;">📍 ${lok}</span><span class="${getStatusClass(stat)}" style="display:inline-block; margin-top:4px; padding:3px 8px;">${stat}</span>`;

        let safeFileIds = item.file_ids || item.fotos || []; let firstFileId = safeFileIds.find(id => id && id.length > 5);
        let imageSrc = 'https://placehold.co/300x300/EEEEEE/999999?text=NO+IMAGE';
        if (firstFileId) { imageSrc = firstFileId.includes("http") ? firstFileId : `https://drive.google.com/thumbnail?id=${firstFileId}&sz=w400`; }
        
        const kodeBadge = item.kode_barang ? `<span style="color:#ea580c; font-weight:900;">#${item.kode_barang}</span>` : "";
        const timeBadge = item.timestamp ? `<div style="font-size:9px; color:gray; margin-bottom:6px;">⏱️ Update: ${item.timestamp}</div>` : "";

        if (currentViewMode === 'grid') {
            card.className = "mission-card " + (isSelected ? "selected " : "") + (stat === 'Akan Dibawa' ? "card-siap-dibawa " : "");
            card.innerHTML = `${isSelected ? '<div class="card-check">✓</div>' : ''}<div style="position:relative;"><img src="${imageSrc}" class="card-img" loading="lazy"><div style="position:absolute; bottom:12px; right:4px;"><span class="badge-qty">Qty: ${item.jumlah || 0}</span></div></div><h4 class="card-title">${item.nama_barang}</h4>${timeBadge} <div class="card-codes">${kodeBadge}</div> <div>${badgeLokasiHtml}</div>`;
        } else {
            card.className = "list-item " + (isSelected ? "selected " : "") + (stat === 'Akan Dibawa' ? "card-siap-dibawa " : "");
            card.innerHTML = `${isSelected ? '<div class="card-check" style="top:50%; transform:translateY(-50%); right:15px;">✓</div>' : ''}<img src="${imageSrc}" class="list-img" loading="lazy"><div class="list-info"><h4 class="list-title">${item.nama_barang}</h4>${timeBadge}<div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center; font-size:10px;">${kodeBadge} ${badgeLokasiHtml} <span class="badge-qty">Qty: ${item.jumlah || 0}</span></div></div>`;
        }
        card.onclick = () => { if (isBulkMode) toggleSelection(item.row_index); else openDetailModal(item); };
        container.appendChild(card);
    });
}

function openZoomModal(imgUrl) { document.getElementById("zoomImgSrc").src = imgUrl; document.getElementById("zoomModal").classList.add("active"); }
function closeZoomModal() { document.getElementById("zoomModal").classList.remove("active"); setTimeout(() => { document.getElementById("zoomImgSrc").src = ""; }, 300); }

// ==========================================
// POP-UP DETAIL
// ==========================================
function openDetailModal(item) {
    const oldModal = document.getElementById("detailModal"); if(oldModal) oldModal.remove();
    let stat = item.status_digunakan || "Di Gudang"; if(stat === 'FALSE') stat = "Di Gudang"; let lok = item.lokasi || "Gudang KC";

    let galleryHtml = `<div class="detail-gallery">`; let adaFoto = false; let safeFileIds = item.file_ids || item.fotos || [];
    safeFileIds.forEach((fileId, i) => {
        if(fileId && fileId.length > 5) {
            let thumbUrl = fileId.includes("http") ? fileId : `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
            let highResUrl = fileId.includes("http") ? fileId.replace('sz=800', 'sz=s2000') : `https://drive.google.com/uc?export=view&id=${fileId}`;
            if(i < 3) { galleryHtml += `<img src="${thumbUrl}" class="gallery-img" onclick="openZoomModal('${highResUrl}')">`; } else { galleryHtml += `<div class="gallery-box"><img src="${thumbUrl}" class="gallery-img" style="border:2px solid #ea580c;" onclick="openZoomModal('${highResUrl}')"><span class="badge-wadah">📦 WADAH</span></div>`; }
            adaFoto = true;
        }
    });
    if(!adaFoto) galleryHtml += `<img src="https://placehold.co/300x200/EEEEEE/999999?text=Tidak+Ada+Foto" class="gallery-img" style="width:100%;">`; galleryHtml += `</div>`;

    let optionsLokasi = `<option value="Gudang KC" ${lok.includes('Gudang') ? 'selected':''}>🏢 Gudang KC</option><option value="Dalam Perjalanan" ${lok === 'Dalam Perjalanan' ? 'selected':''}>🚚 Dalam Perjalanan</option><option value="Di Lokasi Event" ${lok.includes('Event') ? 'selected':''}>📍 Di Lokasi Event</option>`;
    let optionsStatus = `<option value="Di Gudang" ${stat === 'Di Gudang' ? 'selected':''}>📦 Standby / Di Gudang</option><option value="Akan Dibawa" ${stat === 'Akan Dibawa' ? 'selected':''}>🛒 Akan Dibawa (Packing)</option><option value="Sedang Dipakai" ${stat === 'Sedang Dipakai' ? 'selected':''}>🔌 Sedang Dipakai / Aktivasi</option><option value="Sedang Diservis" ${stat === 'Sedang Diservis' ? 'selected':''}>🛠️ Sedang Diservis</option>`;

    let actionButtons = isAdminMode ? `
        <button onclick='openEditFullModal(${JSON.stringify(item).replace(/'/g, "&#39;")})' style="width:100%; padding:10px; background:#f59e0b; color:white; border:none; border-radius:8px; font-weight:bold; margin-bottom:15px;">✏️ EDIT DATA & FOTO LENGKAP</button>
        <div style="text-align:left; border-top:1px dashed #ccc; padding-top:15px;">
            <label style="font-size:11px; font-weight:bold; color:gray; display:block; margin-bottom:4px;">📍 Update Lokasi (Cell O):</label>
            <select id="editLokasi" style="width:100%; padding:8px; border-radius:8px; border:1px solid #ccc; margin-bottom:12px;">${optionsLokasi}</select>
            <label style="font-size:11px; font-weight:bold; color:gray; display:block; margin-bottom:4px;">🔌 Update Status (Cell R):</label>
            <select id="editStatus" style="width:100%; padding:8px; border-radius:8px; border:1px solid #ccc; margin-bottom:12px; font-weight:bold;">${optionsStatus}</select>
            <button onclick="saveEditLokasiStatus(${item.row_index})" style="width:100%; padding:12px; background:#ea580c; color:white; border:none; border-radius:8px; font-weight:bold;">💾 SIMPAN STATUS</button>
        </div>` : `<div style="margin-top:15px; padding:10px; background:#f1f5f9; border-radius:8px; font-size:12px; color:#64748b;">🔒 Login Akses untuk mengubah status/lokasi.</div>`;

    const modalHtml = `<div id="detailModal" class="modal-overlay active"><div class="modal-content" style="max-width:400px; background:white; padding:20px; border-radius:15px; text-align:center; position:relative;"><button onclick="document.getElementById('detailModal').remove()" style="position:absolute; top:15px; right:15px; border:none; background:#f1f5f9; width:30px; height:30px; border-radius:50%; font-weight:bold; cursor:pointer; z-index:10;">✕</button>${galleryHtml}<h3 style="margin:0; font-weight:900; color:#1e293b; font-size:18px;">${item.nama_barang}</h3><div style="font-size:10px; color:gray; margin-bottom:8px;">⏱️ Update: ${item.timestamp || '-'}</div><p style="margin:5px 0 15px 0; font-size:13px; color:#ea580c; font-weight:bold;">#${item.kode_barang || '-'} | 📦 Wadah: ${item.kode_wadah || '-'}</p><div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px; text-align:left; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0;"><div><span style="color:gray;">Total Qty:</span> <br><b>${item.jumlah || 0} Pcs</b></div><div><span style="color:gray;">Kondisi:</span> <br><b>${item.kondisi || '-'}</b></div><div><span style="color:gray;">📍 Lokasi:</span> <br><b>${lok}</b></div><div><span style="color:gray;">🔌 Status:</span> <br><b>${stat}</b></div></div><div style="text-align:left; margin-top:10px; font-size:11px; color:#475569; background:#fff7ed; padding:8px; border-radius:6px; border:1px solid #fed7aa; margin-bottom:15px;"><b>📝 Ket:</b> ${item.keterangan_ref || 'Tidak ada catatan.'}</div>${actionButtons}</div></div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function saveEditLokasiStatus(rowIndex) {
    const nLok = document.getElementById("editLokasi").value; const nStat = document.getElementById("editStatus").value;
    event.target.innerText = "MEMPROSES..."; event.target.disabled = true;
    try {
        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "update_status_lokasi", pin: userPin, rows: [rowIndex], new_lokasi: nLok, new_status: nStat }) });
        const data = await response.json();
        if(data.status === "success") { showToast("Lokasi & Status diperbarui!"); document.getElementById('detailModal').remove(); loadData(); } else { alert("Gagal:\n" + data.message); }
    } catch(e) { alert("Error Sistem:\n" + e.message); }
}

// ==========================================
// FULL EDIT & TAMBAH ALAT
// ==========================================
function openEditFullModal(item) {
    document.getElementById('detailModal').remove(); document.getElementById('modalEditFull').classList.add("active");
    document.getElementById("editRowIndex").value = item.row_index; document.getElementById("editNama").value = item.nama_barang; document.getElementById("editKode").value = item.kode_barang || ""; document.getElementById("editWadah").value = item.kode_wadah || ""; document.getElementById("editJumlah").value = item.jumlah || 0; document.getElementById("editKondisi").value = item.kondisi || "Bagus"; document.getElementById("editKet").value = item.keterangan_ref || "";
    let safeFileIds = item.file_ids || item.fotos || [];
    for(let i=0; i<3; i++) { let fileId = safeFileIds[i]; let preview = document.getElementById("previewFoto" + i); let btnRemove = document.getElementById("btnRemove" + i); let btnUpload = document.getElementById("btnUpload" + i); let existInput = document.getElementById("existingId" + i); let fileInput = document.getElementById("editFoto" + i); fileInput.value = ""; if (fileId && fileId.length > 5) { preview.src = fileId.includes("http") ? fileId : `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`; preview.style.display = "block"; btnRemove.style.display = "block"; btnUpload.style.display = "none"; existInput.value = fileId; } else { preview.style.display = "none"; btnRemove.style.display = "none"; btnUpload.style.display = "block"; existInput.value = ""; } }
}
function closeEditFullModal() { document.getElementById('modalEditFull').classList.remove("active"); }
function removeFotoEdit(index) { document.getElementById("previewFoto" + index).style.display = "none"; document.getElementById("btnRemove" + index).style.display = "none"; document.getElementById("btnUpload" + index).style.display = "block"; document.getElementById("existingId" + index).value = ""; document.getElementById("editFoto" + index).value = ""; }
function previewNewFoto(index) { let fileInput = document.getElementById("editFoto" + index); if(fileInput.files.length > 0) { let reader = new FileReader(); reader.onload = function(e) { document.getElementById("previewFoto" + index).src = e.target.result; document.getElementById("previewFoto" + index).style.display = "block"; document.getElementById("btnRemove" + index).style.display = "block"; document.getElementById("btnUpload" + index).style.display = "none"; document.getElementById("existingId" + index).value = "NEW_BASE64"; }; reader.readAsDataURL(fileInput.files[0]); } }

async function submitEditFull(e) {
    e.preventDefault(); const btn = document.getElementById("btnSubmitEditFull"); btn.innerText = "MENYIMPAN..."; btn.disabled = true;
    try {
        let finalFotos = ["", "", ""];
        for(let i=0; i<3; i++) { let existVal = document.getElementById("existingId" + i).value; let fileInput = document.getElementById("editFoto" + i); if (existVal === "NEW_BASE64" && fileInput.files.length > 0) { finalFotos[i] = await compressImage(fileInput.files[0]); } else if (existVal && existVal.length > 5) { finalFotos[i] = existVal; } else { finalFotos[i] = ""; } }
        const payload = { action: "full_edit_item", pin: userPin, row_index: document.getElementById("editRowIndex").value, nama: document.getElementById("editNama").value, kode_barang: document.getElementById("editKode").value, kode_wadah: document.getElementById("editWadah").value, jumlah: document.getElementById("editJumlah").value, kondisi: document.getElementById("editKondisi").value, keterangan_ref: document.getElementById("editKet").value, fotos: finalFotos };
        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) }); const data = await response.json();
        if (data.status === "success") { showToast("✅ Data Diperbarui!"); closeEditFullModal(); loadData(); } else { alert("Gagal:\n" + data.message); }
    } catch (err) { alert("Error Sistem:\n" + err.message); } finally { btn.innerText = "💾 UPDATE DATA & FOTO"; btn.disabled = false; }
}

function openAddModal() { if(!isAdminMode) return; document.getElementById("formAdd").reset(); document.getElementById("modalAdd").classList.add("active"); }
function closeAddModal() { document.getElementById("modalAdd").classList.remove("active"); }
function compressImage(file, maxWidth = 1000) { return new Promise((resolve) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = (event) => { const img = new Image(); img.src = event.target.result; img.onload = () => { const canvas = document.createElement('canvas'); const scaleSize = maxWidth / img.width; canvas.width = maxWidth; canvas.height = img.height * scaleSize; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/jpeg', 0.6)); }; }; }); }

async function submitNewItem(e) {
    e.preventDefault(); const btn = document.getElementById("btnSubmitAdd"); btn.innerText = "MENGOMPRES & UPLOAD..."; btn.disabled = true;
    try {
        let base64Fotos = ["", "", ""]; const fileInput = document.getElementById("addFotosMultiple"); const files = fileInput.files; let maxFiles = Math.min(files.length, 3); for (let i = 0; i < maxFiles; i++) { base64Fotos[i] = await compressImage(files[i]); }
        const payload = { action: "add_item", pin: userPin, nama: document.getElementById("addNama").value, kode_barang: document.getElementById("addKode").value, kode_wadah: document.getElementById("addWadah").value, jumlah: document.getElementById("addJumlah").value, kondisi: document.getElementById("addKondisi").value, keterangan_ref: document.getElementById("addKet").value, fotos: base64Fotos };
        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) }); const data = await response.json();
        if (data.status === "success") { showToast("✅ Alat Tersimpan!"); closeAddModal(); loadData(); } else { alert("Gagal:\n" + data.message); }
    } catch (err) { alert("Error Sistem:\n" + err.message); } finally { btn.innerText = "💾 SIMPAN ALAT"; btn.disabled = false; }
}

// ==========================================
// KERANJANG (ADVANCED BULK UPDATE)
// ==========================================
function toggleBulkMode() {
    isBulkMode = !isBulkMode; let bar = document.getElementById("bulkBar");
    if(!bar) { document.body.insertAdjacentHTML('beforeend', `<div id="bulkBar" class="bulk-bar"><span id="bulkCount" class="bulk-info" style="font-weight:bold;">0 Terpilih</span><button onclick="openBulkUpdateModal()" class="btn-bulk-process">Ubah Massal</button></div>`); bar = document.getElementById("bulkBar"); }
    if (isBulkMode) { document.getElementById("btnBulkMode").innerHTML = `Batalkan`; bar.classList.add("active"); } else { document.getElementById("btnBulkMode").innerHTML = `🛒 Mode Loading`; bar.classList.remove("active"); selectedRows.clear(); document.getElementById("bulkCount").innerText = `0 Terpilih`; }
    applyFilters(); 
}
function toggleSelection(rowIndex) { if (selectedRows.has(rowIndex)) selectedRows.delete(rowIndex); else selectedRows.add(rowIndex); document.getElementById("bulkCount").innerText = `${selectedRows.size} Terpilih`; applyFilters(); }
function selectAllVisible() { getFilteredData().forEach(item => selectedRows.add(item.row_index)); document.getElementById("bulkCount").innerText = `${selectedRows.size} Terpilih`; applyFilters(); }

function openBulkUpdateModal() {
    if (selectedRows.size === 0) { alert("Pilih minimal 1 barang!"); return; }
    
    // UI BULK UPDATE YANG DIPERJELAS (Cell O dan Cell R)
    const modalHtml = `
    <div id="bulkModal" class="modal-overlay active">
        <div class="modal-content" style="max-width:350px; padding:20px; background:white; border-radius:15px; position:relative;">
            <button onclick="document.getElementById('bulkModal').remove()" style="position:absolute; top:15px; right:15px; border:none; background:#f1f5f9; width:30px; height:30px; border-radius:50%; font-weight:bold;">✕</button>
            <h3 style="margin-top:0;">Ubah Massal (${selectedRows.size} Alat)</h3>
            
            <div style="text-align:left; margin-bottom:15px;">
                <label style="font-size:11px; font-weight:bold; color:gray; display:block; margin-bottom:4px;">📍 Ubah Lokasi Saat Ini (Kolom O):</label>
                <select id="bulkNewLokasi" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc; font-weight:bold;">
                    <option value="TETAP">-- Jangan Ubah Lokasi --</option>
                    <option value="Gudang KC">🏢 Gudang KC</option>
                    <option value="Dalam Perjalanan">🚚 Dalam Perjalanan</option>
                    <option value="Di Lokasi Event">📍 Di Lokasi Event</option>
                </select>
            </div>

            <div style="text-align:left; margin-bottom:15px;">
                <label style="font-size:11px; font-weight:bold; color:gray; display:block; margin-bottom:4px;">🔌 Ubah Status Alat (Kolom R):</label>
                <select id="bulkNewStatus" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc; font-weight:bold;">
                    <option value="TETAP">-- Jangan Ubah Status --</option>
                    <option value="Akan Dibawa">🛒 Akan Dibawa (Packing)</option>
                    <option value="Sedang Dipakai">🔌 Sedang Dipakai / Aktivasi</option>
                    <option value="Di Gudang">📦 Standby / Di Gudang</option>
                </select>
            </div>

            <div style="font-size:10px; color:gray; text-align:left; margin-bottom:15px;">
                <i>*Tips: Untuk "Kembalikan ke Gudang", ubah Lokasi jadi "Gudang KC" dan Status jadi "Di Gudang".</i>
            </div>

            <button onclick="processBulkUpdate(this)" style="width:100%; padding:12px; background:#ea580c; color:white; border:none; border-radius:8px; font-weight:bold;">PROSES UPDATE LOKASI & STATUS</button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function processBulkUpdate(btn) {
    const newLokasi = document.getElementById("bulkNewLokasi").value; const newStatus = document.getElementById("bulkNewStatus").value; 
    if (newLokasi === "TETAP" && newStatus === "TETAP") { alert("Pilih minimal satu perubahan (Lokasi atau Status)!"); return; }

    btn.disabled = true; btn.innerText = "MEMPROSES... (JANGAN DITUTUP)";
    try {
        const payload = { action: "update_status_lokasi", pin: userPin, rows: Array.from(selectedRows), new_lokasi: newLokasi !== "TETAP" ? newLokasi : null, new_status: newStatus !== "TETAP" ? newStatus : null };
        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) }); const data = await response.json();
        if(data.status === "success") { document.getElementById('bulkModal').remove(); toggleBulkMode(); loadData(); showToast("✅ Update massal berhasil!"); } else { alert("Gagal:\n" + data.message); }
    } catch (e) { alert("Error Sistem:\n" + e.message); } finally { btn.disabled = false; btn.innerText = "PROSES UPDATE"; }
}

function openScannerModal() {
    let modal = document.createElement("div"); modal.id = "tempScannerModal"; modal.className = "modal-overlay active";
    modal.innerHTML = `<div class="modal-content" style="max-width:400px; background:white; padding:15px; border-radius:15px; text-align:center; position:relative;"><button onclick="closeScannerModal()" style="position:absolute; top:10px; right:10px; border:none; background:#fef2f2; color:#dc2626; width:35px; height:35px; border-radius:50%; font-weight:bold; cursor:pointer; z-index:9999;">✕</button><h3 style="margin:0 0 10px 0; font-size:16px;">Scan QR / Barcode</h3><div id="qr-reader" style="width:100%; border-radius:10px; overflow:hidden;"></div></div>`;
    document.body.appendChild(modal);
    html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", { fps: 15, qrbox: {width: 250, height: 250} }, false);
    html5QrcodeScanner.render((decodedText) => {
        const now = Date.now(); if (now - lastScanTime < 2000) return; lastScanTime = now;
        let scanResult = decodedText.trim();
        if (isBulkMode) {
            const foundItem = allItems.find(i => (i.kode_barang||"").toString().toLowerCase() === scanResult.toLowerCase() || (i.kode_wadah||"").toString().toLowerCase() === scanResult.toLowerCase());
            if (foundItem) { if (!selectedRows.has(foundItem.row_index)) { selectedRows.add(foundItem.row_index); document.getElementById("bulkCount").innerText = `${selectedRows.size} Terpilih`; applyFilters(); showToast(`✅ ${foundItem.nama_barang} ditambahkan!`); } } else { showToast(`❌ Kode tidak ada di database!`, false); }
        } else {
            closeScannerModal(); document.getElementById('searchInput').value = scanResult; applyFilters(); 
            const foundItem = allItems.find(i => (i.kode_barang||"").toString().toLowerCase() === scanResult.toLowerCase() || (i.kode_wadah||"").toString().toLowerCase() === scanResult.toLowerCase());
            if (foundItem) openDetailModal(foundItem); 
        }
    });
}
function closeScannerModal() { if (html5QrcodeScanner) { html5QrcodeScanner.clear().catch(e=>console.log(e)); } const m = document.getElementById("tempScannerModal"); if(m) m.remove(); }
