// ==========================================
// MESIN LOGIKA MISSION CONTROL (V.7.0 - KLIK DETAIL BARANG)
// ==========================================

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxm4eJGQjBytrLTQgYrsfEXIQxLQ_Rq7NFVM__Y8AhRfzPe8q5FJhofecqrDJ5ywkeBEg/exec"; 

const VALID_MISSION_PINS = ["123456", "v9t6c2"]; 
let userPin = localStorage.getItem("AV_MISSION_PIN") || ""; 

let isAdminMode = false;
let allMissions = [];
let allInventory = []; 
let activeTeam = ''; 
let isDataLoaded = false; 

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
    if (isDataLoaded) renderMissions();
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
                userPin = pinAttempt; 
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
            allInventory = data.inventory || []; 
            isDataLoaded = true; 
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
    if (isDataLoaded) renderMissions();
}

function renderMissions() {
    if (!isDataLoaded) return; 

    const container = document.getElementById("missionsContainer");
    container.innerHTML = "";
    
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
        
        let packageHtml = '';
        if (misi.kode_barang) {
            let codes = misi.kode_barang.split(','); 
            packageHtml += `<div class="package-list"><div style="font-size:10px; font-weight:bold; color:gray; margin-bottom:4px;">📦 Target Paket Barang:</div>`;
            
            codes.forEach(c => {
                let codeClean = c.trim();
                if(!codeClean) return;
                
                let foundItem = allInventory.find(inv => inv.kode_barang && inv.kode_barang.toLowerCase() === codeClean.toLowerCase());
                
                if (foundItem) {
                    let safeFileIds = foundItem.file_ids || []; 
                    let firstFileId = safeFileIds.find(id => id && id.length > 5); 
                    let imgUrl = 'https://placehold.co/100x100/EEEEEE/999999?text=NO+IMG';
                    if(firstFileId) imgUrl = firstFileId.includes("http") ? firstFileId : `https://drive.google.com/thumbnail?id=${firstFileId}&sz=w200`;
                    
                    // TAMBAHAN: Efek Hover & Klik untuk Buka Detail
                    packageHtml += `<div class="package-item" style="cursor:pointer; transition:0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='white'" onclick="openItemDetail('${foundItem.kode_barang}')">
                        <img src="${imgUrl}" class="pkg-img" loading="lazy">
                        <div class="pkg-info">
                            <div class="pkg-name">${foundItem.nama_barang}</div>
                            <div class="pkg-code">#${foundItem.kode_barang} <span style="font-weight:normal; font-size:9px; color:#94a3b8;">(Klik lihat detail)</span></div>
                        </div>
                    </div>`;
                } else {
                    packageHtml += `<div class="package-item">
                        <div class="pkg-info">
                            <div class="pkg-code" style="color:gray;">#${codeClean} (Barang tidak ditemukan)</div>
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

// ==========================================
// POP-UP DETAIL READ-ONLY & ZOOM
// ==========================================
function openItemDetail(kodeBarang) {
    const item = allInventory.find(i => i.kode_barang && i.kode_barang.toLowerCase() === kodeBarang.toLowerCase());
    if(!item) return;

    const oldModal = document.getElementById("detailModal"); 
    if(oldModal) oldModal.remove();

    let stat = item.status_digunakan || "Di Gudang"; if(stat === 'FALSE') stat = "Di Gudang"; 
    let lok = item.lokasi || "Gudang KC (SMG)";

    let galleryHtml = `<div class="detail-gallery">`; 
    let adaFoto = false; 
    let safeFileIds = item.file_ids || item.fotos || [];
    safeFileIds.forEach((fileId, i) => { 
        if(fileId && fileId.length > 5) { 
            let thumbUrl = fileId.includes("http") ? fileId : `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`; 
            let highResUrl = fileId.includes("http") ? fileId.replace('sz=800', 'sz=s2000') : `https://drive.google.com/thumbnail?id=${fileId}&sz=s2000`; 
            galleryHtml += `<img src="${thumbUrl}" class="gallery-img" onclick="openZoomModal('${highResUrl}')">`; 
            adaFoto = true; 
        } 
    });
    if(!adaFoto) galleryHtml += `<img src="https://placehold.co/300x200/EEEEEE/999999?text=Tidak+Ada+Foto" class="gallery-img" style="width:100%;">`; 
    galleryHtml += `</div>`;

    // Modal khusus Read-Only (Tanpa tombol edit sama sekali)
    const modalHtml = `
    <div id="detailModal" class="modal-overlay active">
        <div class="modal-content" style="max-width:400px; background:white; padding:20px; border-radius:15px; text-align:center; position:relative;">
            <button onclick="document.getElementById('detailModal').remove()" style="position:absolute; top:15px; right:15px; border:none; background:#f1f5f9; width:30px; height:30px; border-radius:50%; font-weight:bold; cursor:pointer; z-index:10;">✕</button>
            ${galleryHtml}
            <h3 style="margin:0; font-weight:900; color:#1e293b; font-size:18px;">${item.nama_barang}</h3>
            <p style="margin:5px 0 10px 0; font-size:12px; color:#ea580c; font-weight:bold;">#${item.kode_barang || '-'}</p>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px; text-align:left; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">
                <div><span style="color:gray;">Kondisi:</span> <br><b>${item.kondisi || '-'}</b></div>
                <div><span style="color:gray;">📍 Lokasi:</span> <br><b>${lok}</b></div>
                <div style="grid-column: 1 / -1;"><span style="color:gray;">🔌 Status Gudang:</span> <br><b>${stat}</b></div>
            </div>
            
            <div style="text-align:left; margin-top:10px; font-size:11px; color:#475569; background:#fff7ed; padding:8px; border-radius:6px; border:1px solid #fed7aa;">
                <b>📝 Catatan / Referensi:</b> <br>${item.keterangan_ref || 'Tidak ada catatan.'}
            </div>
            <div style="margin-top:15px; font-size:10px; color:gray;">Mode Baca (Read-Only)</div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function openZoomModal(imgUrl) { 
    let zoomModal = document.getElementById("zoomModal");
    if (!zoomModal) {
        document.body.insertAdjacentHTML('beforeend', `<div id="zoomModal" class="zoom-overlay" onclick="closeZoomModal()"><button class="btn-back-zoom" onclick="closeZoomModal()">⬅ Kembali</button><img id="zoomImgSrc" src="" style="max-width:95vw; max-height:90vh; object-fit:contain; border-radius:8px;" onclick="event.stopPropagation()"></div>`);
        zoomModal = document.getElementById("zoomModal");
    }
    document.getElementById("zoomImgSrc").src = imgUrl; 
    zoomModal.classList.add("active"); 
}
function closeZoomModal() { 
    const zoomModal = document.getElementById("zoomModal");
    if(zoomModal) {
        zoomModal.classList.remove("active"); 
        setTimeout(() => { document.getElementById("zoomImgSrc").src = ""; }, 300); 
    }
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
