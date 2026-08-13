// ==========================================
// MESIN LOGIKA GUDANG & LOGISTIK
// ==========================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyg6ntp8BPWPP8qm9IfpN62Rwd272tAEiTM0Qgl1GQQkUqJGcViG-FnewlFqFTjZ4w-Zg/exec"; 

let allItems = [];
let optionsData = { tim: [] };
let userPin = localStorage.getItem("AV_INVENTORY_PIN") || ""; 
let html5QrcodeScanner = null;

// VARIABEL STATUS
let isAdminMode = false;
let isBulkMode = false;
let selectedRows = new Set();
let lastScanTime = 0;
let activeFilterPill = 'all';

// KETIKA WEB DIBUKA
window.onload = () => {
    checkAdminStatus();
    loadData();
};

// -----------------------------------------
// 1. SISTEM GEMBOK ADMIN (READ-ONLY vs ADMIN)
// -----------------------------------------
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
        // Logout
        if(confirm("Tutup akses Admin?")) {
            localStorage.removeItem("AV_INVENTORY_PIN");
            userPin = "";
            checkAdminStatus();
            showToast("Akses dikunci. Mode Read-Only.");
        }
    } else {
        // Login
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

// -----------------------------------------
// 2. AMBIL DATA DARI SERVER
// -----------------------------------------
async function loadData() {
    try {
        const loadingEl = document.getElementById("loading");
        if(loadingEl) loadingEl.style.display = "block";

        const res = await fetch(SCRIPT_URL + "?action=api&nocache=" + new Date().getTime());
        const rawData = await res.json();
        
        allItems = rawData.inventory.filter(item => item.nama_barang && item.nama_barang.toLowerCase() !== 'nama barang');
        optionsData = rawData.dropdowns || { tim: [] };
        
        if(loadingEl) loadingEl.style.display = "none";
        
        populateTeams();
        applyFilters();
    } catch (e) {
        console.error(e);
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

// -----------------------------------------
// 3. FILTER & RENDER TAMPILAN
// -----------------------------------------
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
        if (finalStatus === 'Akan Dibuang' && activeFilterPill !== 'Akan Dibuang') return false; // Sembunyikan tong sampah

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

        card.onclick = () => {
            if (isBulkMode) toggleSelection(item.row_index);
            // else if(isAdminMode) openModalEdit(item); // Aktifkan jika form edit sudah dibuat
        };
        container.appendChild(card);
    });
}

// -----------------------------------------
// 4. SISTEM KERANJANG & SCANNER KASIR
// -----------------------------------------
function toggleBulkMode() {
    isBulkMode = !isBulkMode;
    const btn = document.getElementById("btnBulkMode");
    const bar = document.getElementById("bulkBar");
    
    if (isBulkMode) {
        btn.innerHTML = `Batalkan`;
        bar.classList.add("active");
    } else {
        btn.innerHTML = `🛒 Mode Loading`;
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
    const currentFiltered = getFilteredData();
    currentFiltered.forEach(item => selectedRows.add(item.row_index));
    document.getElementById("bulkCount").innerText = `${selectedRows.size} Terpilih`;
    applyFilters();
}

function openBulkUpdateModal() {
    if (selectedRows.size === 0) { alert("Pilih minimal 1 barang dulu!"); return; }
    // Nanti kita hubungkan ini ke form modal update kalau di-klik
    document.getElementById("modalBulk").classList.add("active");
}

function openScannerModal() {
    // Pastikan admin mode aktif
    if(!isAdminMode) return;
    
    let modal = document.createElement("div");
    modal.id = "tempScannerModal";
    modal.className = "modal-overlay active";
    modal.innerHTML = `
        <div class="modal-content" style="max-width:400px; background:white; padding:20px; border-radius:15px; text-align:center;">
            <button onclick="closeScannerModal()" style="float:right; border:none; background:none; font-size:20px;">✕</button>
            <h3>Scanner Gudang</h3>
            <div id="qr-reader"></div>
            <p style="font-size:11px; color:gray; margin-top:10px;">Arahkan kamera ke stiker QR.</p>
        </div>
    `;
    document.body.appendChild(modal);

    html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", { fps: 5, qrbox: 250, aspectRatio: 1.0 }, false);
    html5QrcodeScanner.render((decodedText) => {
        const now = Date.now();
        if (now - lastScanTime < 2000) return; // Jeda 2 detik antar scan
        lastScanTime = now;

        const foundItem = allItems.find(i => i.kode_barang === decodedText || i.kode_wadah === decodedText);

        if (isBulkMode && foundItem) {
            if (!selectedRows.has(foundItem.row_index)) {
                selectedRows.add(foundItem.row_index);
                document.getElementById("bulkCount").innerText = `${selectedRows.size} Terpilih`;
                applyFilters();
                showToast(`✅ ${foundItem.nama_barang} ditambahkan!`);
                try { navigator.vibrate(100); } catch(e){}
            } else {
                showToast(`⚠️ Sudah ada di keranjang!`, false);
            }
        } else if (foundItem) {
            closeScannerModal();
            document.getElementById('searchInput').value = decodedText; 
            applyFilters(); 
        } else {
            showToast(`❌ Kode tidak dikenali!`, false);
        }
    });
}

function closeScannerModal() {
    if (html5QrcodeScanner) html5QrcodeScanner.clear();
    const modal = document.getElementById("tempScannerModal");
    if(modal) modal.remove();
}
