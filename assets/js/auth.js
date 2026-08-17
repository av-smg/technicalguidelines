// Data 45 PIN Alphanumeric (Tanpa Strip)
const dataPIN = {
  master: ["M9X2A", "M4B7Y", "M1C8Z", "M6P3K", "M2W5Q"],
  kapten: ["K7N2X", "K3P9M", "K8R4T", "K1L6J", "K5V8D", "K9F2B", "K4H7C", "K2Y5W", "K6M3P", "K8Z1N", "K3X9L", "K7T4R", "K5B6F", "K1J8V", "K9D2H"],
  kru: ["V4X1M", "V8N7K", "V2P5L", "V9R3T", "V6B8F", "V1C4J", "V5H2D", "V7M9W", "V3Z6P", "V8L1N", "V4T5R", "V2K7X", "V9J3B", "V6V8C", "V1F4H", "V5N2M", "V7P9K", "V3R6L", "V8B1T", "V4C5F", "V2H7J", "V9M3D", "V6Z8W", "V1L4P", "V5T2N"]
};

// Fungsi Login
function prosesLogin(event) {
  event.preventDefault(); // Mencegah reload halaman
  const inputPin = document.getElementById('inputPin').value.toUpperCase().trim();
  const errorMsg = document.getElementById('errorMsg');
  let userRole = null;

  // Pengecekan Level Akses
  if (dataPIN.master.includes(inputPin)) {
    userRole = "Master";
  } else if (dataPIN.kapten.includes(inputPin)) {
    userRole = "Kapten";
  } else if (dataPIN.kru.includes(inputPin)) {
    userRole = "Kru";
  }

  if (userRole) {
    // Jika PIN Benar: Simpan sesi di HP kru
    localStorage.setItem('av_session_pin', inputPin);
    localStorage.setItem('av_session_role', userRole);
    
    // Animasi sukses sedikit biar keren
    event.target.innerHTML = "✅ Akses Diberikan...";
    
    // Arahkan ke halaman utama (Home)
    setTimeout(() => {
      window.location.href = "/"; 
    }, 800);
  } else {
    // Jika PIN Salah
    errorMsg.style.display = "block";
    errorMsg.textContent = "⚠️ PIN Tidak Dikenali. Silakan coba lagi.";
  }
}

// Fungsi Logout
function prosesLogout() {
  localStorage.removeItem('av_session_pin');
  localStorage.removeItem('av_session_role');
  window.location.href = "/login.html"; // Arahkan kembali ke halaman login
}
