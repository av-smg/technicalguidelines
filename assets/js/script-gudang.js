// ==========================================
// MESIN LOGIKA GUDANG & LOGISTIK (V.7 - LIST VIEW & ZOOM FIX)
// ==========================================

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyg6ntp8BPWPP8qm9IfpN62Rwd272tAEiTM0Qgl1GQQkUqJGcViG-FnewlFqFTjZ4w-Zg/exec"; 

// Variabel Global
let allItems = [];
let optionsData = { lokasi: [], tim: [] };
let userPin = localStorage.getItem("AV_INVENTORY_PIN") || ""; 
let html5QrcodeScanner = null;

let isAdminMode = false;
let isBulkMode = false;
let selectedRows = new Set();
let lastScanTime = 0;
let activeFilterPill = 'all';
let currentViewMode = 'grid'; // Default tampilan: Grid

// Saat Halaman Pertama Dimuat
window.onload = () => {
    checkAdminStatus();
    loadData();
};

// ==========================================
// 1. SISTEM AKSES / GEMBOK
// ==========================================
function checkAdminStatus() {
    if (userPin) {
        isAdminMode = true;
        document.body.classList.add("admin-mode-active");
        document.getElementById("modeStatusText").innerHTML = "🔴 Admin Mode";
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
        if(confirm("Tutup akses Admin? Memori PIN akan dihapus.")) {
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

function showToast(msg, isSuccess = true) {
    const toast = document.getElementById("toastMsg");
    if(!toast) return;
    toast.innerText = msg;
    toast.className = "toast-msg show " + (isSuccess ? "toast-success" : "toast-error");
    setTimeout(() => { toast.classList.remove("show"); }, 2200);
}

// ==========================================
// 2. AMBIL DATA DARI SERVER (GOOGLE SHEETS)
// ==========================================
async function loadData() {
    try {
        document.getElementById("loading").style.display = "block";
        const res = await fetch(SCRIPT_URL + "?action=api&nocache=" + new Date().getTime());
        const data = await res.json();
        
        allItems = data.inventory || [];
        optionsData = data.dropdowns || { lokasi: [], tim: [] };
        
        document.getElementById("loading").style.display = "none";
        applyFilters();
    } catch (e) {
        document.getElementById("loading").innerHTML = `<span style="color:red;">Gagal memuat data. Periksa koneksi internet.</span>`;
    }
}

// ==========================================
// 3. PENGATURAN TAMPILAN (LIST vs GRID & FILTER)
// ==========================================
function toggleViewMode() {
    const btn = document.getElementById("btnViewToggle");
    if (currentViewMode === 'grid') {
        currentViewMode = 'list';
        btn.innerHTML = '🖼️ Grid View';
        document.getElementById("dataContainer").className = "list-view-container";
    } else {
        currentViewMode = 'grid';
        btn.innerHTML = '📄 List View';
        document.getElementById("dataContainer").className = "grid-cards";
    }
    applyFilters();
}

function setFilterPill(status, btnElement) {
    activeFilterPill = status;
    document.querySelectorAll('.pill-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
    applyFilters();
}

function getFilteredData() {
    const q = document.getElementById("searchInput").value.toLowerCase();
    
    return allItems.filter(i => {
        // Carian teks
        const matchQ = i.nama_barang.toLowerCase().includes(q) || 
                       (i.kode_barang||"").toLowerCase().includes(q) || 
                       (i.kode_wadah||"").toLowerCase().includes(q);
        
        // Filter status pil
        let stat = i.status_digunakan || 'Di Gudang';
        if(stat === 'FALSE') stat = 'Di Gudang';
        let matchPill = (activeFilterPill === 'all') ? true : (stat === activeFilterPill);
        
        // Sembunyikan barang di karantina kalau tidak dicari khusus
        if (stat === 'Akan Dibuang' && activeFilterPill !== 'Akan Dibuang') return false; 
        
        return matchQ && matchPill;
    });
}

function applyFilters() {
    render(getFilteredData());
}

function getStatusClass(status) {
    if(status === 'Siap Dibawa') return 'badge-status status-keranjang';
    if(status === 'Sedang Dipakai') return 'badge-status status-dipakai';
    if(status.includes('Perjalanan')) return 'badge-status status-perjalanan';
    return 'badge-status status-gudang'; 
}

// ==========================================
// 4. MENGGAMBAR KARTU BARANG
// ==========================================
function render(data) {
    const container = document.getElementById("dataContainer");
    container.innerHTML = "";
    
    data.forEach(item => {
        const card = document.createElement("div");
        let stat = item.status_digunakan || "Di Gudang";
        if(stat === 'FALSE') stat = "Di Gudang";
        
        const isSelected = selectedRows.has(item.row_index);
        
        // Cari foto pertama yang valid
        let validPhotos = item.fotos.filter(f => f && f.includes("http"));
        const imageSrc = validPhotos.length > 0 ? validPhotos[0] : 'https://placehold.co/300x300/EEEEEE/999999?text=NO+IMAGE';
        const kodeBadge = item.kode_barang ? `<span style="color:#ea580c;">#${item.kode_barang}</span>` : "";

        // Jika Tampilan GRID
        if (currentViewMode === 'grid') {
            card.className = "mission-card " + (isSelected ? "selected " : "") + (stat === 'Siap Dibawa' ? "card-siap-dibawa " : "");
            card.innerHTML = `
                ${isSelected ? '<div class="card-check">✓</div>' : ''}
                <div style="position:relative;">
                    <img src="${imageSrc}" class="card-img" loading="lazy">
                    <div style="position:absolute; bottom:12px; right:4px;"><span class="badge-qty">${item.jumlah || 0} Pcs</span></div>
                </div>
                <h4 class="card-title">${item.nama_barang}</h4>
                <div class="card-codes">${kodeBadge} <span>📍 ${item.lokasi || "Gudang"}</span></div>
                <span class="${getStatusClass(stat)}">${stat}</span>
            `;
        } 
        // Jika Tampilan LIST
        else {
            card.className = "list-item " + (isSelected ? "selected " : "") + (stat === 'Siap Dibawa' ? "card-siap-dibawa " : "");
            card.innerHTML = `
                ${isSelected ? '<div class="card-check" style="top:50%; transform:translateY(-50%); right:15px;">✓</div>' : ''}
                <img src="${imageSrc}" class="list-img" loading="lazy">
                <div class="list-info">
                    <h4 class="list-title">${item.nama_barang}</h4>
                    <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center; font-size:10px; font-weight:bold;">
                        ${kodeBadge} 
                        <span>📍 ${item.lokasi || "Gudang"}</span>
                        <span class="${getStatusClass(stat)}" style="width:auto; padding:3px 6px;">${stat}</span>
                        <span class="badge-qty">Total: ${item.jumlah || 0}</span>
                    </div>
                </div>
            `;
        }

        // Kalau di klik, masuk keranjang (jika mode keranjang), atau buka detail
        card.onclick = () => {
            if (isBulkMode) {
                toggleSelection(item.row_index);
            } else {
                openDetailModal(item);
            }
        };
        
        container.appendChild(card);
    });
}

// ==========================================
// 5. FITUR ZOOM GAMBAR FULL SCREEN
// ==========================================
function openZoomModal(imgUrl) {
    document.getElementById("zoomImgSrc").src = imgUrl;
    document.getElementById("zoomModal").classList.add("active");
}

function closeZoomModal() {
    document.getElementById("zoomModal").classList.remove("active");
    // Hilangkan sumber gambar agar saat dibuka lagi tidak nge-bug
    setTimeout(() => { document.getElementById("zoomImgSrc").src = ""; }, 300);
}

// ==========================================
// 6. POP-UP DETAIL BARANG
// ==========================================
function openDetailModal(item) {
    const oldModal = document.getElementById("detailModal");
    if(oldModal) oldModal.remove();

    let stat = item.status_digunakan || "Di Gudang";
    if(stat === 'FALSE') stat = "Di Gudang";
    let lok = item.lokasi || "Gudang KC";

    // MERAKIT GALERI FOTO
    let galleryHtml = `<div class="detail-gallery">`;
    let adaFoto = false;
    
    item.fotos.forEach((foto, i) => {
        if(foto && foto.includes("http")) {
            if(i < 3) {
                // Foto Alat Utama (Index 0,1,2)
                galleryHtml += `<img src="${foto}" class="gallery-img" onclick="openZoomModal('${foto}')">`;
            } else {
                // Foto Wadah (Index 3,4) dengan Frame Oranye
                galleryHtml += `
                <div class="gallery-box">
                    <img src="${foto}" class="gallery-img" style="border:2px solid #ea580c;" onclick="openZoomModal('${foto}')">
                    <span class="badge-wadah">📦 WADAH</span>
                </div>`;
            }
            adaFoto = true;
        }
    });
    
    if(!adaFoto) {
        galleryHtml += `<img src="https://placehold.co/300x200/EEEEEE/999999?text=Tidak+Ada+Foto" class="gallery-img" style="width:100%;">`;
    }
    galleryHtml += `</div>`;

    // DROPDOWN LOKASI & STATUS (DIPISAH!)
    let optionsLokasi = `
        <option value="Gudang KC" ${lok.includes('Gudang') ? 'selected':''}>🏢 Gudang KC</option>
        <option value="Dalam Perjalanan" ${lok === 'Dalam Perjalanan' ? 'selected':''}>🚚 Dalam Perjalanan</option>
        <option value="Di Lokasi Event" ${lok.includes('Event') ? 'selected':''}>📍 Di Lokasi Event</option>
    `;
    
    let optionsStatus = `
        <option value="Di Gudang" ${stat === 'Di Gudang' ? 'selected':''}>📦 Standby / Di Gudang</option>
        <option value="Siap Dibawa" ${stat === 'Siap Dibawa' ? 'selected':''}>🛒 Siap Dibawa (Packing)</option>
        <option value="Sedang Dipakai" ${stat === 'Sedang Dipakai' ? 'selected':''}>🔌 Sedang Dipakai / Aktivasi</option>
        <option value="Sedang Diservis" ${stat === 'Sedang Diservis' ? 'selected':''}>🛠️ Sedang Diservis</option>
    `;

    // Tombol Edit hanya untuk Admin
    let actionButtons = isAdminMode ? `
        <div style="margin-top:15px; text-align:left; border-top:1px dashed #ccc; padding-top:15px;">
            <label style="font-size:11px; font-weight:bold; color:gray; display:block; margin-bottom:4px;">📍 Ubah Lokasi Saat Ini:</label>
            <select id="editLokasi" style="width:100%; padding:8px; border-radius:8px; border:1px solid #ccc; margin-bottom:12px;">
                ${optionsLokasi}
            </select>
            
            <label style="font-size:11px; font-weight:bold; color:gray; display:block; margin-bottom:4px;">🔌 Ubah Status Alat:</label>
            <select id="editStatus" style="width:100%; padding:8px; border-radius:8px; border:1px solid #ccc; margin-bottom:12px; font-weight:bold;">
                ${optionsStatus}
            </select>
            
            <button onclick="saveEditLokasiStatus(${item.row_index})" style="width:100%; padding:12px; background:#ea580c; color:white; border:none; border-radius:8px; font-weight:bold;">💾 SIMPAN PERUBAHAN</button>
        </div>
    ` : `
        <div style="margin-top:15px; padding:10px; background:#f1f5f9; border-radius:8px; font-size:12px; color:#64748b;">
            🔒 Login Akses untuk mengubah status/lokasi.
        </div>
    `;

    // Merakit Seluruh Jendela Detail
    const modalHtml = `
    <div id="detailModal" class="modal-overlay active">
        <div class="modal-content" style="max-width:400px; background:white; padding:20px; border-radius:15px; text-align:center; position:relative;">
            <button onclick="document.getElementById('detailModal').remove()" style="position:absolute; top:15px; right:15px; border:none; background:#f1f5f9; width:30px; height:30px; border-radius:50%; font-weight:bold; cursor:pointer; z-index:10;">✕</button>
            
            ${galleryHtml}
            <p style="font-size:10px; color:gray; margin-top:4px; margin-bottom:15px;">*Klik gambar untuk memperbesar</p>
            
            <h3 style="margin:0; font-weight:900; color:#1e293b; font-size:18px;">${item.nama_barang}</h3>
            <p style="margin:5px 0 15px 0; font-size:13px; color:#ea580c; font-weight:bold;">#${item.kode_barang || '-'} | 📦 Wadah: ${item.kode_wadah || '-'}</p>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px; text-align:left; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">
                <div><span style="color:gray;">Total Qty:</span> <br><b>${item.jumlah || 0} Pcs</b></div>
                <div><span style="color:gray;">Kondisi:</span> <br><b>${item.kondisi || '-'}</b></div>
                <div><span style="color:gray;">📍 Lokasi Saat Ini:</span> <br><b>${lok}</b></div>
                <div><span style="color:gray;">🔌 Status:</span> <br><b>${stat}</b></div>
            </div>

            <div style="text-align:left; margin-top:10px; font-size:11px; color:#475569; background:#fff7ed; padding:8px; border-radius:6px; border:1px solid #fed7aa;">
                <b>📝 Ket:</b> ${item.keterangan_ref || 'Tidak ada catatan.'}
            </div>

            ${actionButtons}
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// ==========================================
// 7. FUNGSI SIMPAN & UPDATE KE SERVER
// ==========================================
async function saveEditLokasiStatus(rowIndex) {
    const nLok = document.getElementById("editLokasi").value;
    const nStat = document.getElementById("editStatus").value;
    
    event.target.innerText = "MEMPROSES..."; 
    event.target.disabled = true;
    
    try {
        const response = await fetch(SCRIPT_URL, { 
            method: "POST", 
            body: JSON.stringify({ 
                action: "update_status_lokasi", 
                pin: userPin, 
                rows: [rowIndex], 
                new_lokasi: nLok, 
                new_status: nStat 
            }) 
        });
        const data = await response.json();
        
        if(data.status === "success") { 
            showToast("Lokasi & Status diperbarui!"); 
            document.getElementById('detailModal').remove(); 
            loadData(); 
        } else {
            alert("Gagal: " + data.message);
        }
    } catch(e) { 
        alert("Error koneksi!"); 
    }
}

// --- TAMBAH BARANG BARU (3 FOTO SAJA) ---
function openAddModal() { 
    if(!isAdminMode) return; 
    document.getElementById("formAdd").reset(); 
    document.getElementById("modalAdd").classList.add("active"); 
}

function closeAddModal() { 
    document.getElementById("modalAdd").classList.remove("active"); 
}

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
    btn.innerText = "MENGUPLOAD... (MOHON TUNGGU)"; 
    btn.disabled = true;

    try {
        let base64Fotos = ["", "", ""]; // Hanya 3 foto alat
        for (let i = 1; i <= 3; i++) {
            const fileInput = document.getElementById("addFoto" + i);
            if (fileInput && fileInput.files.length > 0) { 
                base64Fotos[i-1] = await getBase64(fileInput.files[0]); 
            }
        }
        
        const payload = {
            action: "add_item", 
            pin: userPin,
            nama: document.getElementById("addNama").value, 
            kode_barang: document.getElementById("addKode").value,
            kode_wadah: document.getElementById("addWadah").value, 
            jumlah: document.getElementById("addJumlah").value,
            kondisi: document.getElementById("addKondisi").value, 
            keterangan_ref: document.getElementById("addKet").value,
            fotos: base64Fotos
        };
        
        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
        const data = await response.json();
        
        if (data.status === "success") { 
            showToast("✅ Alat Baru Tersimpan!"); 
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

// ==========================================
// 8. SISTEM KERANJANG & MODE LOADING
// ==========================================
function toggleBulkMode() {
    isBulkMode = !isBulkMode;
    let bar = document.getElementById("bulkBar");
    
    // Buat elemen bar kalau belum ada
    if(!bar) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="bulkBar" class="bulk-bar">
                <span id="bulkCount" class="bulk-info" style="font-weight:bold;">0 Terpilih</span>
                <button onclick="openBulkUpdateModal()" class="btn-bulk-process">Ubah Massal</button>
            </div>
        `);
        bar = document.getElementById("bulkBar");
    }
    
    if (isBulkMode) { 
        document.getElementById("btnBulkMode").innerHTML = `Batalkan`; 
        bar.classList.add("active"); 
    } else { 
        document.getElementById("btnBulkMode").innerHTML = `🛒 Mode Loading`; 
        bar.classList.remove("active"); 
        selectedRows.clear(); 
        document.getElementById("bulkCount").innerText = `0 Terpilih`; 
    }
    applyFilters(); 
}

function toggleSelection(rowIndex) {
    if (selectedRows.has(rowIndex)) selectedRows.delete(rowIndex); 
    else selectedRows.add(rowIndex);
    
    document.getElementById("bulkCount").innerText = `${selectedRows.size} Terpilih`; 
    applyFilters(); 
}

function selectAllVisible() { 
    getFilteredData().forEach(item => selectedRows.add(item.row_index)); 
    document.getElementById("bulkCount").innerText = `${selectedRows.size} Terpilih`; 
    applyFilters(); 
}

function openBulkUpdateModal() {
    if (selectedRows.size === 0) { alert("Pilih minimal 1 barang dulu!"); return; }
    
    const modalHtml = `
    <div id="bulkModal" class="modal-overlay active">
        <div class="modal-content" style="max-width:350px; padding:20px; background:white; border-radius:15px; position:relative;">
            <button onclick="document.getElementById('bulkModal').remove()" style="position:absolute; top:15px; right:15px; border:none; background:#f1f5f9; width:30px; height:30px; border-radius:50%; font-weight:bold;">✕</button>
            
            <h3 style="margin-top:0;">Ubah Status Massal</h3>
            <p style="font-size:12px; color:gray;">Anda memilih <b>${selectedRows.size}</b> alat.</p>
            
            <select id="bulkNewStatus" style="width:100%; padding:10px; margin:15px 0; border-radius:8px; border:1px solid #ccc; font-weight:bold;">
                <option value="Siap Dibawa">🛒 Siap Dibawa (Packing)</option>
                <option value="Sedang Dipakai">🔌 Sedang Dipakai / Aktivasi</option>
                <option value="Di Gudang">📦 Kembalikan ke Gudang</option>
            </select>
            
            <button onclick="processBulkUpdate(this)" style="width:100%; padding:12px; background:#ea580c; color:white; border:none; border-radius:8px; font-weight:bold;">PROSES UPDATE MASSAL</button>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function processBulkUpdate(btn) {
    const newStatus = document.getElementById("bulkNewStatus").value;
    btn.disabled = true; 
    btn.innerText = "MEMPROSES...";
    
    try {
        const response = await fetch(SCRIPT_URL, { 
            method: "POST", 
            body: JSON.stringify({ action: "bulk_update_status", pin: userPin, rows: Array.from(selectedRows), new_status: newStatus }) 
        });
        const data = await response.json();
        
        if(data.status === "success") { 
            document.getElementById('bulkModal').remove(); 
            toggleBulkMode(); 
            loadData(); 
            showToast("✅ Update massal berhasil!"); 
        }
    } catch (e) { alert("Error koneksi jaringan!"); }
}

// ==========================================
// 9. SCANNER KAMERA (PUBLIK BISA PAKAI)
// ==========================================
function openScannerModal() {
    let modal = document.createElement("div"); 
    modal.id = "tempScannerModal"; 
    modal.className = "modal-overlay active";
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width:400px; background:white; padding:15px; border-radius:15px; text-align:center; position:relative;">
            <button onclick="closeScannerModal()" style="position:absolute; top:10px; right:10px; border:none; background:#fef2f2; color:#dc2626; width:35px; height:35px; border-radius:50%; font-weight:bold; cursor:pointer; z-index:9999;">✕</button>
            <h3 style="margin:0 0 10px 0; font-size:16px;">Scan Barcode / QR</h3>
            <div id="qr-reader" style="width:100%; border-radius:10px; overflow:hidden;"></div>
            <p style="font-size:11px; color:gray; margin-top:10px;">Arahkan kamera ke stiker. Alat otomatis dicari.</p>
        </div>
    `;
    document.body.appendChild(modal);

    // Buka Scanner dengan prioritas kamera belakang (environment)
    html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", { 
        fps: 10, 
        qrbox: {width: 250, height: 250}, 
        aspectRatio: 1.0, 
        facingMode: "environment" 
    }, false);
    
    html5QrcodeScanner.render((decodedText) => {
        const now = Date.now(); 
        if (now - lastScanTime < 2000) return; // Jeda 2 detik agar tidak doubel scan
        lastScanTime = now;
        
        const foundItem = allItems.find(i => i.kode_barang === decodedText || i.kode_wadah === decodedText);
        
        if (foundItem) { 
            closeScannerModal(); 
            // Masukkan kode ke kotak pencarian
            document.getElementById('searchInput').value = decodedText; 
            applyFilters(); 
            // Langsung otomatis buka pop-up detailnya!
            openDetailModal(foundItem); 
        } else { 
            showToast(`❌ Kode tidak dikenali!`, false); 
        }
    });
}

function closeScannerModal() { 
    if (html5QrcodeScanner) { 
        html5QrcodeScanner.clear().catch(e => console.log(e)); 
    } 
    const m = document.getElementById("tempScannerModal"); 
    if(m) m.remove(); 
}
