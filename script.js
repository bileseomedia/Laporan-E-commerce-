// ========== KONFIGURASI SUPABASE ==========
const SUPABASE_URL = "https://inwmobbmpmqnvsxtqdev.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlud21vYmJtcG1xbnZzeHRxZGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NjQ1MzMsImV4cCI6MjA5MzU0MDUzM30.BIiavatJdfyR6HJqKEKUXps5eHP7zbaQK8_aHJho5T8";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========== DATA GLOBAL ==========
let penjualanData = [];
let stokData = [];
let biayaData = [];

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
    } else {
        loadAllData();
    }
}

// ========== TAMPILKAN TANGGAL ==========
function updateDate() {
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        const today = new Date();
        dateEl.innerText = today.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
}
updateDate();

// ========== LOAD DATA DARI SUPABASE ==========
async function loadAllData() {
    console.log("Loading data...");
    
    try {
        // Load penjualan
        const { data: penjualan, error: err1 } = await supabase
            .from('penjualan')
            .select('*')
            .order('tanggal', { ascending: false });
        if (err1) console.error("Error penjualan:", err1);
        else if (penjualan) penjualanData = penjualan;
        console.log("Penjualan:", penjualanData.length);
        
        // Load stok
        const { data: stok, error: err2 } = await supabase
            .from('stok')
            .select('*')
            .order('produk');
        if (err2) console.error("Error stok:", err2);
        else if (stok) stokData = stok;
        console.log("Stok:", stokData.length);
        
        // Load biaya
        const { data: biaya, error: err3 } = await supabase
            .from('biaya_operasional')
            .select('*');
        if (err3) console.error("Error biaya:", err3);
        else if (biaya) biayaData = biaya;
        console.log("Biaya:", biayaData.length);
        
    } catch (error) {
        console.error("Error:", error);
    }
    
    // Refresh semua tampilan
    renderDashboard();
    renderPenjualan();
    renderStok();
    renderKeuangan();
    renderStrategi();
    applyViewerRestrictions();
    
    console.log("✅ Data loaded and rendered");
}

// ========== FUNGSI BANTU ==========
function getTotalOmzet() {
    return penjualanData.reduce((sum, p) => sum + (p.jumlah * p.harga_jual), 0);
}

function getTotalBiaya() {
    return biayaData.reduce((sum, b) => sum + b.nominal, 0);
}

function getLabaBersih() {
    return getTotalOmzet() - getTotalBiaya();
}

function getOmzetByDate(date) {
    return penjualanData.filter(p => p.tanggal === date).reduce((sum, p) => sum + (p.jumlah * p.harga_jual), 0);
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

// ========== RENDER DASHBOARD ==========
function renderDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const todayOmzet = getOmzetByDate(today);
    const yesterdayOmzet = getOmzetByDate(yesterday);
    const totalOrder = penjualanData.length;
    const totalProdukTerjual = penjualanData.reduce((sum, p) => sum + p.jumlah, 0);
    
    const el = (id) => document.getElementById(id);
    if (el('omzetHariIni')) el('omzetHariIni').innerText = `Rp ${todayOmzet.toLocaleString()}`;
    if (el('totalOrder')) el('totalOrder').innerText = totalOrder;
    if (el('produkTerjual')) el('produkTerjual').innerText = totalProdukTerjual;
    if (el('compHariIni')) el('compHariIni').innerText = `Rp ${todayOmzet.toLocaleString()}`;
    if (el('compKemarin')) el('compKemarin').innerText = `Rp ${yesterdayOmzet.toLocaleString()}`;
    
    let trend = yesterdayOmzet > 0 ? ((todayOmzet - yesterdayOmzet) / yesterdayOmzet) * 100 : 0;
    if (el('trendStatus')) {
        if (trend > 0) el('trendStatus').innerHTML = `+${trend.toFixed(1)}% ↑`;
        else if (trend < 0) el('trendStatus').innerHTML = `${trend.toFixed(1)}% ↓`;
        else el('trendStatus').innerHTML = '0% →';
    }
    
    let realisasi = getTotalOmzet();
    let targetOmzet = 10000000;
    if (el('targetNilai')) el('targetNilai').innerText = `Rp ${targetOmzet.toLocaleString()}`;
    if (el('realisasiNilai')) el('realisasiNilai').innerText = `Rp ${realisasi.toLocaleString()}`;
    let percent = Math.min(100, (realisasi / targetOmzet) * 100);
    if (el('progressFill')) el('progressFill').style.width = `${percent}%`;
    if (el('targetPercent')) el('targetPercent').innerText = `${percent.toFixed(1)}% tercapai`;
    
    const mp = { Shopee: { omzet: 0, order: 0, produk: 0 }, Tokopedia: { omzet: 0, order: 0, produk: 0 }, 'TikTok Shop': { omzet: 0, order: 0, produk: 0 } };
    penjualanData.forEach(p => { if (mp[p.marketplace]) { mp[p.marketplace].omzet += p.jumlah * p.harga_jual; mp[p.marketplace].order++; mp[p.marketplace].produk += p.jumlah; } });
    let totalMp = mp.Shopee.omzet + mp.Tokopedia.omzet + mp['TikTok Shop'].omzet;
    
    if (el('mpShopeeOmzet')) el('mpShopeeOmzet').innerText = `Rp ${mp.Shopee.omzet.toLocaleString()}`;
    if (el('mpShopeeOrder')) el('mpShopeeOrder').innerText = mp.Shopee.order;
    if (el('mpShopeePersen')) el('mpShopeePersen').innerText = totalMp > 0 ? `${((mp.Shopee.omzet/totalMp)*100).toFixed(1)}%` : '0%';
    if (el('mpTokopediaOmzet')) el('mpTokopediaOmzet').innerText = `Rp ${mp.Tokopedia.omzet.toLocaleString()}`;
    if (el('mpTokopediaOrder')) el('mpTokopediaOrder').innerText = mp.Tokopedia.order;
    if (el('mpTokopediaPersen')) el('mpTokopediaPersen').innerText = totalMp > 0 ? `${((mp.Tokopedia.omzet/totalMp)*100).toFixed(1)}%` : '0%';
    if (el('mpTiktokOmzet')) el('mpTiktokOmzet').innerText = `Rp ${mp['TikTok Shop'].omzet.toLocaleString()}`;
    if (el('mpTiktokOrder')) el('mpTiktokOrder').innerText = mp['TikTok Shop'].order;
    if (el('mpTiktokPersen')) el('mpTiktokPersen').innerText = totalMp > 0 ? `${((mp['TikTok Shop'].omzet/totalMp)*100).toFixed(1)}%` : '0%';
    if (el('totalOmzet')) el('totalOmzet').innerHTML = `Rp ${totalMp.toLocaleString()}`;
    if (el('totalOrderCount')) el('totalOrderCount').innerText = totalOrder;
    if (el('totalProdukCount')) el('totalProdukCount').innerText = totalProdukTerjual;
    
    const productSales = {};
    penjualanData.forEach(p => { productSales[p.produk] = (productSales[p.produk] || 0) + (p.jumlah * p.harga_jual); });
    const top5 = Object.entries(productSales).sort((a,b) => b[1] - a[1]).slice(0,5);
    if (el('topProdukList')) {
        if (top5.length === 0) el('topProdukList').innerHTML = '<tr><td colspan="2" class="text-center">Belum ada数据</td></tr>';
        else el('topProdukList').innerHTML = top5.map(p => `<tr><td style="font-weight:500;">${p[0]}</td><td style="text-align:right;">Rp ${p[1].toLocaleString()}</td></tr>`).join('');
    }
    
    const alertList = stokData.filter(item => { let sisa = (item.stok_awal || 0) + (item.stok_masuk || 0) - (item.stok_keluar || 0); return sisa <= 0 || sisa < 10; }).map(item => `${item.produk} - ${((item.stok_awal||0)+(item.stok_masuk||0)-(item.stok_keluar||0)) <= 0 ? 'Habis' : 'Stok Menipis'}`);
    if (el('alertStokList')) {
        if (alertList.length === 0) el('alertStokList').innerHTML = '<div class="empty-alert">Tidak ada peringatan stok</div>';
        else el('alertStokList').innerHTML = alertList.map(a => `<div class="alert-item">⚠️ ${a}</div>`).join('');
    }
    
    updateSalesChart();
    updateMarketplaceChart(mp, totalMp);
}

let salesChart = null;
function updateSalesChart() {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;
    const data = getOmzetLast7Days();
    if (salesChart) salesChart.destroy();
    salesChart = new Chart(canvas.getContext('2d'), { 
        type: 'line', 
        data: { labels: data.map(d => d.date.slice(5)), datasets: [{ label: 'Omzet', data: data.map(d => d.omzet), borderColor: '#1a1a2e', fill: true, tension: 0.3 }] }, 
        options: { responsive: true, plugins: { legend: { display: false } } } 
    });
}

let marketplaceChart = null;
function updateMarketplaceChart(mp, total) {
    const canvas = document.getElementById('marketplaceChart');
    if (!canvas) return;
    if (marketplaceChart) marketplaceChart.destroy();
    marketplaceChart = new Chart(canvas.getContext('2d'), { 
        type: 'doughnut', 
        data: { labels: ['Shopee', 'Tokopedia', 'TikTok Shop'], datasets: [{ data: [mp.Shopee.omzet, mp.Tokopedia.omzet, mp['TikTok Shop'].omzet], backgroundColor: ['#1a1a2e', '#4a6cf7', '#f59f00'] }] }, 
        options: { responsive: true } 
    });
}

// ========== RENDER PENJUALAN ==========
function renderPenjualan() {
    const tbody = document.getElementById('penjualanBody');
    if (!tbody) return;
    if (penjualanData.length === 0) { tbody.innerHTML = '<tr><td colspan="8" class="text-center">Belum ada data penjualan</td></tr>'; return; }
    tbody.innerHTML = penjualanData.map(item => `<tr><td>${item.tanggal}</td><td>${item.marketplace}</td><td style="font-weight:500;">${item.produk}</td><td>${item.jumlah}</td><td>Rp ${item.harga_jual.toLocaleString()}</td><td>Rp ${(item.jumlah * item.harga_jual).toLocaleString()}</td><td>${item.status}</td><td>${isAdmin() ? `<button onclick="hapusPenjualan('${item.id}')" class="btn-delete">Hapus</button>` : ''}</td>`).join('');
}

window.hapusPenjualan = async function(id) {
    if (!isAdmin()) { alert('Hanya admin yang dapat menghapus'); return; }
    if (confirm('Hapus data ini?')) { await supabase.from('penjualan').delete().eq('id', id); await loadAllData(); }
};

// ========== RENDER STOK ==========
function renderStok() {
    const tbody = document.getElementById('stokBody');
    if (!tbody) return;
    if (stokData.length === 0) { tbody.innerHTML = '<tr><td colspan="6" class="text-center">Belum ada data stok</td></tr>'; return; }
    tbody.innerHTML = stokData.map(item => { let sisa = (item.stok_awal||0)+(item.stok_masuk||0)-(item.stok_keluar||0); let status = sisa <= 0 ? 'Habis' : (sisa < 10 ? 'Menipis' : 'Aman'); return `<tr><td style="font-weight:500;">${item.produk}</td><td>${item.stok_awal||0}</td><td>${item.stok_masuk||0}</td><td>${item.stok_keluar||0}</td><td><strong>${sisa}</strong></td><td>${status}</td></tr>`; }).join('');
    let habis = stokData.filter(item => { let sisa = (item.stok_awal||0)+(item.stok_masuk||0)-(item.stok_keluar||0); return sisa <= 0; });
    let habisBody = document.getElementById('habisBody');
    if (habisBody) habisBody.innerHTML = habis.length ? habis.map(item => `<tr><td>${item.produk}</td><td>0</td></tr>`).join('') : '<tr><td colspan="2" class="text-center">Tidak ada produk habis</td></tr>';
}

// ========== RENDER KEUANGAN ==========
function renderKeuangan() {
    let totalOmzet = getTotalOmzet(), totalBiaya = getTotalBiaya(), labaBersih = getLabaBersih();
    let totalTransaksi = penjualanData.length, avgTransaksi = totalTransaksi > 0 ? totalOmzet / totalTransaksi : 0;
    let margin = totalOmzet > 0 ? (labaBersih / totalOmzet) * 100 : 0;
    const el = (id) => document.getElementById(id);
    if (el('totalOmzetKeu')) el('totalOmzetKeu').innerText = `Rp ${totalOmzet.toLocaleString()}`;
    if (el('totalBiayaKeu')) el('totalBiayaKeu').innerText = `Rp ${totalBiaya.toLocaleString()}`;
    if (el('labaBersihKeu')) el('labaBersihKeu').innerText = `Rp ${labaBersih.toLocaleString()}`;
    if (el('summaryTotal')) el('summaryTotal').innerText = `Rp ${totalBiaya.toLocaleString()}`;
    if (el('avgTransaction')) el('avgTransaction').innerText = `Rp ${avgTransaksi.toLocaleString()}`;
    if (el('marginProfit')) el('marginProfit').innerText = `${margin.toFixed(1)}%`;
    if (el('totalTransaksi')) el('totalTransaksi').innerText = totalTransaksi;
}

// ========== RENDER STRATEGI ==========
function renderStrategi() {
    const el = (id) => document.getElementById(id);
    if (el('businessScore')) el('businessScore').innerText = penjualanData.length > 0 ? '75' : '-';
    if (el('businessStatus')) el('businessStatus').innerText = penjualanData.length > 0 ? 'Sehat' : 'Belum ada data';
    if (el('topProduct')) el('topProduct').innerText = penjualanData.length > 0 ? 'Ada' : '-';
    if (el('slowProduct')) el('slowProduct').innerText = '-';
    if (el('topProductsTable')) el('topProductsTable').innerHTML = '<tr><td colspan="4" class="text-center">Data akan muncul setelah ada transaksi</td></tr>';
    if (el('bottomProductsTable')) el('bottomProductsTable').innerHTML = '<tr><td colspan="4" class="text-center">Data akan muncul setelah ada transaksi</td></tr>';
    if (el('shopeeOmzet')) el('shopeeOmzet').innerText = 'Rp 0';
    if (el('shopeeOrder')) el('shopeeOrder').innerText = '0';
    if (el('tokopediaOmzet')) el('tokopediaOmzet').innerText = 'Rp 0';
    if (el('tokopediaOrder')) el('tokopediaOrder').innerText = '0';
    if (el('tiktokOmzet')) el('tiktokOmzet').innerText = 'Rp 0';
    if (el('tiktokOrder')) el('tiktokOrder').innerText = '0';
    if (el('recommendationList')) el('recommendationList').innerHTML = '<div class="recommendation-item">Mulai input data penjualan untuk mendapatkan rekomendasi</div>';
    if (el('insight1')) el('insight1').innerText = penjualanData.length;
    if (el('insight2')) el('insight2').innerText = new Set(penjualanData.map(p => p.marketplace)).size;
    if (el('insight3')) el('insight3').innerText = 'Rp 0';
}

// ========== VIEWER RESTRICTIONS ==========
function applyViewerRestrictions() {
    if (!isViewer()) return;
    document.querySelectorAll('.btn-primary, #btnTambah, #btnTambahStok, #simpanBiaya, #saveActionPlan').forEach(btn => { if (btn) btn.style.display = 'none'; });
    document.querySelectorAll('input, select, textarea').forEach(input => { input.disabled = true; input.style.backgroundColor = '#f8f9fa'; });
}

// ========== TAMBAH DATA PENJUALAN ==========
if (document.getElementById('btnTambah')) {
    const modal = document.getElementById('modalTambah'), btn = document.getElementById('btnTambah'), close = document.querySelector('#modalTambah .close');
    if (btn) btn.onclick = () => { if (isAdmin()) modal.style.display = 'block'; else alert('Hanya admin yang dapat menambah data'); };
    if (close) close.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    document.getElementById('formPenjualan')?.addEventListener('submit', async (e) => { e.preventDefault(); if (!isAdmin()) { alert('Hanya admin yang dapat menambah data'); return; } const newData = { tanggal: document.getElementById('tgl').value, marketplace: document.getElementById('mp').value, produk: document.getElementById('produk').value, jumlah: parseInt(document.getElementById('jumlah').value) || 0, harga_jual: parseInt(document.getElementById('harga').value) || 0, status: document.getElementById('status').value }; const { error } = await supabase.from('penjualan').insert([newData]); if (error) alert('Gagal: ' + error.message); else { await loadAllData(); modal.style.display = 'none'; e.target.reset(); alert('Data tersimpan!'); } });
}

// ========== TAMBAH DATA STOK ==========
if (document.getElementById('btnTambahStok')) {
    const modal = document.getElementById('modalStok'), btn = document.getElementById('btnTambahStok'), close = document.querySelector('#modalStok .close-stok');
    if (btn) btn.onclick = () => { if (isAdmin()) modal.style.display = 'block'; else alert('Hanya admin yang dapat menambah data'); };
    if (close) close.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    document.getElementById('formStok')?.addEventListener('submit', async (e) => { e.preventDefault(); if (!isAdmin()) { alert('Hanya admin yang dapat menambah data'); return; } const newData = { produk: document.getElementById('namaProduk').value, stok_awal: parseInt(document.getElementById('stokAwal').value) || 0, stok_masuk: parseInt(document.getElementById('stokMasuk').value) || 0, stok_keluar: 0 }; const { error } = await supabase.from('stok').insert([newData]); if (error) alert('Gagal: ' + error.message); else { await loadAllData(); modal.style.display = 'none'; e.target.reset(); alert('Stok tersimpan!'); } });
}

// ========== SIMPAN BIAYA ==========
if (document.getElementById('simpanBiaya')) {
    document.getElementById('simpanBiaya').addEventListener('click', async () => { if (!isAdmin()) { alert('Hanya admin yang dapat mengedit biaya'); return; } const biayaList = [{ jenis: 'Biaya Iklan', nominal: parseInt(document.getElementById('biayaIklan').value) || 0 }, { jenis: 'Fee Marketplace', nominal: parseInt(document.getElementById('feeMarketplace').value) || 0 }, { jenis: 'Biaya Pengiriman', nominal: parseInt(document.getElementById('ongkir').value) || 0 }, { jenis: 'Biaya Lainnya', nominal: parseInt(document.getElementById('lainLain').value) || 0 }]; for (let b of biayaList) { await supabase.from('biaya_operasional').insert([{ tanggal: new Date().toISOString().split('T')[0], jenis: b.jenis, nominal: b.nominal }]); } await loadAllData(); alert('Biaya tersimpan!'); });
}

// ========== EXPORT EXCEL ==========
if (document.getElementById('btnExport')) {
    document.getElementById('btnExport').addEventListener('click', () => { if (!isAdmin()) { alert('Hanya admin yang dapat export'); return; } if (!penjualanData.length) { alert('Tidak ada data'); return; } let csv = "Tanggal,Marketplace,Produk,Jumlah,Harga,Total,Status\n"; penjualanData.forEach(p => { csv += `"${p.tanggal}","${p.marketplace}","${p.produk}",${p.jumlah},${p.harga_jual},${p.jumlah * p.harga_jual},"${p.status}"\n`; }); const blob = new Blob([csv], { type: 'text/csv' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `penjualan_${new Date().toISOString().slice(0,10)}.csv`; link.click(); alert(`Export ${penjualanData.length} data!`); });
}

// ========== SEARCH & FILTER ==========
if (document.getElementById('searchInput')) document.getElementById('searchInput')?.addEventListener('keyup', () => renderPenjualan());
if (document.getElementById('filterMarketplace')) document.getElementById('filterMarketplace')?.addEventListener('change', () => renderPenjualan());
if (document.getElementById('searchStok')) document.getElementById('searchStok')?.addEventListener('keyup', () => renderStok());

// ========== LOGIN ==========
if (document.getElementById('loginForm')) {
    const roleBtns = document.querySelectorAll('.role-btn'), adminInfo = document.getElementById('adminInfo'), viewerInfo = document.getElementById('viewerInfo');
    roleBtns.forEach(btn => btn.addEventListener('click', () => { roleBtns.forEach(b => b.classList.remove('active')); btn.classList.add('active'); if (btn.getAttribute('data-role') === 'admin') { adminInfo.classList.remove('hidden'); viewerInfo.classList.add('hidden'); } else { adminInfo.classList.add('hidden'); viewerInfo.classList.remove('hidden'); } }));
    document.getElementById('loginForm').addEventListener('submit', (e) => { e.preventDefault(); const email = document.getElementById('email').value, password = document.getElementById('password').value; if (email === 'cylla@store' && password === 'cylla123') { localStorage.setItem('isLoggedIn', 'true'); localStorage.setItem('userRole', 'admin'); window.location.href = 'dashboard.html'; } else if (email === 'agung@panca' && password === 'pancagung') { localStorage.setItem('isLoggedIn', 'true'); localStorage.setItem('userRole', 'viewer'); window.location.href = 'dashboard.html'; } else alert('Email atau password salah!'); });
}

// ========== INITIAL LOAD ==========
if (!window.location.href.includes('login.html')) { setTimeout(() => { loadAllData(); }, 100); }
