// ========== CEK LOGIN ==========
if (!window.location.href.includes('login.html') && !window.location.href.includes('index.html')) {
    if (localStorage.getItem('isLoggedIn') !== 'true') {
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

// ========== DATA PENJUALAN ==========
let penjualanData = JSON.parse(localStorage.getItem('penjualanData')) || [];
let stokData = JSON.parse(localStorage.getItem('stokData')) || [];
let targetBulanan = JSON.parse(localStorage.getItem('targetBulanan')) || 5000000;

function savePenjualan() {
    localStorage.setItem('penjualanData', JSON.stringify(penjualanData));
}

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

// ========== RENDER DASHBOARD ==========
function renderDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    const todayOmzet = getOmzetByDate(today);
    const yesterdayOmzet = getOmzetByDate(yesterday);
    const totalOmzetAll = penjualanData.reduce((sum, p) => sum + (p.jumlah * p.harga), 0);
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
        trendEl.className = `trend ${trendPercent > 0 ? 'up' : (trendPercent < 0 ? 'down' : 'neutral')}`;
    }
    
    // Target
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
    
    // Marketplace Summary
    const mp = { Shopee: { omzet: 0, order: 0, produk: 0 }, Tokopedia: { omzet: 0, order: 0, produk: 0 }, 'TikTok Shop': { omzet: 0, order: 0, produk: 0 } };
    penjualanData.forEach(p => {
        if (mp[p.marketplace]) {
            mp[p.marketplace].omzet += p.jumlah * p.harga;
            mp[p.marketplace].order++;
            mp[p.marketplace].produk += p.jumlah;
        }
    });
    const totalOmzetMp = mp.Shopee.omzet + mp.Tokopedia.omzet + mp['TikTok Shop'].omzet;
    document.getElementById('mpShopeeOmzet').innerText = `Rp ${mp.Shopee.omzet.toLocaleString()}`;
    document.getElementById('mpShopeeOrder').innerText = mp.Shopee.order;
    document.getElementById('mpShopeeProduk').innerText = mp.Shopee.produk;
    document.getElementById('mpShopeePersen').innerText = totalOmzetMp > 0 ? `${((mp.Shopee.omzet/totalOmzetMp)*100).toFixed(1)}%` : '0%';
    document.getElementById('mpTokopediaOmzet').innerText = `Rp ${mp.Tokopedia.omzet.toLocaleString()}`;
    document.getElementById('mpTokopediaOrder').innerText = mp.Tokopedia.order;
    document.getElementById('mpTokopediaProduk').innerText = mp.Tokopedia.produk;
    document.getElementById('mpTokopediaPersen').innerText = totalOmzetMp > 0 ? `${((mp.Tokopedia.omzet/totalOmzetMp)*100).toFixed(1)}%` : '0%';
    document.getElementById('mpTiktokOmzet').innerText = `Rp ${mp['TikTok Shop'].omzet.toLocaleString()}`;
    document.getElementById('mpTiktokOrder').innerText = mp['TikTok Shop'].order;
    document.getElementById('mpTiktokProduk').innerText = mp['TikTok Shop'].produk;
    document.getElementById('mpTiktokPersen').innerText = totalOmzetMp > 0 ? `${((mp['TikTok Shop'].omzet/totalOmzetMp)*100).toFixed(1)}%` : '0%';
    document.getElementById('totalOmzet').innerHTML = `<strong>Rp ${totalOmzetMp.toLocaleString()}</strong>`;
    document.getElementById('totalOrderCount').innerHTML = `<strong>${penjualanData.length}</strong>`;
    document.getElementById('totalProdukCount').innerHTML = `<strong>${totalProdukTerjual}</strong>`;
    
    // Top Products
    const productSales = {};
    penjualanData.forEach(p => { productSales[p.produk] = (productSales[p.produk] || 0) + (p.jumlah * p.harga); });
    const top5 = Object.entries(productSales).sort((a,b) => b[1] - a[1]).slice(0,5);
    const topList = document.getElementById('topProdukList');
    if (topList) {
        if (top5.length === 0) topList.innerHTML = '<tr><td colspan="4" class="text-center">Belum ada data</td></tr>';
        else topList.innerHTML = top5.map((p, i) => `<tr><td>${i+1}</td><td>${p[0]}</td><td>${Math.round(p[1] / (p[1]/p[0][1]))}</td><td>Rp ${p[1].toLocaleString()}</td></tr>`).join('');
    }
    
    // Alert Stok
    const alertList = [];
    stokData.forEach(item => {
        const sisa = (item.stokAwal || 0) + (item.stokMasuk || 0) - (item.terjual || 0);
        if (sisa <= 0) alertList.push(`${item.nama} (Habis)`);
        else if (sisa < 10) alertList.push(`${item.nama} (Sisa ${sisa})`);
    });
    const alertDiv = document.getElementById('alertStokList');
    if (alertDiv) alertDiv.innerHTML = alertList.length ? alertList.join(', ') : 'Tidak ada stok menipis';
    
    // Update Charts
    updateSalesChart();
    updateMarketplaceChart(mp, totalOmzetMp);
}

// ========== GRAFIK PENJUALAN ==========
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
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } }
        }
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
            datasets: [{
                data: [mp.Shopee.omzet, mp.Tokopedia.omzet, mp['TikTok Shop'].omzet],
                backgroundColor: ['#1a1a2e', '#4a6cf7', '#f59f00'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { position: 'bottom' } }
        }
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
    tbody.innerHTML = filtered.map((item, idx) => `
        <tr>
            <td>${item.tanggal}</td>
            <td>${item.marketplace}</td>
            <td>${item.produk}</td>
            <td>${item.jumlah}</td>
            <td>Rp ${parseInt(item.harga).toLocaleString()}</td>
            <td>Rp ${(item.jumlah * item.harga).toLocaleString()}</td>
            <td>${item.status}</td>
            <td><button onclick="hapusPenjualan(${penjualanData.indexOf(item)})" class="btn-delete">Hapus</button></td>
        </tr>
    `).join('');
}

window.hapusPenjualan = function(index) {
    if (confirm('Hapus data ini?')) {
        penjualanData.splice(index, 1);
        savePenjualan();
        renderPenjualan();
        renderDashboard();
        updateStokFromPenjualan();
        updateKeuangan();
        renderStrategi();
    }
};

// ========== RENDER STOK ==========
function renderStok() {
    const tbody = document.getElementById('stokBody');
    if (!tbody) return;
    const search = document.getElementById('searchStok')?.value.toLowerCase() || '';
    const filtered = stokData.filter(item => item.nama.toLowerCase().includes(search));
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Belum ada data</td></tr>';
        document.getElementById('habisBody').innerHTML = '<tr><td colspan="2" class="text-center">-</td></tr>';
        return;
    }
    tbody.innerHTML = filtered.map((item, idx) => {
        const sisa = (item.stokAwal || 0) + (item.stokMasuk || 0) - (item.terjual || 0);
        const status = sisa <= 0 ? 'Habis' : (sisa < 10 ? 'Menipis' : 'Aman');
        return `<tr><td>${item.nama}</td><td>${item.stokAwal || 0}</td><td>${item.stokMasuk || 0}</td><td>${item.terjual || 0}</td><td>${sisa}</td><td>${status}</td><td><button onclick="hapusStok(${idx})" class="btn-delete">Hapus</button></td></tr>`;
    }).join('');
    const habis = stokData.filter(item => { const sisa = (item.stokAwal || 0) + (item.stokMasuk || 0) - (item.terjual || 0); return sisa <= 0; });
    document.getElementById('habisBody').innerHTML = habis.length === 0 ? '<tr><td colspan="2" class="text-center">-</td></tr>' : habis.map(item => `<tr><td>${item.nama}</td><td>0</td></tr>`).join('');
}

window.hapusStok = function(index) {
    if (confirm('Hapus produk ini?')) {
        stokData.splice(index, 1);
        localStorage.setItem('stokData', JSON.stringify(stokData));
        renderStok();
        renderDashboard();
    }
};

function updateStokFromPenjualan() {
    const productSold = {};
    penjualanData.forEach(p => { productSold[p.produk] = (productSold[p.produk] || 0) + p.jumlah; });
    stokData.forEach(item => { item.terjual = productSold[item.nama] || 0; });
    localStorage.setItem('stokData', JSON.stringify(stokData));
    renderStok();
}

// ========== KEUANGAN ==========
let biayaOp = JSON.parse(localStorage.getItem('biayaOp')) || { iklan: 0, fee: 0, ongkir: 0, lain: 0 };

function updateKeuangan() {
    const totalOmzet = penjualanData.reduce((sum, p) => sum + (p.jumlah * p.harga), 0);
    const totalBiaya = (biayaOp.iklan || 0) + (biayaOp.fee || 0) + (biayaOp.ongkir || 0) + (biayaOp.lain || 0);
    const labaBersih = totalOmzet - totalBiaya;
    document.getElementById('totalOmzetKeu')?.setAttribute('data-value', totalOmzet);
    const keuanganCards = document.querySelectorAll('.kpi-card');
    keuanganCards.forEach(card => {
        const title = card.querySelector('h3')?.innerText;
        if (title === 'Omzet') card.querySelector('.kpi-value').innerText = `Rp ${totalOmzet.toLocaleString()}`;
        if (title === 'Biaya Operasional') card.querySelector('.kpi-value').innerText = `Rp ${totalBiaya.toLocaleString()}`;
        if (title === 'Laba Bersih') card.querySelector('.kpi-value').innerText = `Rp ${labaBersih.toLocaleString()}`;
    });
}

// ========== STRATEGI ==========
function renderStrategi() {
    const productSales = {};
    penjualanData.forEach(p => { productSales[p.produk] = (productSales[p.produk] || 0) + p.jumlah; });
    const top5 = Object.entries(productSales).sort((a,b) => b[1] - a[1]).slice(0,5);
    const bottom5 = Object.entries(productSales).sort((a,b) => a[1] - b[1]).slice(0,5);
    const topBody = document.getElementById('topProdukBody');
    if (topBody) topBody.innerHTML = top5.length === 0 ? '<tr><td colspan="3">Belum ada data</td></tr>' : top5.map(p => `<tr><td>${p[0]}</td><td>${p[1]}</td><td>Rp 0</td></tr>`).join('');
    const bottomBody = document.getElementById('bottomProdukBody');
    if (bottomBody) bottomBody.innerHTML = bottom5.length === 0 ? '<tr><td colspan="3">Belum ada data</td></tr>' : bottom5.map(p => `<tr><td>${p[0]}</td><td>${p[1]}</td><td>Rp 0</td></tr>`).join('');
    const rekomendasi = document.getElementById('rekomendasiList');
    if (rekomendasi && top5.length > 0) rekomendasi.innerHTML = `<div class="rekomendasi-item">Fokus promosi: ${top5[0][0]} (produk terlaris)</div>${bottom5[0] ? `<div class="rekomendasi-item">Evaluasi: ${bottom5[0][0]} sepi order</div>` : ''}<div class="rekomendasi-item">Total ${penjualanData.length} transaksi tercatat</div>`;
}

// ========== MODAL & EVENT ==========
if (document.getElementById('btnTambah')) {
    const modal = document.getElementById('modalTambah');
    const btn = document.getElementById('btnTambah');
    const close = document.querySelector('.close');
    btn.onclick = () => modal.style.display = 'block';
    if (close) close.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    document.getElementById('formPenjualan')?.addEventListener('submit', function(e) {
        e.preventDefault();
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
        updateKeuangan();
        renderStrategi();
        modal.style.display = 'none';
        this.reset();
        alert('Data tersimpan!');
    });
}

if (document.getElementById('btnTambahStok')) {
    const modal = document.getElementById('modalStok');
    const btn = document.getElementById('btnTambahStok');
    const close = document.querySelector('.close-stok');
    btn.onclick = () => modal.style.display = 'block';
    if (close) close.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    document.getElementById('formStok')?.addEventListener('submit', function(e) {
        e.preventDefault();
        stokData.push({
            nama: document.getElementById('namaProduk').value,
            stokAwal: parseInt(document.getElementById('stokAwal').value) || 0,
            stokMasuk: parseInt(document.getElementById('stokMasuk').value) || 0,
            terjual: 0
        });
        localStorage.setItem('stokData', JSON.stringify(stokData));
        renderStok();
        renderDashboard();
        modal.style.display = 'none';
        this.reset();
        alert('Stok tersimpan!');
    });
}

if (document.getElementById('formBiaya')) {
    document.getElementById('formBiaya').addEventListener('submit', function(e) {
        e.preventDefault();
        biayaOp = {
            iklan: parseInt(document.getElementById('biayaIklan').value) || 0,
            fee: parseInt(document.getElementById('feeMarketplace').value) || 0,
            ongkir: parseInt(document.getElementById('ongkir').value) || 0,
            lain: parseInt(document.getElementById('lainLain').value) || 0
        };
        localStorage.setItem('biayaOp', JSON.stringify(biayaOp));
        updateKeuangan();
        alert('Biaya tersimpan!');
    });
}

if (document.getElementById('simpanCatatan')) {
    const saved = localStorage.getItem('catatanStrategi') || '';
    if (document.getElementById('catatanStrategi')) document.getElementById('catatanStrategi').value = saved;
    document.getElementById('simpanCatatan').addEventListener('click', () => {
        const note = document.getElementById('catatanStrategi').value;
        localStorage.setItem('catatanStrategi', note);
        alert('Catatan tersimpan!');
    });
}

if (document.getElementById('btnExport')) {
    document.getElementById('btnExport').addEventListener('click', () => {
        let csv = 'Tanggal,Marketplace,Produk,Jumlah,Harga,Total,Status\n';
        penjualanData.forEach(p => csv += `${p.tanggal},${p.marketplace},${p.produk},${p.jumlah},${p.harga},${p.jumlah * p.harga},${p.status}\n`);
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `penjualan_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
    });
}

if (document.getElementById('searchInput')) {
    document.getElementById('searchInput')?.addEventListener('keyup', () => renderPenjualan());
    document.getElementById('filterMarketplace')?.addEventListener('change', () => renderPenjualan());
}
if (document.getElementById('searchStok')) document.getElementById('searchStok')?.addEventListener('keyup', () => renderStok());

// ========== LOGIN ==========
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        if (email === 'admin@cylla.store' && password === '123') {
            localStorage.setItem('isLoggedIn', 'true');
            window.location.href = 'dashboard.html';
        } else alert('Email atau password salah!');
    });
}

// ========== KEUANGAN PAGE SPECIFIC ==========
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
    
    // Summary
    document.getElementById('summaryIklan')?.innerText = `Rp ${(biayaOp.iklan || 0).toLocaleString()}`;
    document.getElementById('summaryFee')?.innerText = `Rp ${(biayaOp.fee || 0).toLocaleString()}`;
    document.getElementById('summaryOngkir')?.innerText = `Rp ${(biayaOp.ongkir || 0).toLocaleString()}`;
    document.getElementById('summaryLain')?.innerText = `Rp ${(biayaOp.lain || 0).toLocaleString()}`;
    document.getElementById('summaryTotal')?.innerText = `Rp ${totalBiaya.toLocaleString()}`;
    
    // Additional info
    const totalTransaksi = penjualanData.length;
    const avgTransaksi = totalTransaksi > 0 ? totalOmzet / totalTransaksi : 0;
    document.getElementById('avgTransaction')?.innerText = `Rp ${avgTransaksi.toLocaleString()}`;
    document.getElementById('marginProfit')?.innerText = totalOmzet > 0 ? `${((labaBersih / totalOmzet) * 100).toFixed(1)}%` : '0%';
    document.getElementById('totalTransaksi')?.innerText = totalTransaksi;
    
    // Profit Chart
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
        data: {
            labels: ['Pendapatan', 'Biaya', 'Laba Bersih'],
            datasets: [{
                data: [omzet, biaya, omzet - biaya],
                backgroundColor: ['#1a1a2e', '#e03131', '#2e7d32'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } }
        }
    });
}

// Load biaya operasional ke form
if (document.getElementById('biayaIklan')) {
    document.getElementById('biayaIklan').value = biayaOp.iklan || 0;
    document.getElementById('feeMarketplace').value = biayaOp.fee || 0;
    document.getElementById('ongkir').value = biayaOp.ongkir || 0;
    document.getElementById('lainLain').value = biayaOp.lain || 0;
    
    document.getElementById('simpanBiaya').addEventListener('click', () => {
        biayaOp = {
            iklan: parseInt(document.getElementById('biayaIklan').value) || 0,
            fee: parseInt(document.getElementById('feeMarketplace').value) || 0,
            ongkir: parseInt(document.getElementById('ongkir').value) || 0,
            lain: parseInt(document.getElementById('lainLain').value) || 0
        };
        localStorage.setItem('biayaOp', JSON.stringify(biayaOp));
        renderKeuangan();
        alert('Biaya operasional telah disimpan');
    });
}

// Panggil renderKeuangan jika di halaman keuangan
if (window.location.href.includes('keuangan.html')) {
    renderKeuangan();
}

// ========== INIT ==========
renderPenjualan();
renderStok();
renderDashboard();
updateKeuangan();
renderStrategi();
