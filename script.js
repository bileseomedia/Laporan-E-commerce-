// ========== KONFIGURASI SUPABASE ==========
// GANTI DENGAN PROJECT URL DAN ANON KEY DARI SUPABASE KAMU!
const SUPABASE_URL = "https://sb_publishable_r-Iy9iSNBBAWvdO7HvmoxA_TtIM9AdF.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIs...";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========== DATA GLOBAL ==========
let penjualanData = [];
let stokData = [];
let biayaData = [];
let targetData = null;
let currentUserRole = "";

// ========== LOGIN SYSTEM (FIXED - TOMBOL BISA DIPENCET) ==========
if (document.getElementById('loginForm')) {
    const roleBtns = document.querySelectorAll('.role-btn');
    const adminInfo = document.getElementById('adminInfo');
    const viewerInfo = document.getElementById('viewerInfo');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    // Tab switch (tanpa isi otomatis email)
    if (roleBtns.length) {
        roleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                roleBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const role = btn.getAttribute('data-role');
                if (role === 'admin') {
                    if (adminInfo) adminInfo.classList.remove('hidden');
                    if (viewerInfo) viewerInfo.classList.add('hidden');
                    // HAPUS: emailInput.value = 'cylla@store'; (jangan diisi otomatis)
                    if (passwordInput) passwordInput.value = '';
                } else {
                    if (adminInfo) adminInfo.classList.add('hidden');
                    if (viewerInfo) viewerInfo.classList.remove('hidden');
                    // HAPUS: emailInput.value = 'agung@panca'; (jangan diisi otomatis)
                    if (passwordInput) passwordInput.value = '';
                }
            });
        });
    }
    
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // Validasi sederhana
        if (!email || !password) {
            alert('Email dan password harus diisi!');
            return;
        }
        
        // LOGIN ADMIN
        if (email === 'cylla@store' && password === 'cylla123') {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userRole', 'admin');
            window.location.href = 'dashboard.html';
        } 
        // LOGIN VIEWER (ATASAN)
        else if (email === 'agung@panca' && password === 'pancagung') {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userRole', 'viewer');
            window.location.href = 'dashboard.html';
        }
        else {
            alert('Email atau password salah! Hubungi administrator untuk mendapatkan akses.');
        }
    });
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
        
        const { data: biaya } = await supabase.from('biaya_operasional').select('*').order('tanggal', { ascending: false });
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
    renderDashboard();
    renderPenjualan();
    renderStok();
    renderKeuangan();
    renderStrategi();
    applyViewerRestrictions();
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
    
    const el = (id) => document.getElementById(id);
    if (el('omzetHariIni')) el('omzetHariIni').innerText = `Rp ${todayOmzet.toLocaleString()}`;
    if (el('totalOrder')) el('totalOrder').innerText = totalOrder;
    if (el('produkTerjual')) el('produkTerjual').innerText = totalProdukTerjual;
    if (el('compHariIni')) el('compHariIni').innerText = `Rp ${todayOmzet.toLocaleString()}`;
    if (el('compKemarin')) el('compKemarin').innerText = `Rp ${yesterdayOmzet.toLocaleString()}`;
    
    let trendPercent = yesterdayOmzet > 0 ? ((todayOmzet - yesterdayOmzet) / yesterdayOmzet) * 100 : 0;
    if (el('trendStatus')) {
        el('trendStatus').innerHTML = trendPercent > 0 ? `+${trendPercent.toFixed(1)}% ↑` : (trendPercent < 0 ? `${trendPercent.toFixed(1)}% ↓` : '0% →');
        el('trendStatus').style.color = trendPercent > 0 ? '#2e7d32' : (trendPercent < 0 ? '#c62828' : '#616161');
    }
    
    let realisasi = getTotalOmzet();
    const targetOmzet = targetData?.target_omzet || 10000000;
    if (el('targetNilai')) el('targetNilai').innerText = `Rp ${targetOmzet.toLocaleString()}`;
    if (el('realisasiNilai')) el('realisasiNilai').innerText = `Rp ${realisasi.toLocaleString()}`;
    const percent = Math.min(100, (realisasi / targetOmzet) * 100);
    if (el('progressFill')) el('progressFill').style.width = `${percent}%`;
    if (el('targetPercent')) el('targetPercent').innerText = `${percent.toFixed(1)}% tercapai`;
    
    const mp = { Shopee: { omzet: 0, order: 0, produk: 0 }, Tokopedia: { omzet: 0, order: 0, produk: 0 }, 'TikTok Shop': { omzet: 0, order: 0, produk: 0 } };
    penjualanData.forEach(p => { if (mp[p.marketplace]) { mp[p.marketplace].omzet += p.jumlah * p.harga_jual; mp[p.marketplace].order++; mp[p.marketplace].produk += p.jumlah; } });
    const totalOmzetMp = mp.Shopee.omzet + mp.Tokopedia.omzet + mp['TikTok Shop'].omzet;
    
    if (el('mpShopeeOmzet')) el('mpShopeeOmzet').innerText = `Rp ${mp.Shopee.omzet.toLocaleString()}`;
    if (el('mpShopeeOrder')) el('mpShopeeOrder').innerText = mp.Shopee.order;
    if (el('mpShopeeProduk')) el('mpShopeeProduk').innerText = mp.Shopee.produk;
    if (el('mpShopeePersen')) el('mpShopeePersen').innerText = totalOmzetMp > 0 ? `${((mp.Shopee.omzet/totalOmzetMp)*100).toFixed(1)}%` : '0%';
    if (el('mpTokopediaOmzet')) el('mpTokopediaOmzet').innerText = `Rp ${mp.Tokopedia.omzet.toLocaleString()}`;
    if (el('mpTokopediaOrder')) el('mpTokopediaOrder').innerText = mp.Tokopedia.order;
    if (el('mpTokopediaProduk')) el('mpTokopediaProduk').innerText = mp.Tokopedia.produk;
    if (el('mpTokopediaPersen')) el('mpTokopediaPersen').innerText = totalOmzetMp > 0 ? `${((mp.Tokopedia.omzet/totalOmzetMp)*100).toFixed(1)}%` : '0%';
    if (el('mpTiktokOmzet')) el('mpTiktokOmzet').innerText = `Rp ${mp['TikTok Shop'].omzet.toLocaleString()}`;
    if (el('mpTiktokOrder')) el('mpTiktokOrder').innerText = mp['TikTok Shop'].order;
    if (el('mpTiktokProduk')) el('mpTiktokProduk').innerText = mp['TikTok Shop'].produk;
    if (el('mpTiktokPersen')) el('mpTiktokPersen').innerText = totalOmzetMp > 0 ? `${((mp['TikTok Shop'].omzet/totalOmzetMp)*100).toFixed(1)}%` : '0%';
    if (el('totalOmzet')) el('totalOmzet').innerHTML = `Rp ${totalOmzetMp.toLocaleString()}`;
    if (el('totalOrderCount')) el('totalOrderCount').innerText = penjualanData.length;
    if (el('totalProdukCount')) el('totalProdukCount').innerText = totalProdukTerjual;
    
    const productSales = {};
    penjualanData.forEach(p => { productSales[p.produk] = (productSales[p.produk] || 0) + (p.jumlah * p.harga_jual); });
    const top5 = Object.entries(productSales).sort((a,b) => b[1] - a[1]).slice(0,5);
    if (el('topProdukList')) el('topProdukList').innerHTML = top5.length === 0 ? '<tr><td colspan="3" class="text-center">Belum ada</td></tr>' : top5.map(p => `<tr><td style="font-weight:500;">${p[0]}</td><td>0</td><td>Rp ${p[1].toLocaleString()}</td></tr>`).join('');
    
    const alertList = stokData.filter(item => { const sisa = item.stok_sisa; return sisa <= 0 || sisa < (item.minimum_stok || 10); }).map(item => `${item.produk} ${item.stok_sisa <= 0 ? '(Habis)' : `(Sisa ${item.stok_sisa})`}`);
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
    if (stokData.length === 0) { tbody.innerHTML = '<tr><td colspan="7" class="text-center">Belum ada数据 stok</td></tr>'; return; }
    tbody.innerHTML = stokData.map(item => { const sisa = item.stok_sisa; const status = sisa <= 0 ? 'Habis' : (sisa < (item.minimum_stok || 10) ? 'Menipis' : 'Aman'); return `<tr><td style="font-weight:500;">${item.produk}</td><td>${item.stok_awal}</td><td>${item.stok_masuk}</td><td>${item.stok_keluar}</td><td style="font-weight:bold;">${sisa}</td><td>${status}</td><td>Rp ${(item.hpp_terakhir || 0).toLocaleString()}</td></tr>`; }).join('');
    const habis = stokData.filter(item => item.stok_sisa <= 0);
    const habisBody = document.getElementById('habisBody');
    if (habisBody) habisBody.innerHTML = habis.length === 0 ? '<tr><td colspan="2" class="text-center">Tidak ada produk habis</td></tr>' : habis.map(item => `<tr><td>${item.produk}</td><td>0</td></tr>`).join('');
}

// ========== RENDER KEUANGAN ==========
function renderKeuangan() {
    const totalOmzet = getTotalOmzet(), totalHPP = getTotalHPP(), totalLaba = getTotalLaba(), totalBiaya = getTotalBiaya(), labaBersih = getLabaBersih();
    const el = (id) => document.getElementById(id);
    if (el('totalOmzetKeu')) el('totalOmzetKeu').innerText = `Rp ${totalOmzet.toLocaleString()}`;
    if (el('totalHPPKeu')) el('totalHPPKeu').innerText = `Rp ${totalHPP.toLocaleString()}`;
    if (el('totalLabaKeu')) el('totalLabaKeu').innerText = `Rp ${totalLaba.toLocaleString()}`;
    if (el('totalBiayaKeu')) el('totalBiayaKeu').innerText = `Rp ${totalBiaya.toLocaleString()}`;
    if (el('labaBersihKeu')) el('labaBersihKeu').innerText = `Rp ${labaBersih.toLocaleString()}`;
    if (el('summaryIklan')) el('summaryIklan').innerText = `Rp ${(biayaData.find(b => b.jenis === 'Biaya Iklan')?.nominal || 0).toLocaleString()}`;
    if (el('summaryFee')) el('summaryFee').innerText = `Rp ${(biayaData.find(b => b.jenis === 'Fee Marketplace')?.nominal || 0).toLocaleString()}`;
    if (el('summaryOngkir')) el('summaryOngkir').innerText = `Rp ${(biayaData.find(b => b.jenis === 'Biaya Pengiriman')?.nominal || 0).toLocaleString()}`;
    if (el('summaryLain')) el('summaryLain').innerText = `Rp ${(biayaData.find(b => b.jenis === 'Biaya Lainnya')?.nominal || 0).toLocaleString()}`;
    if (el('summaryTotal')) el('summaryTotal').innerText = `Rp ${totalBiaya.toLocaleString()}`;
    
    const monthlyData = {};
    penjualanData.forEach(p => { const m = p.tanggal.slice(0,7); if (!monthlyData[m]) monthlyData[m] = { omzet:0, hpp:0, laba:0 }; monthlyData[m].omzet += p.jumlah * p.harga_jual; monthlyData[m].hpp += p.jumlah * (p.hpp || 0); monthlyData[m].laba = monthlyData[m].omzet - monthlyData[m].hpp; });
    biayaData.forEach(b => { const m = b.tanggal.slice(0,7); if (monthlyData[m]) monthlyData[m].laba -= b.nominal; });
    const labaRugiBody = document.getElementById('labaRugiBody');
    if (labaRugiBody) labaRugiBody.innerHTML = Object.keys(monthlyData).sort().reverse().map(m => `<tr><td>${m}</td><td>Rp ${monthlyData[m].omzet.toLocaleString()}</td><td>Rp ${monthlyData[m].hpp.toLocaleString()}</td><td>Rp ${(monthlyData[m].omzet - monthlyData[m].hpp).toLocaleString()}</td><td>Rp ${monthlyData[m].laba.toLocaleString()}</td></tr>`).join('');
    
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
    const totalOmzet = getTotalOmzet(), totalUnit = penjualanData.reduce((s,p) => s + p.jumlah, 0);
    const productStats = {};
    penjualanData.forEach(p => { if (!productStats[p.produk]) productStats[p.produk] = { unit:0, omzet:0 }; productStats[p.produk].unit += p.jumlah; productStats[p.produk].omzet += p.jumlah * p.harga_jual; });
    const productList = Object.entries(productStats).map(([name, data]) => ({ name, unit: data.unit, omzet: data.omzet, share: totalOmzet > 0 ? (data.omzet / totalOmzet) * 100 : 0 })).sort((a,b) => b.omzet - a.omzet);
    const top5 = productList.slice(0,5), bottom5 = productList.slice(-5).reverse();
    const topProduct = top5[0], slowProduct = bottom5[0];
    const uniqueProducts = productList.length, activeMarketplaces = new Set(penjualanData.map(p => p.marketplace)).size;
    let score = (totalOmzet > 0 ? 30 : 0) + (uniqueProducts >= 3 ? 20 : uniqueProducts >= 1 ? 10 : 0) + (activeMarketplaces >= 2 ? 20 : activeMarketplaces >= 1 ? 10 : 0) + (topProduct && topProduct.share < 60 ? 15 : topProduct ? 5 : 0) + (totalUnit >= 10 ? 15 : totalUnit >= 1 ? 5 : 0);
    const el = (id) => document.getElementById(id);
    if (el('businessScore')) el('businessScore').innerText = score;
    if (el('businessStatus')) { el('businessStatus').innerText = score >= 70 ? 'Sehat' : (score >= 40 ? 'Perlu Perbaikan' : 'Kritis'); el('businessStatus').style.color = score >= 70 ? '#2e7d32' : (score >= 40 ? '#e65100' : '#c62828'); }
    if (el('topProduct')) el('topProduct').innerText = topProduct ? topProduct.name : '-';
    if (el('slowProduct')) el('slowProduct').innerText = slowProduct ? slowProduct.name : '-';
    if (el('topProductsTable')) el('topProductsTable').innerHTML = top5.length ? top5.map(p => `<td><td style="font-weight:500;">${p.name}</td><td>${p.unit} unit</td><td>Rp ${p.omzet.toLocaleString()}</td><td>${p.share.toFixed(1)}%</td></tr>`).join('') : '<tr><td colspan="4" class="text-center">Belum ada data</td></tr>';
    if (el('bottomProductsTable')) el('bottomProductsTable').innerHTML = bottom5.length ? bottom5.map(p => `<td><td style="font-weight:500;">${p.name}</td><td>${p.unit} unit</td><td>Rp ${p.omzet.toLocaleString()}</td><td>${p.share.toFixed(1)}%</td></tr>`).join('') : '<tr><td colspan="4" class="text-center">Belum ada数据</td></tr>';
    
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
    
    const recommendations = [];
    if (topProduct && topProduct.share > 50) recommendations.push(`Produk "${topProduct.name}" mendominasi ${topProduct.share.toFixed(1)}% omzet. Fokus pada produk ini.`);
    if (slowProduct && slowProduct.omzet > 0 && slowProduct.share < 5) recommendations.push(`Produk "${slowProduct.name}" hanya berkontribusi ${slowProduct.share.toFixed(1)}% omzet. Evaluasi produk ini.`);
    if (totalUnit < 10) recommendations.push('Volume penjualan masih rendah. Coba program diskon atau bundling produk.');
    if (recommendations.length === 0) recommendations.push('Terus pantau data penjualan untuk mendapatkan rekomendasi.');
    if (el('recommendationList')) el('recommendationList').innerHTML = recommendations.map(rec => `<div class="recommendation-item">${rec}</div>`).join('');
    
    const savedPlan = localStorage.getItem('actionPlan') || '';
    if (el('actionPlan')) el('actionPlan').value = savedPlan;
    
    const totalTop5 = top5.reduce((s,p) => s + p.omzet, 0);
    const distCanvas = document.getElementById('distributionChart');
    if (distCanvas) { const ctx = distCanvas.getContext('2d'); if (window.distChart) window.distChart.destroy(); window.distChart = new Chart(ctx, { type: 'doughnut', data: { labels: [...top5.map(p => p.name), 'Lainnya'], datasets: [{ data: [...top5.map(p => p.omzet), totalOmzet - totalTop5], backgroundColor: ['#1a1a2e', '#4a6cf7', '#f59f00', '#e03131', '#2e7d32', '#adb5bd'] }] }, options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } } }); }
    
    if (el('insight1')) el('insight1').innerText = uniqueProducts;
    if (el('insight2')) el('insight2').innerText = activeMarketplaces;
    if (el('insight3')) el('insight3').innerText = totalUnit > 0 ? `Rp ${Math.round(totalOmzet/totalUnit).toLocaleString()}` : 'Rp 0';
}

// ========== APPLY VIEWER RESTRICTIONS ==========
function applyViewerRestrictions() {
    if (!isViewer()) return;
    document.querySelectorAll('.btn-primary, .btn-delete, #btnTambah, #btnTambahStok, #simpanBiaya, #saveActionPlan').forEach(btn => { if (btn) btn.style.display = 'none'; });
    document.querySelectorAll('input, select, textarea').forEach(input => { input.disabled = true; input.style.backgroundColor = '#f8f9fa'; });
    if (!document.querySelector('.viewer-badge')) { const title = document.querySelector('.top-bar h1'); if (title) { const badge = document.createElement('span'); badge.className = 'viewer-badge'; badge.innerText = 'Mode Lihat'; badge.style.cssText = 'background:#f59f00; color:white; font-size:11px; padding:4px 12px; border-radius:40px; margin-left:14px;'; title.parentElement.insertBefore(badge, title.nextSibling); } }
}

// ========== TAMBAH DATA ==========
if (document.getElementById('btnTambah')) {
    const modal = document.getElementById('modalTambah'), btn = document.getElementById('btnTambah'), close = document.querySelector('#modalTambah .close');
    if (btn) btn.onclick = () => { if (isAdmin()) modal.style.display = 'block'; else alert('Mode viewer tidak dapat menambah data'); };
    if (close) close.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    document.getElementById('formPenjualan')?.addEventListener('submit', async (e) => { e.preventDefault(); if (isViewer()) { alert('Mode viewer tidak dapat menambah data'); modal.style.display = 'none'; return; } await supabase.from('penjualan').insert([{ tanggal: document.getElementById('tgl').value, marketplace: document.getElementById('mp').value, produk: document.getElementById('produk').value, jumlah: parseInt(document.getElementById('jumlah').value) || 0, harga_jual: parseInt(document.getElementById('harga').value) || 0, hpp: parseInt(document.getElementById('hpp').value) || 0, status: document.getElementById('status').value }]); await loadAllData(); modal.style.display = 'none'; e.target.reset(); alert('Data tersimpan!'); });
}

if (document.getElementById('btnTambahStok')) {
    const modal = document.getElementById('modalStok'), btn = document.getElementById('btnTambahStok'), close = document.querySelector('#modalStok .close-stok');
    if (btn) btn.onclick = () => { if (isAdmin()) modal.style.display = 'block'; else alert('Mode viewer tidak dapat menambah data'); };
    if (close) close.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    document.getElementById('formStok')?.addEventListener('submit', async (e) => { e.preventDefault(); if (isViewer()) { alert('Mode viewer tidak dapat menambah data'); modal.style.display = 'none'; return; } await supabase.from('stok').insert([{ produk: document.getElementById('namaProduk').value, stok_awal: parseInt(document.getElementById('stokAwal').value) || 0, stok_masuk: parseInt(document.getElementById('stokMasuk').value) || 0, hpp_terakhir: parseInt(document.getElementById('hppStok').value) || 0, minimum_stok: parseInt(document.getElementById('minimumStok').value) || 10 }]); await loadAllData(); modal.style.display = 'none'; e.target.reset(); alert('Stok tersimpan!'); });
}

if (document.getElementById('simpanBiaya')) document.getElementById('simpanBiaya').addEventListener('click', async () => { if (isViewer()) { alert('Mode viewer tidak dapat mengedit biaya'); return; } await supabase.from('biaya_operasional').insert([{ tanggal: new Date().toISOString().split('T')[0], jenis: 'Biaya Iklan', nominal: parseInt(document.getElementById('biayaIklan').value) || 0 }, { tanggal: new Date().toISOString().split('T')[0], jenis: 'Fee Marketplace', nominal: parseInt(document.getElementById('feeMarketplace').value) || 0 }, { tanggal: new Date().toISOString().split('T')[0], jenis: 'Biaya Pengiriman', nominal: parseInt(document.getElementById('ongkir').value) || 0 }, { tanggal: new Date().toISOString().split('T')[0], jenis: 'Biaya Lainnya', nominal: parseInt(document.getElementById('lainLain').value) || 0 }]); await loadAllData(); alert('Biaya tersimpan!'); });

if (document.getElementById('saveActionPlan')) document.getElementById('saveActionPlan').addEventListener('click', () => { if (isViewer()) { alert('Mode viewer tidak dapat mengedit rencana'); return; } localStorage.setItem('actionPlan', document.getElementById('actionPlan').value); const hint = document.getElementById('saveHint'); if (hint) { hint.innerText = 'Tersimpan!'; setTimeout(() => hint.innerText = '', 2000); } });

// ========== EXPORT EXCEL ==========
const exportBtn = document.getElementById('btnExport');
if (exportBtn) exportBtn.addEventListener('click', () => { if (isViewer()) { alert('Mode viewer tidak dapat export'); return; } if (!penjualanData.length) { alert('Tidak ada data'); return; } let csv = "Tanggal,Marketplace,Produk,Jumlah,Harga,Total,Status\n"; penjualanData.forEach(p => { csv += `"${p.tanggal}","${p.marketplace}","${p.produk}",${p.jumlah},${p.harga_jual},${p.jumlah * p.harga_jual},"${p.status}"\n`; }); const blob = new Blob([csv], { type: 'text/csv' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `penjualan_${new Date().toISOString().slice(0,10)}.csv`; link.click(); alert(`Export ${penjualanData.length} data!`); });

// ========== SEARCH & FILTER ==========
if (document.getElementById('searchInput')) { document.getElementById('searchInput')?.addEventListener('keyup', () => renderPenjualan()); document.getElementById('filterMarketplace')?.addEventListener('change', () => renderPenjualan()); }
if (document.getElementById('searchStok')) document.getElementById('searchStok')?.addEventListener('keyup', () => renderStok());

// ========== LOGIN SYSTEM ==========
if (document.getElementById('loginForm')) {
    const roleBtns = document.querySelectorAll('.role-btn'), adminInfo = document.getElementById('adminInfo'), viewerInfo = document.getElementById('viewerInfo'), emailInput = document.getElementById('email'), passwordInput = document.getElementById('password');
    roleBtns.forEach(btn => btn.addEventListener('click', () => { roleBtns.forEach(b => b.classList.remove('active')); btn.classList.add('active'); if (btn.getAttribute('data-role') === 'admin') { adminInfo.classList.remove('hidden'); viewerInfo.classList.add('hidden'); if (emailInput) emailInput.value = 'cylla@store'; if (passwordInput) passwordInput.value = ''; } else { adminInfo.classList.add('hidden'); viewerInfo.classList.remove('hidden'); if (emailInput) emailInput.value = 'agung@panca'; if (passwordInput) passwordInput.value = ''; } }));
    document.getElementById('loginForm').addEventListener('submit', (e) => { e.preventDefault(); const email = document.getElementById('email').value, password = document.getElementById('password').value; if (email === 'cylla@store' && password === 'cylla123') { localStorage.setItem('isLoggedIn', 'true'); localStorage.setItem('userRole', 'admin'); window.location.href = 'dashboard.html'; } else if (email === 'agung@panca' && password === 'pancagung') { localStorage.setItem('isLoggedIn', 'true'); localStorage.setItem('userRole', 'viewer'); window.location.href = 'dashboard.html'; } else alert('Email atau password salah!'); });
}

// ========== INITIAL RENDER ==========
setTimeout(() => { if (!window.location.href.includes('login.html')) { loadAllData(); setTimeout(applyViewerRestrictions, 500); } }, 100);
