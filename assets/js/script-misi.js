// ==========================================
// MESIN LOGIKA MISSION CONTROL (V.10.2 - SMART OVERRIDE)
// ==========================================

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxm4eJGQjBytrLTQgYrsfEXIQxLQ_Rq7NFVM__Y8AhRfzPe8q5FJhofecqrDJ5ywkeBEg/exec"; 

const VALID_MISSION_PINS = ["123456", "v9t6c2", "spk001", "kbl002", "bth003"];
let userPin = localStorage.getItem("AV_MISSION_PIN") || ""; 

let isAdminMode = false, allMissions = [], allInventory = [], activeTeam = '', isDataLoaded = false, html5QrcodeScanner = null;

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
        if (input) {
            let pinAttempt = input.trim().toLowerCase();
            if (VALID_MISSION_PINS.includes(pinAttempt)) { 
                localStorage.setItem("AV_MISSION_PIN", pinAttempt); showToast("Akses Terbuka! Memuat ulang..."); 
                setTimeout(() => { window.location.reload(); }, 800); 
            } 
            else { alert("⛔ AKSES DITOLAK! PIN tidak dikenali untuk area ini."); }
        }
    }
}

// FIX: zIndex 99999 agar notifikasi tidak tenggelam di belakang scanner
function showToast(msg, isSuccess = true) { 
    const t = document.getElementById("toastMsg"); if(!t) return; 
    t.innerText = msg; t.className = "toast-msg show " + (isSuccess ? "" : "error"); 
    t.style.zIndex = "999999"; 
    setTimeout(() => { t.classList.remove("show"); }, 3000); 
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

function renderMissions() {
    if (!isDataLoaded) return; const container = document.getElementById("missionsContainer"); container.innerHTML = "";
    if (activeTeam === '') { container.innerHTML = `<div style="text-align:center; padding:40px 20px; color:#64748b; grid-column: 1 / -1;"><h3 style="margin-bottom:5px;">Pilih Divisi Tim 👆</h3><p style="font-size:12px; margin-top:0;">Silakan pilih salah satu tombol tim di atas.</p></div>`; return; }
    let filtered = allMissions.filter(m => m.tim.toLowerCase().includes(activeTeam.toLowerCase()));
    if(filtered.length === 0) { container.innerHTML = `<div style="text-align:center; padding:40px 20px; color:#64748b; grid-column: 1 / -1;">✅ Belum ada tugas / semua tugas telah selesai untuk tim ini.</div>`; return; }

    filtered.forEach(misi => {
        const isSelesai = (misi.status_misi.toLowerCase() === 'selesai');
        const card = document.createElement("div"); card.className = `mission-card ${isSelesai ? 'selesai' : ''}`;
        
        let packageHtml = '';
        if (misi.kode_barang) {
            let codes = misi.kode_barang.split(',').map(c => c.trim()).filter(c => c);
            let groups = {}; 

            codes.forEach(code => {
                let foundItem = allInventory.find(inv => inv.kode_barang && inv.kode_barang.toLowerCase() === code.toLowerCase());
                if (foundItem) {
                    let wadah = (foundItem.kode_wadah && foundItem.kode_wadah.trim() !== "") ? foundItem.kode_wadah.toUpperCase() : "TANPA_WADAH";
                    if (!groups[wadah]) groups[wadah] = [];
                    groups[wadah].push(foundItem);
                } else {
                    if (!groups["NOT_FOUND"]) groups["NOT_FOUND"] = [];
                    groups["NOT_FOUND"].push({ kode_barang: code, nama_barang: "Barang tidak ditemukan" });
                }
            });

            packageHtml += `<div class="package-list"><div style="font-size:10px; font-weight:bold; color:gray; margin-bottom:4px;">📦 Target Instalasi:</div>`;
            
            for (const [wadahKey, itemsArr] of Object.entries(groups)) {
                if (wadahKey === "NOT_FOUND") {
                    itemsArr.forEach(item => { packageHtml += `<div class="package-item"><div class="pkg-info"><div class="pkg-code" style="color:#ef4444;">#${item.kode_barang} (Tidak Ada)</div></div></div>`; });
                } else if (wadahKey === "TANPA_WADAH") {
                    itemsArr.forEach(item => {
                        packageHtml += `<div class="package-item" style="cursor:pointer;" onclick="openItemDetail('${item.kode_barang}')">
                            <img src="${getThumbUrl(item)}" class="pkg-img" loading="lazy">
                            <div class="pkg-info"><div class="pkg-name">${item.nama_barang}</div><div class="pkg-code">#${item.kode_barang}</div></div>
                        </div>`;
                    });
                } else {
                    let containerItem = allInventory.find(inv => inv.kode_barang && inv.kode_barang.toLowerCase() === wadahKey.toLowerCase());
                    let cImgUrl = containerItem ? getThumbUrl(containerItem) : 'https://placehold.co/100x100/EEEEEE/999999?text=BOX';
                    let cName = containerItem ? containerItem.nama_barang : `Wadah: ${wadahKey}`;
                    
                    packageHtml += `<div class="container-group">
                        <div class="container-header" onclick="${containerItem ? `openItemDetail('${containerItem.kode_barang}')` : ''}">
                            <img src="${cImgUrl}" class="pkg-img" style="border-color:#3b82f6;">
                            <div class="pkg-info"><div class="pkg-name" style="color:#1e3a8a;">${cName}</div><div class="pkg-code" style="color:#2563eb;">#${wadahKey}</div></div>
                        </div>
                        <div class="container-children">`;
                    
                    itemsArr.forEach(item => {
                        packageHtml += `<div class="item-child" onclick="openItemDetail('${item.kode_barang}')">
                            <img src="${getThumbUrl(item)}" class="pkg-img-small" loading="lazy">
                            <div class="pkg-info"><div class="pkg-name">${item.nama_barang}</div><div class="pkg-code">#${item.kode_barang}</div></div>
                        </div>`;
                    });
                    packageHtml += `</div></div>`; 
                }
            }
            packageHtml += `</div>`;
        }
        
        let buttonHtml = '';
        if (isSelesai) {
            if (isAdminMode) {
                buttonHtml = `
                <div style="display:flex; gap:10px; width:100%;">
                    <div class="btn-complete done" style="flex:1; display:flex; justify-content:center; align-items:center; background:#f0fdf4; border:1px solid #10b981; color:#10b981; font-size:12px; margin:0;">✅ Selesai: ${misi.waktu_selesai}</div>
                    <button class="btn-complete" style="background:#ef4444; flex:0 0 auto; padding:10px 15px; margin:0;" onclick="undoMission(event, '${misi.row_index}', '${misi.id_misi}', '${misi.kode_barang}')">❌ BATALKAN</button>
                </div>`;
            } else {
                buttonHtml = `<button class="btn-complete done">✅ SELESAI (${misi.waktu_selesai})</button>`;
            }
        } else {
            if (isAdminMode) buttonHtml = `<button class="btn-complete" style="background:#2563eb;" onclick="openMissionScanner('${misi.row_index}', '${misi.id_misi}', '${misi.kode_barang}')">📷 SCAN & SELESAI</button>`;
            else buttonHtml = `<button class="btn-complete" style="background:#94a3b8;" onclick="toggleAdminMode()">🔒 KUNCI (LOGIN)</button>`;
        }

        card.innerHTML = `<div class="mission-top"><span class="mission-id">${misi.id_misi}</span><span class="badge-zona">📍 ${misi.zona || '-'}</span></div><h3 class="mission-title">${misi.tugas}</h3>${packageHtml}<div class="mission-action">${buttonHtml}</div>`;
        container.appendChild(card);
    });
}

// ==========================================
// SCANNER JALUR TIKUS & SMART OVERRIDE
// ==========================================
function openMissionScanner(rowIndex, idMisi, targetKodeBarangString) {
    let modal = document.createElement("div"); modal.id = "missionScannerModal"; modal.className = "modal-overlay active";
    modal.innerHTML = `<div class="modal-content" style="max-width:400px; background:white; padding:20px; border-radius:15px; text-align:center; position:relative;"><button onclick="closeMissionScanner()" style="position:absolute; top:15px; right:15px; border:none; background:#fef2f2; color:#dc2626; width:35px; height:35px; border-radius:50%; font-weight:bold; cursor:pointer; z-index:9999;">✕</button><h3 style="margin:0 0 5px 0; font-size:16px; font-weight:900;">Scan QR Code</h3><p style="font-size:11px; color:#64748b; margin-top:0;">Scan Barcode Target / Wadah / Pengganti</p><div id="qr-reader-mission" style="width:100%; border-radius:10px; overflow:hidden;"></div></div>`; document.body.appendChild(modal);

    html5QrcodeScanner = new Html5QrcodeScanner("qr-reader-mission", { fps: 15, qrbox: {width: 230, height: 230} }, false);
    
    html5QrcodeScanner.render((decodedText) => {
        let scannedText = decodedText.trim().toLowerCase();
        
        if (targetKodeBarangString) {
            let targetCodes = targetKodeBarangString.split(',').map(c => c.trim().toLowerCase()).filter(c => c);
            let allowedCodes = new Set(targetCodes);
            
            targetCodes.forEach(code => {
                let foundItem = allInventory.find(inv => inv.kode_barang && inv.kode_barang.toLowerCase() === code);
                if (foundItem && foundItem.kode_wadah) allowedCodes.add(foundItem.kode_wadah.toLowerCase());
            });

            // LOGIKA 1: Apakah scan cocok dengan target atau wadahnya?
            let isMatch = Array.from(allowedCodes).some(allowed => scannedText.includes(allowed));
            
            if (!isMatch) {
                // LOGIKA 2: Cek apakah barcode ini valid terdaftar di gudang?
                let validNewItem = allInventory.find(inv => inv.kode_barang && inv.kode_barang.toLowerCase() === scannedText);
                
                if (!validNewItem) {
                    showToast(`❌ Barcode tidak terdaftar di Gudang!`, false);
                    return; // Tetap biarkan kamera hidup
                }

                // LOGIKA 3: SMART OVERRIDE (Barang valid, tapi bukan target misi)
                html5QrcodeScanner.clear().catch(e => console.log(e)); // Matikan kamera
                
                let optionsHtml = targetCodes.map(c => {
                    let itm = allInventory.find(inv => inv.kode_barang && inv.kode_barang.toLowerCase() === c);
                    let nama = itm ? itm.nama_barang : c;
                    return `<option value="${c}">${nama} (#${c.toUpperCase()})</option>`;
                }).join('');

                // Ubah tampilan modal menjadi pop-up konfirmasi ganti alat
                document.querySelector("#missionScannerModal .modal-content").innerHTML = `
                    <button onclick="closeMissionScanner()" style="position:absolute; top:15px; right:15px; border:none; background:#fef2f2; color:#dc2626; width:35px; height:35px; border-radius:50%; font-weight:bold; cursor:pointer; z-index:9999;">✕</button>
                    <div style="background:#fef2f2; border:1px solid #fca5a5; padding:15px; border-radius:10px; margin-top:20px;">
                        <h3 style="margin:0 0 5px 0; font-size:18px; color:#dc2626;">⚠️ ALAT BERBEDA!</h3>
                        <p style="font-size:12px; color:#475569; margin:0 0 15px 0;">Target misi tidak cocok. Anda men-scan:<br><b style="font-size:14px; color:black;">${validNewItem.nama_barang}</b><br><span style="color:#dc2626; font-weight:bold;">#${scannedText.toUpperCase()}</span></p>
                        
                        <div style="background:white; padding:10px; border-radius:8px; text-align:left;">
                            <label style="font-size:11px; font-weight:bold; color:#c2410c;">Ganti alat target dengan alat ini?</label>
                            <p style="font-size:10px; color:gray; margin:2px 0 8px 0;">Pilih alat awal yang ingin digantikan:</p>
                            <select id="overrideSelect" style="width:100%; padding:8px; border-radius:5px; border:1px solid #cbd5e1; margin-bottom:15px; font-size:12px;">
                                ${optionsHtml}
                            </select>
                            <button onclick="executeOverrideMission('${rowIndex}', '${idMisi}', '${targetKodeBarangString}', '${scannedText}')" style="width:100%; padding:10px; background:#f97316; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">🔄 Ya, Ganti & Selesai</button>
                        </div>
                    </div>
                `;
                return;
            }
        }
        closeMissionScanner(); executeCompleteMission(rowIndex, idMisi, targetKodeBarangString);
    });
}
function closeMissionScanner() { if (html5QrcodeScanner) { html5QrcodeScanner.clear().catch(e => console.log(e)); } const m = document.getElementById("missionScannerModal"); if(m) m.remove(); }

async function executeCompleteMission(rowIndex, idMisi, kodeBarang) {
    showToast(`⏳ Memproses penyelesaian ${idMisi}...`);
    try {
        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "complete_mission", pin: userPin, row_index: rowIndex, id_misi: idMisi, kode_barang: kodeBarang }) });
        const data = await response.json();
        if (data.status === "success") { showToast(`✅ Scan Berhasil! Misi Selesai.`); loadMissions(); } 
        else { alert("Gagal:\n" + data.message); }
    } catch (e) { alert("Error Jaringan:\n" + e.message); }
}

async function executeOverrideMission(rowIndex, idMisi, oldTargetString, newScannedCode) {
    let replacedCode = document.getElementById("overrideSelect").value; 
    
    // Buat daftar target baru (ganti kode lama dengan kode baru)
    let oldTargetArray = oldTargetString.split(',').map(c => c.trim().toLowerCase());
    let newTargetArray = oldTargetArray.map(c => c === replacedCode ? newScannedCode : c);
    let finalKodeString = newTargetArray.join(', '); 

    showToast(`⏳ Memproses pergantian alat & menyelesaikan misi...`);
    closeMissionScanner(); 
    
    try {
        const response = await fetch(SCRIPT_URL, { 
            method: "POST", 
            body: JSON.stringify({ 
                action: "complete_mission", 
                pin: userPin, 
                row_index: rowIndex, 
                id_misi: idMisi, 
                kode_barang: finalKodeString, // Deploy barang pengganti!
                update_kode: finalKodeString // Update teks target di Excel
            }) 
        });
        const data = await response.json();
        if (data.status === "success") { showToast(`✅ Alat diganti & Misi Selesai!`); loadMissions(); } 
        else { alert("Gagal:\n" + data.message); }
    } catch (e) { alert("Error Jaringan:\n" + e.message); }
}

async function undoMission(event, rowIndex, idMisi, kodeBarang) {
    if (!confirm(`PERINGATAN:\nApakah Anda yakin ingin membatalkan misi ${idMisi}?\nStatus barang akan dikembalikan ke Gudang.`)) return;
    const btn = event.target; btn.innerText = "⏳ MEMPROSES..."; btn.disabled = true;
    try {
        const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "undo_mission", pin: userPin, row_index: rowIndex, id_misi: idMisi, kode_barang: kodeBarang }) });
        const data = await response.json();
        if (data.status === "success") { showToast(`✅ Misi dibatalkan & status direset!`); loadMissions(); } 
        else { alert("Gagal:\n" + data.message); btn.innerText = "❌ BATALKAN"; btn.disabled = false; }
    } catch (e) { alert("Error Jaringan:\n" + e.message); btn.innerText = "❌ BATALKAN"; btn.disabled = false; }
}

// ==========================================
// POP-UP DETAIL (READ-ONLY)
// ==========================================
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

    const modalHtml = `<div id="detailModal" class="modal-overlay active"><div class="modal-content" style="max-width:400px; background:white; padding:20px; border-radius:15px; text-align:center; position:relative;"><button onclick="document.getElementById('detailModal').remove()" style="position:absolute; top:15px; right:15px; border:none; background:#f1f5f9; width:30px; height:30px; border-radius:50%; font-weight:bold; cursor:pointer; z-index:10;">✕</button>${galleryHtml}<h3 style="margin:0; font-weight:900; color:#1e293b; font-size:18px;">${item.nama_barang}</h3><p style="margin:5px 0 10px 0; font-size:12px; color:#ea580c; font-weight:bold;">#${item.kode_barang || '-'}</p><div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px; text-align:left; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0;"><div><span style="color:gray;">Kondisi:</span> <br><b>${item.kondisi || '-'}</b></div><div><span style="color:gray;">📍 Lokasi:</span> <br><b>${lok}</b></div><div style="grid-column: 1 / -1;"><span style="color:gray;">🔌 Status Gudang:</span> <br><b>${stat}</b></div></div><div style="text-align:left; margin-top:10px; font-size:11px; color:#475569; background:#fff7ed; padding:8px; border-radius:6px; border:1px solid #fed7aa;"><b>📝 Catatan:</b> <br>${item.keterangan_ref || 'Tidak ada catatan.'}</div></div></div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}
function openZoomModal(imgUrl) { let zoomModal = document.getElementById("zoomModal"); if (!zoomModal) { document.body.insertAdjacentHTML('beforeend', `<div id="zoomModal" class="zoom-overlay" onclick="closeZoomModal()"><button class="btn-back-zoom" onclick="closeZoomModal()">⬅ Kembali</button><img id="zoomImgSrc" src="" style="max-width:95vw; max-height:90vh; object-fit:contain; border-radius:8px;" onclick="event.stopPropagation()"></div>`); zoomModal = document.getElementById("zoomModal"); } document.getElementById("zoomImgSrc").src = imgUrl; zoomModal.classList.add("active"); }
function closeZoomModal() { const zoomModal = document.getElementById("zoomModal"); if(zoomModal) { zoomModal.classList.remove("active"); setTimeout(() => { document.getElementById("zoomImgSrc").src = ""; }, 300); } }
