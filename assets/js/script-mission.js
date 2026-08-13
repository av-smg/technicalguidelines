// ==========================================
// MESIN LOGIKA MISSION CARD
// ==========================================

// Ganti URL ini dengan URL Web App Mission Card kamu yang sebenarnya
const MISSION_SCRIPT_URL = "URL_APPS_SCRIPT_MISSION_CARD_KAMU_DISINI"; 
let allMissions = [];

window.onload = () => {
    // Uncomment baris di bawah ini kalau URL-nya sudah kamu isi!
    // loadMissionData(); 
    
    // Ini Data Dummy Sementara biar kamu bisa lihat tampilannya
    renderMissions([
        { tim: "Tim Audio", tugas: "Tarik kabel XLR dari Stage ke FOH", gambar: "https://placehold.co/600x400?text=Skema+Audio" },
        { tim: "Tim Visual", tugas: "Pasang LED Screen 3x4 meter", gambar: "https://placehold.co/600x400?text=Skema+LED" }
    ]);
};

async function loadMissionData() {
    try {
        const loadingEl = document.getElementById("loadingMission");
        if(loadingEl) loadingEl.style.display = "block";

        const res = await fetch(MISSION_SCRIPT_URL + "?action=getMissions&nocache=" + new Date().getTime());
        const data = await res.json();
        allMissions = data;
        
        if(loadingEl) loadingEl.style.display = "none";
        renderMissions(allMissions);
    } catch (e) {
        console.error("Gagal load mission card", e);
    }
}

function filterMissions() {
    const q = document.getElementById("searchMission").value.toLowerCase();
    const filtered = allMissions.filter(m => 
        (m.tim && m.tim.toLowerCase().includes(q)) || 
        (m.tugas && m.tugas.toLowerCase().includes(q))
    );
    renderMissions(filtered);
}

function renderMissions(data) {
    const container = document.getElementById("missionContainer");
    if(!container) return;
    container.innerHTML = "";
    
    data.forEach(item => {
        const card = document.createElement("div");
        card.className = "mission-card";
        
        const imgHtml = item.gambar ? `<img src="${item.gambar}" class="card-img" style="cursor:zoom-in;" onclick="openZoom('${item.gambar}')" loading="lazy">` : '';

        card.innerHTML = `
            ${imgHtml}
            <h4 class="card-title" style="color:#ea580c; font-size:14px; margin-top:10px;">${item.tim}</h4>
            <p style="font-size:12px; color:#334155; line-height:1.4;">${item.tugas}</p>
        `;
        container.appendChild(card);
    });
}

// -----------------------------------------
// FITUR ZOOM GAMBAR ANTI BUG
// -----------------------------------------
function openZoom(imageSrc) {
    const modal = document.getElementById("imageZoomModal");
    const imgEl = document.getElementById("zoomedImage");
    
    if (modal && imgEl) {
        imgEl.src = imageSrc;
        modal.classList.add("active");
    }
}

function closeZoom() {
    const modal = document.getElementById("imageZoomModal");
    if (modal) {
        modal.classList.remove("active");
        setTimeout(() => { document.getElementById("zoomedImage").src = ""; }, 300); // Bersihkan src setelah animasi tertutup
    }
}
