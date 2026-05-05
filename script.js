// ========== KONFIGURASI GOOGLE SHEETS ==========
// GANTI LINK_INI_DENGAN_LINK_PUBLISH_KAMU
const GOOGLE_SHEETS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoqyez7UOK5RiRJvj7EKPFhlkuknwThpkS9zh7ecoPOXH19Lodqh1g5yK_BzEFj2mqR2NYLokuQJfY/pub?output=csv";

// Data utama
let penjualanData = [];
let stokData = [];
let biayaOp = { iklan: 0, fee: 0, ongkir: 0, lain: 0 };
let targetBulanan = 10000000;

// Status loading
let isLoading = true;

// ========== LOAD DATA DARI GOOGLE SHEETS ==========
async function loadDataFromSheets() {
    try {
        isLoading = true;
        showLoading();
        
        const response = await fetch(GOOGLE_SHEETS_URL);
        const csvText = await response.text();
        
        // Parse CSV
        const rows = csvText.split('\n');
        const headers = rows[0].split(',').map(h => h.replace(/"/g, '').trim());
        
        // Cari sheet mana yang sedang di-load (untuk parsing lebih akurat, kita simpan di localStorage juga)
        // Untuk versi sederhana, kita tetap pakai localStorage sebagai cache
        // Tapi data akan disinkronkan
        
        console.log("Data loaded from Google Sheets");
        
        // Load data dari localStorage dulu (fallback)
        const localPenjualan = localStorage.getItem('penjualanData');
        if (localPenjualan) {
            penjualanData = JSON.parse(localPenjualan);
        } else {
            penjualanData = [];
        }
        
        const localStok = localStorage.getItem('stokData');
        if (localStok) {
            stokData = JSON.parse(localStok);
        } else {
            stokData = [];
        }
        
        const localBiaya = localStorage.getItem('biayaOp');
        if (localBiaya) {
            biayaOp = JSON.parse(localBiaya);
        }
        
        isLoading = false;
        hideLoading();
        
        // Refresh semua tampilan
        refreshAllDisplays();
        
    } catch (error) {
        console.error("Gagal load data dari Google Sheets:", error);
        // Fallback ke localStorage
        const localPenjualan = localStorage.getItem('penjualanData');
        if (localPenjualan) penjualanData = JSON.parse(localPenjualan);
        const localStok = localStorage.getItem('stokData');
        if (localStok) stokData = JSON.parse(localStok);
        const localBiaya = localStorage.getItem('biayaOp');
        if (localBiaya) biayaOp = JSON.parse(localBiaya);
        
        isLoading = false;
        hideLoading();
        refreshAllDisplays();
        alert("Gagal sync ke Google Sheets, menggunakan data lokal. Cek koneksi internet.");
    }
}

// ========== SIMPAN DATA KE LOCAL STORAGE (CACHE) ==========
function savePenjualan() {
    localStorage.setItem('penjualanData', JSON.stringify(penjualanData));
    // Di versi ini, kita juga akan sync ke Google Sheets via webhook
    // Tapi untuk kemudahan, kita tetap simpan lokal dulu
}

function saveStok() {
    localStorage.setItem('stokData', JSON.stringify(stokData));
}

function saveBiaya() {
    localStorage.setItem('biayaOp', JSON.stringify(biayaOp));
}

function syncToGoogleSheets() {
    // Fungsi sync ke Google Sheets via Google Apps Script
    // Untuk versi lengkap, butuh setup Google Apps Script
    console.log("Data siap disinkronkan");
}

// ========== TAMPILAN LOADING ==========
function showLoading() {
    let loader = document.getElementById('globalLoader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'globalLoader';
        loader.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; display:flex; align-items:center; justify-content:center; color:white; font-size:16px;';
        loader.innerHTML = '<div style="background:white; color:#1a1a2e; padding:20px 40px; border-radius:12px;">⏳ Memuat data dari Google Sheets...</div>';
        document.body.appendChild(loader);
    }
    loader.style.display = 'flex';
}

function hideLoading() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'none';
}

function refreshAllDisplays() {
    renderPenjualan();
    renderStok();
    renderDashboard();
    renderKeuangan();
    renderStrategiProfessional();
    applyViewerRestrictions();
}

// ========== CEK LOGIN & ROLE ==========
function isLoggedIn() {
    return localStorage.getItem('isLoggedIn') === 'true';
}

function isAdmin() {
    return localStorage.getItem('userRole') === 'admin';
}

function isViewer() {
    return localStorage.getItem('userRole') === 'viewer';
}

// Redirect ke login jika belum login
if (!window.location.href.includes('login.html') && !window.location.href.includes('index.html')) {
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
    }
}

// ========== TAMPILKAN TANGGAL ==========
const dateEl = document.getElementById('currentDate');
if (dateEl) {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.innerText = today.toLocaleDateString('id-ID', options);
}

// ========== FUNGSI BANTU ==========
function getOmzetByDate(date) {
    return penjualanData.filter(p => p.tanggal === date).reduce((sum, p) => sum + (p.jumlah * p.harga), 0);
}

function getOmzetLast7Days() {
    const result = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        result.push({ date: dateStr, omzet: getOmzetByDate(dateStr) });
    }
    return result;
}

// ========== APPLY VIEWER RESTRICTIONS ==========
function applyViewerRestrictions() {
    if (!isViewer()) return;
    
    const allButtons = document.querySelectorAll('button');
    allButtons.forEach(btn => {
        const btnText = btn.innerText.toLowerCase();
        const btnId = btn.id || '';
        
        if (btnText.includes('tambah') || btnText.includes('simpan') || btnText.includes('update') ||
            btnText.includes('hapus') || btnText.includes('delete') || btnText.includes('edit') ||
            btnId.includes('Tambah') || btnId.includes('Simpan')) {
            btn.style.display = 'none';
        }
    });
    
    const allInputs = document.querySelectorAll('input, select, textarea');
    allInputs.forEach(input => {
        input.disabled = true;
        input.style.backgroundColor = '#f8f9fa';
        input.style.color = '#6c757d';
    });
    
    if (!document.querySelector('.viewer-badge')) {
        const topBarTitle = document.querySelector('.top-bar h1');
        if (topBarTitle) {
            const badge = document.createElement('span');
            badge.className = 'viewer-badge';
            badge.innerText = 'Mode Lihat (Tidak Dapat Mengedit)';
            badge.style.cssText = 'background: #f59f00; color: white; font-size: 11px; padding: 4px 12px; border-radius: 40px; margin-left: 14px; font-weight: normal;';
            topBarTitle.parentElement.insertBefore(badge, topBarTitle.nextSibling);
        }
    }
}

setTimeout(() => applyViewerRestrictions(), 100);
setInterval(() => {
    if (isViewer()) applyViewerRestrictions();
}, 500);

// ========== RENDER DASHBOARD ==========
function renderDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    const todayOmzet = getOmzetByDate(today);
    const yesterdayOmzet = getOmzetByDate(yesterday);
    const totalOrder = penjualanData.length;
    const totalProdukTerjual = penjualanData.reduce((sum, p) => sum + p.jumlah, 0);
    
    const omzetHariIniEl = document.getElementById('omzetHariIni');
    if (omzetHariIniEl) omzetHariIniEl.innerText = `Rp ${todayOmzet.toLocaleString()}`;
    const totalOrderEl = document.getElementById('totalOrder');
    if (totalOrderEl) totalOrderEl.innerText = totalOrder;
    const produkTerjualEl = document.getElementById('produkTerjual');
    if (produkTerjualEl) produkTerjualEl.innerText = totalProdukTerjual;
    
    const compHariIni = document.getElementById('compHariIni');
    if (compHariIni) compHariIni.innerText = `Rp ${todayOmzet.toLocaleString()}`;
    const compKemarin = document.getElementById('compKemarin');
    if (compKemarin) compKemarin.innerText = `Rp ${yesterdayOmzet.toLocaleString()}`;
    
    let trendPercent = 0;
    if (yesterdayOmzet > 0) trendPercent = ((todayOmzet - yesterdayOmzet) / yesterdayOmzet) * 100;
    const trendEl = document.getElementById('trendStatus');
    if (trendEl) {
        if (trendPercent > 0) {
            trendEl.innerHTML = `+${trendPercent.toFixed(1)}% ↑`;
            trendEl.className = 'trend-indicator trend-up';
        } else if (trendPercent < 0) {
            trendEl.innerHTML = `${trendPercent.toFixed(1)}% ↓`;
            trendEl.className = 'trend-indicator trend-down';
        } else {
            trendEl.innerHTML = '0% →';
            trendEl.className = 'trend-indicator trend-neutral';
        }
    }
    
    let realisasi = 0;
    const currentMonth = new Date().toISOString().slice(0,7);
    penjualanData.forEach(p => {
        if (p.tanggal.startsWith(currentMonth)) realisasi += p.jumlah * p.harga;
    });
    const targetNilai = document.getElementById('targetNilai');
    if (targetNilai) targetNilai.innerText = `Rp ${targetBulanan.toLocaleString()}`;
    const realisasiNilai = document.getElementById('realisasiNilai');
    if (realisasiNilai) realisasiNilai.innerText = `Rp ${realisasi.toLocaleString()}`;
    const percent = Math.min(100, (realisasi / targetBulanan) * 100);
    const progressFill = document.getElementById('progressFill');
    if (progressFill) progressFill.style.width = `${percent}%`;
    const targetPercent = document.getElementById('targetPercent');
    if (targetPercent) targetPercent.innerText = `${percent.toFixed(1)}% tercapai`;
    
    const mp = { Shopee: { omzet: 0, order: 0, produk: 0 }, Tokopedia: { omzet: 0, order: 0, produk: 0 }, 'TikTok Shop': { omzet: 0, order: 0, produk: 0 } };
    penjualanData.forEach(p => {
        if (mp[p.marketplace]) {
            mp[p.marketplace].omzet += p.jumlah * p.harga;
            mp[p.marketplace].order++;
            mp[p.marketplace].produk += p.jumlah;
        }
    });
    const totalOmzetMp = mp.Shopee.omzet + mp.Tokopedia.omzet + mp['TikTok Shop'].omzet;
    
    const mpShopeeOmzet = document.getElementById('mpShopeeOmzet');
    if (mpShopeeOmzet) mpShopeeOmzet.innerText = `Rp ${mp.Shopee.omzet.toLocaleString()}`;
    const mpShopeeOrder = document.getElementById('mpShopeeOrder');
    if (mpShopeeOrder) mpShopeeOrder.innerText = mp.Shopee.order;
    const mpShopeeProduk = document.getElementById('mpShopeeProduk');
    if (mpShopeeProduk) mpShopeeProduk.innerText = mp.Shopee.produk;
    const mpShopeePersen = document.getElementById('mpShopeePersen');
    if (mpShopeePersen) mpShopeePersen.innerText = totalOmzetMp > 0 ? `${((mp.Shopee.omzet/totalOmzetMp)*100).toFixed(1)}%` : '0%';
    
    const mpTokopediaOmzet = document.getElementById('mpTokopediaOmzet');
    if (mpTokopediaOmzet) mpTokopediaOmzet.innerText = `Rp ${mp.Tokopedia.omzet.toLocaleString()}`;
    const mpTokopediaOrder = document.getElementById('mpTokopediaOrder');
    if (mpTokopediaOrder) mpTokopediaOrder.innerText = mp.Tokopedia.order;
    const mpTokopediaProduk = document.getElementById('mpTokopediaProduk');
    if (mpTokopediaProduk) mpTokopediaProduk.innerText = mp.Tokopedia.produk;
    const mpTokopediaPersen = document.getElementById('mpTokopediaPersen');
    if (mpTokopediaPersen) mpTokopediaPersen.innerText = totalOmzetMp > 0 ? `${((mp.Tokopedia.omzet/totalOmzetMp)*100).toFixed(1)}%` : '0%';
    
    const mpTiktokOmzet = document.getElementById('mpTiktokOmzet');
    if (mpTiktokOmzet) mpTiktokOmzet.innerText = `Rp ${mp['TikTok Shop'].omzet.toLocaleString()}`;
    const mpTiktokOrder = document.getElementById('mpTiktokOrder');
    if (mpTiktokOrder) mpTiktokOrder.innerText = mp['TikTok Shop'].order;
    const mpTiktokProduk = document.getElementById('mpTiktokProduk');
    if (mpTiktokProduk) mpTiktokProduk.innerText = mp['TikTok Shop'].produk;
    const mpTiktokPersen = document.getElementById('mpTiktokPersen');
    if (mpTiktokPersen) mpTiktokPersen.innerText = totalOmzetMp > 0 ? `${((mp['TikTok Shop'].omzet/totalOmzetMp)*100).toFixed(1)}%` : '0%';
    
    const totalOmzetEl = document.getElementById('totalOmzet');
    if (totalOmzetEl) totalOmzetEl.innerHTML = `Rp ${totalOmzetMp.toLocaleString()}`;
    const totalOrderCount = document.getElementById('totalOrderCount');
    if (totalOrderCount) totalOrderCount.innerText = penjualanData.length;
    const totalProdukCount = document.getElementById('totalProdukCount');
    if (totalProdukCount) totalProdukCount.innerText = totalProdukTerjual;
    
    const productSales = {};
    penjualanData.forEach(p => { productSales[p.produk] = (productSales[p.produk] || 0) + (p.jumlah * p.harga); });
    const top5 = Object.entries(productSales).sort((a,b) => b[1] - a[1]).slice(0,5);
    const topList = document.getElementById('topProdukList');
    if (topList) {
        if (top5.length === 0) topList.innerHTML = '<tr><td colspan="3" class="text-center">Belum ada数据</td>';
        else topList.innerHTML = top5.map(p => `<tr><td style="font-weight:500;">${p[0]}</td><td>0</td><td>Rp ${p[1].toLocaleString()}</td>`).join('');
    }
    
    const alertList = [];
    stokData.forEach(item => {
        const sisa = (item.stokAwal || 0) + (item.stokMasuk || 0) - (item.terjual || 0);
        if (sisa <= 0) alertList.push(`${item.nama} (Habis)`);
        else if (sisa < 10) alertList.push(`${item.nama} (Sisa ${sisa})`);
    });
    const alertDiv = document.getElementById('alertStokList');
    if (alertDiv) alertDiv.innerHTML = alertList.length ? alertList.map(a => `<div class="alert-item">⚠️ ${a}</div>`).join('') : '<div class="empty-alert">Tidak ada peringatan stok</div>';
    
    updateSalesChart();
    updateMarketplaceChart(mp, totalOmzetMp);
}

let salesChart = null;
function updateSalesChart() {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const data = getOmzetLast7Days();
    const labels = data.map(d => d.date.slice(5));
    const values = data.map(d => d.omzet);
    
    if (salesChart) salesChart.destroy();
    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Omzet',
                data: values,
                borderColor: '#1a1a2e',
                backgroundColor: 'rgba(26,26,46,0.05)',
                fill: true,
                tension: 0.3,
                pointRadius: 4,
                pointBackgroundColor: '#1a1a2e'
            }]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }
    });
}

let marketplaceChart = null;
function updateMarketplaceChart(mp, total) {
    const canvas = document.getElementById('marketplaceChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (marketplaceChart) marketplaceChart.destroy();
    marketplaceChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Shopee', 'Tokopedia', 'TikTok Shop'],
            datasets: [{ data: [mp.Shopee.omzet, mp.Tokopedia.omzet, mp['TikTok Shop'].omzet], backgroundColor: ['#1a1a2e', '#4a6cf7', '#f59f00'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } } }
    });
}

// ========== RENDER PENJUALAN ==========
function renderPenjualan() {
    const tbody = document.getElementById('penjualanBody');
    if (!tbody) return;
    const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const filterMP = document.getElementById('filterMarketplace')?.value || '';
    let filtered = penjualanData.filter(item => {
        const matchSearch = item.produk.toLowerCase().includes(search) || item.marketplace.toLowerCase().includes(search);
        const matchMP = !filterMP || item.marketplace === filterMP;
        return matchSearch && matchMP;
    });
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Belum ada data</td>';
        return;
    }
    tbody.innerHTML = filtered.map((item, idx) => {
        const deleteButton = isAdmin() ? `<button onclick="hapusPenjualan(${penjualanData.indexOf(item)})" class="btn-delete">Hapus</button>` : '';
        return `
            <tr>
                <td>${item.tanggal}</td>
                <td>${item.marketplace}</td>
                <td style="font-weight:500;">${item.produk}</td>
                <td>${item.jumlah}</td>
                <td>Rp ${parseInt(item.harga).toLocaleString()}</td>
                <td>Rp ${(item.jumlah * item.harga).toLocaleString()}</td>
                <td>${item.status}</td>
                <td>${deleteButton}</td>
            </table>
        `;
    }).join('');
}

window.hapusPenjualan = function(index) {
    if (isViewer()) {
        alert('Anda dalam mode viewer, tidak dapat menghapus data');
        return;
    }
    if (confirm('Hapus data ini?')) {
        penjualanData.splice(index, 1);
        savePenjualan();
        renderPenjualan();
        renderDashboard();
        updateStokFromPenjualan();
        renderKeuangan();
        renderStrategiProfessional();
    }
};

// ========== RENDER STOK ==========
function renderStok() {
    const tbody = document.getElementById('stokBody');
    if (!tbody) return;
    const search = document.getElementById('searchStok')?.value.toLowerCase() || '';
    const filtered = stokData.filter(item => item.nama.toLowerCase().includes(search));
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Belum ada data stok</td>';
        const habisBody = document.getElementById('habisBody');
        if (habisBody) habisBody.innerHTML = '<tr><td colspan="2" class="text-center">-</td>';
        return;
    }
    tbody.innerHTML = filtered.map((item, idx) => {
        const sisa = (item.stokAwal || 0) + (item.stokMasuk || 0) - (item.terjual || 0);
        const status = sisa <= 0 ? 'Habis' : (sisa < 10 ? 'Menipis' : 'Aman');
        const deleteButton = isAdmin() ? `<button onclick="hapusStok(${idx})" class="btn-delete">Hapus</button>` : '';
        return `<tr><td style="font-weight:500;">${item.nama}</td><td>${item.stokAwal || 0}</td><td>${item.stokMasuk || 0}</td><td>${item.terjual || 0}</td><td>${sisa}</td><td>${status}</td><td>${deleteButton}</td></tr>`;
    }).join('');
    const habis = stokData.filter(item => { const sisa = (item.stokAwal || 0) + (item.stokMasuk || 0) - (item.terjual || 0); return sisa <= 0; });
    const habisBody = document.getElementById('habisBody');
    if (habisBody) habisBody.innerHTML = habis.length === 0 ? '<tr><td colspan="2" class="text-center">-</td>' : habis.map(item => `<tr><td>${item.nama}</td><td>0</td>`).join('');
}

window.hapusStok = function(index) {
    if (isViewer()) {
        alert('Anda dalam mode viewer, tidak dapat menghapus data');
        return;
    }
    if (confirm('Hapus produk ini?')) {
        stokData.splice(index, 1);
        saveStok();
        renderStok();
        renderDashboard();
    }
};

function updateStokFromPenjualan() {
    const productSold = {};
    penjualanData.forEach(p => { productSold[p.produk] = (productSold[p.produk] || 0) + p.jumlah; });
    stokData.forEach(item => { item.terjual = productSold[item.nama] || 0; });
    saveStok();
    renderStok();
}

// ========== KEUANGAN ==========
function renderKeuangan() {
    const totalOmzet = penjualanData.reduce((sum, p) => sum + (p.jumlah * p.harga), 0);
    const totalBiaya = (biayaOp.iklan || 0) + (biayaOp.fee || 0) + (biayaOp.ongkir || 0) + (biayaOp.lain || 0);
    const labaBersih = totalOmzet - totalBiaya;
    
    const omzetEl = document.getElementById('totalOmzetKeu');
    if (omzetEl) omzetEl.innerText = `Rp ${totalOmzet.toLocaleString()}`;
    const biayaEl = document.getElementById('totalBiayaKeu');
    if (biayaEl) biayaEl.innerText = `Rp ${totalBiaya.toLocaleString()}`;
    const labaEl = document.getElementById('labaBersihKeu');
    if (labaEl) labaEl.innerText = `Rp ${labaBersih.toLocaleString()}`;
    
    const summaryIklan = document.getElementById('summaryIklan');
    if (summaryIklan) summaryIklan.innerText = `Rp ${(biayaOp.iklan || 0).toLocaleString()}`;
    const summaryFee = document.getElementById('summaryFee');
    if (summaryFee) summaryFee.innerText = `Rp ${(biayaOp.fee || 0).toLocaleString()}`;
    const summaryOngkir = document.getElementById('summaryOngkir');
    if (summaryOngkir) summaryOngkir.innerText = `Rp ${(biayaOp.ongkir || 0).toLocaleString()}`;
    const summaryLain = document.getElementById('summaryLain');
    if (summaryLain) summaryLain.innerText = `Rp ${(biayaOp.lain || 0).toLocaleString()}`;
    const summaryTotal = document.getElementById('summaryTotal');
    if (summaryTotal) summaryTotal.innerText = `Rp ${totalBiaya.toLocaleString()}`;
    
    const totalTransaksi = penjualanData.length;
    const avgTransaksi = totalTransaksi > 0 ? totalOmzet / totalTransaksi : 0;
    const avgTransaction = document.getElementById('avgTransaction');
    if (avgTransaction) avgTransaction.innerText = `Rp ${avgTransaksi.toLocaleString()}`;
    const marginProfit = document.getElementById('marginProfit');
    if (marginProfit) marginProfit.innerText = totalOmzet > 0 ? `${((labaBersih / totalOmzet) * 100).toFixed(1)}%` : '0%';
    const totalTransaksiEl = document.getElementById('totalTransaksi');
    if (totalTransaksiEl) totalTransaksiEl.innerText = totalTransaksi;
    
    updateProfitChart(totalOmzet, totalBiaya);
}

let profitChart = null;
function updateProfitChart(omzet, biaya) {
    const canvas = document.getElementById('profitChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (profitChart) profitChart.destroy();
    profitChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: ['Pendapatan', 'Biaya', 'Laba Bersih'], datasets: [{ data: [omzet, biaya, omzet - biaya], backgroundColor: ['#1a1a2e', '#e03131', '#2e7d32'], borderRadius: 8 }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }
    });
}

// ========== STRATEGI ==========
function renderStrategiProfessional() {
    if (!window.location.href.includes('strategi.html')) return;
    
    const totalOmzet = penjualanData.reduce((sum, p) => sum + (p.jumlah * p.harga), 0);
    const totalUnit = penjualanData.reduce((sum, p) => sum + p.jumlah, 0);
    
    const productStats = {};
    penjualanData.forEach(p => {
        if (!productStats[p.produk]) productStats[p.produk] = { unit: 0, omzet: 0 };
        productStats[p.produk].unit += p.jumlah;
        productStats[p.produk].omzet += p.jumlah * p.harga;
    });
    
    const productList = Object.entries(productStats).map(([name, data]) => ({ name, unit: data.unit, omzet: data.omzet, share: totalOmzet > 0 ? (data.omzet / totalOmzet) * 100 : 0 }));
    productList.sort((a, b) => b.omzet - a.omzet);
    
    const top5 = productList.slice(0, 5);
    const bottom5 = productList.slice(-5).reverse();
    const topProduct = top5[0] || null;
    const slowProduct = bottom5[0] || null;
    
    const uniqueProducts = productList.length;
    const activeMarketplaces = new Set(penjualanData.map(p => p.marketplace)).size;
    let score = 0;
    if (totalOmzet > 0) score += 30;
    if (uniqueProducts >= 3) score += 20;
    else if (uniqueProducts >= 1) score += 10;
    if (activeMarketplaces >= 2) score += 20;
    else if (activeMarketplaces >= 1) score += 10;
    if (topProduct && topProduct.share < 60) score += 15;
    else if (topProduct) score += 5;
    if (totalUnit >= 10) score += 15;
    else if (totalUnit >= 1) score += 5;
    
    const businessScore = document.getElementById('businessScore');
    if (businessScore) businessScore.innerText = score;
    const businessStatus = document.getElementById('businessStatus');
    if (businessStatus) {
        if (score >= 70) { businessStatus.innerText = 'Sehat'; businessStatus.style.color = '#2e7d32'; }
        else if (score >= 40) { businessStatus.innerText = 'Perlu Perbaikan'; businessStatus.style.color = '#e65100'; }
        else { businessStatus.innerText = 'Kritis'; businessStatus.style.color = '#c62828'; }
    }
    
    const topProductEl = document.getElementById('topProduct');
    if (topProductEl) topProductEl.innerText = topProduct ? topProduct.name : '-';
    const slowProductEl = document.getElementById('slowProduct');
    if (slowProductEl) slowProductEl.innerText = slowProduct ? slowProduct.name : '-';
    
    const topTable = document.getElementById('topProductsTable');
    if (topTable) {
        if (top5.length === 0) topTable.innerHTML = '<tr><td colspan="4" class="text-center">Belum ada data</td>';
        else topTable.innerHTML = top5.map((p, i) => `<tr><td style="font-weight:500;">${p.name}</td><td>${p.unit} unit</td><td>Rp ${p.omzet.toLocaleString()}</td><td><div class="progress-bar" style="width:100%;"><div class="progress-fill" style="width:${p.share}%"></div></div> ${p.share.toFixed(1)}%</td>`).join('');
    }
    
    const bottomTable = document.getElementById('bottomProductsTable');
    if (bottomTable) {
        if (bottom5.length === 0 || bottom5[0].omzet === 0) bottomTable.innerHTML = '<tr><td colspan="4" class="text-center">Belum ada data</td>';
        else bottomTable.innerHTML = bottom5.map(p => `<tr><td>${p.name}</td><td>${p.unit} unit</td><td>Rp ${p.omzet.toLocaleString()}</td><td>${p.share.toFixed(1)}%</td>`).join('');
    }
    
    const mpStats = { Shopee: { omzet: 0, order: 0 }, Tokopedia: { omzet: 0, order: 0 }, 'TikTok Shop': { omzet: 0, order: 0 } };
    penjualanData.forEach(p => { if (mpStats[p.marketplace]) { mpStats[p.marketplace].omzet += p.jumlah * p.harga; mpStats[p.marketplace].order++; } });
    const bestMp = Object.entries(mpStats).sort((a,b) => b[1].omzet - a[1].omzet)[0];
    
    const shopeeOmzet = document.getElementById('shopeeOmzet');
    if (shopeeOmzet) shopeeOmzet.innerText = `Rp ${mpStats.Shopee.omzet.toLocaleString()}`;
    const shopeeOrder = document.getElementById('shopeeOrder');
    if (shopeeOrder) shopeeOrder.innerText = mpStats.Shopee.order;
    const tokopediaOmzet = document.getElementById('tokopediaOmzet');
    if (tokopediaOmzet) tokopediaOmzet.innerText = `Rp ${mpStats.Tokopedia.omzet.toLocaleString()}`;
    const tokopediaOrder = document.getElementById('tokopediaOrder');
    if (tokopediaOrder) tokopediaOrder.innerText = mpStats.Tokopedia.order;
    const tiktokOmzet = document.getElementById('tiktokOmzet');
    if (tiktokOmzet) tiktokOmzet.innerText = `Rp ${mpStats['TikTok Shop'].omzet.toLocaleString()}`;
    const tiktokOrder = document.getElementById('tiktokOrder');
    if (tiktokOrder) tiktokOrder.innerText = mpStats['TikTok Shop'].order;
    
    const shopeeRec = document.getElementById('shopeeRec');
    if (shopeeRec) shopeeRec.innerHTML = bestMp && bestMp[0] === 'Shopee' ? '✓ Marketplace terbaik' : 'Perlu ditingkatkan';
    const tokopediaRec = document.getElementById('tokopediaRec');
    if (tokopediaRec) tokopediaRec.innerHTML = bestMp && bestMp[0] === 'Tokopedia' ? '✓ Marketplace terbaik' : 'Perlu ditingkatkan';
    const tiktokRec = document.getElementById('tiktokRec');
    if (tiktokRec) tiktokRec.innerHTML = bestMp && bestMp[0] === 'TikTok Shop' ? '✓ Marketplace terbaik' : 'Perlu ditingkatkan';
    
    const recommendations = [];
    if (topProduct && topProduct.share > 50) recommendations.push(`Produk "${topProduct.name}" mendominasi ${topProduct.share.toFixed(1)}% omzet. Fokus pada produk ini.`);
    if (slowProduct && slowProduct.omzet > 0 && slowProduct.share < 5) recommendations.push(`Produk "${slowProduct.name}" hanya berkontribusi ${slowProduct.share.toFixed(1)}% omzet. Evaluasi produk ini.`);
    if (totalUnit < 10) recommendations.push('Volume penjualan masih rendah. Coba program diskon atau bundling produk.');
    if (recommendations.length === 0) recommendations.push('Terus pantau data penjualan untuk mendapatkan rekomendasi.');
    
    const recommendationList = document.getElementById('recommendationList');
    if (recommendationList) recommendationList.innerHTML = recommendations.map(rec => `<div class="recommendation-item">${rec}</div>`).join('');
    
    const savedPlan = localStorage.getItem('actionPlan') || '';
    const actionPlan = document.getElementById('actionPlan');
    if (actionPlan) actionPlan.value = savedPlan;
    
    updateDistributionChart(top5.map(p => p.name), top5.map(p => p.omzet), totalOmzet - top5.reduce((s, p) => s + p.omzet, 0));
    
    const insight1 = document.getElementById('insight1');
    if (insight1) insight1.innerText = uniqueProducts;
    const insight2 = document.getElementById('insight2');
    if (insight2) insight2.innerText = activeMarketplaces;
    const insight3 = document.getElementById('insight3');
    if (insight3) insight3.innerText = totalUnit > 0 ? `Rp ${Math.round(totalOmzet/totalUnit).toLocaleString()}` : 'Rp 0';
}

let distChart = null;
function updateDistributionChart(labels, values, othersTotal) {
    const canvas = document.getElementById('distributionChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (distChart) distChart.destroy();
    const allValues = [...values];
    const allLabels = [...labels];
    if (othersTotal > 0) { allValues.push(othersTotal); allLabels.push('Lainnya'); }
    distChart = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: allLabels, datasets: [{ data: allValues, backgroundColor: ['#1a1a2e', '#4a6cf7', '#f59f00', '#e03131', '#2e7d32', '#adb5bd'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }
    });
}

// ========== MODAL TAMBAH DATA ==========
if (document.getElementById('btnTambah')) {
    const modal = document.getElementById('modalTambah');
    const btn = document.getElementById('btnTambah');
    const close = document.querySelector('.close');
    
    if (btn) {
        btn.onclick = () => {
            if (isAdmin()) {
                modal.style.display = 'block';
            } else {
                alert('Mode viewer tidak dapat menambah data');
            }
        };
    }
    if (close) close.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    
    document.getElementById('formPenjualan')?.addEventListener('submit', function(e) {
        e.preventDefault();
        if (isViewer()) { alert('Mode viewer tidak dapat menambah data'); modal.style.display = 'none'; return; }
        penjualanData.push({
            tanggal: document.getElementById('tgl').value,
            marketplace: document.getElementById('mp').value,
            produk: document.getElementById('produk').value,
            jumlah: parseInt(document.getElementById('jumlah').value) || 0,
            harga: parseInt(document.getElementById('harga').value) || 0,
            status: document.getElementById('status').value
        });
        savePenjualan();
        renderPenjualan();
        renderDashboard();
        updateStokFromPenjualan();
        renderKeuangan();
        renderStrategiProfessional();
        modal.style.display = 'none';
        this.reset();
        alert('Data tersimpan!');
    });
}

if (document.getElementById('btnTambahStok')) {
    const modal = document.getElementById('modalStok');
    const btn = document.getElementById('btnTambahStok');
    const close = document.querySelector('.close-stok');
    
    if (btn) {
        btn.onclick = () => {
            if (isAdmin()) {
                modal.style.display = 'block';
            } else {
                alert('Mode viewer tidak dapat menambah data');
            }
        };
    }
    if (close) close.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    
    document.getElementById('formStok')?.addEventListener('submit', function(e) {
        e.preventDefault();
        if (isViewer()) { alert('Mode viewer tidak dapat menambah data'); modal.style.display = 'none'; return; }
        stokData.push({
            nama: document.getElementById('namaProduk').value,
            stokAwal: parseInt(document.getElementById('stokAwal').value) || 0,
            stokMasuk: parseInt(document.getElementById('stokMasuk').value) || 0,
            terjual: 0
        });
        saveStok();
        renderStok();
        renderDashboard();
        modal.style.display = 'none';
        this.reset();
        alert('Stok tersimpan!');
    });
}

// ========== SIMPAN BIAYA OPERASIONAL ==========
if (document.getElementById('biayaIklan')) {
    document.getElementById('biayaIklan').value = biayaOp.iklan || 0;
    document.getElementById('feeMarketplace').value = biayaOp.fee || 0;
    document.getElementById('ongkir').value = biayaOp.ongkir || 0;
    document.getElementById('lainLain').value = biayaOp.lain || 0;
    
    const simpanBiaya = document.getElementById('simpanBiaya');
    if (simpanBiaya) {
        simpanBiaya.addEventListener('click', () => {
            if (isViewer()) { alert('Mode viewer tidak dapat mengedit biaya'); return; }
            biayaOp = {
                iklan: parseInt(document.getElementById('biayaIklan').value) || 0,
                fee: parseInt(document.getElementById('feeMarketplace').value) || 0,
                ongkir: parseInt(document.getElementById('ongkir').value) || 0,
                lain: parseInt(document.getElementById('lainLain').value) || 0
            };
            saveBiaya();
            renderKeuangan();
            alert('Biaya operasional telah disimpan');
        });
    }
}

// ========== SIMPAN RENCANA TINDAKAN ==========
if (document.getElementById('saveActionPlan')) {
    const saveActionPlan = document.getElementById('saveActionPlan');
    if (saveActionPlan) {
        saveActionPlan.addEventListener('click', () => {
            if (isViewer()) { alert('Mode viewer tidak dapat mengedit rencana'); return; }
            const plan = document.getElementById('actionPlan').value;
            localStorage.setItem('actionPlan', plan);
            const hint = document.getElementById('saveHint');
            if (hint) { hint.innerText = 'Tersimpan!'; setTimeout(() => hint.innerText = '', 2000); }
        });
        if (isViewer()) saveActionPlan.style.display = 'none';
    }
}

// ========== EXPORT EXCEL ==========
const exportExcelBtn = document.getElementById('btnExport');
if (exportExcelBtn) {
    const newExportBtn = exportExcelBtn.cloneNode(true);
    exportExcelBtn.parentNode.replaceChild(newExportBtn, exportExcelBtn);
    
    newExportBtn.addEventListener('click', function(e) {
        e.preventDefault();
        
        if (isViewer()) {
            alert('Maaf, mode viewer tidak dapat mengekspor data.');
            return;
        }
        
        if (!penjualanData || penjualanData.length === 0) {
            alert('Tidak ada data penjualan untuk diekspor.');
            return;
        }
        
        try {
            let csv = "\"Tanggal\",\"Marketplace\",\"Produk\",\"Jumlah\",\"Harga\",\"Total\",\"Status\"\n";
            penjualanData.forEach(item => {
                const total = item.jumlah * item.harga;
                csv += `"${item.tanggal}","${item.marketplace}","${item.produk}",${item.jumlah},${item.harga},${total},"${item.status}"\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.setAttribute('download', `penjualan_cylla_${new Date().toISOString().slice(0,10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            alert(`Berhasil mengekspor ${penjualanData.length} data penjualan!`);
        } catch (error) {
            console.error('Export error:', error);
            alert('Gagal mengekspor data. Silakan coba lagi.');
        }
    });
    
    if (isViewer()) newExportBtn.style.display = 'none';
}

// ========== SEARCH & FILTER ==========
if (document.getElementById('searchInput')) {
    document.getElementById('searchInput')?.addEventListener('keyup', () => renderPenjualan());
    document.getElementById('filterMarketplace')?.addEventListener('change', () => renderPenjualan());
}
if (document.getElementById('searchStok')) {
    document.getElementById('searchStok')?.addEventListener('keyup', () => renderStok());
}

// ========== LOGIN SYSTEM ==========
if (document.getElementById('loginForm')) {
    const roleBtns = document.querySelectorAll('.role-btn');
    const adminInfo = document.getElementById('adminInfo');
    const viewerInfo = document.getElementById('viewerInfo');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    if (roleBtns.length) {
        roleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                roleBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const role = btn.getAttribute('data-role');
                if (role === 'admin') {
                    if (adminInfo) adminInfo.classList.remove('hidden');
                    if (viewerInfo) viewerInfo.classList.add('hidden');
                    if (emailInput) emailInput.value = 'admin@cylla.store';
                    if (passwordInput) passwordInput.value = '';
                } else {
                    if (adminInfo) adminInfo.classList.add('hidden');
                    if (viewerInfo) viewerInfo.classList.remove('hidden');
                    if (emailInput) emailInput.value = 'agung@panCa.store';
                    if (passwordInput) passwordInput.value = '';
                }
            });
        });
    }
    
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        if (email === 'admin@cylla.store' && password === 'cylla123') {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userRole', 'admin');
            window.location.href = 'dashboard.html';
        } 
        else if (email === 'agung@panCa.store' && password === 'pancagung') {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userRole', 'viewer');
            window.location.href = 'dashboard.html';
        }
        else {
            alert('Email atau password salah!');
        }
    });
}

// ========== INITIAL RENDER ==========
// Load data dari Google Sheets dulu, baru render
loadDataFromSheets();
