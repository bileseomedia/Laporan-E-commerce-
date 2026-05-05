// ========== KONFIGURASI SUPABASE ==========
const SUPABASE_URL = "https://inwmobbmpmqnvsxtqdev.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlud21vYmJtcG1xbnZzeHRxZGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NjQ1MzMsImV4cCI6MjA5MzU0MDUzM30.BIiavatJdfyR6HJqKEKUXps5eHP7zbaQK8_aHJho5T8";

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
    dateEl.innerText = today.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ========== LOAD DATA DARI SUPABASE ==========
async function loadAllData() {
    showLoading();
    try {
        const { data: penjualan } = await supabase.from('penjualan').select('*').order('tanggal', { ascending: false });
        if (penjualan) penjualanData = penjualan;
        
        const { data: stok } = await supabase.from('stok').select('*').order('produk');
        if (stok) stokData = stok;
        
        const { data: biaya } = await supabase.from('biaya_operasional').select('*');
        if (biaya) biayaData = biaya;
        
        const now = new Date();
        const { data: target } = await supabase.from('target_bisnis').select('*').eq('tahun', now.getFullYear()).eq('bulan', now.getMonth() + 1).maybeSingle();
        if (target) targetData = target;
    } catch (error) {
        console.error('Error:', error);
    }
    hideLoading();
    refreshAllDisplays();
}

function showLoading() {
    let loader = document.getElementById('globalLoader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'globalLoader';
        loader.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; display:flex; align-items:center; justify-content:center;';
        loader.innerHTML = '<div style="background:white; padding:20px 40px; border-radius:12px;">Memuat data...</div>';
        document.body.appendChild(loader);
    }
    loader.style.display = 'flex';
}

function hideLoading() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'none';
}

function refreshAllDisplays() {
    renderDashboard();
    renderPenjualan();
    renderStok();
    renderKeuangan();
    renderStrategi();
    applyViewerRestrictions();
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

// ========== CRUD ==========
async function tambahPenjualan(data) {
    if (isViewer()) { alert('Mode viewer tidak dapat menambah data'); return false; }
    const { error } = await supabase.from('penjualan').insert([{
        tanggal: data.tanggal, marketplace: data.marketplace, produk: data.produk,
        jumlah: data.jumlah, harga_jual: data.harga_jual, status: data.status
    }]);
    if (error) { alert('Gagal: ' + error.message); return false; }
    await loadAllData();
    return true;
}

async function hapusPenjualan(id) {
    if (isViewer()) { alert('Mode viewer tidak dapat menghapus'); return false; }
    if (!confirm('Hapus data ini?')) return false;
    await supabase.from('penjualan').delete().eq('id', id);
    await loadAllData();
    return true;
}

async function tambahStok(data) {
    if (isViewer()) { alert('Mode viewer tidak dapat menambah data'); return false; }
    const { error } = await supabase.from('stok').insert([{
        produk: data.produk, stok_awal: data.stok_awal, stok_masuk: data.stok_masuk, stok_keluar: 0
    }]);
    if (error) { alert('Gagal: ' + error.message); return false; }
    await loadAllData();
    return true;
}

async function tambahBiaya(jenis, nominal) {
    if (isViewer()) { alert('Mode viewer tidak dapat menambah data'); return false; }
    const { error } = await supabase.from('biaya_operasional').insert([{
        tanggal: new Date().toISOString().split('T')[0], jenis: jenis, nominal: nominal
    }]);
    if (error) { alert('Gagal: ' + error.message); return false; }
    await loadAllData();
    return true;
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
    if (el('trendStatus')) el('trendStatus').innerHTML = trend > 0 ? `+${trend.toFixed(1)}% ↑` : (trend < 0 ? `${trend.toFixed(1)}% ↓` : '0% →');
    
    let realisasi = getTotalOmzet();
    let targetOmzet = targetData?.target_omzet || 10000000;
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
    if (el('topProdukList')) el('topProdukList').innerHTML = top5.length ? top5.map(p => `<tr><td style="font-weight:500;">${p[0]}</td><td style="text-align:right;">Rp ${p[1].toLocaleString()}</td>`).join('') : '<tr><td colspan="2" class="text-center">Belum ada数据</td></tr>';
    
    const alertList = stokData.filter(item => { let sisa = (item.stok_awal || 0) + (item.stok_masuk || 0) - (item.stok_keluar || 0); return sisa <= 0 || sisa < 10; }).map(item => `${item.produk} ${((item.stok_awal||0)+(item.stok_masuk||0)-(item.stok_keluar||0)) <= 0 ? '(Habis)' : '(Stok menipis)'}`);
    if (el('alertStokList')) el('alertStokList').innerHTML = alertList.length ? alertList.map(a => `<div class="alert-item">${a}</div>`).join('') : '<div class="empty-alert">Tidak ada peringatan stok</div>';
    
    updateSalesChart();
    updateMarketplaceChart(mp, totalMp);
}

let salesChart = null;
function updateSalesChart() {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;
    const data = getOmzetLast7Days();
    if (salesChart) salesChart.destroy();
    salesChart = new Chart(canvas.getContext('2d'), { type: 'line', data: { labels: data.map(d => d.date.slice(5)), datasets: [{ label: 'Omzet', data: data.map(d => d.omzet), borderColor: '#1a1a2e', fill: true, tension: 0.3 }] }, options: { responsive: true, plugins: { legend: { display: false } } } });
}

let marketplaceChart = null;
function updateMarketplaceChart(mp, total) {
    const canvas = document.getElementById('marketplaceChart');
    if (!canvas) return;
    if (marketplaceChart) marketplaceChart.destroy();
    marketplaceChart = new Chart(canvas.getContext('2d'), { type: 'doughnut', data: { labels: ['Shopee', 'Tokopedia', 'TikTok Shop'], datasets: [{ data: [mp.Shopee.omzet, mp.Tokopedia.omzet, mp['TikTok Shop'].omzet], backgroundColor: ['#1a1a2e', '#4a6cf7', '#f59f00'] }] }, options: { responsive: true } });
}

// ========== RENDER PENJUALAN ==========
function renderPenjualan() {
    const tbody = document.getElementById('penjualanBody');
    if (!tbody) return;
    const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const filter = document.getElementById('filterMarketplace')?.value || '';
    let filtered = penjualanData.filter(item => (item.produk.toLowerCase().includes(search) || item.marketplace.toLowerCase().includes(search)) && (!filter || item.marketplace === filter));
    if (filtered.length === 0) { tbody.innerHTML = '<tr><td colspan="8" class="text-center">Belum ada</td></tr>'; return; }
    tbody.innerHTML = filtered.map(item => `<tr><td>${item.tanggal}</td><td>${item.marketplace}</td><td style="font-weight:500;">${item.produk}</td><td>${item.jumlah}</td><td>Rp ${item.harga_jual.toLocaleString()}</td><td>Rp ${(item.jumlah * item.harga_jual).toLocaleString()}</td><td>${item.status}</td><td>${isAdmin() ? `<button onclick="hapusPenjualan(${item.id})" class="btn-delete">Hapus</button>` : ''}</td></tr>`).join('');
}

window.hapusPenjualan = async function(id) {
    if (isViewer()) { alert('Mode viewer tidak dapat menghapus'); return; }
    if (confirm('Hapus data ini?')) { await supabase.from('penjualan').delete().eq('id', id); await loadAllData(); }
};

// ========== RENDER STOK ==========
function renderStok() {
    const tbody = document.getElementById('stokBody');
    if (!tbody) return;
    if (stokData.length === 0) { tbody.innerHTML = '<tr><td colspan="6" class="text-center">Belum ada data stok</td></tr>'; return; }
    tbody.innerHTML = stokData.map(item => { let sisa = (item.stok_awal || 0) + (item.stok_masuk || 0) - (item.stok_keluar || 0); let status = sisa <= 0 ? 'Habis' : (sisa < 10 ? 'Menipis' : 'Aman'); return `<tr><td style="font-weight:500;">${item.produk}</td><td>${item.stok_awal || 0}</td><td>${item.stok_masuk || 0}</td><td>${item.stok_keluar || 0}</td><td style="font-weight:bold;">${sisa}</td><td>${status}</td></tr>`; }).join('');
    let habis = stokData.filter(item => { let sisa = (item.stok_awal || 0) + (item.stok_masuk || 0) - (item.stok_keluar || 0); return sisa <= 0; });
    let habisBody = document.getElementById('habisBody');
    if (habisBody) habisBody.innerHTML = habis.length ? habis.map(item => `<tr><td>${item.produk}</td><td>0</td></tr>`).join('') : '<tr><td colspan="2" class="text-center">Tidak ada produk habis</td></tr>';
}

// ========== RENDER KEUANGAN ==========
function renderKeuangan() {
    let totalOmzet = getTotalOmzet(), totalBiaya = getTotalBiaya(), labaBersih = getLabaBersih();
    let totalTransaksi = penjualanData.length, avgTransaksi = totalTransaksi > 0 ? totalOmzet / totalTransaksi : 0;
    let margin = totalOmzet > 0 ? (labaBersih / totalOmzet) * 100 : 0;
    let el = (id) => document.getElementById(id);
    if (el('totalOmzetKeu')) el('totalOmzetKeu').innerText = `Rp ${totalOmzet.toLocaleString()}`;
    if (el('totalBiayaKeu')) el('totalBiayaKeu').innerText = `Rp ${totalBiaya.toLocaleString()}`;
    if (el('labaBersihKeu')) el('labaBersihKeu').innerText = `Rp ${labaBersih.toLocaleString()}`;
    if (el('summaryTotal')) el('summaryTotal').innerText = `Rp ${totalBiaya.toLocaleString()}`;
    if (el('avgTransaction')) el('avgTransaction').innerText = `Rp ${avgTransaksi.toLocaleString()}`;
    if (el('marginProfit')) el('marginProfit').innerText = `${margin.toFixed(1)}%`;
    if (el('totalTransaksi')) el('totalTransaksi').innerText = totalTransaksi;
    
    let profitCanvas = document.getElementById('profitChart');
    if (profitCanvas) { if (window.profitChart) window.profitChart.destroy(); window.profitChart = new Chart(profitCanvas.getContext('2d'), { type: 'bar', data: { labels: ['Pendapatan', 'Biaya', 'Laba Bersih'], datasets: [{ data: [totalOmzet, totalBiaya, labaBersih], backgroundColor: ['#1a1a2e', '#e03131', '#2e7d32'] }] }, options: { responsive: true, plugins: { legend: { display: false } } } }); }
}

// ========== RENDER STRATEGI ==========
function renderStrategi() {
    let totalOmzet = getTotalOmzet(), totalUnit = penjualanData.reduce((s,p) => s + p.jumlah, 0);
    let productStats = {};
    penjualanData.forEach(p => { if (!productStats[p.produk]) productStats[p.produk] = { unit:0, omzet:0 }; productStats[p.produk].unit += p.jumlah; productStats[p.produk].omzet += p.jumlah * p.harga_jual; });
    let productList = Object.entries(productStats).map(([name, data]) => ({ name, unit: data.unit, omzet: data.omzet, share: totalOmzet > 0 ? (data.omzet / totalOmzet) * 100 : 0 })).sort((a,b) => b.omzet - a.omzet);
    let top5 = productList.slice(0,5), bottom5 = productList.slice(-5).reverse();
    let topProduct = top5[0], slowProduct = bottom5[0];
    let uniqueProducts = productList.length, activeMarketplaces = new Set(penjualanData.map(p => p.marketplace)).size;
    let score = (totalOmzet > 0 ? 30 : 0) + (uniqueProducts >= 3 ? 20 : uniqueProducts >= 1 ? 10 : 0) + (activeMarketplaces >= 2 ? 20 : activeMarketplaces >= 1 ? 10 : 0) + (topProduct && topProduct.share < 60 ? 15 : topProduct ? 5 : 0) + (totalUnit >= 10 ? 15 : totalUnit >= 1 ? 5 : 0);
    let el = (id) => document.getElementById(id);
    if (el('businessScore')) el('businessScore').innerText = score;
    if (el('businessStatus')) el('businessStatus').innerText = score >= 70 ? 'Sehat' : (score >= 40 ? 'Perlu Perbaikan' : 'Kritis');
    if (el('topProduct')) el('topProduct').innerText = topProduct ? topProduct.name : '-';
    if (el('slowProduct')) el('slowProduct').innerText = slowProduct ? slowProduct.name : '-';
    if (el('topProductsTable')) el('topProductsTable').innerHTML = top5.length ? top5.map(p => `<tr><td style="font-weight:500;">${p.name}</td><td>${p.unit} unit</td><td>Rp ${p.omzet.toLocaleString()}</td><td>${p.share.toFixed(1)}%</td>`).join('') : '<tr><td colspan="4" class="text-center">Belum ada data</td></tr>';
    if (el('bottomProductsTable')) el('bottomProductsTable').innerHTML = bottom5.length ? bottom5.map(p => `<tr><td style="font-weight:500;">${p.name}</td><td>${p.unit} unit</td><td>Rp ${p.omzet.toLocaleString()}</td><td>${p.share.toFixed(1)}%</td>`).join('') : '<tr><td colspan="4" class="text-center">Belum ada数据</td></tr>';
    
    const mpStats = { Shopee: { omzet:0, order:0 }, Tokopedia: { omzet:0, order:0 }, 'TikTok Shop': { omzet:0, order:0 } };
    penjualanData.forEach(p => { if (mpStats[p.marketplace]) { mpStats[p.marketplace].omzet += p.jumlah * p.harga_jual; mpStats[p.marketplace].order++; } });
    const bestMp = Object.entries(mpStats).sort((a,b) => b[1].omzet - a[1].omzet)[0];
    if (el('shopeeOmzet')) el('shopeeOmzet').innerText = `Rp ${mpStats.Shopee.omzet.toLocaleString()}`;
    if (el('shopeeOrder')) el('shopeeOrder').innerText = mpStats.Shopee.order;
    if (el('shopeeRec')) el('shopeeRec').innerHTML = bestMp && bestMp[0] === 'Shopee' ? 'Marketplace terbaik' : 'Perlu ditingkatkan';
    if (el('tokopediaOmzet')) el('tokopediaOmzet').innerText = `Rp ${mpStats.Tokopedia.omzet.toLocaleString()}`;
    if (el('tokopediaOrder')) el('tokopediaOrder').innerText = mpStats.Tokopedia.order;
    if (el('tokopediaRec')) el('tokopediaRec').innerHTML = bestMp && bestMp[0] === 'Tokopedia' ? 'Marketplace terbaik' : 'Perlu ditingkatkan';
    if (el('tiktokOmzet')) el('tiktokOmzet').innerText = `Rp ${mpStats['TikTok Shop'].omzet.toLocaleString()}`;
    if (el('tiktokOrder')) el('tiktokOrder').innerText = mpStats['TikTok Shop'].order;
    if (el('tiktokRec')) el('tiktokRec').innerHTML = bestMp && bestMp[0] === 'TikTok Shop' ? 'Marketplace terbaik' : 'Perlu ditingkatkan';
    
    let recommendations = [];
    if (topProduct && topProduct.share > 50) recommendations.push(`Produk "${topProduct.name}" mendominasi ${topProduct.share.toFixed(1)}% omzet. Fokus pada produk ini.`);
    if (slowProduct && slowProduct.omzet > 0 && slowProduct.share < 5) recommendations.push(`Produk "${slowProduct.name}" hanya berkontribusi ${slowProduct.share.toFixed(1)}% omzet. Evaluasi produk ini.`);
    if (totalUnit < 10) recommendations.push('Volume penjualan masih rendah. Coba program diskon atau bundling produk.');
    if (!recommendations.length) recommendations.push('Terus pantau data penjualan untuk mendapatkan rekomendasi.');
    if (el('recommendationList')) el('recommendationList').innerHTML = recommendations.map(rec => `<div class="recommendation-item">${rec}</div>`).join('');
    
    let savedPlan = localStorage.getItem('actionPlan') || '';
    if (el('actionPlan')) el('actionPlan').value = savedPlan;
    
    let totalTop5 = top5.reduce((s,p) => s + p.omzet, 0);
    let distCanvas = document.getElementById('distributionChart');
    if (distCanvas) { if (window.distChart) window.distChart.destroy(); window.distChart = new Chart(distCanvas.getContext('2d'), { type: 'doughnut', data: { labels: [...top5.map(p => p.name), 'Lainnya'], datasets: [{ data: [...top5.map(p => p.omzet), totalOmzet - totalTop5], backgroundColor: ['#1a1a2e', '#4a6cf7', '#f59f00', '#e03131', '#2e7d32', '#adb5bd'] }] }, options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } } }); }
    
    if (el('insight1')) el('insight1').innerText = uniqueProducts;
    if (el('insight2')) el('insight2').innerText = activeMarketplaces;
    if (el('insight3')) el('insight3').innerText = totalUnit > 0 ? `Rp ${Math.round(totalOmzet/totalUnit).toLocaleString()}` : 'Rp 0';
}

// ========== VIEWER RESTRICTIONS ==========
function applyViewerRestrictions() {
    if (!isViewer()) return;
    document.querySelectorAll('.btn-primary, .btn-delete, #btnTambah, #btnTambahStok, #simpanBiaya, #saveActionPlan').forEach(btn => { if (btn) btn.style.display = 'none'; });
    document.querySelectorAll('input, select, textarea').forEach(input => { input.disabled = true; input.style.backgroundColor = '#f8f9fa'; });
    if (!document.querySelector('.viewer-badge')) { let title = document.querySelector('.top-bar h1'); if (title) { let badge = document.createElement('span'); badge.className = 'viewer-badge'; badge.innerText = 'Mode Lihat'; badge.style.cssText = 'background:#f59f00; color:white; font-size:11px; padding:4px 12px; border-radius:40px; margin-left:14px;'; title.parentElement.insertBefore(badge, title.nextSibling); } }
}

// ========== EVENT HANDLERS ==========
if (document.getElementById('btnTambah')) {
    let modal = document.getElementById('modalTambah'), btn = document.getElementById('btnTambah'), close = document.querySelector('#modalTambah .close');
    if (btn) btn.onclick = () => { if (isAdmin()) modal.style.display = 'block'; else alert('Mode viewer tidak dapat menambah data'); };
    if (close) close.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    document.getElementById('formPenjualan')?.addEventListener('submit', async (e) => { e.preventDefault(); if (isViewer()) { alert('Mode viewer tidak dapat menambah data'); modal.style.display = 'none'; return; } await tambahPenjualan({ tanggal: document.getElementById('tgl').value, marketplace: document.getElementById('mp').value, produk: document.getElementById('produk').value, jumlah: parseInt(document.getElementById('jumlah').value) || 0, harga_jual: parseInt(document.getElementById('harga').value) || 0, status: document.getElementById('status').value }); modal.style.display = 'none'; e.target.reset(); alert('Data tersimpan!'); });
}

if (document.getElementById('btnTambahStok')) {
    let modal = document.getElementById('modalStok'), btn = document.getElementById('btnTambahStok'), close = document.querySelector('#modalStok .close-stok');
    if (btn) btn.onclick = () => { if (isAdmin()) modal.style.display = 'block'; else alert('Mode viewer tidak dapat menambah data'); };
    if (close) close.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    document.getElementById('formStok')?.addEventListener('submit', async (e) => { e.preventDefault(); if (isViewer()) { alert('Mode viewer tidak dapat menambah data'); modal.style.display = 'none'; return; } await tambahStok({ produk: document.getElementById('namaProduk').value, stok_awal: parseInt(document.getElementById('stokAwal').value) || 0, stok_masuk: parseInt(document.getElementById('stokMasuk').value) || 0 }); modal.style.display = 'none'; e.target.reset(); alert('Stok tersimpan!'); });
}

if (document.getElementById('simpanBiaya')) {
    document.getElementById('simpanBiaya').addEventListener('click', async () => {
        if (isViewer()) { alert('Mode viewer tidak dapat mengedit biaya'); return; }
        await tambahBiaya('Biaya Iklan', parseInt(document.getElementById('biayaIklan').value) || 0);
        await tambahBiaya('Fee Marketplace', parseInt(document.getElementById('feeMarketplace').value) || 0);
        await tambahBiaya('Biaya Pengiriman', parseInt(document.getElementById('ongkir').value) || 0);
        await tambahBiaya('Biaya Lainnya', parseInt(document.getElementById('lainLain').value) || 0);
        alert('Biaya tersimpan!');
    });
}

if (document.getElementById('saveActionPlan')) {
    document.getElementById('saveActionPlan').addEventListener('click', () => {
        if (isViewer()) { alert('Mode viewer tidak dapat mengedit rencana'); return; }
        localStorage.setItem('actionPlan', document.getElementById('actionPlan').value);
        let hint = document.getElementById('saveHint');
        if (hint) { hint.innerText = 'Tersimpan!'; setTimeout(() => hint.innerText = '', 2000); }
    });
}

if (document.getElementById('btnExport')) {
    document.getElementById('btnExport').addEventListener('click', () => {
        if (isViewer()) { alert('Mode viewer tidak dapat export'); return; }
        if (!penjualanData.length) { alert('Tidak ada data'); return; }
        let csv = "Tanggal,Marketplace,Produk,Jumlah,Harga,Total,Status\n";
        penjualanData.forEach(p => { csv += `"${p.tanggal}","${p.marketplace}","${p.produk}",${p.jumlah},${p.harga_jual},${p.jumlah * p.harga_jual},"${p.status}"\n`; });
        let blob = new Blob([csv], { type: 'text/csv' });
        let link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `penjualan_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
        alert(`Export ${penjualanData.length} data!`);
    });
}

if (document.getElementById('searchInput')) {
    document.getElementById('searchInput')?.addEventListener('keyup', () => renderPenjualan());
    document.getElementById('filterMarketplace')?.addEventListener('change', () => renderPenjualan());
}
if (document.getElementById('searchStok')) {
    document.getElementById('searchStok')?.addEventListener('keyup', () => renderStok());
}

// ========== LOGIN ==========
if (document.getElementById('loginForm')) {
    let roleBtns = document.querySelectorAll('.role-btn'), adminInfo = document.getElementById('adminInfo'), viewerInfo = document.getElementById('viewerInfo');
    roleBtns.forEach(btn => btn.addEventListener('click', () => { roleBtns.forEach(b => b.classList.remove('active')); btn.classList.add('active'); if (btn.getAttribute('data-role') === 'admin') { adminInfo.classList.remove('hidden'); viewerInfo.classList.add('hidden'); } else { adminInfo.classList.add('hidden'); viewerInfo.classList.remove('hidden'); } }));
    document.getElementById('loginForm').addEventListener('submit', (e) => { e.preventDefault(); let email = document.getElementById('email').value, password = document.getElementById('password').value; if (email === 'cylla@store' && password === 'cylla123') { localStorage.setItem('isLoggedIn', 'true'); localStorage.setItem('userRole', 'admin'); window.location.href = 'dashboard.html'; } else if (email === 'agung@panca' && password === 'pancagung') { localStorage.setItem('isLoggedIn', 'true'); localStorage.setItem('userRole', 'viewer'); window.location.href = 'dashboard.html'; } else alert('Email atau password salah!'); });
}

// ========== INIT ==========
if (!window.location.href.includes('login.html')) { setTimeout(() => { loadAllData(); setTimeout(applyViewerRestrictions, 500); }, 100); }
