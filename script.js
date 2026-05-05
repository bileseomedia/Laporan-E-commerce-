// ========== KONFIGURASI SUPABASE ==========
// GANTI DENGAN PROJECT URL DAN ANON KEY DARI SUPABASE KAMU!
const SUPABASE_URL = "https://sb_publishable_r-Iy9iSNBBAWvdO7HvmoxA_TtIM9AdF.supabase.co";  // Ganti!
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIs...";  // Ganti!

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========== DATA GLOBAL ==========
let penjualanData = [];
let stokData = [];
let biayaData = [];
let targetData = null;

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
const dateEl = document.getElementById('currentDate');
if (dateEl) {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.innerText = today.toLocaleDateString('id-ID', options);
}

// ========== LOAD DATA DARI SUPABASE ==========
async function loadAllData() {
    showLoading();
    
    try {
        // Load penjualan
        const { data: penjualan } = await supabase
            .from('penjualan')
            .select('*')
            .order('tanggal', { ascending: false });
        if (penjualan) penjualanData = penjualan;
        
        // Load stok
        const { data: stok } = await supabase
            .from('stok')
            .select('*')
            .order('produk');
        if (stok) stokData = stok;
        
        // Load biaya
        const { data: biaya } = await supabase
            .from('biaya_operasional')
            .select('*')
            .order('tanggal', { ascending: false });
        if (biaya) biayaData = biaya;
        
        // Load target bulan ini
        const now = new Date();
        const { data: target } = await supabase
            .from('target_bisnis')
            .select('*')
            .eq('tahun', now.getFullYear())
            .eq('bulan', now.getMonth() + 1)
            .maybeSingle();
        if (target) targetData = target;
        
    } catch (error) {
        console.error('Error:', error);
    }
    
    hideLoading();
    refreshAllDisplays();
}

// ========== FUNGSI LOADING ==========
function showLoading() {
    let loader = document.getElementById('globalLoader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'globalLoader';
        loader.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; display:flex; align-items:center; justify-content:center;';
        loader.innerHTML = '<div style="background:white; color:#1a1a2e; padding:20px 40px; border-radius:12px;">Memuat data...</div>';
        document.body.appendChild(loader);
    }
    loader.style.display = 'flex';
}

function hideLoading() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'none';
}

function refreshAllDisplays() {
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof renderPenjualan === 'function') renderPenjualan();
    if (typeof renderStok === 'function') renderStok();
    if (typeof renderKeuangan === 'function') renderKeuangan();
}

// ========== FUNGSI CRUD ==========
async function tambahPenjualan(data) {
    if (isViewer()) { alert('Mode viewer tidak dapat menambah data'); return false; }
    
    const { error } = await supabase.from('penjualan').insert([{
        tanggal: data.tanggal,
        marketplace: data.marketplace,
        produk: data.produk,
        jumlah: data.jumlah,
        harga_jual: data.harga_jual,
        hpp: data.hpp || 0,
        status: data.status || 'Selesai'
    }]);
    
    if (error) { alert('Gagal: ' + error.message); return false; }
    
    // Update stok keluar
    const { data: stokExist } = await supabase
        .from('stok')
        .select('*')
        .eq('produk', data.produk)
        .single();
    
    if (stokExist) {
        await supabase
            .from('stok')
            .update({ stok_keluar: stokExist.stok_keluar + data.jumlah })
            .eq('produk', data.produk);
    }
    
    await loadAllData();
    return true;
}

async function tambahStok(data) {
    if (isViewer()) { alert('Mode viewer tidak dapat menambah data'); return false; }
    
    const { error } = await supabase.from('stok').insert([{
        produk: data.produk,
        stok_awal: data.stok_awal || 0,
        stok_masuk: data.stok_masuk || 0,
        stok_keluar: 0,
        hpp_terakhir: data.hpp || 0
    }]);
    
    if (error) { alert('Gagal: ' + error.message); return false; }
    await loadAllData();
    return true;
}

async function tambahBiaya(data) {
    if (isViewer()) { alert('Mode viewer tidak dapat menambah data'); return false; }
    
    const { error } = await supabase.from('biaya_operasional').insert([{
        tanggal: data.tanggal,
        jenis: data.jenis,
        nominal: data.nominal,
        keterangan: data.keterangan || null
    }]);
    
    if (error) { alert('Gagal: ' + error.message); return false; }
    await loadAllData();
    return true;
}

// ========== FUNGSI PERHITUNGAN ==========
function getTotalOmzet() {
    return penjualanData.reduce((sum, p) => sum + (p.jumlah * p.harga_jual), 0);
}

function getTotalHPP() {
    return penjualanData.reduce((sum, p) => sum + (p.jumlah * (p.hpp || 0)), 0);
}

function getTotalLaba() {
    return getTotalOmzet() - getTotalHPP();
}

function getTotalBiaya() {
    return biayaData.reduce((sum, b) => sum + b.nominal, 0);
}

function getLabaBersih() {
    return getTotalLaba() - getTotalBiaya();
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
    
    // Update KPI
    const omzetHariIniEl = document.getElementById('omzetHariIni');
    if (omzetHariIniEl) omzetHariIniEl.innerText = `Rp ${todayOmzet.toLocaleString()}`;
    const totalOrderEl = document.getElementById('totalOrder');
    if (totalOrderEl) totalOrderEl.innerText = totalOrder;
    const produkTerjualEl = document.getElementById('produkTerjual');
    if (produkTerjualEl) produkTerjualEl.innerText = totalProdukTerjual;
    
    // Perbandingan
    const compHariIni = document.getElementById('compHariIni');
    if (compHariIni) compHariIni.innerText = `Rp ${todayOmzet.toLocaleString()}`;
    const compKemarin = document.getElementById('compKemarin');
    if (compKemarin) compKemarin.innerText = `Rp ${yesterdayOmzet.toLocaleString()}`;
    
    let trendPercent = 0;
    if (yesterdayOmzet > 0) trendPercent = ((todayOmzet - yesterdayOmzet) / yesterdayOmzet) * 100;
    const trendEl = document.getElementById('trendStatus');
    if (trendEl) {
        if (trendPercent > 0) trendEl.innerHTML = `+${trendPercent.toFixed(1)}% ↑`;
        else if (trendPercent < 0) trendEl.innerHTML = `${trendPercent.toFixed(1)}% ↓`;
        else trendEl.innerHTML = '0% →';
    }
    
    // Target
    let realisasi = getTotalOmzet();
    const targetOmzet = targetData?.target_omzet || 10000000;
    const percent = Math.min(100, (realisasi / targetOmzet) * 100);
    const progressFill = document.getElementById('progressFill');
    if (progressFill) progressFill.style.width = `${percent}%`;
    const targetPercent = document.getElementById('targetPercent');
    if (targetPercent) targetPercent.innerText = `${percent.toFixed(1)}% tercapai`;
    
    // Marketplace Summary
    const mp = { Shopee: { omzet: 0, order: 0, produk: 0 }, Tokopedia: { omzet: 0, order: 0, produk: 0 }, 'TikTok Shop': { omzet: 0, order: 0, produk: 0 } };
    penjualanData.forEach(p => {
        if (mp[p.marketplace]) {
            mp[p.marketplace].omzet += p.jumlah * p.harga_jual;
            mp[p.marketplace].order++;
            mp[p.marketplace].produk += p.jumlah;
        }
    });
    const totalOmzetMp = mp.Shopee.omzet + mp.Tokopedia.omzet + mp['TikTok Shop'].omzet;
    
    const mpShopeeOmzet = document.getElementById('mpShopeeOmzet');
    if (mpShopeeOmzet) mpShopeeOmzet.innerText = `Rp ${mp.Shopee.omzet.toLocaleString()}`;
    const mpTokopediaOmzet = document.getElementById('mpTokopediaOmzet');
    if (mpTokopediaOmzet) mpTokopediaOmzet.innerText = `Rp ${mp.Tokopedia.omzet.toLocaleString()}`;
    const mpTiktokOmzet = document.getElementById('mpTiktokOmzet');
    if (mpTiktokOmzet) mpTiktokOmzet.innerText = `Rp ${mp['TikTok Shop'].omzet.toLocaleString()}`;
    
    // Top Products
    const productSales = {};
    penjualanData.forEach(p => { productSales[p.produk] = (productSales[p.produk] || 0) + (p.jumlah * p.harga_jual); });
    const top5 = Object.entries(productSales).sort((a,b) => b[1] - a[1]).slice(0,5);
    const topList = document.getElementById('topProdukList');
    if (topList) {
        if (top5.length === 0) topList.innerHTML = '<td><td colspan="3" class="text-center">Belum ada data</td></tr>';
        else topList.innerHTML = top5.map(p => `<tr><td>${p[0]}</td><td>0</td><td>Rp ${p[1].toLocaleString()}</td></tr>`).join('');
    }
    
    // Alert Stok
    const alertList = [];
    stokData.forEach(item => {
        const sisa = item.stok_sisa;
        if (sisa <= 0) alertList.push(`${item.produk} (Habis)`);
        else if (sisa < 10) alertList.push(`${item.produk} (Sisa ${sisa})`);
    });
    const alertDiv = document.getElementById('alertStokList');
    if (alertDiv) alertDiv.innerHTML = alertList.length ? alertList.map(a => `<div class="alert-item">${a}</div>`).join('') : '<div class="empty-alert">Tidak ada peringatan stok</div>';
    
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
        data: { labels, datasets: [{ label: 'Omzet', data: values, borderColor: '#1a1a2e', fill: true, tension: 0.3 }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
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
        data: { labels: ['Shopee', 'Tokopedia', 'TikTok Shop'], datasets: [{ data: [mp.Shopee.omzet, mp.Tokopedia.omzet, mp['TikTok Shop'].omzet], backgroundColor: ['#1a1a2e', '#4a6cf7', '#f59f00'] }] },
        options: { responsive: true }
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
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Belum ada data</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map(item => `
        <tr>
            <td>${item.tanggal}</td>
            <td>${item.marketplace}</td>
            <td><strong>${item.produk}</strong></td>
            <td>${item.jumlah}</td>
            <td>Rp ${item.harga_jual.toLocaleString()}</td>
            <td>Rp ${(item.jumlah * item.harga_jual).toLocaleString()}</td>
            <td>${item.status}</td>
            <td>${isAdmin() ? `<button onclick="hapusPenjualan(${item.id})" class="btn-delete">Hapus</button>` : ''}</td>
        </tr>
    `).join('');
}

window.hapusPenjualan = async function(id) {
    if (isViewer()) { alert('Mode viewer tidak dapat menghapus'); return; }
    if (confirm('Hapus data ini?')) {
        await supabase.from('penjualan').delete().eq('id', id);
        await loadAllData();
    }
};

// ========== RENDER STOK ==========
function renderStok() {
    const tbody = document.getElementById('stokBody');
    if (!tbody) return;
    
    if (stokData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Belum ada data</td></tr>';
        return;
    }
    
    tbody.innerHTML = stokData.map(item => {
        const status = item.stok_sisa <= 0 ? 'Habis' : (item.stok_sisa < 10 ? 'Menipis' : 'Aman');
        return `
            <tr>
                <td><strong>${item.produk}</strong></td>
                <td>${item.stok_awal}</td>
                <td>${item.stok_masuk}</td>
                <td>${item.stok_keluar}</td>
                <td><strong>${item.stok_sisa}</strong></td>
                <td>${status}</td>
                <td>Rp ${(item.hpp_terakhir || 0).toLocaleString()}</td>
            </tr>
        `;
    }).join('');
}

// ========== RENDER KEUANGAN ==========
function renderKeuangan() {
    const totalOmzet = getTotalOmzet();
    const totalHPP = getTotalHPP();
    const totalLaba = getTotalLaba();
    const totalBiaya = getTotalBiaya();
    const labaBersih = getLabaBersih();
    
    const omzetEl = document.getElementById('totalOmzetKeu');
    if (omzetEl) omzetEl.innerText = `Rp ${totalOmzet.toLocaleString()}`;
    const hppEl = document.getElementById('totalHPPKeu');
    if (hppEl) hppEl.innerText = `Rp ${totalHPP.toLocaleString()}`;
    const labaEl = document.getElementById('totalLabaKeu');
    if (labaEl) labaEl.innerText = `Rp ${totalLaba.toLocaleString()}`;
    const biayaEl = document.getElementById('totalBiayaKeu');
    if (biayaEl) biayaEl.innerText = `Rp ${totalBiaya.toLocaleString()}`;
    const labaBersihEl = document.getElementById('labaBersihKeu');
    if (labaBersihEl) labaBersihEl.innerText = `Rp ${labaBersih.toLocaleString()}`;
    
    const totalTransaksi = penjualanData.length;
    const avgTransaksi = totalTransaksi > 0 ? totalOmzet / totalTransaksi : 0;
    const marginBersih = totalOmzet > 0 ? (labaBersih / totalOmzet) * 100 : 0;
    
    const avgTransaction = document.getElementById('avgTransaction');
    if (avgTransaction) avgTransaction.innerText = `Rp ${avgTransaksi.toLocaleString()}`;
    const marginProfit = document.getElementById('marginProfit');
    if (marginProfit) marginProfit.innerText = `${marginBersih.toFixed(1)}%`;
    const totalTransaksiEl = document.getElementById('totalTransaksi');
    if (totalTransaksiEl) totalTransaksiEl.innerText = totalTransaksi;
    
    updateProfitChart(totalOmzet, totalBiaya, labaBersih);
}

let profitChart = null;
function updateProfitChart(omzet, biaya, laba) {
    const canvas = document.getElementById('profitChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (profitChart) profitChart.destroy();
    profitChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: ['Pendapatan', 'Biaya', 'Laba Bersih'], datasets: [{ data: [omzet, biaya, laba], backgroundColor: ['#1a1a2e', '#e03131', '#2e7d32'] }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
}

// ========== APPLY VIEWER RESTRICTIONS ==========
function applyViewerRestrictions() {
    if (!isViewer()) return;
    
    document.querySelectorAll('.btn-primary, .btn-delete, #btnTambah, #btnTambahStok, #btnTambahBiaya').forEach(btn => {
        if (btn) btn.style.display = 'none';
    });
    document.querySelectorAll('input, select, textarea').forEach(input => {
        input.disabled = true;
        input.style.backgroundColor = '#f8f9fa';
    });
    
    if (!document.querySelector('.viewer-badge')) {
        const title = document.querySelector('.top-bar h1');
        if (title) {
            const badge = document.createElement('span');
            badge.className = 'viewer-badge';
            badge.innerText = 'Mode Lihat';
            badge.style.cssText = 'background:#f59f00; color:white; font-size:11px; padding:4px 12px; border-radius:40px; margin-left:14px;';
            title.parentElement.insertBefore(badge, title.nextSibling);
        }
    }
}

// ========== EXPORT EXCEL ==========
const exportBtn = document.getElementById('btnExport');
if (exportBtn) {
    exportBtn.addEventListener('click', () => {
        if (isViewer()) { alert('Mode viewer tidak dapat export'); return; }
        if (!penjualanData.length) { alert('Tidak ada data'); return; }
        
        let csv = "Tanggal,Marketplace,Produk,Jumlah,Harga,Total,Status\n";
        penjualanData.forEach(p => {
            csv += `"${p.tanggal}","${p.marketplace}","${p.produk}",${p.jumlah},${p.harga_jual},${p.jumlah * p.harga_jual},"${p.status}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `penjualan_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
        alert(`Export ${penjualanData.length} data!`);
    });
}

// ========== SEARCH & FILTER ==========
if (document.getElementById('searchInput')) {
    document.getElementById('searchInput')?.addEventListener('keyup', () => renderPenjualan());
    document.getElementById('filterMarketplace')?.addEventListener('change', () => renderPenjualan());
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
                    if (emailInput) emailInput.value = 'cylla@store';
                    if (passwordInput) passwordInput.value = '';
                } else {
                    if (adminInfo) adminInfo.classList.add('hidden');
                    if (viewerInfo) viewerInfo.classList.remove('hidden');
                    if (emailInput) emailInput.value = 'agung@panca';
                    if (passwordInput) passwordInput.value = '';
                }
            });
        });
    }
    
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        if (email === 'cylla@store' && password === 'cylla123') {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userRole', 'admin');
            window.location.href = 'dashboard.html';
        } else if (email === 'agung@panca' && password === 'pancagung') {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userRole', 'viewer');
            window.location.href = 'dashboard.html';
        } else {
            alert('Email atau password salah!');
        }
    });
}

// ========== INITIAL RENDER ==========
setTimeout(() => {
    if (!window.location.href.includes('login.html')) {
        loadAllData();
        setTimeout(applyViewerRestrictions, 500);
    }
}, 100);
