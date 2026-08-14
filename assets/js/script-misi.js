// ==========================================
// MESIN LOGIKA MISSION CONTROL (V.5.0)
// ==========================================

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxm4eJGQjBytrLTQgYrsfEXIQxLQ_Rq7NFVM__Y8AhRfzPe8q5FJhofecqrDJ5ywkeBEg/exec"; 

const VALID_MISSION_PINS = ["123456", "v9t6c2"]; 
let userPin = localStorage.getItem("AV_MISSION_PIN") || ""; 

let isAdminMode = false;
let allMissions = [];
let allInventory = []; // Menyimpan data gudang untuk dicocokkan dengan Misi
let activeTeam = ''; // Kosong secara default agar user dipaksa milih

window.onload = () => { checkAdminStatus(); loadMissions(); };

function checkAdminStatus() {
    if (userPin && VALID_MISSION_PINS.includes(userPin)) {
        isAdminMode = true;
        document.body.classList.add("admin-mode-active");
        document.getElementById("modeStatusText").innerHTML = "🔴 Akses Eksekutor Aktif";
        document.getElementById("btnUnlock").innerText = "🔓 Tutup Akses";
    } else {
        isAdminMode = false;
        userPin = "";
        document.body.classList.remove("admin-mode-active");
        document.getElementById("modeStatusText").innerHTML = "🟢 Read-Only Mode";
        document.getElementById("btnUnlock").innerText = "🔒 Buka Akses";
    }
    // Paksa kartu dirender ulang agar tombol Gembok langsung berubah tanpa refresh!
    renderMissions();
}

function toggleAdminMode() {
    if (isAdminMode) {
        if(confirm("Tutup akses Eksekutor? Memori PIN akan dihapus.")) {
            localStorage.removeItem("AV_MISSION_PIN");
            checkAdminStatus(); 
            showToast("Mode Read-Only aktif.");
        }
    } else {
        let input = prompt("Masukkan PIN Kapten Lapangan / Master:");
        if (input) {
            let pinAttempt = input.trim().toLowerCase();
            if (VALID_MISSION_PINS.includes(pinAttempt)) {
                localStorage.setItem("AV_MISSION_PIN", pinAttempt);
                userPin = pinAttempt; // Pastikan variabel memori langsung terisi
                checkAdminStatus(); // Panggil fungsi perubah UI
                showToast("Akses Terbuka! Silakan eksekusi misi.");
            } else {
                alert("⛔ AKSES DITOLAK! PIN tidak dikenali untuk area ini.");
            }
        }
    }
}

function showToast(msg) {
    const t = document.getElementById("toastMsg");
    if(!t) return;
    t.innerText = msg;
    t.classList.add("show");
    setTimeout(() => { t.classList.remove("show"); }, 3000);
}

async function loadMissions() {
    try {
        const res = await fetch(SCRIPT_URL + "?action=api&nocache=" + new Date().getTime());
        const data = await res.json();
        if(data.status === "success") {
            allMissions = data.missions || [];
            allInventory = data.inventory || []; // Simpan data gudang untuk foto
            document.getElementById("loading").style.display = "none";
            renderMissions();
        } else {
            document.getElementById("loading").innerText = "Gagal memuat data dari server.";
        }
    } catch (e) {
        document.getElementById("loading").innerText = "Error Jaringan. Periksa koneksi Anda.";
    }
}

function setTeamFilter(teamName) {
    activeTeam = teamName;
    document.querySelectorAll('.btn-team').forEach(btn => {
        btn.classList.remove('active');
        if(btn.innerText.includes(teamName)) btn.classList.add('active');
    });
    renderMissions();
}

function renderMissions() {
    const container = document.getElementById("missionsContainer");
    container.innerHTML = "";
    
    // Jika belum milih tim, suruh milih
    if (activeTeam === '') {
        container.innerHTML = `<div style="text-align:center; padding:40px 20px; color:#64748b; grid-column: 1 / -1;">
            <h3 style="margin-bottom:5px;">Pilih Divisi Tim 👆</h3>
            <p style="font-size:12px; margin-top:0;">Silakan pilih salah satu tombol tim di atas untuk melihat daftar tugas yang harus diselesaikan.</p>
        </div>`;
        return;
    }

    let filtered = allMissions.filter(m => m.tim.toLowerCase().includes(activeTeam.toLowerCase()));

    if(filtered.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:40px 20px; color:#64748b; grid-column: 1 / -1;">
            ✅ Belum ada tugas / semua tugas telah selesai untuk tim ini.
        </div>`;
        return;
    }

    filtered.forEach(misi => {
        const isSelesai = (misi.status_misi.toLowerCase() === 'selesai');
        const card = document.createElement("div");
        card.className = `mission-card ${isSelesai ? 'selesai' : ''}`;
        
        // LOGIKA PENCOCOKAN PAKET BARANG & FOTO
        let packageHtml = '';
        if (misi.kode_barang) {
            let codes = misi.kode_barang.split(','); // Memisahkan jika ada banyak kode
            packageHtml += `<div class="package-list"><div style="font-size:10px; font-weight:bold; color:gray; margin-bottom:4px;">📦 Target Paket Barang:</div>`;
            
            codes.forEach(c => {
                let codeClean = c.trim();
                if(!codeClean) return;
                
                // Cari kode ini di database gudang
                let foundItem = allInventory.find(inv => inv.kode_barang && inv.kode_barang.toLowerCase() === codeClean.toLowerCase());
                
                if (foundItem) {
                    let safeFileIds = foundItem.file_ids || []; 
                    let firstFileId = safeFileIds.find(id => id && id.length > 5); 
                    let imgUrl = 'https://placehold.co/100x100/EEEEEE/999999?text=NO+IMG';
                    if(firstFileId) imgUrl = firstFileId.includes("http") ? firstFileId : `https://drive.google.com/thumbnail?id=${firstFileId}&sz=w200`;
                    
                    packageHtml += `<div class="package-item">
                        <img src="${imgUrl}" class="pkg-img" loading="lazy">
                        <div class="pkg-info">
                            <div class="pkg-name">${foundItem.nama_barang}</div>
                            <div class="pkg-code">#${foundItem.kode_barang}</div>
                        </div>
                    </div>`;
                } else {
                    packageHtml += `<div class="package-item">
                        <div class="pkg-info">
                            <div class="pkg-code" style="color:gray;">#${codeClean} (Barang tidak ditemukan di gudang)</div>
                        </div>
                    </div>`;
                }
            });
            packageHtml += `</div>`;
        }
        
        let buttonHtml = '';
        if (isSelesai) {
            buttonHtml = `<button class="btn-complete done">✅ SELESAI (${misi.waktu_selesai})</button>`;
        } else {
            if (isAdminMode) {
                buttonHtml = `<button class="btn-complete" onclick="confirmMission(event, '${misi.row_index}', '${misi.id_misi}', '${misi.kode_barang}')">☑️ TANDAI SELESAI</button>`;
            } else {
                buttonHtml = `<button class="btn-complete" style="background:#94a3b8;" onclick="toggleAdminMode()">🔒 KUNCI (LOGIN)</button>`;
            }
        }

        card.innerHTML = `
            <div class="mission-top">
                <span class="mission-id">${misi.id_misi}</span>
                <span class="badge-zona">📍 ${misi.zona || '-'}</span>
            </div>
            <h3 class="mission-title">${misi.tugas}</h3>
            ${packageHtml}
            <div class="mission-action">
                ${buttonHtml}
            </div>
        `;
        container.appendChild(card);
    });
}

async function confirmMission(event, rowIndex, idMisi, kodeBarang) {
    if (!confirm(`Konfirmasi:\nApakah tugas ${idMisi} sudah terpasang dengan benar di lapangan?`)) return;

    const btn = event.target;
    btn.innerText = "⏳ MEMPROSES...";
    btn.disabled = true;

    try {
        const payload = {
            action: "complete_mission",
            pin: userPin,  
            row_index: rowIndex,
            id_misi: idMisi,
            kode_barang: kodeBarang
        };

        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
        const data = await response.json();

        if (data.status === "success") {
            showToast(`✅ Misi Selesai! Gudang Diupdate.`);
            loadMissions(); 
        } else {
            alert("Gagal:\n" + data.message);
            btn.innerText = "☑️ TANDAI SELESAI";
            btn.disabled = false;
        }
    } catch (e) {
        alert("Error Jaringan:\n" + e.message);
        btn.innerText = "☑️ TANDAI SELESAI";
        btn.disabled = false;
    }
}
