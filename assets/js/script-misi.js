// ==========================================
// MESIN LOGIKA MISSION CONTROL (V.1.0)
// ==========================================

// GANTI DENGAN URL DEPLOYMENT BARU (V.26)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfyc...URL_BARU_V26.../exec"; 

let allMissions = [];
let activeTeam = 'Semua';

window.onload = () => { loadMissions(); };

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
        container.innerHTML = `<div style="text-align:center; padding:20px; color:gray;">Tidak ada misi untuk tim ini.</div>`;
        return;
    }

    filtered.forEach(misi => {
        const isSelesai = (misi.status_misi.toLowerCase() === 'selesai');
        const card = document.createElement("div");
        card.className = `mission-card ${isSelesai ? 'selesai' : ''}`;
        
        let kaitanHtml = misi.kode_barang ? `<span class="badge-kaitan">📦 Link: ${misi.kode_barang}</span>` : '';
        let buttonHtml = isSelesai 
            ? `<button class="btn-complete done">✅ SELESAI (${misi.waktu_selesai})</button>`
            : `<button class="btn-complete" onclick="confirmMission('${misi.row_index}', '${misi.id_misi}', '${misi.kode_barang}')">☑️ TANDAI SELESAI</button>`;

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

async function confirmMission(rowIndex, idMisi, kodeBarang) {
    // Meminta PIN validasi agar tidak sembarang orang bisa centang
    let pinAttempt = prompt(`VALIDASI MISI ${idMisi}\nMasukkan PIN Kapten Lapangan untuk menyelesaikan:`);
    if (!pinAttempt) return;

    // Ubah tombol jadi loading
    event.target.innerText = "⏳ MEMPROSES...";
    event.target.disabled = true;

    try {
        const payload = {
            action: "complete_mission",
            pin: pinAttempt,
            row_index: rowIndex,
            id_misi: idMisi,
            kode_barang: kodeBarang
        };

        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
        const data = await response.json();

        if (data.status === "success") {
            showToast(`✅ Misi ${idMisi} Selesai! Gudang Diupdate.`);
            loadMissions(); // Refresh data untuk mengubah warna kartu
        } else {
            alert("Gagal:\n" + data.message);
            event.target.innerText = "☑️ TANDAI SELESAI";
            event.target.disabled = false;
        }
    } catch (e) {
        alert("Error Jaringan:\n" + e.message);
        event.target.innerText = "☑️ TANDAI SELESAI";
        event.target.disabled = false;
    }
}
