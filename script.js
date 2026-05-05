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

// ========== DATA (localStorage) ==========
let penjualanData = JSON.parse(localStorage.getItem('penjualanData')) || [];
let stokData = JSON.parse(localStorage.getItem('stokData')) || [];
let targetBulanan = JSON.parse(localStorage.getItem('targetBulanan')) || 10000000;
let biayaOp = JSON.parse(localStorage.getItem('biayaOp')) || { iklan: 0, fee: 0, ongkir: 0, lain: 0 };

function savePenjualan() {
    localStorage.setItem('penjualanData', JSON.stringify(penjualanData));
}

function saveStok() {
    localStorage.setItem('stokData', JSON.stringify(stokData));
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
    
    document.querySelectorAll('.btn-primary, .btn-delete, #btnTambah, #btnTambahStok, #simpanBiaya, #saveActionPlan').forEach(btn => {
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

setTimeout(applyViewerRestrictions, 100);

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
    
    let trendPercent = yesterdayOmzet > 0 ? ((todayOmzet - yesterdayOmzet) / yesterdayOmzet) * 100 : 0;
    if (el('trendStatus')) {
        el('trendStatus').innerHTML = trendPercent > 0 ? `+${trendPercent.toFixed(1)}% ↑` : (trendPercent < 0 ? `${trendPercent.toFixed(1)}% ↓` : '0% →');
    }
    
    let realisasi = penjualanData.reduce((sum, p) => sum + (p.jumlah * p.harga), 0);
    if (el('targetNilai')) el('targetNilai').innerText = `Rp ${targetBulanan.toLocaleString()}`;
    if (el('realisasiNilai')) el('realisasiNilai').innerText = `Rp ${realisasi.toLocaleString()}`;
    const percent = Math.min(100, (realisasi / targetBulanan) * 100);
    if (el('progressFill')) el('progressFill').style.width = `${percent}%`;
    if (el('targetPercent')) el('targetPercent').innerText = `${percent.toFixed(1)}% tercapai`;
    
    const mp = { Shopee: { omzet: 0, order: 0, produk: 0 }, Tokopedia: { omzet: 0, order: 0, produk: 0 }, 'TikTok Shop': { omzet: 0, order: 0, produk: 0 } };
    penjualanData.forEach(p => { if (mp[p.marketplace]) { mp[p.marketplace].omzet += p.jumlah * p.harga; mp[p.marketplace].order++; mp[p.marketplace].produk += p.jumlah; } });
    const totalOmzetMp = mp.Shopee.omzet + mp.Tokopedia.omzet + mp['TikTok Shop'].omzet;
    
    if (el('mpShopeeOmzet')) el('mpShopeeOmzet').innerText = `Rp ${mp.Shopee.omzet.toLocaleString()}`;
    if (el('mpShopeeOrder')) el('mpShopeeOrder').innerText = mp.Shopee.order;
    if (el('mpShopeePersen')) el('mpShopeePersen').innerText = totalOmzetMp > 0 ? `${((mp.Shopee.omzet/totalOmzetMp)*100).toFixed(1)}%` : '0%';
    if (el('mpTokopediaOmzet')) el('mpTokopediaOmzet').innerText = `Rp ${mp.Tokopedia.omzet.toLocaleString()}`;
    if (el('mpTokopediaOrder')) el('mpTokopediaOrder').innerText = mp.Tokopedia.order;
    if (el('mpTokopediaPersen')) el('mpTokopediaPersen').innerText = totalOmzetMp > 0 ? `${((mp.Tokopedia.omzet/totalOmzetMp)*100).toFixed(1)}%` : '0%';
    if (el('mpTiktokOmzet')) el('mpTiktokOmzet').innerText = `Rp ${mp['TikTok Shop'].omzet.toLocaleString()}`;
    if (el('mpTiktokOrder')) el('mpTiktokOrder').innerText = mp['TikTok Shop'].order;
    if (el('mpTiktokPersen')) el('mpTiktokPersen').innerText = totalOmzetMp > 0 ? `${((mp['TikTok Shop'].omzet/totalOmzetMp)*100).toFixed(1)}%` : '0%';
    if (el('totalOmzet')) el('totalOmzet').innerHTML = `Rp ${totalOmzetMp.toLocaleString()}`;
    if (el('totalOrderCount')) el('totalOrderCount').innerText = penjualanData.length;
    if (el('totalProdukCount')) el('totalProdukCount').innerText = totalProdukTerjual;
    
    const productSales = {};
    penjualanData.forEach(p => { productSales[p.produk] = (productSales[p.produk] || 0) + (p.jumlah * p.harga); });
    const top5 = Object.entries(productSales).sort((a,b) => b[1] - a[1]).slice(0,5);
    if (el('topProdukList')) el('topProdukList').innerHTML = top5.length === 0 ? '<tr><td colspan="3" class="text-center">Belum ada</td></tr>' : top5.map(p => `<tr><td style="font-weight:500;">${p[0]}</td><td>0</td><td>Rp ${p[1].toLocaleString()}</td>`).join('');
    
    const alertList = stokData.filter(item => { const sisa = (item.stokAwal || 0) + (item.stokMasuk || 0) - (item.terjual || 0); return sisa <= 0 || sisa < 10; }).map(item => `${item.nama} ${((item.stokAwal||0)+(item.stokMasuk||0)-(item.terjual||0)) <= 0 ? '(Habis)' : `(Sisa ${(item.stokAwal||0)+(item.stokMasuk||0)-(item.terjual||0)})`}`);
    if (el('alertStokList')) el('alertStokList').innerHTML = alertList.length ? alertList.map(a => `<div class="alert-item">${a}</div>`).join('') : '<div class="empty-alert">Tidak ada peringatan stok</div>';
    
    updateSalesChart();
    updateMarketplaceChart(mp, totalOmzetMp);
}

let salesChart = null;
function updateSalesChart() {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const data = getOmzetLast7Days();
    if (salesChart) salesChart.destroy();
    salesChart = new Chart(ctx, { type: 'line', data: { labels: data.map(d => d.date.slice(5)), datasets: [{ label: 'Omzet', data: data.map(d => d.omzet), borderColor: '#1a1a2e', fill: true, tension: 0.3 }] }, options: { responsive: true, plugins: { legend: { display: false } } } });
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
    const filterMP = document.getElementById('filterMarketplace')?.value || '';
    let filtered = penjualanData.filter(item => (item.produk.toLowerCase().includes(search) || item.marketplace.toLowerCase().includes(search)) && (!filterMP || item.marketplace === filterMP));
    if (filtered.length === 0) { tbody.innerHTML = '<tr><td colspan="8" class="text-center">Belum ada data</td></tr>'; return; }
    tbody.innerHTML = filtered.map((item, idx) => `<tr><td>${item.tanggal}</td><td>${item.marketplace}</td><td style="font-weight:500;">${item.produk}</td><td>${item.jumlah}</td><td>Rp ${item.harga.toLocaleString()}</td><td>Rp ${(item.jumlah * item.harga).toLocaleString()}</td><td>${item.status}</td><td>${isAdmin() ? `<button onclick="hapusPenjualan(${idx})" class="btn-delete">Hapus</button>` : ''}</td></tr>`).join('');
}

window.hapusPenjualan = function(index) {
    if (isViewer()) { alert('Mode viewer tidak dapat menghapus'); return; }
    if (confirm('Hapus data ini?')) { penjualanData.splice(index, 1); savePenjualan(); renderPenjualan(); renderDashboard(); updateStokFromPenjualan(); renderKeuangan(); renderStrategi(); applyViewerRestrictions(); }
};

// ========== RENDER STOK ==========
function renderStok() {
    const tbody = document.getElementById('stokBody');
    if (!tbody) return;
    if (stokData.length === 0) { tbody.innerHTML = '<tr><td colspan="7" class="text-center">Belum ada data stok</td></tr>'; return; }
    tbody.innerHTML = stokData.map((item, idx) => { const sisa = (item.stokAwal || 0) + (item.stokMasuk || 0) - (item.terjual || 0); const status = sisa <= 0 ? 'Habis' : (sisa < 10 ? 'Menipis' : 'Aman'); return `<tr><td style="font-weight:500;">${item.nama}</td><td>${item.stokAwal || 0}</td><td>${item.stokMasuk || 0}</td><td>${item.terjual || 0}</td><td style="font-weight:bold;">${sisa}</td><td>${status}</td><td>${isAdmin() ? `<button onclick="hapusStok(${idx})" class="btn-delete">Hapus</button>` : ''}</td></tr>`; }).join('');
    const habis = stokData.filter(item => { const sisa = (item.stokAwal || 0) + (item.stokMasuk || 0) - (item.terjual || 0); return sisa <= 0; });
    const habisBody = document.getElementById('habisBody');
    if (habisBody) habisBody.innerHTML = habis.length === 0 ? '<tr><td colspan="2" class="text-center">Tidak ada produk habis</td></tr>' : habis.map(item => `<tr><td>${item.nama}</td><td>0</td></tr>`).join('');
}

window.hapusStok = function(index) {
    if (isViewer()) { alert('Mode viewer tidak dapat menghapus'); return; }
    if (confirm('Hapus produk ini?')) { stokData.splice(index, 1); saveStok(); renderStok(); renderDashboard(); applyViewerRestrictions(); }
};

function updateStokFromPenjualan() {
    const productSold = {};
    penjualanData.forEach(p => { productSold[p.produk] = (productSold[p.produk] || 0) + p.jumlah; });
    stokData.forEach(item => { item.terjual = productSold[item.nama] || 0; });
    saveStok();
    renderStok();
}

// ========== RENDER KEUANGAN ==========
function renderKeuangan() {
    const totalOmzet = penjualanData.reduce((sum, p) => sum + (p.jumlah * p.harga), 0);
    const totalHPP = 0; // Sementara 0 dulu
    const totalLaba = totalOmzet - totalHPP;
    const totalBiaya = (biayaOp.iklan || 0) + (biayaOp.fee || 0) + (biayaOp.ongkir || 0) + (biayaOp.lain || 0);
    const labaBersih = totalLaba - totalBiaya;
    
    const el = (id) => document.getElementById(id);
    if (el('totalOmzetKeu')) el('totalOmzetKeu').innerText = `Rp ${totalOmzet.toLocaleString()}`;
    if (el('totalBiayaKeu')) el('totalBiayaKeu').innerText = `Rp ${totalBiaya.toLocaleString()}`;
    if (el('labaBersihKeu')) el('labaBersihKeu').innerText = `Rp ${labaBersih.toLocaleString()}`;
    if (el('summaryIklan')) el('summaryIklan').innerText = `Rp ${(biayaOp.iklan || 0).toLocaleString()}`;
    if (el('summaryFee')) el('summaryFee').innerText = `Rp ${(biayaOp.fee || 0).toLocaleString()}`;
    if (el('summaryOngkir')) el('summaryOngkir').innerText = `Rp ${(biayaOp.ongkir || 0).toLocaleString()}`;
    if (el('summaryLain')) el('summaryLain').innerText = `Rp ${(biayaOp.lain || 0).toLocaleString()}`;
    if (el('summaryTotal')) el('summaryTotal').innerText = `Rp ${totalBiaya.toLocaleString()}`;
    
    const totalTransaksi = penjualanData.length;
    const avgTransaksi = totalTransaksi > 0 ? totalOmzet / totalTransaksi : 0;
    if (el('avgTransaction')) el('avgTransaction').innerText = `Rp ${avgTransaksi.toLocaleString()}`;
    if (el('marginProfit')) el('marginProfit').innerText = totalOmzet > 0 ? `${((labaBersih / totalOmzet) * 100).toFixed(1)}%` : '0%';
    if (el('totalTransaksi')) el('totalTransaksi').innerText = totalTransaksi;
    
    const profitCanvas = document.getElementById('profitChart');
    if (profitCanvas) { const ctx = profitCanvas.getContext('2d'); if (window.profitChart) window.profitChart.destroy(); window.profitChart = new Chart(ctx, { type: 'bar', data: { labels: ['Pendapatan', 'Biaya', 'Laba Bersih'], datasets: [{ data: [totalOmzet, totalBiaya, labaBersih], backgroundColor: ['#1a1a2e', '#e03131', '#2e7d32'] }] }, options: { responsive: true, plugins: { legend: { display: false } } } }); }
}

// ========== RENDER STRATEGI ==========
function renderStrategi() {
    const totalOmzet = penjualanData.reduce((sum, p) => sum + (p.jumlah * p.harga), 0);
    const totalUnit = penjualanData.reduce((s,p) => s + p.jumlah, 0);
    const productStats = {};
    penjualanData.forEach(p => { if (!productStats[p.produk]) productStats[p.produk] = { unit:0, omzet:0 }; productStats[p.produk].unit += p.jumlah; productStats[p.produk].omzet += p.jumlah * p.harga; });
    const productList = Object.entries(productStats).map(([name, data]) => ({ name, unit: data.unit, omzet: data.omzet, share: totalOmzet > 0 ? (data.omzet / totalOmzet) * 100 : 0 })).sort((a,b) => b.omzet - a.omzet);
    const top5 = productList.slice(0,5), bottom5 = productList.slice(-5).reverse();
    const topProduct = top5[0], slowProduct = bottom5[0];
    const uniqueProducts = productList.length, activeMarketplaces = new Set(penjualanData.map(p => p.marketplace)).size;
    let score = (totalOmzet > 0 ? 30 : 0) + (uniqueProducts >= 3 ? 20 : uniqueProducts >= 1 ? 10 : 0) + (activeMarketplaces >= 2 ? 20 : activeMarketplaces >= 1 ? 10 : 0) + (topProduct && topProduct.share < 60 ? 15 : topProduct ? 5 : 0) + (totalUnit >= 10 ? 15 : totalUnit >= 1 ? 5 : 0);
    const el = (id) => document.getElementById(id);
    if (el('businessScore')) el('businessScore').innerText = score;
    if (el('businessStatus')) { el('businessStatus').innerText = score >= 70 ? 'Sehat' : (score >= 40 ? 'Perlu Perbaikan' : 'Kritis'); }
    if (el('topProduct')) el('topProduct').innerText = topProduct ? topProduct.name : '-';
    if (el('slowProduct')) el('slowProduct').innerText = slowProduct ? slowProduct.name : '-';
    if (el('topProductsTable')) el('topProductsTable').innerHTML = top5.length ? top5.map(p => `<tr><td style="font-weight:500;">${p.name}</td><td>${p.unit} unit</td><td>Rp ${p.omzet.toLocaleString()}</td><td>${p.share.toFixed(1)}%</td></tr>`).join('') : '<tr><td colspan="4" class="text-center">Belum ada数据</td></tr>';
    if (el('bottomProductsTable')) el('bottomProductsTable').innerHTML = bottom5.length ? bottom5.map(p => `<tr><td style="font-weight:500;">${p.name}</td><td>${p.unit} unit</td><td>Rp ${p.omzet.toLocaleString()}</td><td>${p.share.toFixed(1)}%</td></tr>`).join('') : '<tr><td colspan="4" class="text-center">Belum ada数据</td></tr>';
    
    const mpStats = { Shopee: { omzet:0, order:0 }, Tokopedia: { omzet:0, order:0 }, 'TikTok Shop': { omzet:0, order:0 } };
    penjualanData.forEach(p => { if (mpStats[p.marketplace]) { mpStats[p.marketplace].omzet += p.jumlah * p.harga; mpStats[p.marketplace].order++; } });
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
    
    const recommendations = [];
    if (topProduct && topProduct.share > 50) recommendations.push(`Produk "${topProduct.name}" mendominasi ${topProduct.share.toFixed(1)}% omzet. Fokus pada produk ini.`);
    if (slowProduct && slowProduct.omzet > 0 && slowProduct.share < 5) recommendations.push(`Produk "${slowProduct.name}" hanya berkontribusi ${slowProduct.share.toFixed(1)}% omzet. Evaluasi produk ini.`);
    if (totalUnit < 10) recommendations.push('Volume penjualan masih rendah. Coba program diskon atau bundling produk.');
    if (recommendations.length === 0) recommendations.push('Terus pantau data penjualan untuk mendapatkan rekomendasi.');
    if (el('recommendationList')) el('recommendationList').innerHTML = recommendations.map(rec => `<div class="recommendation-item">${rec}</div>`).join('');
    
    const totalTop5 = top5.reduce((s,p) => s + p.omzet, 0);
    const distCanvas = document.getElementById('distributionChart');
    if (distCanvas) { const ctx = distCanvas.getContext('2d'); if (window.distChart) window.distChart.destroy(); window.distChart = new Chart(ctx, { type: 'doughnut', data: { labels: [...top5.map(p => p.name), 'Lainnya'], datasets: [{ data: [...top5.map(p => p.omzet), totalOmzet - totalTop5], backgroundColor: ['#1a1a2e', '#4a6cf7', '#f59f00', '#e03131', '#2e7d32', '#adb5bd'] }] }, options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } } }); }
    
    if (el('insight1')) el('insight1').innerText = uniqueProducts;
    if (el('insight2')) el('insight2').innerText = activeMarketplaces;
    if (el('insight3')) el('insight3').innerText = totalUnit > 0 ? `Rp ${Math.round(totalOmzet/totalUnit).toLocaleString()}` : 'Rp 0';
}

// ========== MODAL TAMBAH DATA ==========
if (document.getElementById('btnTambah')) {
    const modal = document.getElementById('modalTambah'), btn = document.getElementById('btnTambah'), close = document.querySelector('#modalTambah .close');
    if (btn) btn.onclick = () => { if (isAdmin()) modal.style.display = 'block'; else alert('Mode viewer tidak dapat menambah data'); };
    if (close) close.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    document.getElementById('formPenjualan')?.addEventListener('submit', function(e) { e.preventDefault(); if (isViewer()) { alert('Mode viewer tidak dapat menambah data'); modal.style.display = 'none'; return; } penjualanData.push({ tanggal: document.getElementById('tgl').value, marketplace: document.getElementById('mp').value, produk: document.getElementById('produk').value, jumlah: parseInt(document.getElementById('jumlah').value) || 0, harga: parseInt(document.getElementById('harga').value) || 0, status: document.getElementById('status').value }); savePenjualan(); renderPenjualan(); renderDashboard(); updateStokFromPenjualan(); renderKeuangan(); renderStrategi(); modal.style.display = 'none'; this.reset(); alert('Data tersimpan!'); });
}

if (document.getElementById('btnTambahStok')) {
    const modal = document.getElementById('modalStok'), btn = document.getElementById('btnTambahStok'), close = document.querySelector('#modalStok .close-stok');
    if (btn) btn.onclick = () => { if (isAdmin()) modal.style.display = 'block'; else alert('Mode viewer tidak dapat menambah data'); };
    if (close) close.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    document.getElementById('formStok')?.addEventListener('submit', function(e) { e.preventDefault(); if (isViewer()) { alert('Mode viewer tidak dapat menambah data'); modal.style.display = 'none'; return; } stokData.push({ nama: document.getElementById('namaProduk').value, stokAwal: parseInt(document.getElementById('stokAwal').value) || 0, stokMasuk: parseInt(document.getElementById('stokMasuk').value) || 0, terjual: 0 }); saveStok(); renderStok(); renderDashboard(); modal.style.display = 'none'; this.reset(); alert('Stok tersimpan!'); });
}

if (document.getElementById('simpanBiaya')) document.getElementById('simpanBiaya').addEventListener('click', function() { if (isViewer()) { alert('Mode viewer tidak dapat mengedit biaya'); return; } biayaOp = { iklan: parseInt(document.getElementById('biayaIklan').value) || 0, fee: parseInt(document.getElementById('feeMarketplace').value) || 0, ongkir: parseInt(document.getElementById('ongkir').value) || 0, lain: parseInt(document.getElementById('lainLain').value) || 0 }; localStorage.setItem('biayaOp', JSON.stringify(biayaOp)); renderKeuangan(); alert('Biaya operasional telah disimpan'); });

if (document.getElementById('saveActionPlan')) document.getElementById('saveActionPlan').addEventListener('click', function() { if (isViewer()) { alert('Mode viewer tidak dapat mengedit rencana'); return; } localStorage.setItem('actionPlan', document.getElementById('actionPlan').value); const hint = document.getElementById('saveHint'); if (hint) { hint.innerText = 'Tersimpan!'; setTimeout(() => hint.innerText = '', 2000); } });

if (document.getElementById('btnExport')) document.getElementById('btnExport').addEventListener('click', function() { if (isViewer()) { alert('Mode viewer tidak dapat export'); return; } if (!penjualanData.length) { alert('Tidak ada data'); return; } let csv = "Tanggal,Marketplace,Produk,Jumlah,Harga,Total,Status\n"; penjualanData.forEach(p => { csv += `"${p.tanggal}","${p.marketplace}","${p.produk}",${p.jumlah},${p.harga},${p.jumlah * p.harga},"${p.status}"\n`; }); const blob = new Blob([csv], { type: 'text/csv' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `penjualan_${new Date().toISOString().slice(0,10)}.csv`; link.click(); alert(`Export ${penjualanData.length} data!`); });

if (document.getElementById('searchInput')) { document.getElementById('searchInput')?.addEventListener('keyup', () => renderPenjualan()); document.getElementById('filterMarketplace')?.addEventListener('change', () => renderPenjualan()); }
if (document.getElementById('searchStok')) document.getElementById('searchStok')?.addEventListener('keyup', () => renderStok());

// ========== LOGIN SYSTEM ==========
if (document.getElementById('loginForm')) {
    const roleBtns = document.querySelectorAll('.role-btn'), adminInfo = document.getElementById('adminInfo'), viewerInfo = document.getElementById('viewerInfo');
    roleBtns.forEach(btn => btn.addEventListener('click', () => { roleBtns.forEach(b => b.classList.remove('active')); btn.classList.add('active'); if (btn.getAttribute('data-role') === 'admin') { adminInfo.classList.remove('hidden'); viewerInfo.classList.add('hidden'); } else { adminInfo.classList.add('hidden'); viewerInfo.classList.remove('hidden'); } }));
    document.getElementById('loginForm').addEventListener('submit', function(e) { e.preventDefault(); const email = document.getElementById('email').value, password = document.getElementById('password').value; if (email === 'cylla@store' && password === 'cylla123') { localStorage.setItem('isLoggedIn', 'true'); localStorage.setItem('userRole', 'admin'); window.location.href = 'dashboard.html'; } else if (email === 'agung@panca' && password === 'pancagung') { localStorage.setItem('isLoggedIn', 'true'); localStorage.setItem('userRole', 'viewer'); window.location.href = 'dashboard.html'; } else alert('Email atau password salah!'); });
}

// ========== INITIAL RENDER ==========
if (!window.location.href.includes('login.html')) {
    renderPenjualan();
    renderStok();
    renderDashboard();
    renderKeuangan();
    renderStrategi();
}
