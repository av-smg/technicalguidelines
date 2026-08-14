// ==========================================
// MESIN LOGIKA MISSION CONTROL (V.4.0 - URL BARU & PIN TERPISAH)
// ==========================================

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxm4eJGQjBytrLTQgYrsfEXIQxLQ_Rq7NFVM__Y8AhRfzPe8q5FJhofecqrDJ5ywkeBEg/exec"; 

// HANYA KAPTEN TIM (123456) DAN MASTER DEV (v9t6c2) YANG BISA AKSES
const VALID_MISSION_PINS = ["123456", "v9t6c2"]; 
let userPin = localStorage.getItem("AV_MISSION_PIN") || ""; 

let isAdminMode = false;
let allMissions = [];
let activeTeam = 'Semua';

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
    if (allMissions.length > 0) renderMissions();
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
                checkAdminStatus();
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
        container.innerHTML = `<div style="text-align:center; padding:20px; color:gray;">Belum ada data misi untuk tim ini.</div>`;
        return;
    }

    filtered.forEach(misi => {
        const isSelesai = (misi.status_misi.toLowerCase() === 'selesai');
        const card = document.createElement("div");
        card.className = `mission-card ${isSelesai ? 'selesai' : ''}`;
        
        let kaitanHtml = misi.kode_barang ? `<span class="badge-kaitan">📦 Link: ${misi.kode_barang}</span>` : '';
        
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
