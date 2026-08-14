// ==========================================
// MESIN LOGIKA MISSION CONTROL (V.2.0 - PIN AUTH)
// ==========================================

// ⚠️ GANTI DENGAN URL DEPLOYMENT BARUMU!
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyYNghkn3XZNfFXRzuWr0BSZf3EC8IZ80KoTO0llMMyouC5ozFfmV8dcAq2zOCTLW0Smg/exec"; 

const VALID_PINS = ["a1b2c3", "v9t6c2", "123456"];
let userPin = localStorage.getItem("AV_INVENTORY_PIN") || "";
let isAdminMode = false;
let allMissions = [];
let activeTeam = 'Semua';

window.onload = () => { checkAdminStatus(); loadMissions(); };

function checkAdminStatus() {
    if (userPin && VALID_PINS.includes(userPin)) {
        isAdminMode = true;
        document.body.classList.add("admin-mode-active");
        document.getElementById("modeStatusText").innerHTML = "🔴 Akses Eksekutor";
        document.getElementById("btnUnlock").innerText = "🔓 Tutup Akses";
    } else {
        isAdminMode = false;
        userPin = "";
        document.body.classList.remove("admin-mode-active");
        document.getElementById("modeStatusText").innerHTML = "🟢 Read-Only Mode";
        document.getElementById("btnUnlock").innerText = "🔒 Buka Akses";
    }
    // Jika data sudah terload, render ulang agar tombol gembok berubah
    if (allMissions.length > 0) renderMissions();
}

function toggleAdminMode() {
    if (isAdminMode) {
        if(confirm("Tutup akses? Memori PIN akan dihapus.")) {
            localStorage.removeItem("AV_INVENTORY_PIN");
            checkAdminStatus();
            showToast("Mode Read-Only aktif.");
        }
    } else {
        let input = prompt("Masukkan PIN Kapten Lapangan:");
        if (input) {
            let pinAttempt = input.trim().toLowerCase();
            if (VALID_PINS.includes(pinAttempt)) {
                localStorage.setItem("AV_INVENTORY_PIN", pinAttempt);
                checkAdminStatus();
                showToast("Akses Terbuka! Silakan eksekusi misi.");
            } else {
                alert("⛔ AKSES DITOLAK! PIN salah.");
            }
        }
    }
}

function showToast(msg) {
    const t = document.getElementById("toastMsg");
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
    
    let filtered = allMissions.filter(m => {
        if(activeTeam === 'Semua') return true;
        return m.tim.toLowerCase().includes(activeTeam.toLowerCase());
    });

    if(filtered.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:20px; color:gray;">Belum ada data misi. Pastikan nama Sheet di Google adalah "Database_Misi".</div>`;
        return;
    }

    filtered.forEach(misi => {
        const isSelesai = (misi.status_misi.toLowerCase() === 'selesai');
        const card = document.createElement("div");
        card.className = `mission-card ${isSelesai ? 'selesai' : ''}`;
        
        let kaitanHtml = misi.kode_barang ? `<span class="badge-kaitan">📦 Link: ${misi.kode_barang}</span>` : '';
        
        // Logika Tombol Gembok
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
            <div>${kaitanHtml}</div>
            <div class="mission-action">
                ${buttonHtml}
            </div>
        `;
        container.appendChild(card);
    });
}

async function confirmMission(event, rowIndex, idMisi, kodeBarang) {
    if (!confirm(`Konfirmasi:\nApakah tugas ${idMisi} sudah terpasang dengan benar di lapangan?`)) return;

    // Ubah tombol jadi loading
    const btn = event.target;
    btn.innerText = "⏳ MEMPROSES...";
    btn.disabled = true;

    try {
        const payload = {
            action: "complete_mission",
            pin: userPin,  // Otomatis menembak PIN dari memori login
            row_index: rowIndex,
            id_misi: idMisi,
            kode_barang: kodeBarang
        };

        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
        const data = await response.json();

        if (data.status === "success") {
            showToast(`✅ Misi Selesai! Gudang Diupdate.`);
            loadMissions(); // Refresh data untuk merubah kartu jadi hijau
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
