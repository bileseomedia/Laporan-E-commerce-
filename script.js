// ========== KONFIGURASI SUPABASE ==========
const SUPABASE_URL = "https://inwmobbmpmqnvsxtqdev.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlud21vYmJtcG1xbnZzeHRxZGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NjQ1MzMsImV4cCI6MjA5MzU0MDUzM30.BIiavatJdfyR6HJqKEKUXps5eHP7zbaQK8_aHJho5T8";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========== DATA GLOBAL ==========
let penjualanData = [];
let stokData = [];
let biayaData = [];
let isLoading = false;

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
function updateDate() {
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        const today = new Date();
        dateEl.innerText = today.toLocaleDateString('id-ID', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });
    }
}
updateDate();

// ========== LOAD DATA DARI SUPABASE ==========
async function loadAllData() {
    if (isLoading) return;
    isLoading = true;
    
    console.log("Loading data from Supabase...");
    
    try {
        // Load penjualan
        const { data: penjualan, error: err1 } = await supabase
            .from('penjualan')
            .select('*')
            .order('tanggal', { ascending: false });
        
        if (err1) {
            console.error("Error penjualan:", err1);
        } else if (penjualan) {
            penjualanData = penjualan;
            console.log("Penjualan loaded:", penjualanData.length);
        }
        
        // Load stok
        const { data: stok, error: err2 } = await supabase
            .from('stok')
            .select('*')
            .order('produk');
        
        if (err2) {
            console.error("Error stok:", err2);
        } else if (stok) {
            stokData = stok;
            console.log("Stok loaded:", stokData.length);
        }
        
        // Load biaya
        const { data: biaya, error: err3 } = await supabase
            .from('biaya_operasional')
            .select('*');
        
        if (err3) {
            console.error("Error biaya:", err3);
        } else if (biaya) {
            biayaData = biaya;
            console.log("Biaya loaded:", biayaData.length);
        }
        
        // Load target
        const now = new Date();
        const { data: target, error: err4 } = await supabase
            .from('target_bisnis')
            .select('*')
            .eq('tahun', now.getFullYear())
            .eq('bulan', now.getMonth() + 1)
            .maybeSingle();
        
        if (err4) {
            console.error("Error target:", err4);
        }
        
    } catch (error) {
        console.error("Error loading data:", error);
    }
    
    isLoading = false;
    
    // Refresh semua tampilan
    renderDashboard();
    renderPenjualan();
    renderStok();
    renderKeuangan();
    renderStrategi();
    applyViewerRestrictions();
    
    console.log("All data loaded and rendered");
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
        el('trendStatus').innerHTML = trend > 0 ? `+${trend.toFixed(1)}% ↑` : (trend < 0 ? `${trend.toFixed(1)}% ↓` : '0% →');
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
        if (top5.length === 0) {
            el('topProdukList').innerHTML = '<tr><td colspan="2" class="text-center">Belum ada数据</td></tr>';
        } else {
            el('topProdukList').innerHTML = top5.map(p => `<tr><td style="font-weight:500;">${p[0]}</td><td style="text-align:right;">Rp ${p[1].toLocaleString()}</td></tr>`).join('');
        }
    }
    
    const alertList = stokData.filter(item => { let sisa = (item.stok_awal || 0) + (item.stok_masuk || 0) - (item.stok_keluar || 0); return sisa <= 0 || sisa < 10; }).map(item => `${item.produk} - Stok ${((item.stok_awal||0)+(item.stok_masuk||0)-(item.stok_keluar||0)) <= 0 ? 'Habis' : 'Menipis'}`);
    if (el('alertStokList')) {
        if (alertList.length === 0) {
            el('alertStokList').innerHTML = '<div class="empty-alert">Tidak ada peringatan stok</div>';
        } else {
            el('alertStokList').innerHTML = alertList.map(a => `<div class="alert-item">${a}</div>`).join('');
        }
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
        data: { 
            labels: data.map(d => d.date.slice(5)), 
            datasets: [{ 
                label: 'Omzet', 
                data: data.map(d => d.omzet), 
                borderColor: '#1a1a2e', 
                fill: true, 
                tension: 0.3 
            }] 
        }, 
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
        data: { 
            labels: ['Shopee', 'Tokopedia', 'TikTok Shop'], 
            datasets: [{ 
                data: [mp.Shopee.omzet, mp.Tokopedia.omzet, mp['TikTok Shop'].omzet], 
                backgroundColor: ['#1a1a2e', '#4a6cf7', '#f59f00'] 
            }] 
        }, 
        options: { responsive: true } 
    });
}

// ========== RENDER PENJUALAN ==========
function renderPenjualan() {
    const tbody = document.getElementById('penjualanBody');
    if (!tbody) return;
    
    if (penjualanData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Belum ada data penjualan</td></tr>';
        return;
    }
    
    tbody.innerHTML = penjualanData.map(item => `
        <tr>
            <td>${item.tanggal}</td>
            <td>${item.marketplace}</td>
            <td style="font-weight:500;">${item.produk}</td>
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
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Belum ada data stok</td></tr>';
        return;
    }
    
    tbody.innerHTML = stokData.map(item => { 
        let sisa = (item.stok_awal || 0) + (item.stok_masuk || 0) - (item.stok_keluar || 0); 
        let status = sisa <= 0 ? 'Habis' : (sisa < 10 ? 'Menipis' : 'Aman'); 
        return `<tr>
            <td style="font-weight:500;">${item.produk}</td>
            <td>${item.stok_awal || 0}</td>
            <td>${item.stok_masuk || 0}</td>
            <td>${item.stok_keluar || 0}</td>
            <td style="font-weight:bold;">${sisa}</td>
            <td>${status}</td>
        </tr>`;
    }).join('');
    
    let habis = stokData.filter(item => { 
        let sisa = (item.stok_awal || 0) + (item.stok_masuk || 0) - (item.stok_keluar || 0); 
        return sisa <= 0; 
    });
    let habisBody = document.getElementById('habisBody');
    if (habisBody) {
        if (habis.length === 0) {
            habisBody.innerHTML = '<tr><td colspan="2" class="text-center">Tidak ada produk habis</td></tr>';
        } else {
            habisBody.innerHTML = habis.map(item => `<tr><td>${item.produk}</td><td>0</td></tr>`).join('');
        }
    }
}

// ========== RENDER KEUANGAN ==========
function renderKeuangan() {
    let totalOmzet = getTotalOmzet();
    let totalBiaya = getTotalBiaya();
    let labaBersih = getLabaBersih();
    let totalTransaksi = penjualanData.length;
    let avgTransaksi = totalTransaksi > 0 ? totalOmzet / totalTransaksi : 0;
    let margin = totalOmzet > 0 ? (labaBersih / totalOmzet) * 100 : 0;
    
    const el = (id) => document.getElementById(id);
    if (el('totalOmzetKeu')) el('totalOmzetKeu').innerText = `Rp ${totalOmzet.toLocaleString()}`;
    if (el('totalBiayaKeu')) el('totalBiayaKeu').innerText = `Rp ${totalBiaya.toLocaleString()}`;
    if (el('labaBersihKeu')) el('labaBersihKeu').innerText = `Rp ${labaBersih.toLocaleString()}`;
    if (el('summaryTotal')) el('summaryTotal').innerText = `Rp ${totalBiaya.toLocaleString()}`;
    if (el('avgTransaction')) el('avgTransaction').innerText = `Rp ${avgTransaksi.toLocaleString()}`;
    if (el('marginProfit')) el('marginProfit').innerText = `${margin.toFixed(1)}%`;
    if (el('totalTransaksi')) el('totalTransaksi').innerText = totalTransaksi;
    
    let profitCanvas = document.getElementById('profitChart');
    if (profitCanvas) { 
        if (window.profitChart) window.profitChart.destroy(); 
        window.profitChart = new Chart(profitCanvas.getContext('2d'), { 
            type: 'bar', 
            data: { 
                labels: ['Pendapatan', 'Biaya', 'Laba Bersih'], 
                datasets: [{ 
                    data: [totalOmzet, totalBiaya, labaBersih], 
                    backgroundColor: ['#1a1a2e', '#e03131', '#2e7d32'] 
                }] 
            }, 
            options: { responsive: true, plugins: { legend: { display: false } } } 
        }); 
    }
}

// ========== RENDER STRATEGI ==========
function renderStrategi() {
    let totalOmzet = getTotalOmzet();
    let totalUnit = penjualanData.reduce((s,p) => s + p.jumlah, 0);
    
    const productStats = {};
    penjualanData.forEach(p => { 
        if (!productStats[p.produk]) productStats[p.produk] = { unit:0, omzet:0 }; 
        productStats[p.produk].unit += p.jumlah; 
        productStats[p.produk].omzet += p.jumlah * p.harga_jual; 
    });
    
    const productList = Object.entries(productStats).map(([name, data]) => ({ 
        name, unit: data.unit, omzet: data.omzet, 
        share: totalOmzet > 0 ? (data.omzet / totalOmzet) * 100 : 0 
    })).sort((a,b) => b.omzet - a.omzet);
    
    const top5 = productList.slice(0,5);
    const bottom5 = productList.slice(-5).reverse();
    const topProduct = top5[0];
    const slowProduct = bottom5[0];
    const uniqueProducts = productList.length;
    const activeMarketplaces = new Set(penjualanData.map(p => p.marketplace)).size;
    
    let score = (totalOmzet > 0 ? 30 : 0) + 
                (uniqueProducts >= 3 ? 20 : uniqueProducts >= 1 ? 10 : 0) + 
                (activeMarketplaces >= 2 ? 20 : activeMarketplaces >= 1 ? 10 : 0) + 
                (topProduct && topProduct.share < 60 ? 15 : topProduct ? 5 : 0) + 
                (totalUnit >= 10 ? 15 : totalUnit >= 1 ? 5 : 0);
    
    const el = (id) => document.getElementById(id);
    if (el('businessScore')) el('businessScore').innerText = score;
    if (el('businessStatus')) el('businessStatus').innerText = score >= 70 ? 'Sehat' : (score >= 40 ? 'Perlu Perbaikan' : 'Kritis');
    if (el('topProduct')) el('topProduct').innerText = topProduct ? topProduct.name : '-';
    if (el('slowProduct')) el('slowProduct').innerText = slowProduct ? slowProduct.name : '-';
    
    if (el('topProductsTable')) {
        if (top5.length === 0) {
            el('topProductsTable').innerHTML = '<tr><td colspan="4" class="text-center">Belum ada数据</td></tr>';
        } else {
            el('topProductsTable').innerHTML = top5.map(p => `<tr><td style="font-weight:500;">${p.name}</td><td>${p.unit} unit</td><td>Rp ${p.omzet.toLocaleString()}</td><td>${p.share.toFixed(1)}%</td></tr>`).join('');
        }
    }
    
    if (el('bottomProductsTable')) {
        if (bottom5.length === 0) {
            el('bottomProductsTable').innerHTML = '<tr><td colspan="4" class="text-center">Belum ada数据</td></tr>';
        } else {
            el('bottomProductsTable').innerHTML = bottom5.map(p => `<tr><td style="font-weight:500;">${p.name}</td><td>${p.unit} unit</td><td>Rp ${p.omzet.toLocaleString()}</td><td>${p.share.toFixed(1)}%</td></tr>`).join('');
        }
    }
    
    const mpStats = { Shopee: { omzet:0, order:0 }, Tokopedia: { omzet:0, order:0 }, 'TikTok Shop': { omzet:0, order:0 } };
    penjualanData.forEach(p => { if (mpStats[p.marketplace]) { mpStats[p.marketplace].omzet += p.jumlah * p.harga_jual; mpStats[p.marketplace].order++; } });
    const bestMp = Object.entries(mpStats).sort((a,b) => b[1].omzet - a[1].omzet)[0];
    
    if (el('shopeeOmzet')) el('shopeeOmzet').innerText = `Rp ${mpStats.Shopee.omzet.toLocaleString()}`;
    if (el('shopeeOrder')) el('shopeeOrder').innerText = mpStats.Shopee.order;
    if (el('shopeeRec')) el('shopeeRec').innerHTML = bestMp && bestMp[0] === 'Shopee' ? '✓ Marketplace terbaik' : 'Perlu ditingkatkan';
    if (el('tokopediaOmzet')) el('tokopediaOmzet').innerText = `Rp ${mpStats.Tokopedia.omzet.toLocaleString()}`;
    if (el('tokopediaOrder')) el('tokopediaOrder').innerText = mpStats.Tokopedia.order;
    if (el('tokopediaRec')) el('tokopediaRec').innerHTML = bestMp && bestMp[0] === 'Tokopedia' ? '✓ Marketplace terbaik' : 'Perlu ditingkatkan';
    if (el('tiktokOmzet')) el('tiktokOmzet').innerText = `Rp ${mpStats['TikTok Shop'].omzet.toLocaleString()}`;
    if (el('tiktokOrder')) el('tiktokOrder').innerText = mpStats['TikTok Shop'].order;
    if (el('tiktokRec')) el('tiktokRec').innerHTML = bestMp && bestMp[0] === 'TikTok Shop' ? '✓ Marketplace terbaik' : 'Perlu ditingkatkan';
    
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
    if (distCanvas) { 
        if (window.distChart) window.distChart.destroy(); 
        window.distChart = new Chart(distCanvas.getContext('2d'), { 
            type: 'doughnut', 
            data: { 
                labels: [...top5.map(p => p.name), 'Lainnya'], 
                datasets: [{ 
                    data: [...top5.map(p => p.omzet), totalOmzet - totalTop5], 
                    backgroundColor: ['#1a1a2e', '#4a6cf7', '#f59f00', '#e03131', '#2e7d32', '#adb5bd'] 
                }] 
            }, 
            options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } } 
        }); 
    }
    
    if (el('insight1')) el('insight1').innerText = uniqueProducts;
    if (el('insight2')) el('insight2').innerText = activeMarketplaces;
    if (el('insight3')) el('insight3').innerText = totalUnit > 0 ? `Rp ${Math.round(totalOmzet/totalUnit).toLocaleString()}` : 'Rp 0';
}

// ========== VIEWER RESTRICTIONS ==========
function applyViewerRestrictions() {
    if (!isViewer()) return;
    document.querySelectorAll('.btn-primary, .btn-delete, #btnTambah, #btnTambahStok, #simpanBiaya, #saveActionPlan').forEach(btn => { if (btn) btn.style.display = 'none'; });
    document.querySelectorAll('input, select, textarea').forEach(input => { input.disabled = true; input.style.backgroundColor = '#f8f9fa'; });
}

// ========== TAMBAH DATA PENJUALAN ==========
if (document.getElementById('btnTambah')) {
    const modal = document.getElementById('modalTambah');
    const btn = document.getElementById('btnTambah');
    const close = document.querySelector('#modalTambah .close');
    
    if (btn) {
        btn.onclick = () => { 
            if (isAdmin()) modal.style.display = 'block'; 
            else alert('Mode viewer tidak dapat menambah data'); 
        };
    }
    if (close) close.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    
    document.getElementById('formPenjualan')?.addEventListener('submit', async (e) => { 
        e.preventDefault(); 
        if (isViewer()) { 
            alert('Mode viewer tidak dapat menambah data'); 
            modal.style.display = 'none'; 
            return; 
        }
        
        const newData = {
            tanggal: document.getElementById('tgl').value,
            marketplace: document.getElementById('mp').value,
            produk: document.getElementById('produk').value,
            jumlah: parseInt(document.getElementById('jumlah').value) || 0,
            harga_jual: parseInt(document.getElementById('harga').value) || 0,
            status: document.getElementById('status').value
        };
        
        const { error } = await supabase.from('penjualan').insert([newData]);
        if (error) {
            alert('Gagal menyimpan: ' + error.message);
        } else {
            await loadAllData();
            modal.style.display = 'none';
            e.target.reset();
            alert('Data tersimpan!');
        }
    });
}

// ========== TAMBAH DATA STOK ==========
if (document.getElementById('btnTambahStok')) {
    const modal = document.getElementById('modalStok');
    const btn = document.getElementById('btnTambahStok');
    const close = document.querySelector('#modalStok .close-stok');
    
    if (btn) {
        btn.onclick = () => { 
            if (isAdmin()) modal.style.display = 'block'; 
            else alert('Mode viewer tidak dapat menambah data'); 
        };
    }
    if (close) close.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    
    document.getElementById('formStok')?.addEventListener('submit', async (e) => { 
        e.preventDefault(); 
        if (isViewer()) { 
            alert('Mode viewer tidak dapat menambah data'); 
            modal.style.display = 'none'; 
            return; 
        }
        
        const newData = {
            produk: document.getElementById('namaProduk').value,
            stok_awal: parseInt(document.getElementById('stokAwal').value) || 0,
            stok_masuk: parseInt(document.getElementById('stokMasuk').value) || 0,
            stok_keluar: 0
        };
        
        const { error } = await supabase.from('stok').insert([newData]);
        if (error) {
            alert('Gagal menyimpan: ' + error.message);
        } else {
            await loadAllData();
            modal.style.display = 'none';
            e.target.reset();
            alert('Stok tersimpan!');
        }
    });
}

// ========== SIMPAN BIAYA ==========
if (document.getElementById('simpanBiaya')) {
    document.getElementById('simpanBiaya').addEventListener('click', async () => {
        if (isViewer()) { 
            alert('Mode viewer tidak dapat mengedit biaya'); 
            return; 
        }
        
        const biayaList = [
            { jenis: 'Biaya Iklan', nominal: parseInt(document.getElementById('biayaIklan').value) || 0 },
            { jenis: 'Fee Marketplace', nominal: parseInt(document.getElementById('feeMarketplace').value) || 0 },
            { jenis: 'Biaya Pengiriman', nominal: parseInt(document.getElementById('ongkir').value) || 0 },
            { jenis: 'Biaya Lainnya', nominal: parseInt(document.getElementById('lainLain').value) || 0 }
        ];
        
        for (let b of biayaList) {
            const { error } = await supabase.from('biaya_operasional').insert([{
                tanggal: new Date().toISOString().split('T')[0],
                jenis: b.jenis,
                nominal: b.nominal
            }]);
            if (error) console.error('Error:', error);
        }
        
        await loadAllData();
        alert('Biaya tersimpan!');
    });
}

// ========== SIMPAN RENCANA TINDAKAN ==========
if (document.getElementById('saveActionPlan')) {
    document.getElementById('saveActionPlan').addEventListener('click', () => {
        if (isViewer()) { 
            alert('Mode viewer tidak dapat mengedit rencana'); 
            return; 
        }
        localStorage.setItem('actionPlan', document.getElementById('actionPlan').value);
        const hint = document.getElementById('saveHint');
        if (hint) { 
            hint.innerText = 'Tersimpan!'; 
            setTimeout(() => hint.innerText = '', 2000); 
        }
    });
}

// ========== EXPORT EXCEL ==========
if (document.getElementById('btnExport')) {
    document.getElementById('btnExport').addEventListener('click', () => {
        if (isViewer()) { 
            alert('Mode viewer tidak dapat export'); 
            return; 
        }
        if (!penjualanData.length) { 
            alert('Tidak ada data'); 
            return; 
        }
        
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
if (document.getElementById('searchStok')) {
    document.getElementById('searchStok')?.addEventListener('keyup', () => renderStok());
}

// ========== LOGIN SYSTEM ==========
if (document.getElementById('loginForm')) {
    const roleBtns = document.querySelectorAll('.role-btn');
    const adminInfo = document.getElementById('adminInfo');
    const viewerInfo = document.getElementById('viewerInfo');
    
    roleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            roleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (btn.getAttribute('data-role') === 'admin') {
                if (adminInfo) adminInfo.classList.remove('hidden');
                if (viewerInfo) viewerInfo.classList.add('hidden');
            } else {
                if (adminInfo) adminInfo.classList.add('hidden');
                if (viewerInfo) viewerInfo.classList.remove('hidden');
            }
        });
    });
    
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        if (email === 'cylla@store' && password === 'cylla123') {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userRole', 'admin');
            window.location.href = 'dashboard.html';
        } 
        else if (email === 'agung@panca' && password === 'pancagung') {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userRole', 'viewer');
            window.location.href = 'dashboard.html';
        }
        else {
            alert('Email atau password salah!');
        }
    });
}

// ========== INITIAL LOAD ==========
if (!window.location.href.includes('login.html')) {
    setTimeout(() => {
        loadAllData();
    }, 100);
}
