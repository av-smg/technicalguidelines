// ==========================================
// MESIN LOGIKA MISSION CONTROL (V.20.0 - DUAL CITY & KALENDER)
// ==========================================

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxm4eJGQjBytrLTQgYrsfEXIQxLQ_Rq7NFVM__Y8AhRfzPe8q5FJhofecqrDJ5ywkeBEg/exec"; 
const API_BACKEND_PIN = "a1b2c3"; // Pastikan PIN ini cocok dengan yang ada di Code.gs

// Ambil Sesi Login Global dari Navbar
const currentUserRole = localStorage.getItem('av_session_role');
const currentUserName = localStorage.getItem('av_session_nama');

let isAdminMode = false, allMissions = [], allInventory = [], activeTeam = '', isDataLoaded = false;
let html5QrCode = null; 
let isHideCompleted = false; 
let currentCameraFacing = "environment"; 
let isFlashlightOn = false;

// Default Kota Target
let activeDbKota = "Database_Misi_Semarang";

const teamRoster = {
    "speaker": { kapten: "Malkhiel", asisten: "Yoka" },
    "kabel": { kapten: "Vina", asisten: "Anggid" },
    "booth": { kapten: "Evan", asisten: "Truna" },
    "inventaris": { kapten: "Emma", asisten: "Peni" }
};

window.onload = () => { 
    checkAdminStatus(); 
    // Setel dropdown awal sesuai variabel
    document.getElementById("dbKotaSelector").value = activeDbKota;
    loadMissions(); 
};

function checkAdminStatus() {
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
    document.getElementById("loading").style.display = "block";
    document.getElementById("missionsContainer").innerHTML = "";
    try {
        const res = await fetch(SCRIPT_URL + "?action=api&nocache=" + new Date().getTime()); const data = await res.json();
        if(data.status === "success") { 
            allMissions = data.missions || []; 
            allInventory = data.inventory || []; 
            isDataLoaded = true; 
            document.getElementById("loading").style.display = "none"; 
            renderMissions(); 
        } 
        else { document.getElementById("loading").innerText = "Gagal memuat data dari server."; }
    } catch (e) { document.getElementById("loading").innerText = "Error Jaringan. Periksa koneksi Anda."; }
}

function changeKota() {
    activeDbKota = document.getElementById("dbKotaSelector").value;
    renderMissions(); // Langsung render ulang tanpa harus load dari internet lagi
}

function setTeamFilter(teamName) { 
    activeTeam = teamName; 
    document.querySelectorAll('.btn-team').forEach(btn => { 
        btn.classList.remove('active'); 
        if(btn.innerText.includes(teamName)) btn.classList.add('active'); 
    }); 
    if (isDataLoaded) renderMissions(); 
}

function toggleHideCompleted() { isHideCompleted = !isHideCompleted; renderMissions(); }

function toggleMissionContent(element) { 
    const content = element.nextElementSibling; 
    const icon = element.querySelector('.toggle-icon');
    
    if (content.style.display === 'none' || content.style.display === '') {
        content.style.display = 'block'; // Buka kartu
        if (icon) icon.innerText = '▲'; 
    } else {
        content.style.display = 'none';  // Tutup kartu
        if (icon) icon.innerText = '▼'; 
    }
}

// ==========================================
// RENDER MISI (V.21.1 - MODERN GRID + BUKA TUTUP)
// ==========================================
function renderMissions() {
    if (!isDataLoaded) return; 
    const container = document.getElementById("missionsContainer"); 
    const bannerContainer = document.getElementById("missionBanners");
    container.innerHTML = "";
    bannerContainer.innerHTML = "";
    
    if (activeTeam === '') { 
        bannerContainer.innerHTML = `<div style="text-align:center; padding:50px 15px; background:white; border-radius:16px; border:2px dashed #cbd5e1; margin:10px;"><h3 style="margin:0 0 10px 0; color:#475569;">Pilih Divisi Tim Terlebih Dahulu 👆</h3><p style="font-size:12px; color:#94a3b8; margin:0;">Silakan klik salah satu divisi di panel atas untuk melihat daftar tugas.</p></div>`; 
        return; 
    }
    
    let filtered = allMissions.filter(m => {
        let isTeamMatch = String(m.tim || "").toLowerCase().includes(activeTeam.toLowerCase());
        let isKotaMatch = (m.sheet_asal === activeDbKota);
        return isTeamMatch && isKotaMatch;
    });

    if(filtered.length === 0) { 
        let namaKota = activeDbKota === "Database_Misi_Semarang" ? "Semarang" : "Yogyakarta";
        bannerContainer.innerHTML = `<div style="text-align:center; padding:50px 15px; background:#f0fdf4; border-radius:16px; border:2px dashed #bbf7d0; margin:10px;"><h3 style="margin:0 0 5px 0; color:#166534;">✅ Area Bersih!</h3><p style="font-size:12px; color:#16a34a; margin:0;">Belum ada tugas untuk tim ini di wilayah <b>${namaKota}</b>.</p></div>`; 
        return; 
    }

    let totalMisi = filtered.length;
    let selesaiMisi = filtered.filter(m => String(m.status_misi || "").toLowerCase() === 'selesai').length;
    let persentase = Math.round((selesaiMisi / totalMisi) * 100) || 0;
    let teamLower = activeTeam.toLowerCase();

    // 1. BANNER CONTACT PERSON (Gaya Baru)
    let rosterHtml = "";
    let foundTeamKey = Object.keys(teamRoster).find(k => teamLower.includes(k));
    if (foundTeamKey) {
        let cp = teamRoster[foundTeamKey];
        rosterHtml = `
        <div style="background:white; border:1px solid #e2e8f0; border-left:4px solid #3b82f6; padding:12px 15px; border-radius:12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
            <div>
                <div style="font-size:10px; font-weight:900; color:#3b82f6; margin-bottom:4px; text-transform:uppercase;">📞 Contact Person</div>
                <div style="font-size:13px; color:#1e293b;"><b>👑 Kapten:</b> ${cp.kapten} <span style="color:#cbd5e1; margin:0 6px;">|</span> <b>🛠️ Asisten:</b> ${cp.asisten}</div>
            </div>
            <div style="font-size:24px; opacity:0.2;">📱</div>
        </div>`;
    }

    // 2. KOTAK PRIORITAS PEMASANGAN
    let prioritasHtml = `
    <div style="background:white; border:1px solid #e2e8f0; border-radius:12px; margin-bottom:10px; overflow:hidden; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
        <div onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'" style="cursor:pointer; padding:12px 15px; font-size:11px; font-weight:900; color:#475569; background:#f8fafc; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9;">
            <span>📋 PRIORITAS PEMASANGAN (KLIK)</span>
            <span>▼</span>
        </div>
        <div class="mission-content" style="display:none; padding:15px; font-size:12px; color:#334155; line-height:1.6; background:white;">
            <ol style="margin:0; padding-left:18px;">
                <li><b>Area Hadirin</b> (Zona C1, C2, D, E, G)</li>
                <li><b>Samping & Belakang Panggung</b> (Zona A)</li>
                <li><b>Ruang P3K</b> (Zona F)</li>
                <li><b>Area Panggung</b> (Zona B)</li>
            </ol>
        </div>
    </div>`;

    // 3. BANNER APD 
    let apdText = "🥾 Sepatu | 🦺 Rompi | 🧤 Sarung Tangan"; 
    if (teamLower.includes("speaker")) { apdText = "🪖 Helm | " + apdText; }
    let apdHtml = `
    <div style="background:#fffbeb; border:1px solid #fde68a; border-left:4px solid #f59e0b; padding:10px 15px; border-radius:12px; margin-bottom:10px; font-size:11px; font-weight:bold; color:#b45309; display:flex; align-items:center; gap:8px; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
        <span style="font-size:16px;">⚠️</span> <span><b>STANDAR APD:</b> ${apdText}</span>
    </div>`;

    // 4. PROGRESS BAR
    let progressHtml = `
    <div style="background:white; border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:15px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div style="font-size:13px; font-weight:900; color:#0f172a;">📊 Progress Event: ${selesaiMisi} / ${totalMisi}</div>
            <button class="filter-toggle ${isHideCompleted ? 'active' : ''}" onclick="toggleHideCompleted()" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; padding:4px 10px; border-radius:20px; font-size:10px; font-weight:bold; cursor:pointer;">${isHideCompleted ? '👁️ Tampilkan Semua' : '🙈 Sembunyikan Selesai'}</button>
        </div>
        <div style="width:100%; background:#e2e8f0; height:8px; border-radius:4px; overflow:hidden;">
            <div style="width:${persentase}%; background:${persentase === 100 ? '#10b981' : '#3b82f6'}; height:100%; border-radius:4px; transition:width 0.5s ease;"></div>
        </div>
        <div style="text-align:right; font-size:10px; font-weight:bold; color:#64748b; margin-top:4px;">${persentase}% Selesai</div>
    </div>`;
    
    bannerContainer.innerHTML = rosterHtml + prioritasHtml + apdHtml + progressHtml;

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

            // Tampilan Tanggal
            let badgeTanggalHtml = "";
            if(misi.tgl_mulai && misi.tgl_selesai) {
                let dMulai = new Date(misi.tgl_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                let dSelesai = new Date(misi.tgl_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                badgeTanggalHtml = `<div style="font-size:10px; color:#64748b; margin-top:6px; font-weight:bold;"><span style="display:inline-block; margin-right:4px;">📅</span>${dMulai} - ${dSelesai}</div>`;
            }

            let extraUI = "";
            if (txtPanjang) extraUI += `<div style="background:#fef3c7; color:#d97706; padding:6px 10px; border-radius:8px; font-size:11px; font-weight:bold; display:inline-flex; align-items:center; margin-top:10px; border:1px solid #fde68a;">📏 Kebutuhan Panjang: ${txtPanjang}</div>`;

            let denahHtml = "";
            if (txtDenah) {
                denahHtml = `
                <div style="margin-top:12px;">
                    <div style="font-size:10px; font-weight:800; color:#94a3b8; margin-bottom:6px; text-transform:uppercase;">🗺️ DENAH LOKASI</div>
                    <img src="${txtDenah}" style="width:100%; height:120px; object-fit:cover; border-radius:8px; border:1px solid #cbd5e1; cursor:zoom-in;" onclick="openZoomModal('${txtDenah.replace('w800', 's2000')}')">
                </div>`;
            }

            let detailHtml = (finalDetailText || extraUI || denahHtml) ? `
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-left:3px solid #3b82f6; padding:12px; font-size:12px; color:#334155; margin:12px 0; border-radius:8px; line-height:1.5;">
                    ${finalDetailText ? `<div style="color:#1d4ed8; font-size:10px; font-weight:900; margin-bottom:4px; text-transform:uppercase;">📝 Instruksi Khusus</div><div>${finalDetailText}</div>` : ''}
                    ${extraUI}
                    ${denahHtml}
                </div>` : '';

            let packageHtml = `<div style="margin-top:15px;"><div style="font-size:10px; font-weight:900; color:#94a3b8; margin-bottom:8px; text-transform:uppercase;">📦 Komponen Misi</div>`;
            
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
                        <div style="background:white; border:1px solid #cbd5e1; border-radius:8px; margin-bottom:8px; overflow:hidden;">
                            <div onclick="openItemDetail('${wadah}')" style="cursor:pointer; background:#f1f5f9; padding:8px 12px; font-size:11px; font-weight:800; color:#0f172a; border-bottom:1px solid #cbd5e1; display:flex; justify-content:space-between; align-items:center;">
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <img src="${boxThumbUrl}" style="width:24px; height:24px; object-fit:cover; border-radius:4px; border:1px solid #cbd5e1; background:white;">
                                    <span>🧰 ${boxName}</span>
                                </div>
                                <span style="color:#94a3b8;">🔍</span>
                            </div>
                            <div style="padding:6px;">`;
                        
                        items.forEach(foundItem => {
                            packageHtml += `<div style="display:flex; align-items:center; gap:10px; cursor:pointer; padding:6px; border-bottom:1px dashed #e2e8f0; transition:background 0.2s;" onclick="openItemDetail('${foundItem.kode_barang}')" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'"><img src="${getThumbUrl(foundItem)}" style="width:35px; height:35px; border-radius:6px; object-fit:cover; border:1px solid #e2e8f0;"><div style="flex:1;"><div style="font-size:12px; font-weight:bold; color:#1e293b;">${foundItem.nama_barang}</div><div style="font-size:10px; color:#3b82f6; font-weight:bold; margin-top:2px;">#${foundItem.kode_barang}</div></div></div>`;
                        });
                        packageHtml += `</div></div>`;
                    }
                }

                if (groupedItems["NON_BOX"]) {
                    groupedItems["NON_BOX"].forEach(foundItem => {
                        packageHtml += `<div style="display:flex; align-items:center; gap:10px; cursor:pointer; background:white; padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; margin-bottom:6px; transition:border 0.2s;" onclick="openItemDetail('${foundItem.kode_barang}')" onmouseover="this.style.borderColor='#3b82f6'" onmouseout="this.style.borderColor='#cbd5e1'"><img src="${getThumbUrl(foundItem)}" style="width:40px; height:40px; border-radius:6px; object-fit:cover; border:1px solid #e2e8f0;"><div style="flex:1;"><div style="font-size:12px; font-weight:bold; color:#1e293b;">${foundItem.nama_barang}</div><div style="font-size:10px; color:#3b82f6; font-weight:bold; margin-top:2px;">#${foundItem.kode_barang}</div></div></div>`;
                    });
                }
                notFoundCodes.forEach(code => { packageHtml += `<div style="background:#fef2f2; color:#dc2626; padding:8px 12px; border:1px solid #fecaca; border-radius:8px; font-size:11px; font-weight:bold; margin-bottom:6px;">⚠️ #${code} (Tidak Terdaftar)</div>`; });
            } else {
                packageHtml += `<div style="font-size:11px; color:#ef4444; font-style:italic; background:#fef2f2; padding:10px; border-radius:8px;">⚠️ Keranjang alat kosong.</div>`;
            }
            packageHtml += `</div>`;
            
            let buttonHtml = '';
            if (isSelesai) {
                if (isAdminMode) {
                    buttonHtml = `<div style="display:flex; gap:8px; width:100%; border-top:1px solid #bbf7d0; padding-top:15px;">
                        <div style="flex:1; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:10px; display:flex; flex-direction:column; justify-content:center;">
                            <div style="font-size:12px; font-weight:900; color:#166534;">✅ SELESAI</div>
                            <div style="font-size:10px; color:#15803d; margin-top:2px;">Oleh: <b>${misi.eksekutor || 'Kru A/V'}</b></div>
                        </div>
                        <button class="aksi-misi" style="background:white; color:#ef4444; border:1px solid #fca5a5; border-radius:8px; padding:0 15px; font-weight:bold; cursor:pointer; font-size:12px;" onclick="undoMission(event, '${misi.row_index}', '${misi.id_misi}', '${misi.kode_barang || ''}')">Batal</button>
                    </div>`;
                }
                else {
                    buttonHtml = `<div style="width:100%; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:12px; text-align:center;">
                        <div style="font-size:14px; font-weight:900; color:#166534;">✅ MISI SELESAI</div>
                        <div style="font-size:10px; color:#15803d; margin-top:4px;">${misi.waktu_selesai} • Oleh: <b>${misi.eksekutor || 'Kru A/V'}</b></div>
                    </div>`;
                }
            } else {
                if (isAdminMode) {
                    let safeKodeBarang = String(misi.kode_barang || "");
                    let scanBtn = `<button style="background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; padding:12px; border-radius:8px; font-weight:900; font-size:12px; cursor:pointer; flex:1; display:flex; align-items:center; justify-content:center; gap:6px; transition:all 0.2s;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'" onclick="openMissionScanner('${misi.row_index}', '${misi.id_misi}', '${safeKodeBarang}')">📷 SCAN ITEM</button>`;
                    
                    if (teamLower.includes("booth") || teamLower.includes("kabel") || teamLower.includes("speaker") || teamLower.includes("inventaris")) {
                        buttonHtml = `<div style="display:flex; gap:10px; width:100%;">
                            ${scanBtn}
                            <button class="aksi-misi" style="background:#10b981; color:white; border:none; padding:12px; border-radius:8px; font-weight:900; font-size:12px; cursor:pointer; flex:1; display:flex; align-items:center; justify-content:center; gap:6px; transition:background 0.2s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'" onclick="executeCompleteMission(this, '${misi.row_index}', '${misi.id_misi}', '${safeKodeBarang}')">✅ SELESAI</button>
                        </div>`;
                    } else {
                        buttonHtml = `<div style="width:100%; display:flex;">${scanBtn}</div>`;
                    }
                }
                else {
                    buttonHtml = `<div style="padding:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; font-size:11px; color:#64748b; text-align:center; font-weight:bold;">🔒 Akses dikunci. Silakan login untuk eksekusi.</div>`;
                }
            }

            // STYLE KARTU UTAMA (Card)
            let borderColor = isSelesai ? '#bbf7d0' : '#e2e8f0';
            let bgColor = isSelesai ? '#f8fafc' : '#ffffff';
            let shadow = isSelesai ? 'none' : '0 4px 6px -1px rgba(0,0,0,0.05)';

            const card = document.createElement("div"); 
            card.style.cssText = `background:${bgColor}; border:1px solid ${borderColor}; border-radius:12px; padding:15px; box-shadow:${shadow}; display:flex; flex-direction:column; position:relative; transition:transform 0.2s, box-shadow 0.2s;`;
            
            let leftStripe = `<div style="position:absolute; top:0; left:0; width:6px; height:100%; background:${isSelesai ? '#22c55e' : '#cbd5e1'};"></div>`;

            card.innerHTML = `
                ${leftStripe}
                <div style="padding-left:10px; width:100%; box-sizing:border-box;">
                    <!-- HEADER BISA DIKLIK -->
                    <div onclick="toggleMissionContent(this)" style="cursor:pointer;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span style="background:#f1f5f9; color:#475569; font-size:10px; font-weight:900; padding:4px 8px; border-radius:6px; border:1px solid #e2e8f0;">#${index + 1}</span>
                                <span style="font-size:13px; font-weight:800; color:#0f172a; letter-spacing:-0.5px;">${misi.id_misi}</span>
                            </div>
                            <div style="display:flex; gap:6px; align-items:center;">
                                <span style="background:#fffbeb; color:#d97706; padding:4px 8px; border-radius:6px; font-size:10px; font-weight:bold; border:1px solid #fde68a;">📍 ${misi.zona || '-'}</span>
                                <span class="toggle-icon" style="color:#94a3b8; font-size:10px; font-weight:bold; padding:4px; margin-left:4px;">▼</span>
                            </div>
                        </div>
                        
                        ${isOverride ? '<div style="margin-bottom:8px;"><span style="background:#fee2e2; color:#b91c1c; padding:4px 8px; border-radius:6px; font-size:10px; font-weight:bold; border:1px solid #fecaca;">⚠️ ALAT DIGANTI LAPANGAN</span></div>' : ''}
                        
                        <div style="font-size:14px; font-weight:800; color:#1e293b; line-height:1.3;">${judulTugas}</div>
                        ${badgeTanggalHtml}
                    </div>
                    
                    <!-- KONTEN BISA DILIPAT (DEFAULT: TUTUP) -->
                    <div class="mission-content" style="display:none; margin-top:15px; border-top:1px dashed #e2e8f0; padding-top:15px;">
                        ${detailHtml}
                        ${packageHtml}
                        <div style="margin-top:15px;">${buttonHtml}</div>
                    </div>
                </div>`;
                
            // Interaksi hover pada kartu
            if(!isSelesai) {
                card.onmouseover = () => { card.style.transform = 'translateY(-2px)'; card.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)'; };
                card.onmouseout = () => { card.style.transform = 'translateY(0)'; card.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'; };
            }

            container.appendChild(card);
            
        } catch (err) {
            console.error("Row Error:", err);
            const errCard = document.createElement("div"); 
            errCard.style.cssText = "background:#fef2f2; border:1px solid #fca5a5; padding:15px; border-radius:12px;";
            errCard.innerHTML = `<div style="color:red; font-size:14px; font-weight:bold; margin:0;">⚠️ Kesalahan Data Database</div><p style="font-size:11px; margin:5px 0 0 0; color:#b91c1c;">Misi ID: ${misi.id_misi || 'Tidak Diketahui'}</p>`;
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

    triggerFeedback('success'); closeMissionScanner(); 
    // Otomatis klik eksekusi
    let dummyBtn = document.createElement("button");
    executeCompleteMission(dummyBtn, rowIndex, idMisi, targetKodeBarangString);
}

function closeMissionScanner() { if (html5QrCode) { html5QrCode.stop().catch(e => console.log(e)); html5QrCode = null; } const m = document.getElementById("missionScannerModal"); if(m) m.remove(); }

async function executeCompleteMission(btnElement, rowIndex, idMisi, kodeBarang) {
    if(btnElement && btnElement.innerText) { btnElement.innerText = "⏳..."; btnElement.disabled = true; }
    showToast(`⏳ Memproses ${idMisi}...`);
    try {
        const response = await fetch(SCRIPT_URL, { 
            method: "POST", 
            body: JSON.stringify({ action: "complete_mission", pin: API_BACKEND_PIN, user_name: currentUserName, db_kota: activeDbKota, row_index: rowIndex, id_misi: idMisi, kode_barang: kodeBarang }) 
        });
        const data = await response.json();
        if (data.status === "success") { 
            showToast(`✅ Misi Selesai!`); triggerFeedback('success'); 
            
            // Visual Audit Trail Langsung di Layar
            if(btnElement && btnElement.parentNode) {
                const waktu = new Date();
                const jam = waktu.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                btnElement.parentNode.innerHTML = `
                  <div style="background: #dcfce7; color: #166534; padding: 8px 12px; border-radius: 8px; font-size: 0.9rem; font-weight: bold; border: 1px solid #bbf7d0; display: inline-block; width:100%; box-sizing:border-box;">
                    ✅ Diselesaikan ${jam} WIB oleh ${currentUserName}
                  </div>
                `;
            } else {
                loadMissions(); 
            }
        } 
        else { alert("Gagal:\n" + data.message); triggerFeedback('error'); if(btnElement) { btnElement.innerText = "✅ SELESAI"; btnElement.disabled = false; } }
    } catch (e) { alert("Error Jaringan:\n" + e.message); triggerFeedback('error'); if(btnElement) { btnElement.innerText = "✅ SELESAI"; btnElement.disabled = false; } }
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
            body: JSON.stringify({ action: "complete_mission", pin: API_BACKEND_PIN, user_name: currentUserName, db_kota: activeDbKota, row_index: rowIndex, id_misi: idMisi, kode_barang: finalKodeString, update_kode: finalKodeString, alasan_override: reason }) 
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
        const response = await fetch(SCRIPT_URL, { 
            method: "POST", 
            body: JSON.stringify({ action: "undo_mission", pin: API_BACKEND_PIN, user_name: currentUserName, db_kota: activeDbKota, row_index: rowIndex, id_misi: idMisi, kode_barang: kodeBarang }) 
        });
        const data = await response.json();
        if (data.status === "success") { showToast(`✅ Dibatalkan!`); loadMissions(); } 
        else { alert("Gagal:\n" + data.message); btn.innerText = "❌ Batal"; btn.disabled = false; }
    } catch (e) { alert("Error:\n" + e.message); btn.innerText = "❌ Batal"; btn.disabled = false; }
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
