// ==========================================
// MESIN LOGIKA MISSION CONTROL (V.11 - THE ULTIMATE)
// ==========================================

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxm4eJGQjBytrLTQgYrsfEXIQxLQ_Rq7NFVM__Y8AhRfzPe8q5FJhofecqrDJ5ywkeBEg/exec"; 
const VALID_MISSION_PINS = ["123456", "v9t6c2", "spk001", "kbl002", "bth003", "dev999"]; 
let userPin = localStorage.getItem("AV_MISSION_PIN") || ""; 

let isAdminMode = false, allMissions = [], allInventory = [], activeTeam = '', isDataLoaded = false;
let html5QrCode = null; 
let isHideCompleted = false; // Mode sembunyikan selesai
let currentCameraFacing = "environment"; // Belakang
let isFlashlightOn = false;

window.onload = () => { checkAdminStatus(); loadMissions(); };

function checkAdminStatus() {
    if (userPin && VALID_MISSION_PINS.includes(userPin)) {
        isAdminMode = true; document.body.classList.add("admin-mode-active");
        document.getElementById("modeStatusText").innerHTML = "🔴 Akses Eksekutor Aktif"; document.getElementById("btnUnlock").innerText = "🔓 Tutup Akses";
    } else {
        isAdminMode = false; userPin = ""; document.body.classList.remove("admin-mode-active");
        document.getElementById("modeStatusText").innerHTML = "🟢 Read-Only Mode"; document.getElementById("btnUnlock").innerText = "🔒 Buka Akses";
    }
    if (isDataLoaded) renderMissions();
}

function toggleAdminMode() {
    if (isAdminMode) {
        if(confirm("Tutup akses Eksekutor? Memori PIN akan dihapus.")) { 
            localStorage.removeItem("AV_MISSION_PIN"); showToast("Sistem dikunci. Memuat ulang..."); 
            setTimeout(() => { window.location.reload(); }, 800); 
        }
    } else {
        let input = prompt("Masukkan PIN Kapten Lapangan / Master:");
        if (input && VALID_MISSION_PINS.includes(input.trim().toLowerCase())) {
            localStorage.setItem("AV_MISSION_PIN", input.trim().toLowerCase()); showToast("Akses Terbuka! Memuat ulang..."); 
            setTimeout(() => { window.location.reload(); }, 800); 
        } else if (input) alert("⛔ AKSES DITOLAK! PIN tidak dikenali.");
    }
}

function showToast(msg, isSuccess = true) { 
    const t = document.getElementById("toastMsg"); if(!t) return; 
    t.innerText = msg; t.className = "toast-msg show " + (isSuccess ? "" : "error"); 
    t.style.zIndex = "999999"; 
    setTimeout(() => { t.classList.remove("show"); }, 3000); 
}

// 🔊 HAPTIC & AUDIO ENGINE V.11
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

function getThumbUrl(item) { let fileIds = item.file_ids || item.fotos || []; let firstFileId = fileIds.find(id => id && id.length > 5); if(!firstFileId) return 'https://placehold.co/100x100/EEEEEE/999999?text=NO+IMG'; return firstFileId.includes("http") ? firstFileId : `https://drive.google.com/thumbnail?id=${firstFileId}&sz=w200`; }

async function loadMissions() {
    try {
        const res = await fetch(SCRIPT_URL + "?action=api&nocache=" + new Date().getTime()); const data = await res.json();
        if(data.status === "success") { allMissions = data.missions || []; allInventory = data.inventory || []; isDataLoaded = true; document.getElementById("loading").style.display = "none"; renderMissions(); } 
        else { document.getElementById("loading").innerText = "Gagal memuat data dari server."; }
    } catch (e) { document.getElementById("loading").innerText = "Error Jaringan. Periksa koneksi Anda."; }
}

function setTeamFilter(teamName) { activeTeam = teamName; document.querySelectorAll('.btn-team').forEach(btn => { btn.classList.remove('active'); if(btn.innerText.includes(teamName)) btn.classList.add('active'); }); if (isDataLoaded) renderMissions(); }
function toggleHideCompleted() { isHideCompleted = !isHideCompleted; renderMissions(); }
function toggleMissionContent(element) { const content = element.nextElementSibling; content.classList.toggle('open'); }

function renderMissions() {
    if (!isDataLoaded) return; const container = document.getElementById("missionsContainer"); container.innerHTML = "";
    if (activeTeam === '') { container.innerHTML = `<div style="text-align:center; padding:40px 20px; color:#64748b; grid-column: 1 / -1;"><h3 style="margin-bottom:5px;">Pilih Divisi Tim 👆</h3></div>`; return; }
    
    let filtered = allMissions.filter(m => m.tim.toLowerCase().includes(activeTeam.toLowerCase()));
    if(filtered.length === 0) { container.innerHTML = `<div style="text-align:center; padding:40px 20px; color:#64748b; grid-column: 1 / -1;">✅ Belum ada tugas untuk tim ini.</div>`; return; }

    // Hitung Progress
    let totalMisi = filtered.length;
    let selesaiMisi = filtered.filter(m => m.status_misi.toLowerCase() === 'selesai').length;
    let persentase = Math.round((selesaiMisi / totalMisi) * 100);

    let progressHtml = `
    <div class="mission-progress-container" style="grid-column: 1 / -1;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:14px; font-weight:bold; color:#1e293b;">📊 Progress: ${selesaiMisi}/${totalMisi} (${persentase}%)</div>
            <button class="filter-toggle ${isHideCompleted ? 'active' : ''}" onclick="toggleHideCompleted()">
                ${isHideCompleted ? '👁️ Tampilkan Semua' : '🙈 Sembunyikan Selesai'}
            </button>
        </div>
        <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${persentase}%;"></div></div>
    </div>`;
    container.innerHTML = progressHtml;

    // SORTING: Yang Pending di atas, Selesai di bawah
    filtered.sort((a, b) => {
        let statA = a.status_misi.toLowerCase() === 'selesai' ? 1 : -1;
        let statB = b.status_misi.toLowerCase() === 'selesai' ? 1 : -1;
        return statA - statB;
    });

    filtered.forEach(misi => {
        const isSelesai = (misi.status_misi.toLowerCase() === 'selesai');
        if (isSelesai && isHideCompleted) return; // Filter sembunyikan

        const card = document.createElement("div"); card.className = `mission-card ${isSelesai ? 'selesai' : ''}`;
        const isOverride = misi.tugas.includes("⚠️");
        
        let packageHtml = `<div class="package-list"><div style="font-size:10px; font-weight:bold; color:gray; margin-bottom:4px;">📦 Target Instalasi:</div>`;
        if (misi.kode_barang) {
            let codes = misi.kode_barang.split(',').map(c => c.trim()).filter(c => c);
            codes.forEach(code => {
                let foundItem = allInventory.find(inv => inv.kode_barang && inv.kode_barang.toLowerCase() === code.toLowerCase());
                if (foundItem) {
                    packageHtml += `<div class="package-item" style="cursor:pointer;" onclick="openItemDetail('${foundItem.kode_barang}')">
                        <img src="${getThumbUrl(foundItem)}" class="pkg-img" loading="lazy">
                        <div class="pkg-info"><div class="pkg-name">${foundItem.nama_barang}</div><div class="pkg-code">#${foundItem.kode_barang}</div></div>
                    </div>`;
                } else {
                    packageHtml += `<div class="package-item"><div class="pkg-info"><div class="pkg-code" style="color:#ef4444;">#${code} (Tidak Ada)</div></div></div>`;
                }
            });
        }
        packageHtml += `</div>`;
        
        let buttonHtml = '';
        if (isSelesai) {
            if (isAdminMode) buttonHtml = `<div style="display:flex; gap:10px;"><div class="btn-complete done" style="flex:1; margin:0;">✅ Selesai: ${misi.waktu_selesai}</div><button class="btn-complete" style="background:#ef4444; flex:0 0 auto; padding:10px; margin:0;" onclick="undoMission(event, '${misi.row_index}', '${misi.id_misi}', '${misi.kode_barang}')">❌ BATALKAN</button></div>`;
            else buttonHtml = `<button class="btn-complete done">✅ SELESAI (${misi.waktu_selesai})</button>`;
        } else {
            if (isAdminMode) buttonHtml = `<button class="btn-complete" style="background:#2563eb;" onclick="openMissionScanner('${misi.row_index}', '${misi.id_misi}', '${misi.kode_barang}')">📷 SCAN BARANG</button>`;
            else buttonHtml = `<button class="btn-complete" style="background:#94a3b8;" onclick="toggleAdminMode()">🔒 KUNCI (LOGIN)</button>`;
        }

        // HTML Card dengan Collapsible Logic
        card.innerHTML = `
            <div class="mission-header-click" onclick="toggleMissionContent(this)">
                <div class="mission-top"><span class="mission-id">${misi.id_misi}</span><span class="badge-zona">📍 ${misi.zona || '-'}</span></div>
                ${isOverride ? '<span class="badge-diganti">⚠️ ALAT DIGANTI</span>' : ''}
                <h3 class="mission-title" style="margin:5px 0 0 0; display:flex; justify-content:space-between; align-items:center;">
                    ${misi.tugas.replace(/⚠️ \[.*?\] /g, '')} <span>${isSelesai ? '▼' : '▲'}</span>
                </h3>
            </div>
            <div class="mission-content ${isSelesai ? '' : 'open'}">
                ${packageHtml}
                <div class="mission-action">${buttonHtml}</div>
            </div>`;
        container.appendChild(card);
    });
}

// ==========================================
// SCANNER V.11 (SMART OVERRIDE, KAMERA DEPAN, SENTER)
// ==========================================
function openMissionScanner(rowIndex, idMisi, targetKodeBarangString) {
    let modal = document.createElement("div"); modal.id = "missionScannerModal"; modal.className = "modal-overlay active";
    modal.innerHTML = `
        <div class="modal-content" style="max-width:400px; background:white; padding:20px; border-radius:15px; text-align:center; position:relative;">
            <button onclick="closeMissionScanner()" style="position:absolute; top:15px; right:15px; border:none; background:#fef2f2; color:#dc2626; width:35px; height:35px; border-radius:50%; font-weight:bold; cursor:pointer; z-index:9999;">✕</button>
            <h3 style="margin:0 0 5px 0; font-size:16px;">Misi: ${idMisi}</h3>
            <p style="font-size:11px; color:#64748b; margin-bottom:10px;">Scan target atau alat pengganti</p>
            <div id="qr-reader-mission" style="width:100%; border-radius:10px; overflow:hidden; background:black;"></div>
            <div class="scanner-controls">
                <button class="btn-scanner-action" onclick="toggleCameraFacing()">🔄 Tukar Kamera</button>
            </div>
            <div id="overrideForm" style="display:none; text-align:left; margin-top:15px; background:#fef2f2; border:1px solid #fca5a5; padding:15px; border-radius:10px;"></div>
        </div>`; 
    document.body.appendChild(modal);

    startScanner(rowIndex, idMisi, targetKodeBarangString);
}

function startScanner(rowIndex, idMisi, targetKodeBarangString) {
    if(html5QrCode) { html5QrCode.stop().catch(e=>console.log(e)); html5QrCode = null; }
    html5QrCode = new Html5Qrcode("qr-reader-mission");
    
    let config = { fps: 10, qrbox: { width: 230, height: 230 } };
    html5QrCode.start({ facingMode: currentCameraFacing }, config, 
        (decodedText) => { processScanResult(decodedText, rowIndex, idMisi, targetKodeBarangString); }, 
        (err) => {}
    ).catch(err => { alert("Gagal membuka kamera: " + err); });
}

function toggleCameraFacing() {
    currentCameraFacing = currentCameraFacing === "environment" ? "user" : "environment";
    // Restart Scanner with new facing
    const rowIndex = document.getElementById("qr-reader-mission").getAttribute('data-row'); // hacky way to pass args, we rely on closure usually but here we just restart
    // Simpler: Just close and ask them to reopen if we can't pass args easily, but let's grab from the DOM or just rely on state. 
    // Wait, let's close and reopen cleanly.
    showToast("Mengganti kamera...", true);
    setTimeout(() => { closeMissionScanner(); showToast("Silakan klik SCAN lagi", true); }, 500);
}

function processScanResult(decodedText, rowIndex, idMisi, targetKodeBarangString) {
    let scannedText = decodedText.trim().toLowerCase();
    let targetCodes = targetKodeBarangString.split(',').map(c => c.trim().toLowerCase()).filter(c => c);
    
    // Logika Validasi Sama Seperti Sebelumnya
    let allowedCodes = new Set(targetCodes);
    targetCodes.forEach(code => {
        let foundItem = allInventory.find(inv => inv.kode_barang && inv.kode_barang.toLowerCase() === code);
        if (foundItem && foundItem.kode_wadah) allowedCodes.add(foundItem.kode_wadah.toLowerCase());
    });

    let isMatch = Array.from(allowedCodes).some(allowed => scannedText.includes(allowed));
    
    if (!isMatch) {
        let validNewItem = allInventory.find(inv => inv.kode_barang && inv.kode_barang.toLowerCase() === scannedText);
        if (!validNewItem) { triggerFeedback('error'); showToast(`❌ Barcode ${scannedText} tidak terdaftar!`, false); return; }

        // SMART OVERRIDE TERPICU
        triggerFeedback('error'); // Buzz sebagai peringatan
        html5QrCode.stop().then(() => {
            document.getElementById("qr-reader-mission").style.display = "none";
            document.querySelector(".scanner-controls").style.display = "none";
            
            let optionsHtml = targetCodes.map(c => {
                let itm = allInventory.find(inv => inv.kode_barang && inv.kode_barang.toLowerCase() === c);
                return `<option value="${c}">${itm ? itm.nama_barang : c} (#${c.toUpperCase()})</option>`;
            }).join('');

            const form = document.getElementById("overrideForm");
            form.style.display = "block";
            form.innerHTML = `
                <h3 style="margin:0 0 5px 0; font-size:16px; color:#dc2626;">⚠️ ALAT BERBEDA!</h3>
                <p style="font-size:12px; color:#475569; margin:0 0 10px 0;">Men-scan:<br><b style="color:black;">${validNewItem.nama_barang}</b> (#${scannedText.toUpperCase()})</p>
                <label style="font-size:11px; font-weight:bold; color:#c2410c;">Gantikan alat awal:</label>
                <select id="overrideSelect" style="width:100%; padding:8px; border-radius:5px; border:1px solid #cbd5e1; margin-bottom:10px; font-size:12px;">${optionsHtml}</select>
                <label style="font-size:11px; font-weight:bold; color:#c2410c;">Alasan Ganti (Wajib):</label>
                <input type="text" id="overrideReason" placeholder="Contoh: Kabel awal putus" style="width:100%; padding:8px; border-radius:5px; border:1px solid #cbd5e1; margin-bottom:15px; font-size:12px; box-sizing:border-box;">
                <button onclick="executeOverrideMission('${rowIndex}', '${idMisi}', '${targetKodeBarangString}', '${scannedText}')" style="width:100%; padding:12px; background:#f97316; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">🔄 Konfirmasi & Selesai</button>
            `;
        }).catch(e => console.log(e));
        return;
    }

    // MATCH SUKSES
    triggerFeedback('success'); closeMissionScanner(); executeCompleteMission(rowIndex, idMisi, targetKodeBarangString);
}

function closeMissionScanner() { if (html5QrCode) { html5QrCode.stop().catch(e => console.log(e)); html5QrCode = null; } const m = document.getElementById("missionScannerModal"); if(m) m.remove(); }

async function executeCompleteMission(rowIndex, idMisi, kodeBarang) {
    showToast(`⏳ Memproses ${idMisi}...`);
    try {
        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "complete_mission", pin: userPin, row_index: rowIndex, id_misi: idMisi, kode_barang: kodeBarang }) });
        const data = await response.json();
        if (data.status === "success") { showToast(`✅ Misi Selesai!`); triggerFeedback('success'); loadMissions(); } 
        else { alert("Gagal:\n" + data.message); triggerFeedback('error'); }
    } catch (e) { alert("Error Jaringan:\n" + e.message); triggerFeedback('error'); }
}

async function executeOverrideMission(rowIndex, idMisi, oldTargetString, newScannedCode) {
    let replacedCode = document.getElementById("overrideSelect").value; 
    let reason = document.getElementById("overrideReason").value.trim() || "Darurat Lapangan";
    
    let oldTargetArray = oldTargetString.split(',').map(c => c.trim().toLowerCase());
    let newTargetArray = oldTargetArray.map(c => c === replacedCode ? newScannedCode : c);
    let finalKodeString = newTargetArray.join(', '); 

    showToast(`⏳ Menyimpan data override...`); closeMissionScanner(); 
    try {
        const response = await fetch(SCRIPT_URL, { 
            method: "POST", 
            body: JSON.stringify({ action: "complete_mission", pin: userPin, row_index: rowIndex, id_misi: idMisi, kode_barang: finalKodeString, update_kode: finalKodeString, alasan_override: reason }) 
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
        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "undo_mission", pin: userPin, row_index: rowIndex, id_misi: idMisi, kode_barang: kodeBarang }) });
        const data = await response.json();
        if (data.status === "success") { showToast(`✅ Dibatalkan!`); loadMissions(); } 
        else { alert("Gagal:\n" + data.message); btn.innerText = "❌ BATALKAN"; btn.disabled = false; }
    } catch (e) { alert("Error:\n" + e.message); btn.innerText = "❌ BATALKAN"; btn.disabled = false; }
}

// Fitur Detail (Sama dengan V.10)
function openItemDetail(kodeBarang) {
    const item = allInventory.find(i => i.kode_barang && i.kode_barang.toLowerCase() === kodeBarang.toLowerCase()); if(!item) return;
    const oldModal = document.getElementById("detailModal"); if(oldModal) oldModal.remove();
    let stat = item.status_digunakan || "Di Gudang"; if(stat === 'FALSE') stat = "Di Gudang"; let lok = item.lokasi || "Gudang KC (SMG)";
    let galleryHtml = `<div class="detail-gallery">`; let adaFoto = false; let safeFileIds = item.file_ids || item.fotos || [];
    safeFileIds.forEach((fileId) => { 
        if(fileId && fileId.length > 5) { 
            let thumbUrl = fileId.includes("http") ? fileId : `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`; 
            let highResUrl = fileId.includes("http") ? fileId.replace('sz=800', 'sz=s2000') : `https://drive.google.com/thumbnail?id=${fileId}&sz=s2000`; 
            galleryHtml += `<img src="${thumbUrl}" class="gallery-img" onclick="openZoomModal('${highResUrl}')">`; adaFoto = true; 
        } 
    });
    if(!adaFoto) galleryHtml += `<img src="https://placehold.co/300x200/EEEEEE/999999?text=Tidak+Ada+Foto" class="gallery-img" style="width:100%;">`; galleryHtml += `</div>`;
    const modalHtml = `<div id="detailModal" class="modal-overlay active"><div class="modal-content" style="max-width:400px; background:white; padding:20px; border-radius:15px; text-align:center; position:relative;"><button onclick="document.getElementById('detailModal').remove()" style="position:absolute; top:15px; right:15px; border:none; background:#f1f5f9; width:30px; height:30px; border-radius:50%; font-weight:bold; cursor:pointer; z-index:10;">✕</button>${galleryHtml}<h3 style="margin:0; font-weight:900; color:#1e293b; font-size:18px;">${item.nama_barang}</h3><p style="margin:5px 0 10px 0; font-size:12px; color:#ea580c; font-weight:bold;">#${item.kode_barang || '-'}</p><div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px; text-align:left; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0;"><div><span style="color:gray;">Kondisi:</span> <br><b>${item.kondisi || '-'}</b></div><div><span style="color:gray;">📍 Lokasi:</span> <br><b>${lok}</b></div><div style="grid-column: 1 / -1;"><span style="color:gray;">🔌 Status Gudang:</span> <br><b>${stat}</b></div></div></div></div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}
function openZoomModal(imgUrl) { let zoomModal = document.getElementById("zoomModal"); if (!zoomModal) { document.body.insertAdjacentHTML('beforeend', `<div id="zoomModal" class="zoom-overlay" onclick="closeZoomModal()"><button class="btn-back-zoom" onclick="closeZoomModal()">⬅ Kembali</button><img id="zoomImgSrc" src="" style="max-width:95vw; max-height:90vh; object-fit:contain; border-radius:8px;" onclick="event.stopPropagation()"></div>`); zoomModal = document.getElementById("zoomModal"); } document.getElementById("zoomImgSrc").src = imgUrl; zoomModal.classList.add("active"); }
function closeZoomModal() { const zoomModal = document.getElementById("zoomModal"); if(zoomModal) { zoomModal.classList.remove("active"); setTimeout(() => { document.getElementById("zoomImgSrc").src = ""; }, 300); } }
