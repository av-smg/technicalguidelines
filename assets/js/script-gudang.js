// ==========================================
// MESIN LOGIKA GUDANG & LOGISTIK (V.3 - FULL POWER)
// ==========================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyg6ntp8BPWPP8qm9IfpN62Rwd272tAEiTM0Qgl1GQQkUqJGcViG-FnewlFqFTjZ4w-Zg/exec"; 

let allItems = [];
let optionsData = { tim: [] };
let userPin = localStorage.getItem("AV_INVENTORY_PIN") || ""; 
let html5QrcodeScanner = null;

let isAdminMode = false;
let isBulkMode = false;
let selectedRows = new Set();
let lastScanTime = 0;
let activeFilterPill = 'all';

window.onload = () => {
    checkAdminStatus();
    loadData();
};

// --- GEMBOK ADMIN ---
function checkAdminStatus() {
    if (userPin) {
        isAdminMode = true;
        document.body.classList.add("admin-mode-active");
        document.getElementById("modeStatusText").innerHTML = "🔴 Admin Mode (Akses Penuh)";
        document.getElementById("btnUnlock").innerText = "🔓 Tutup Akses";
    } else {
        isAdminMode = false;
        document.body.classList.remove("admin-mode-active");
        document.getElementById("modeStatusText").innerHTML = "🟢 Read-Only Mode";
        document.getElementById("btnUnlock").innerText = "🔒 Buka Akses";
    }
}

function toggleAdminMode() {
    if (isAdminMode) {
        if(confirm("Tutup akses Admin?")) {
            localStorage.removeItem("AV_INVENTORY_PIN");
            userPin = "";
            checkAdminStatus();
            showToast("Mode Read-Only aktif.");
        }
    } else {
        let input = prompt("Masukkan PIN Kapten / Admin:");
        if (input) {
            userPin = input.trim().toLowerCase();
            localStorage.setItem("AV_INVENTORY_PIN", userPin);
            checkAdminStatus();
            showToast("Akses Admin Terbuka!");
        }
    }
}

function showToast(message, isSuccess = true) {
    const toast = document.getElementById("toastMsg");
    if(!toast) return;
    toast.innerText = message;
    toast.className = "toast-msg show " + (isSuccess ? "toast-success" : "toast-error");
    setTimeout(() => { toast.classList.remove("show"); }, 2200);
}

// --- AMBIL DATA ---
async function loadData() {
    try {
        document.getElementById("loading").style.display = "block";
        const res = await fetch(SCRIPT_URL + "?action=api&nocache=" + new Date().getTime());
        const rawData = await res.json();
        
        allItems = rawData.inventory.filter(item => item.nama_barang && item.nama_barang.toLowerCase() !== 'nama barang');
        optionsData = rawData.dropdowns || { tim: [] };
        
        document.getElementById("loading").style.display = "none";
        populateTeams();
        applyFilters();
    } catch (e) {
        document.getElementById("loading").innerHTML = `<span style="color:red;">Gagal memuat data. Cek koneksi.</span>`;
    }
}

function populateTeams() {
    const dbTeams = [...new Set(allItems.map(i => i.tim).filter(Boolean))];
    const finalTeams = [...new Set([...dbTeams, ...(optionsData.tim || [])])].sort();
    const teamSelect = document.getElementById("teamSelect");
    if(teamSelect) {
        teamSelect.innerHTML = `<option value="all">Semua Tim</option>`;
        finalTeams.forEach(t => teamSelect.innerHTML += `<option value="${t}">${t}</option>`);
    }
}

// --- FILTER & RENDER ---
function setFilterPill(status, btnElement) {
    activeFilterPill = status;
    document.querySelectorAll('.pill-btn').forEach(btn => btn.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');
    applyFilters();
}

function getFilteredData() {
    const q = document.getElementById("searchInput").value.toLowerCase();
    const teamVal = document.getElementById("teamSelect") ? document.getElementById("teamSelect").value : 'all';

    return allItems.filter(i => {
        const matchQ = i.nama_barang.toLowerCase().includes(q) || (i.kode_barang || "").toLowerCase().includes(q) || (i.kode_wadah || "").toLowerCase().includes(q);
        const matchTeam = (teamVal === 'all') || (i.tim === teamVal);
        
        let finalStatus = i.status_digunakan || 'Di Gudang';
        if(finalStatus === 'FALSE' || finalStatus === 'undefined') finalStatus = 'Di Gudang';
        
        let matchPill = (activeFilterPill === 'all') ? true : (finalStatus === activeFilterPill);
        if (finalStatus === 'Akan Dibuang' && activeFilterPill !== 'Akan Dibuang') return false; 

        return matchQ && matchTeam && matchPill;
    });
}

function applyFilters() { render(getFilteredData()); }

function getStatusClass(status) {
    if(!status || status === 'Di Gudang') return 'badge-status status-gudang';
    if(status === 'Siap Dibawa') return 'badge-status status-keranjang';
    if(status === 'Sedang Dipakai') return 'badge-status status-dipakai';
    if(status.includes('Perjalanan')) return 'badge-status status-perjalanan';
    if(status === 'Akan Dibuang') return 'badge-status status-karantina';
    return 'badge-status status-lokasi'; 
}

function render(data) {
    const container = document.getElementById("dataContainer");
    if(!container) return;
    container.innerHTML = "";
    
    data.forEach(item => {
        const card = document.createElement("div");
        const isSelected = selectedRows.has(item.row_index);
        let finalStatus = item.status_digunakan || "Di Gudang";
        if(finalStatus === 'FALSE' || finalStatus === 'undefined') finalStatus = "Di Gudang";

        const isSiapDibawa = (finalStatus === 'Siap Dibawa');
        card.className = "mission-card " + (isSelected ? "selected " : "") + (isSiapDibawa ? "card-siap-dibawa " : "");
        
        const imageSrc = item.fotos && item.fotos[0] ? item.fotos[0] : 'https://placehold.co/300x300/EEEEEE/999999?text=NO+IMAGE';
        const badgeClass = getStatusClass(finalStatus);
        const wadahBadge = item.kode_wadah ? `<span>📦 ${item.kode_wadah}</span>` : "";
        const kodeBadge = item.kode_barang ? `<span style="color:#ea580c;">#${item.kode_barang}</span>` : "";

        card.innerHTML = `
            ${isSelected ? '<div class="card-check">✓</div>' : ''}
            <div style="position:relative;">
                <img src="${imageSrc}" class="card-img" loading="lazy">
                <div style="position:absolute; bottom:12px; right:4px;"><span class="badge-qty">${item.jumlah || 0} Pcs</span></div>
            </div>
            <h4 class="card-title">${item.nama_barang}</h4>
            <div class="card-codes">${kodeBadge} ${wadahBadge}</div>
            <span class="${badgeClass}">${finalStatus}</span>
        `;

        // KLIK KARTU BARANG
        card.onclick = () => {
            if (isBulkMode) toggleSelection(item.row_index);
            else openDetailModal(item);
        };
        container.appendChild(card);
    });
}

// --- POP-UP DETAIL ---
function openDetailModal(item) {
    const oldModal = document.getElementById("detailModal");
    if(oldModal) oldModal.remove();

    let finalStatus = item.status_digunakan || "Di Gudang";
    if(finalStatus === 'FALSE' || finalStatus === 'undefined') finalStatus = "Di Gudang";

    let actionButtons = isAdminMode ? `
        <div style="margin-top:15px; text-align:left; border-top:1px dashed #ccc; padding-top:15px;">
            <label style="font-size:11px; font-weight:bold; color:gray;">Ubah Status Cepat:</label>
            <select id="editStatus" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc; margin-top:5px; margin-bottom:10px; font-weight:bold;">
                <option value="Di Gudang" ${finalStatus === 'Di Gudang' ? 'selected' : ''}>🏢 Di Gudang</option>
                <option value="Siap Dibawa" ${finalStatus === 'Siap Dibawa' ? 'selected' : ''}>🛒 Siap Dibawa (Packing)</option>
                <option value="Sedang Dipakai" ${finalStatus === 'Sedang Dipakai' ? 'selected' : ''}>🔌 Sedang Dipakai (Aktivasi)</option>
                <option value="Sedang Diservis" ${finalStatus === 'Sedang Diservis' ? 'selected' : ''}>🛠️ Sedang Diservis</option>
            </select>
            <button onclick="saveEdit(${item.row_index})" style="width:100%; padding:10px; background:#ea580c; color:white; border:none; border-radius:8px; font-weight:bold;">SIMPAN PERUBAHAN</button>
        </div>` 
        : `<div style="margin-top:15px; padding:10px; background:#f1f5f9; border-radius:8px; font-size:12px; color:#64748b; text-align:center;">🔒 Login Akses untuk mengubah data.</div>`;

    const modalHtml = `
    <div id="detailModal" class="modal-overlay active">
        <div class="modal-content" style="max-width:400px; background:white; padding:20px; border-radius:15px; text-align:center; position:relative;">
            <button onclick="document.getElementById('detailModal').remove()" style="position:absolute; top:15px; right:15px; border:none; background:#f1f5f9; width:30px; height:30px; border-radius:50%; font-weight:bold; cursor:pointer;">✕</button>
            <img src="${item.fotos && item.fotos[0] ? item.fotos[0] : 'https://placehold.co/300'}" style="width:100%; max-height:200px; object-fit:cover; border-radius:10px; margin-bottom:15px;">
            <h3 style="margin:0; font-weight:900; color:#1e293b; font-size:18px;">${item.nama_barang}</h3>
            <p style="margin:5px 0 15px 0; font-size:13px; color:#ea580c; font-weight:bold;">#${item.kode_barang || '-'} | 📦 Wadah: ${item.kode_wadah || '-'}</p>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px; text-align:left; background:#f8fafc; padding:10px; border-radius:8px;">
                <div><span style="color:gray;">Total Qty:</span> <br><b>${item.jumlah || 0} Pcs</b></div>
                <div><span style="color:gray;">Kondisi:</span> <br><b>${item.kondisi || 'Bagus'}</b></div>
                <div><span style="color:gray;">Status:</span> <br><b>${finalStatus}</b></div>
            </div>
            ${actionButtons}
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function saveEdit(rowIndex) {
    const newStatus = document.getElementById("editStatus").value;
    event.target.innerText = "MEMPROSES..."; event.target.disabled = true;
    try {
        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "bulk_update_status", pin: userPin, rows: [rowIndex], new_status: newStatus }) });
        const data = await response.json();
        if(data.status === "success") { showToast("Berhasil diupdate!"); document.getElementById('detailModal').remove(); loadData(); }
    } catch(e) { alert("Error koneksi!"); }
}

// --- TAMBAH BARANG BARU (DENGAN UPLOAD FOTO) ---
function openAddModal() {
    if(!isAdminMode) return;
    document.getElementById("formAdd").reset();
    document.getElementById("modalAdd").classList.add("active");
}

function closeAddModal() {
    document.getElementById("modalAdd").classList.remove("active");
}

// Konversi File Foto HP jadi Text Base64 agar bisa dikirim ke Google Apps Script
function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

async function submitNewItem(e) {
    e.preventDefault();
    const btn = document.getElementById("btnSubmitAdd");
    btn.innerText = "MENGUPLOAD... MOHON TUNGGU"; 
    btn.disabled = true;

    try {
        let base64Foto = "";
        const fileInput = document.getElementById("addFoto1");
        if (fileInput.files.length > 0) {
            base64Foto = await getBase64(fileInput.files[0]);
        }

        const payload = {
            action: "add_item",
            pin: userPin,
            nama: document.getElementById("addNama").value,
            kode_barang: document.getElementById("addKode").value,
            kode_wadah: document.getElementById("addWadah").value,
            jumlah: document.getElementById("addJumlah").value,
            kondisi: document.getElementById("addKondisi").value,
            fotos: [base64Foto] // Array foto
        };

        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
        const data = await response.json();
        
        if (data.status === "success") {
            showToast("✅ Barang Baru Berhasil Disimpan!");
            closeAddModal();
            loadData();
        } else {
            alert("Gagal: " + data.message);
        }
    } catch (err) {
        alert("Error Koneksi saat Upload!");
    } finally {
        btn.innerText = "💾 SIMPAN ALAT"; 
        btn.disabled = false;
    }
}

// --- KERANJANG (BULK) ---
function toggleBulkMode() {
    isBulkMode = !isBulkMode;
    let bar = document.getElementById("bulkBar");
    if(!bar) {
        document.body.insertAdjacentHTML('beforeend', `<div id="bulkBar" class="bulk-bar"><span id="bulkCount" class="bulk-info" style="font-weight:bold;">0 Terpilih</span><button onclick="openBulkUpdateModal()" class="btn-bulk-process">Ubah Status Massal</button></div>`);
        bar = document.getElementById("bulkBar");
    }
    if (isBulkMode) { document.getElementById("btnBulkMode").innerHTML = `Batalkan`; bar.classList.add("active"); } 
    else { document.getElementById("btnBulkMode").innerHTML = `🛒 Mode Loading`; bar.classList.remove("active"); selectedRows.clear(); document.getElementById("bulkCount").innerText = `0 Terpilih`; }
    applyFilters(); 
}

function toggleSelection(rowIndex) {
    if (selectedRows.has(rowIndex)) selectedRows.delete(rowIndex); else selectedRows.add(rowIndex);
    document.getElementById("bulkCount").innerText = `${selectedRows.size} Terpilih`;
    applyFilters(); 
}

function selectAllVisible() {
    getFilteredData().forEach(item => selectedRows.add(item.row_index));
    document.getElementById("bulkCount").innerText = `${selectedRows.size} Terpilih`;
    applyFilters();
}

function openBulkUpdateModal() {
    if (selectedRows.size === 0) { alert("Pilih minimal 1 barang!"); return; }
    const modalHtml = `<div id="bulkModal" class="modal-overlay active"><div class="modal-content" style="max-width:350px; padding:20px; background:white; border-radius:15px; position:relative;"><button onclick="document.getElementById('bulkModal').remove()" style="position:absolute; top:15px; right:15px; border:none; background:#f1f5f9; width:30px; height:30px; border-radius:50%; font-weight:bold;">✕</button><h3 style="margin-top:0;">Ubah Status Massal</h3><p style="font-size:12px; color:gray;">Anda memilih <b>${selectedRows.size}</b> alat.</p><select id="bulkNewStatus" style="width:100%; padding:10px; margin:15px 0; border-radius:8px; border:1px solid #ccc; font-weight:bold;"><option value="Siap Dibawa">🛒 Siap Dibawa (Packing)</option><option value="Di Lokasi">📍 Di Lokasi Event</option><option value="Sedang Dipakai">🔌 Sedang Dipakai</option><option value="Di Gudang">🏢 Kembalikan ke Gudang</option></select><button onclick="processBulkUpdate(this)" style="width:100%; padding:12px; background:#ea580c; color:white; border:none; border-radius:8px; font-weight:bold;">PROSES UPDATE</button></div></div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function processBulkUpdate(btn) {
    const newStatus = document.getElementById("bulkNewStatus").value;
    btn.disabled = true; btn.innerText = "MEMPROSES...";
    try {
        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "bulk_update_status", pin: userPin, rows: Array.from(selectedRows), new_status: newStatus }) });
        const data = await response.json();
        if(data.status === "success") { document.getElementById('bulkModal').remove(); toggleBulkMode(); loadData(); showToast("✅ Update massal berhasil!"); }
    } catch (e) { alert("Error koneksi!"); }
}

// --- SCANNER KASIR (DIPERBAIKI) ---
function openScannerModal() {
    if(!isAdminMode) return;
    
    let modal = document.createElement("div");
    modal.id = "tempScannerModal";
    modal.className = "modal-overlay active";
    modal.innerHTML = `
        <div class="modal-content" style="max-width:400px; background:white; padding:15px; border-radius:15px; text-align:center; position:relative;">
            <button onclick="closeScannerModal()" style="position:absolute; top:10px; right:10px; border:none; background:#fef2f2; color:#dc2626; width:35px; height:35px; border-radius:50%; font-weight:bold; cursor:pointer; z-index:9999;">✕</button>
            <h3 style="margin:0 0 10px 0; font-size:16px;">Scan Barcode</h3>
            <div id="qr-reader" style="width:100%; border-radius:10px; overflow:hidden;"></div>
        </div>
    `;
    document.body.appendChild(modal);

    // Konfigurasi scanner agar selalu meminta kamera belakang HP (environment)
    html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", { 
        fps: 10, 
        qrbox: {width: 250, height: 250},
        aspectRatio: 1.0,
        facingMode: "environment" // Prioritas Kamera Belakang
    }, false);
    
    html5QrcodeScanner.render((decodedText) => {
        const now = Date.now();
        if (now - lastScanTime < 2000) return; 
        lastScanTime = now;

        const foundItem = allItems.find(i => i.kode_barang === decodedText || i.kode_wadah === decodedText);

        if (isBulkMode && foundItem) {
            if (!selectedRows.has(foundItem.row_index)) {
                selectedRows.add(foundItem.row_index);
                document.getElementById("bulkCount").innerText = `${selectedRows.size} Terpilih`;
                applyFilters();
                showToast(`✅ ${foundItem.nama_barang} ditambahkan!`);
                try { navigator.vibrate(100); } catch(e){}
            }
        } else if (foundItem) {
            closeScannerModal();
            document.getElementById('searchInput').value = decodedText; 
            applyFilters(); 
            openDetailModal(foundItem); 
        } else {
            showToast(`❌ Kode tidak dikenali!`, false);
        }
    });
}

function closeScannerModal() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(error => console.error("Failed to clear html5QrcodeScanner. ", error));
    }
    const modal = document.getElementById("tempScannerModal");
    if(modal) modal.remove();
}
