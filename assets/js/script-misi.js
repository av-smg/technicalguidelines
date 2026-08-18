// ==========================================
// MESIN LOGIKA MISSION CONTROL (V.17.0 - GLOBAL LOGIN & AUDIT TRAIL)
// ==========================================

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxm4eJGQjBytrLTQgYrsfEXIQxLQ_Rq7NFVM__Y8AhRfzPe8q5FJhofecqrDJ5ywkeBEg/exec"; 
const API_BACKEND_PIN = "123456"; // Ghost PIN untuk menembus server GAS lama

// Ambil Sesi Login Global dari Navbar
const currentUserRole = localStorage.getItem('av_session_role');
const currentUserName = localStorage.getItem('av_session_nama');

let isAdminMode = false, allMissions = [], allInventory = [], activeTeam = '', isDataLoaded = false;
let html5QrCode = null; 
let isHideCompleted = false; 
let currentCameraFacing = "environment"; 
let isFlashlightOn = false;

const teamRoster = {
    "speaker": { kapten: "Malkhiel", asisten: "Yoka" },
    "kabel": { kapten: "Vina", asisten: "Anggid" },
    "booth": { kapten: "Evan", asisten: "Truna" },
    "inventaris": { kapten: "Emma", asisten: "Peni" }
};

window.onload = () => { checkAdminStatus(); loadMissions(); };

function checkAdminStatus() {
    // Otomatis cek apakah yang login berhak eksekusi Misi (Master atau Kapten)
    if (currentUserRole === "Master" || currentUserRole === "Kapten") {
        isAdminMode = true; 
        document.body.classList.add("admin-mode-active");
    } else {
        isAdminMode = false; 
        document.body.classList.remove("admin-mode-active");
    }
    if (isDataLoaded) renderMissions();
}

function showToast(msg, isSuccess = true) { 
    const t = document.getElementById("toastMsg"); if(!t) return; 
    t.innerText = msg; t.className = "toast-msg show " + (isSuccess ? "" : "error"); 
    t.style.zIndex = "999999"; 
    setTimeout(() => { t.classList.remove("show"); }, 3000); 
}

function triggerFeedback(type) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        if (type === 'success') {
            osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime);
            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            osc.start(); osc.stop(ctx.currentTime + 0.1);
            if(navigator.vibrate) navigator.vibrate(100);
        } else {
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, ctx.currentTime);
            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            osc.start(); osc.stop(ctx.currentTime + 0.3);
            if(navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]);
        }
    } catch(e) { console.log("Audio API not supported"); }
}

function getThumbUrl(item) { 
    if(!item) return 'https://placehold.co/100x100/EEEEEE/999999?text=NO+IMG';
    let fileIds = item.file_ids || item.fotos || []; 
    if (typeof fileIds === 'string') fileIds = fileIds.split(',');
    if (!Array.isArray(fileIds)) fileIds = [];
    let firstFileId = fileIds.find(id => id && String(id).trim().length > 5); 
    if(!firstFileId) return 'https://placehold.co/100x100/EEEEEE/999999?text=NO+IMG'; 
    firstFileId = String(firstFileId).trim();
    return firstFileId.includes("http") ? firstFileId : `https://drive.google.com/thumbnail?id=${firstFileId}&sz=w200`; 
}

async function loadMissions() {
    try {
        const res = await fetch(SCRIPT_URL + "?action=api&nocache=" + new Date().getTime()); const data = await res.json();
        if(data.status === "success") { allMissions = data.missions || []; allInventory = data.inventory || []; isDataLoaded = true; document.getElementById("loading").style.display = "none"; renderMissions(); } 
        else { document.getElementById("loading").innerText = "Gagal memuat data dari server."; }
    } catch (e) { document.getElementById("loading").innerText = "Error Jaringan. Periksa koneksi Anda."; }
}

function setTeamFilter(teamName) { activeTeam = teamName; document.querySelectorAll('.btn-team').forEach(btn => { btn.classList.remove('active'); if(btn.innerText.includes(teamName)) btn.classList.add('active'); }); if (isDataLoaded) renderMissions(); }
function toggleHideCompleted() { isHideCompleted = !isHideCompleted; renderMissions(); }

function toggleMissionContent(element) { 
    const content = element.nextElementSibling; 
    const icon = element.querySelector('.toggle-icon');
    content.classList.toggle('open'); 
    if (content.classList.contains('open')) { if (icon) icon.innerText = '▲'; } 
    else { if (icon) icon.innerText = '▼'; }
}

function renderMissions() {
    if (!isDataLoaded) return; const container = document.getElementById("missionsContainer"); container.innerHTML = "";
    if (activeTeam === '') { container.innerHTML = `<div style="text-align:center; padding:30px 15px; color:#64748b; font-size:12px; grid-column: 1 / -1;"><h3 style="margin-bottom:5px;">Pilih Divisi Tim 👆</h3></div>`; return; }
    
    let filtered = allMissions.filter(m => String(m.tim || "").toLowerCase().includes(activeTeam.toLowerCase()));
    if(filtered.length === 0) { container.innerHTML = `<div style="text-align:center; padding:30px 15px; color:#64748b; font-size:12px; grid-column: 1 / -1;">✅ Belum ada tugas untuk tim ini.</div>`; return; }

    let totalMisi = filtered.length;
    let selesaiMisi = filtered.filter(m => String(m.status_misi || "").toLowerCase() === 'selesai').length;
    let persentase = Math.round((selesaiMisi / totalMisi) * 100);
    let teamLower = activeTeam.toLowerCase();

    // 1. BANNER CONTACT PERSON
    let rosterHtml = "";
    let foundTeamKey = Object.keys(teamRoster).find(k => teamLower.includes(k));
    if (foundTeamKey) {
        let cp = teamRoster[foundTeamKey];
        rosterHtml = `
        <div style="background:#eff6ff; border:1px solid #bfdbfe; color:#1e3a8a; padding:6px 10px; border-radius:6px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center; grid-column: 1 / -1;">
            <div>
                <div style="font-size:8px; font-weight:bold; color:#3b82f6; margin-bottom:2px;">📞 CONTACT PERSON</div>
                <div style="font-size:10px;"><b>👑 Kapten:</b> ${cp.kapten} &nbsp; <b>🛠️ Asisten:</b> ${cp.asisten}</div>
            </div>
            <div style="font-size:16px; opacity:0.8;">📱</div>
        </div>`;
    }

    // 2. KOTAK PRIORITAS PEMASANGAN
    let prioritasHtml = `
    <div class="priority-box" style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; margin-bottom:8px; grid-column: 1 / -1; overflow:hidden;">
        <div class="priority-header" onclick="this.nextElementSibling.classList.toggle('open')" style="cursor:pointer; padding:6px 10px; font-size:9px; font-weight:bold; color:#1e293b; background:#e2e8f0; display:flex; justify-content:space-between; align-items:center;">
            <span>📋 PRIORITAS PEMASANGAN (KLIK)</span>
            <span style="font-size:10px;">▼</span>
        </div>
        <div class="mission-content priority-content" style="padding:8px 10px; font-size:10px; color:#334155; line-height:1.5;">
            <ol style="margin:0; padding-left:15px;">
                <li><b>Area Hadirin</b> (Zona D1, D2, E, F)</li>
                <li><b>Area Ruang Belakang Panggung</b> (Zona A)</li>
                <li><b>Area Samping Panggung</b> (Zona B)</li>
                <li><b>Area Ruang P3K</b> (Zona F)</li>
                <li><b>Area Panggung</b> (Zona C)</li>
            </ol>
        </div>
    </div>`;

    // 3. BANNER APD 
    let apdText = "";
    if (teamLower.includes("speaker")) { apdText = "🪖 Helm | 🥾 Sepatu | 🧤 Sarung Tangan"; } 
    else if (teamLower.includes("kabel")) { apdText = "🥾 Sepatu Safety | 🧤 Sarung Tangan"; } 
    else if (teamLower.includes("booth")) { apdText = "🥾 Sepatu Safety | 🧤 Sarung Tangan"; }

    let apdHtml = apdText ? `<div style="background:#fffbeb; border:1px solid #fde68a; color:#b45309; padding:5px 8px; border-radius:6px; margin-bottom:6px; font-size:9px; font-weight:bold; display:flex; align-items:center; gap:4px;"><span style="font-size:12px;">⚠️</span> <span><b>APD:</b> ${apdText}</span></div>` : '';

    // 4. PROGRESS BAR
    let progressHtml = `
    <div class="mission-progress-container" style="margin-bottom:0; padding:6px 8px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:10px; font-weight:bold; color:#1e293b;">📊 Progress: ${selesaiMisi}/${totalMisi} (${persentase}%)</div>
            <button class="filter-toggle ${isHideCompleted ? 'active' : ''}" onclick="toggleHideCompleted()">${isHideCompleted ? '👁️ Semua' : '🙈 Sembunyikan'}</button>
        </div>
        <div class="progress-bar-bg" style="margin-top:4px;"><div class="progress-bar-fill" style="width:${persentase}%;"></div></div>
    </div>`;
    
    // STICKY HEADER GABUNGAN
    let stickyHeaderHtml = `
    <div style="position: sticky; top: 50px; z-index: 90; background: rgba(248, 250, 252, 0.95); backdrop-filter: blur(8px); padding: 4px 0 8px 0; margin-bottom: 5px; grid-column: 1 / -1; border-bottom: 2px dashed #cbd5e1;">
        ${apdHtml} ${progressHtml}
    </div>`;

    // INJECT SEMUANYA
    container.innerHTML = rosterHtml + prioritasHtml + stickyHeaderHtml;

    filtered.sort((a, b) => {
        let statA = String(a.status_misi || "").toLowerCase() === 'selesai' ? 1 : -1;
        let statB = String(b.status_misi || "").toLowerCase() === 'selesai' ? 1 : -1;
        return statA - statB;
    });

    filtered.forEach((misi, index) => {
        try {
            const statMisi = String(misi.status_misi || "").toLowerCase();
            const isSelesai = (statMisi === 'selesai');
            if (isSelesai && isHideCompleted) return; 

            const tugasMisi = String(misi.tugas || "");
            const isOverride = tugasMisi.includes("⚠️ [");
            let rawTugas = tugasMisi.replace(/⚠️ \[.*?\] /g, ''); 
            
            let judulTugas = rawTugas || "Tugas Belum Dideskripsikan";
            let detailTugas = String(misi.detail_tugas || misi.detail || ""); 

            if (!detailTugas && rawTugas.includes("\n")) {
                let parts = rawTugas.split("\n");
                judulTugas = parts[0]; 
                parts.shift(); 
                detailTugas = parts.join("\n"); 
            }

            // ==========================================
            // 🤖 MESIN SMART PARSING (PANJANG & DENAH)
            // ==========================================
            let txtPanjang = "", txtDenah = "";
            let cleanDetail = [];

            detailTugas.split("\n").forEach(line => {
                let text = line.trim();
                let lower = text.toLowerCase();
                
                if (lower.startsWith("panjang:")) {
                    txtPanjang = text.substring(8).trim();
                } else if (lower.startsWith("denah:")) {
                    let url = text.substring(6).trim();
                    let matchId = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
                    txtDenah = matchId ? `https://drive.google.com/thumbnail?id=${matchId[1]}&sz=w800` : url;
                } else if (text !== "") {
                    cleanDetail.push(text);
                }
            });

            let finalDetailText = cleanDetail.join("<br>");

            // --- BUILD UI SMART TAGS ---
            let extraUI = "";
            if (txtPanjang) extraUI += `<div class="tag-panjang" style="background:#fffbeb; color:#b45309; padding:4px 8px; border-radius:6px; font-size:9px; font-weight:bold; display:inline-flex; align-items:center; margin-right:5px; margin-bottom:5px; border:1px solid #fde68a;">📏 Kebutuhan Panjang: ${txtPanjang}</div>`;

            let denahHtml = "";
            if (txtDenah) {
                denahHtml = `
                <div style="margin-top:8px; border-top:1px dashed #cbd5e1; padding-top:8px;">
                    <div style="font-size:9px; font-weight:bold; color:#64748b; margin-bottom:4px; display:flex; align-items:center; gap:4px;">🗺️ DENAH LOKASI:</div>
                    <img src="${txtDenah}" style="width:100%; max-height:120px; object-fit:cover; border-radius:6px; border:1px solid #cbd5e1; cursor:zoom-in; box-shadow:0 1px 3px rgba(0,0,0,0.1);" onclick="openZoomModal('${txtDenah.replace('w800', 's2000')}')">
                </div>`;
            }

            let detailHtml = (finalDetailText || extraUI || denahHtml) ? `
                <div class="instruction-box" style="background:#f8fafc; border-left:3px solid #3b82f6; padding:8px; font-size:10px; color:#334155; margin-bottom:8px; border-radius:6px; line-height:1.4;">
                    ${finalDetailText ? `<b style="color:#1d4ed8; font-size:9px;">📝 INSTRUKSI:</b><br>${finalDetailText}<br><div style="margin-bottom:6px;"></div>` : ''}
                    ${extraUI}
                    ${denahHtml}
                </div>` : '';
            // ==========================================

            let packageHtml = `<div class="package-list"><div style="font-size:8px; font-weight:bold; color:gray; margin-bottom:2px;">📦 Daftar Alat / Barang:</div>`;
            
            if (misi.kode_barang && String(misi.kode_barang).trim() !== "") {
                let codes = String(misi.kode_barang).split(',').map(c => c.trim()).filter(c => c);
                let groupedItems = {}; let notFoundCodes = [];
                
                codes.forEach(code => {
                    let foundItem = allInventory.find(inv => inv.kode_barang && String(inv.kode_barang).toLowerCase() === String(code).toLowerCase());
                    if (foundItem) {
                        let wadahRaw = String(foundItem.kode_wadah || "").trim();
                        let wadah = wadahRaw !== "" ? wadahRaw.toUpperCase() : "NON_BOX";
                        if (!groupedItems[wadah]) groupedItems[wadah] = [];
                        groupedItems[wadah].push(foundItem);
                    } else { notFoundCodes.push(code); }
                });

                for (const [wadah, items] of Object.entries(groupedItems)) {
                    if (wadah !== "NON_BOX") {
                        let boxItem = allInventory.find(inv => inv.kode_barang && String(inv.kode_barang).toUpperCase() === wadah);
                        let boxName = boxItem ? boxItem.nama_barang : `WADAH #${wadah}`;
                        let boxThumbUrl = boxItem ? getThumbUrl(boxItem) : 'https://placehold.co/100x100/EEEEEE/999999?text=BOX';
                        
                        packageHtml += `
                        <div class="box-group" style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; margin-bottom:4px; overflow:hidden;">
                            <div class="box-group-header" onclick="openItemDetail('${wadah}')" style="cursor:pointer; background:#e2e8f0; padding:4px 6px; font-size:9px; font-weight:bold; color:#0f172a; border-bottom:1px solid #cbd5e1; display:flex; justify-content:space-between; align-items:center;">
                                <div style="display:flex; align-items:center; gap:4px;">
                                    <img src="${boxThumbUrl}" style="width:20px; height:20px; object-fit:cover; border-radius:3px; border:1px solid #cbd5e1; background:white;">
                                    <span>🧰 ${boxName}</span>
                                </div>
                                <span style="font-size:10px;">🔍</span>
                            </div>
                            <div style="padding:4px;">`;
                            
                        items.forEach(foundItem => {
                            packageHtml += `<div class="package-item" style="cursor:pointer; border:none; background:transparent; margin-bottom:2px; padding:2px; border-bottom:1px dashed #e2e8f0;" onclick="openItemDetail('${foundItem.kode_barang}')"><img src="${getThumbUrl(foundItem)}" class="pkg-img" loading="lazy"><div class="pkg-info"><div class="pkg-name">${foundItem.nama_barang}</div><div class="pkg-code">#${foundItem.kode_barang}</div></div></div>`;
                        });
                        packageHtml += `</div></div>`;
                    }
                }

                if (groupedItems["NON_BOX"]) {
                    groupedItems["NON_BOX"].forEach(foundItem => {
                        packageHtml += `<div class="package-item" style="cursor:pointer;" onclick="openItemDetail('${foundItem.kode_barang}')"><img src="${getThumbUrl(foundItem)}" class="pkg-img" loading="lazy"><div class="pkg-info"><div class="pkg-name">${foundItem.nama_barang}</div><div class="pkg-code">#${foundItem.kode_barang}</div></div></div>`;
                    });
                }
                notFoundCodes.forEach(code => { packageHtml += `<div class="package-item"><div class="pkg-info"><div class="pkg-code" style="color:#ef4444;">#${code} (Tidak Ada)</div></div></div>`; });
            } else {
                packageHtml += `<div style="font-size:9px; color:#ef4444; font-style:italic;">⚠️ Data barang belum di-input kapten.</div>`;
            }
            packageHtml += `</div>`;
            
            let buttonHtml = '';
            if (isSelesai) {
                if (isAdminMode) {
                    // Tombol BATAL diberi class aksi-misi agar tersambung Audit Trail
                    buttonHtml = `<div style="display:flex; gap:6px; width:100%;"><div class="btn-complete done" style="flex:1; margin:0;">✅ Selesai: ${misi.waktu_selesai}</div><button class="btn-complete aksi-misi" style="background:#ef4444; flex:0 0 auto; padding:6px;" onclick="undoMission(event, '${misi.row_index}', '${misi.id_misi}', '${misi.kode_barang || ''}')">❌ Batal</button></div>`;
                }
                else {
                    buttonHtml = `<div class="btn-complete done" style="width:100%;">✅ SELESAI (${misi.waktu_selesai})</div>`;
                }
            } else {
                if (isAdminMode) {
                    let safeKodeBarang = String(misi.kode_barang || "");
                    let scanBtn = `<button class="btn-complete" style="background:#2563eb; margin:0;" onclick="openMissionScanner('${misi.row_index}', '${misi.id_misi}', '${safeKodeBarang}')">📷 SCAN BARANG</button>`;
                    
                    if (teamLower.includes("booth") || teamLower.includes("kabel")) {
                        // Tombol SELESAI diberi class aksi-misi agar berubah jadi label "Diselesaikan oleh..."
                        buttonHtml = `<div style="display:flex; gap:6px; align-items:stretch; width:100%;">
                            ${scanBtn}
                            <button class="btn-complete aksi-misi" style="background:#10b981; margin:0;" onclick="executeCompleteMission('${misi.row_index}', '${misi.id_misi}', '${safeKodeBarang}')">✅ SELESAI</button>
                        </div>`;
                    } else {
                        buttonHtml = `<div style="width:100%; display:flex;">${scanBtn}</div>`;
                    }
                }
                else {
                    buttonHtml = `<div style="margin-top:5px; padding:10px; background:#f1f5f9; border-radius:8px; font-size:11px; color:#64748b; text-align:center; font-weight:bold;">🔒 Login Kapten/Master untuk eksekusi misi</div>`;
                }
            }

            const card = document.createElement("div"); 
            card.className = `mission-card ${isSelesai ? 'selesai' : ''}`;
            card.innerHTML = `
                <div class="mission-header-click" onclick="toggleMissionContent(this)">
                    <div class="mission-top">
                        <span class="mission-id"><span style="background:#e2e8f0; color:#1e293b; padding:2px 4px; border-radius:4px; margin-right:4px; font-weight:bold;">#${index + 1}</span> ${misi.id_misi}</span>
                        <span class="badge-zona">📍 ${misi.zona || '-'}</span>
                    </div>
                    ${isOverride ? '<span class="badge-diganti">⚠️ ALAT DIGANTI</span>' : ''}
                    <div class="mission-title" style="display:flex; justify-content:space-between; align-items:center;">
                        <span>${judulTugas}</span> <span class="toggle-icon">▼</span>
                    </div>
                </div>
                <div class="mission-content">
                    ${detailHtml}
                    ${packageHtml}
                    <div class="mission-action">${buttonHtml}</div>
                </div>`;
            container.appendChild(card);
            
        } catch (err) {
            console.error("Row Error:", err);
            const errCard = document.createElement("div"); errCard.className = "mission-card";
            errCard.innerHTML = `<div style="color:red; font-size:12px; font-weight:bold; margin:0;">⚠️ Kesalahan Data Excel</div><p style="font-size:9px; margin:2px 0;">ID: ${misi.id_misi || '?'}</p>`;
            container.appendChild(errCard);
        }
    });
}

// ==========================================
// SCANNER V.17
// ==========================================
function openMissionScanner(rowIndex, idMisi, targetKodeBarangString) {
    let modal = document.createElement("div"); modal.id = "missionScannerModal"; modal.className = "modal-overlay active";
    modal.innerHTML = `
        <div class="modal-content" style="max-width:350px; background:white; padding:15px; border-radius:12px; text-align:center; position:relative;">
            <button onclick="closeMissionScanner()" style="position:absolute; top:10px; right:10px; border:none; background:#fef2f2; color:#dc2626; width:25px; height:25px; border-radius:50%; font-weight:bold; cursor:pointer; font-size:10px; z-index:9999;">✕</button>
            <h3 style="margin:0 0 5px 0; font-size:14px; color:#2563eb;">📷 Misi: ${idMisi}</h3>
            <p style="font-size:10px; color:#64748b; margin-bottom:8px;">Scan target atau alat pengganti</p>
            <div id="qr-reader-mission" style="width:100%; border-radius:8px; overflow:hidden; background:black;"></div>
            
            <div class="scanner-controls" style="display:flex; gap:8px; justify-content:center; margin-top:12px;">
                <button class="btn-scanner-action" style="padding:8px 12px; border-radius:6px; border:none; background:#e2e8f0; font-weight:bold; cursor:pointer; flex:1; font-size:10px;" onclick="toggleCameraFacing()">🔄 Kamera</button>
                <button class="btn-scanner-action" id="btnFlashlight" style="padding:8px 12px; border-radius:6px; border:none; background:#e2e8f0; font-weight:bold; cursor:pointer; flex:1; font-size:10px;" onclick="toggleFlashlight()">🔦 Senter</button>
            </div>
            
            <div id="overrideForm" style="display:none; text-align:left; margin-top:12px; background:#fef2f2; border:1px solid #fca5a5; padding:12px; border-radius:8px;"></div>
        </div>`; 
    document.body.appendChild(modal);
    isFlashlightOn = false; 
    startScanner(rowIndex, idMisi, targetKodeBarangString);
}

function startScanner(rowIndex, idMisi, targetKodeBarangString) {
    if(html5QrCode) { html5QrCode.stop().catch(e=>console.log(e)); html5QrCode = null; }
    html5QrCode = new Html5Qrcode("qr-reader-mission");
    let config = { fps: 10, qrbox: { width: 200, height: 200 } };
    html5QrCode.start({ facingMode: currentCameraFacing }, config, 
        (decodedText) => { processScanResult(decodedText, rowIndex, idMisi, targetKodeBarangString); }, 
        (err) => {}
    ).catch(err => { alert("Gagal membuka kamera: " + err); });
}

function toggleCameraFacing() {
    currentCameraFacing = currentCameraFacing === "environment" ? "user" : "environment";
    showToast("Mengganti kamera...", true);
    setTimeout(() => { closeMissionScanner(); showToast("Silakan klik SCAN lagi", true); }, 500);
}

function toggleFlashlight() {
    if (!html5QrCode) return;
    isFlashlightOn = !isFlashlightOn;
    html5QrCode.applyVideoConstraints({ advanced: [{ torch: isFlashlightOn }] }).then(() => {
        document.getElementById("btnFlashlight").style.background = isFlashlightOn ? "#fef08a" : "#e2e8f0"; 
    }).catch(err => {
        showToast("Senter tidak didukung/kamera depan aktif.", false);
        isFlashlightOn = false;
        document.getElementById("btnFlashlight").style.background = "#e2e8f0";
    });
}

function processScanResult(decodedText, rowIndex, idMisi, targetKodeBarangString) {
    let scannedText = decodedText.trim().toLowerCase();
    let targetCodes = String(targetKodeBarangString || "").split(',').map(c => c.trim().toLowerCase()).filter(c => c);
    
    let allowedCodes = new Set(targetCodes);
    targetCodes.forEach(code => {
        let foundItem = allInventory.find(inv => inv.kode_barang && String(inv.kode_barang).toLowerCase() === code);
        if (foundItem && foundItem.kode_wadah) allowedCodes.add(String(foundItem.kode_wadah).toLowerCase());
    });

    let isMatch = Array.from(allowedCodes).some(allowed => scannedText.includes(allowed));
    
    if (!isMatch) {
        let validNewItem = allInventory.find(inv => inv.kode_barang && String(inv.kode_barang).toLowerCase() === scannedText);
        if (!validNewItem) { triggerFeedback('error'); showToast(`❌ Barcode ${scannedText} tidak terdaftar!`, false); return; }

        triggerFeedback('error'); 
        html5QrCode.stop().then(() => {
            document.getElementById("qr-reader-mission").style.display = "none";
            document.querySelector(".scanner-controls").style.display = "none";
            
            let optionsHtml = targetCodes.map(c => {
                let itm = allInventory.find(inv => inv.kode_barang && String(inv.kode_barang).toLowerCase() === c);
                return `<option value="${c}">${itm ? itm.nama_barang : c} (#${c.toUpperCase()})</option>`;
            }).join('');

            const form = document.getElementById("overrideForm");
            form.style.display = "block";
            form.innerHTML = `
                <div style="margin:0 0 4px 0; font-size:13px; font-weight:bold; color:#dc2626;">⚠️ ALAT BERBEDA!</div>
                <p style="font-size:10px; color:#475569; margin:0 0 8px 0;">Men-scan:<br><b style="color:black; font-size:11px;">${validNewItem.nama_barang}</b> (#${scannedText.toUpperCase()})</p>
                <label style="font-size:9px; font-weight:bold; color:#c2410c;">Gantikan alat awal:</label>
                <select id="overrideSelect" style="width:100%; padding:6px; border-radius:6px; border:1px solid #cbd5e1; margin-bottom:8px; font-size:10px;">${optionsHtml}</select>
                <label style="font-size:9px; font-weight:bold; color:#c2410c;">Alasan Ganti (Wajib):</label>
                <input type="text" id="overrideReason" placeholder="Contoh: Kabel awal putus" style="width:100%; padding:6px; border-radius:6px; border:1px solid #cbd5e1; margin-bottom:10px; font-size:10px; box-sizing:border-box;">
                <button class="aksi-misi" onclick="executeOverrideMission('${rowIndex}', '${idMisi}', '${targetKodeBarangString}', '${scannedText}')" style="width:100%; padding:8px; background:#f97316; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:11px;">🔄 Konfirmasi & Selesai</button>
            `;
        }).catch(e => console.log(e));
        return;
    }

    triggerFeedback('success'); closeMissionScanner(); executeCompleteMission(rowIndex, idMisi, targetKodeBarangString);
}

function closeMissionScanner() { if (html5QrCode) { html5QrCode.stop().catch(e => console.log(e)); html5QrCode = null; } const m = document.getElementById("missionScannerModal"); if(m) m.remove(); }

async function executeCompleteMission(rowIndex, idMisi, kodeBarang) {
    showToast(`⏳ Memproses ${idMisi}...`);
    try {
        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "complete_mission", pin: API_BACKEND_PIN, row_index: rowIndex, id_misi: idMisi, kode_barang: kodeBarang }) });
        const data = await response.json();
        if (data.status === "success") { showToast(`✅ Misi Selesai!`); triggerFeedback('success'); loadMissions(); } 
        else { alert("Gagal:\n" + data.message); triggerFeedback('error'); }
    } catch (e) { alert("Error Jaringan:\n" + e.message); triggerFeedback('error'); }
}

async function executeOverrideMission(rowIndex, idMisi, oldTargetString, newScannedCode) {
    let replacedCode = document.getElementById("overrideSelect").value; 
    let reason = document.getElementById("overrideReason").value.trim() || "Darurat Lapangan";
    
    let oldTargetArray = String(oldTargetString || "").split(',').map(c => c.trim().toLowerCase());
    let newTargetArray = oldTargetArray.map(c => c === replacedCode ? newScannedCode : c);
    let finalKodeString = newTargetArray.join(', '); 

    showToast(`⏳ Menyimpan data override...`); closeMissionScanner(); 
    try {
        const response = await fetch(SCRIPT_URL, { 
            method: "POST", 
            body: JSON.stringify({ action: "complete_mission", pin: API_BACKEND_PIN, row_index: rowIndex, id_misi: idMisi, kode_barang: finalKodeString, update_kode: finalKodeString, alasan_override: reason }) 
        });
        const data = await response.json();
        if (data.status === "success") { showToast(`✅ Alat diganti & Misi Selesai!`); triggerFeedback('success'); loadMissions(); } 
        else { alert("Gagal:\n" + data.message); triggerFeedback('error');}
    } catch (e) { alert("Error:\n" + e.message); triggerFeedback('error');}
}

async function undoMission(event, rowIndex, idMisi, kodeBarang) {
    if (!confirm(`Batalkan misi ${idMisi}?`)) return;
    const btn = event.target; btn.innerText = "⏳..."; btn.disabled = true;
    try {
        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "undo_mission", pin: API_BACKEND_PIN, row_index: rowIndex, id_misi: idMisi, kode_barang: kodeBarang }) });
        const data = await response.json();
        if (data.status === "success") { showToast(`✅ Dibatalkan!`); loadMissions(); } 
        else { alert("Gagal:\n" + data.message); btn.innerText = "❌ BATALKAN"; btn.disabled = false; }
    } catch (e) { alert("Error:\n" + e.message); btn.innerText = "❌ BATALKAN"; btn.disabled = false; }
}

function openItemDetail(kodeBarang) {
    const item = allInventory.find(i => i.kode_barang && String(i.kode_barang).toLowerCase() === String(kodeBarang).toLowerCase()); 
    if(!item) return;

    const oldModal = document.getElementById("detailModal"); if(oldModal) oldModal.remove();
    let stat = item.status_digunakan || "Di Gudang"; if(stat === 'FALSE') stat = "Di Gudang"; let lok = item.lokasi || "Gudang KC (SMG)";
    let galleryHtml = `<div class="detail-gallery">`; let adaFoto = false; 
    let safeFileIds = item.file_ids || item.fotos || [];
    if (typeof safeFileIds === 'string') safeFileIds = safeFileIds.split(',');
    if (!Array.isArray(safeFileIds)) safeFileIds = [];
    
    safeFileIds.forEach((fileId, i) => { 
        if(fileId && String(fileId).trim().length > 5) { 
            let fId = String(fileId).trim();
            let thumbUrl = fId.includes("http") ? fId : `https://drive.google.com/thumbnail?id=${fId}&sz=w400`; 
            let highResUrl = fId.includes("http") ? fId.replace('sz=800', 'sz=s2000') : `https://drive.google.com/thumbnail?id=${fId}&sz=s2000`; 
            if(i < 3) { galleryHtml += `<img src="${thumbUrl}" class="gallery-img" onclick="openZoomModal('${highResUrl}')">`; } 
            else { galleryHtml += `<div class="gallery-box"><img src="${thumbUrl}" class="gallery-img" style="border:2px solid #ea580c;" onclick="openZoomModal('${highResUrl}')"><span class="badge-wadah">📦 WADAH</span></div>`; } 
            adaFoto = true; 
        } 
    });
    if(!adaFoto) galleryHtml += `<img src="https://placehold.co/300x200/EEEEEE/999999?text=Tidak+Ada+Foto" class="gallery-img" style="width:100%;">`; 
    galleryHtml += `</div>`;
    
    let badgeWadahHtml = item.kode_wadah ? `<span style="display:inline-block; margin-left:5px; background:#fef3c7; color:#d97706; padding:2px 6px; border-radius:4px; border:1px solid #fde68a;">🧰 Wadah: ${item.kode_wadah}</span>` : `<span style="color:gray; margin-left:5px;">📦 Wadah: -</span>`;
    
    let isiWadahHtml = ""; 
    if (item.kode_barang) { 
        let isiWadah = allInventory.filter(i => i.kode_wadah && String(i.kode_wadah).toLowerCase() === String(item.kode_barang).toLowerCase()); 
        if (isiWadah.length > 0) { 
            let listHtml = isiWadah.map(w => {
                let thumbW = getThumbUrl(w);
                return `
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; padding:4px; background:#fff; border:1px solid #dcfce7; border-radius:6px; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                    <img src="${thumbW}" style="width:30px; height:30px; object-fit:cover; border-radius:4px; border:1px solid #e2e8f0;">
                    <div style="flex:1; line-height:1.2; text-align:left;">
                        <div style="font-size:9px; font-weight:bold; color:#1e293b;">${w.nama_barang}</div>
                        <div style="font-size:8px; color:#ea580c; font-weight:bold; margin-top:2px;">#${w.kode_barang || '-'} <span style="color:#64748b; font-weight:normal;">• Qty: ${w.jumlah||0}</span></div>
                    </div>
                </div>`;
            }).join('');
            isiWadahHtml = `<div style="text-align:left; margin-top:8px; background:#f0fdf4; padding:8px; border-radius:8px; border:1px solid #bbf7d0;"><div style="font-size:10px; font-weight:bold; color:#16a34a; margin-bottom:6px;">🧰 Isi di dalam wadah ini (${isiWadah.length} jenis):</div>${listHtml}</div>`; 
        } 
    }

    let similarItems = allInventory.filter(i => i.nama_barang && String(i.nama_barang).toLowerCase() === String(item.nama_barang).toLowerCase());
    let totalSimilarQty = similarItems.reduce((sum, curr) => sum + (parseInt(curr.jumlah) || 1), 0);
    let statusCounts = {};
    similarItems.forEach(i => {
        let s = (i.status_digunakan && i.status_digunakan !== 'FALSE') ? i.status_digunakan : "Di Gudang";
        statusCounts[s] = (statusCounts[s] || 0) + (parseInt(i.jumlah) || 1);
    });
    
    let similarHtml = "";
    if (similarItems.length > 1 || totalSimilarQty > 1) {
        let badgeHtml = Object.keys(statusCounts).map(status => {
            let bgCol = status.includes('Gudang') ? '#dcfce7' : (status.includes('Dipakai') || status.includes('Event') ? '#fef08a' : '#e2e8f0');
            let txtCol = status.includes('Gudang') ? '#166534' : (status.includes('Dipakai') || status.includes('Event') ? '#854d0e' : '#334155');
            return `<span style="display:inline-block; margin-right:4px; margin-bottom:4px; padding:3px 6px; border-radius:4px; font-size:8px; background:${bgCol}; color:${txtCol}; font-weight:bold; border:1px solid #cbd5e1;">${status}: ${statusCounts[status]}</span>`;
        }).join('');
        
        similarHtml = `
        <div style="text-align:left; margin-top:8px; background:#eff6ff; padding:10px; border-radius:8px; border:1px solid #bfdbfe;">
            <div style="font-size:10px; font-weight:900; color:#1d4ed8; margin-bottom:4px;">📊 Cek Silang Stok:</div>
            <div style="display:flex; flex-wrap:wrap;">${badgeHtml}</div>
        </div>`;
    }

    const modalHtml = `
    <div id="detailModal" class="modal-overlay active">
        <div class="modal-content" style="max-width:320px; background:white; padding:15px; border-radius:12px; text-align:center; position:relative;">
            <button onclick="document.getElementById('detailModal').remove()" style="position:absolute; top:10px; right:10px; border:none; background:#f1f5f9; width:25px; height:25px; border-radius:50%; font-weight:bold; cursor:pointer; z-index:10; font-size:10px;">✕</button>
            ${galleryHtml}
            <h3 style="margin:0; font-weight:900; color:#1e293b; font-size:14px;">${item.nama_barang}</h3>
            <p style="margin:4px 0 8px 0; font-size:10px; color:#ea580c; font-weight:bold;">#${item.kode_barang || '-'} ${badgeWadahHtml}</p>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:10px; text-align:left; background:#f8fafc; padding:8px; border-radius:8px; border:1px solid #e2e8f0;">
                <div><span style="color:gray;">Kondisi:</span> <br><b>${item.kondisi || '-'}</b></div>
                <div><span style="color:gray;">📍 Lokasi:</span> <br><b>${lok}</b></div>
                <div style="grid-column: 1 / -1;"><span style="color:gray;">🔌 Status Gudang:</span> <br><b>${stat}</b></div>
            </div>
            ${similarHtml}
            ${isiWadahHtml}
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function openZoomModal(imgUrl) { let zoomModal = document.getElementById("zoomModal"); if (!zoomModal) { document.body.insertAdjacentHTML('beforeend', `<div id="zoomModal" class="zoom-overlay" onclick="closeZoomModal()"><button class="btn-back-zoom" onclick="closeZoomModal()">⬅ Kembali</button><img id="zoomImgSrc" src="" style="max-width:95vw; max-height:90vh; object-fit:contain; border-radius:8px;" onclick="event.stopPropagation()"></div>`); zoomModal = document.getElementById("zoomModal"); } document.getElementById("zoomImgSrc").src = imgUrl; zoomModal.classList.add("active"); }
function closeZoomModal() { const zoomModal = document.getElementById("zoomModal"); if(zoomModal) { zoomModal.classList.remove("active"); setTimeout(() => { document.getElementById("zoomImgSrc").src = ""; }, 300); } }
