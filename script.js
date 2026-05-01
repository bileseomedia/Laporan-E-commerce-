// ========== LOGIN SYSTEM ==========
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        if (email === 'admin@cylla.store' && password === '123') {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userRole', 'admin');
            window.location.href = 'dashboard.html';
        } else {
            alert('Email atau password salah! Gunakan: admin@cylla.store / 123');
        }
    });
}

// Cek login di semua halaman (kecuali login.html)
if (!window.location.href.includes('login.html') && !window.location.href.includes('index.html')) {
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'login.html';
    }
}

// ========== DATA PENJUALAN (localStorage) ==========
let penjualanData = JSON.parse(localStorage.getItem('penjualanData')) || [];

function savePenjualan() {
    localStorage.setItem('penjualanData', JSON.stringify(penjualanData));
}

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
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Belum ada data. Klik "Tambah Data"</td></tr>';
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
            <td><button onclick="hapusPenjualan(${idx})" style="background:#dc3545;color:white;border:none;padding:5px10px;border-radius:5px;cursor:pointer;">Hapus</button></td>
        </tr>
    `).join('');
}

function hapusPenjualan(index) {
    if (confirm('Hapus data ini?')) {
        penjualanData.splice(index, 1);
        savePenjualan();
        renderPenjualan();
        updateDashboard();
        updateStrategi();
    }
}

// Modal Tambah Penjualan
if (document.getElementById('btnTambah')) {
    const modal = document.getElementById('modalTambah');
    const btn = document.getElementById('btnTambah');
    const close = document.querySelector('.close');
    
    btn.onclick = () => modal.style.display = 'block';
    if (close) close.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    
    document.getElementById('formPenjualan')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const newData = {
            tanggal: document.getElementById('tgl').value,
            marketplace: document.getElementById('mp').value,
            produk: document.getElementById('produk').value,
            jumlah: parseInt(document.getElementById('jumlah').value) || 0,
            harga: parseInt(document.getElementById('harga').value) || 0,
            status: document.getElementById('status').value
        };
        penjualanData.push(newData);
        savePenjualan();
        renderPenjualan();
        updateDashboard();
        updateStok();
        updateKeuangan();
        updateStrategi();
        modal.style.display = 'none';
        this.reset();
        alert('Data tersimpan!');
    });
}

// ========== DATA STOK ==========
let stokData = JSON.parse(localStorage.getItem('stokData')) || [];

function saveStok() {
    localStorage.setItem('stokData', JSON.stringify(stokData));
}

function renderStok() {
    const tbody = document.getElementById('stokBody');
    if (!tbody) return;
    
    const search = document.getElementById('searchStok')?.value.toLowerCase() || '';
    const filtered = stokData.filter(item => item.nama.toLowerCase().includes(search));
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Belum ada data stok</td></tr>';
        document.getElementById('habisBody').innerHTML = '<tr><td colspan="2" class="text-center">-</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map((item, idx) => {
        const sisa = (item.stokAwal || 0) + (item.stokMasuk || 0) - (item.terjual || 0);
        const status = sisa <= 0 ? '❌ Habis' : (sisa < 10 ? '⚠️ Menipis' : '✅ Aman');
        return `
            <tr>
                <td>${item.nama}</td>
                <td>${item.stokAwal || 0}</td>
                <td>${item.stokMasuk || 0}</td>
                <td>${item.terjual || 0}</td>
                <td>${sisa}</td>
                <td>${status}</td>
                <td><button onclick="hapusStok(${idx})" style="background:#dc3545;color:white;border:none;padding:5px10px;border-radius:5px;cursor:pointer;">Hapus</button></td>
            </tr>
        `;
    }).join('');
    
    const habis = stokData.filter(item => {
        const sisa = (item.stokAwal || 0) + (item.stokMasuk || 0) - (item.terjual || 0);
        return sisa <= 0;
    });
    
    document.getElementById('habisBody').innerHTML = habis.length === 0 ? 
        '<tr><td colspan="2" class="text-center">Tidak ada produk habis</td></tr>' :
        habis.map(item => `<tr><td>${item.nama}</td><td>0</td></tr>`).join('');
}

function hapusStok(index) {
    if (confirm('Hapus produk ini?')) {
        stokData.splice(index, 1);
        saveStok();
        renderStok();
    }
}

// Modal Stok
if (document.getElementById('btnTambahStok')) {
    const modal = document.getElementById('modalStok');
    const btn = document.getElementById('btnTambahStok');
    const close = document.querySelector('.close-stok');
    
    btn.onclick = () => modal.style.display = 'block';
    if (close) close.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    
    document.getElementById('formStok')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const newStok = {
            nama: document.getElementById('namaProduk').value,
            stokAwal: parseInt(document.getElementById('stokAwal').value) || 0,
            stokMasuk: parseInt(document.getElementById('stokMasuk').value) || 0,
            terjual: parseInt(document.getElementById('terjual').value) || 0
        };
        stokData.push(newStok);
        saveStok();
        renderStok();
        modal.style.display = 'none';
        this.reset();
        alert('Stok tersimpan!');
    });
}

// ========== DASHBOARD UPDATE ==========
function updateDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = penjualanData.filter(p => p.tanggal === today).reduce((sum, p) => sum + (p.jumlah * p.harga), 0);
    const totalOrder = penjualanData.length;
    const totalProdukTerjual = penjualanData.reduce((sum, p) => sum + p.jumlah, 0);
    
    document.querySelectorAll('.kpi-value').forEach(el => {
        if (el.closest('.kpi-card')?.querySelector('h3')?.innerText === 'Omzet Hari Ini') el.innerText = `Rp ${todaySales.toLocaleString()}`;
        if (el.closest('.kpi-card')?.querySelector('h3')?.innerText === 'Total Order') el.innerText = totalOrder;
        if (el.closest('.kpi-card')?.querySelector('h3')?.innerText === 'Produk Terjual') el.innerText = totalProdukTerjual;
    });
    
    // Marketplace summary
    const mpData = { Shopee: 0, Tokopedia: 0, 'TikTok Shop': 0 };
    penjualanData.forEach(p => { if (mpData[p.marketplace] !== undefined) mpData[p.marketplace] += p.jumlah * p.harga; });
    
    const mpRows = document.querySelectorAll('.card table tbody tr');
    if (mpRows.length >= 3) {
        mpRows[0].cells[1].innerText = `Rp ${mpData.Shopee.toLocaleString()}`;
        mpRows[1].cells[1].innerText = `Rp ${mpData.Tokopedia.toLocaleString()}`;
        mpRows[2].cells[1].innerText = `Rp ${mpData['TikTok Shop'].toLocaleString()}`;
    }
    
    // Top products
    const productSales = {};
    penjualanData.forEach(p => { productSales[p.produk] = (productSales[p.produk] || 0) + (p.jumlah * p.harga); });
    const top5 = Object.entries(productSales).sort((a,b) => b[1] - a[1]).slice(0,5);
    const topRows = document.querySelectorAll('.two-columns .card:first-child table tbody tr');
    topRows.forEach((row, i) => {
        if (top5[i]) { row.cells[0].innerText = top5[i][0]; row.cells[1].innerText = '0'; row.cells[2].innerText = `Rp ${top5[i][1].toLocaleString()}`; }
        else { row.cells[0].innerText = '-'; row.cells[1].innerText = '0'; row.cells[2].innerText = 'Rp 0'; }
    });
}

// ========== UPDATE STOK DARI PENJUALAN ==========
function updateStok() {
    const productSold = {};
    penjualanData.forEach(p => { productSold[p.produk] = (productSold[p.produk] || 0) + p.jumlah; });
    
    stokData.forEach(item => {
        item.terjual = productSold[item.nama] || 0;
    });
    saveStok();
    renderStok();
}

// ========== KEUANGAN ==========
let biayaOp = JSON.parse(localStorage.getItem('biayaOp')) || { iklan: 0, fee: 0, ongkir: 0, lain: 0 };

function updateKeuangan() {
    const totalOmzet = penjualanData.reduce((sum, p) => sum + (p.jumlah * p.harga), 0);
    const totalHPP = 0; // Bisa ditambah nanti
    const labaKotor = totalOmzet - totalHPP;
    const totalBiaya = (biayaOp.iklan || 0) + (biayaOp.fee || 0) + (biayaOp.ongkir || 0) + (biayaOp.lain || 0);
    const labaBersih = labaKotor - totalBiaya;
    
    const keuanganCards = document.querySelectorAll('.kpi-card');
    keuanganCards.forEach(card => {
        const title = card.querySelector('h3')?.innerText;
        if (title === 'Omzet') card.querySelector('.kpi-value').innerText = `Rp ${totalOmzet.toLocaleString()}`;
        if (title === 'HPP Total') card.querySelector('.kpi-value').innerText = `Rp ${totalHPP.toLocaleString()}`;
        if (title === 'Laba Kotor') card.querySelector('.kpi-value').innerText = `Rp ${labaKotor.toLocaleString()}`;
        if (title === 'Biaya Operasional') card.querySelector('.kpi-value').innerText = `Rp ${totalBiaya.toLocaleString()}`;
        if (title === 'Laba Bersih') card.querySelector('.kpi-value').innerText = `Rp ${labaBersih.toLocaleString()}`;
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

// ========== STRATEGI ==========
function updateStrategi() {
    const productSales = {};
    penjualanData.forEach(p => { productSales[p.produk] = (productSales[p.produk] || 0) + p.jumlah; });
    
    const top5 = Object.entries(productSales).sort((a,b) => b[1] - a[1]).slice(0,5);
    const bottom5 = Object.entries(productSales).sort((a,b) => a[1] - b[1]).slice(0,5);
    
    const topBody = document.getElementById('topProdukBody');
    if (topBody) {
        topBody.innerHTML = top5.length === 0 ? '<tr><td colspan="3">Belum ada data</td></tr>' :
            top5.map(p => `<tr><td>${p[0]}</td><td>${p[1]}</td><td>Rp ${(p[1] * 0).toLocaleString()}</td></tr>`).join('');
    }
    
    const bottomBody = document.getElementById('bottomProdukBody');
    if (bottomBody) {
        bottomBody.innerHTML = bottom5.length === 0 ? '<tr><td colspan="3">Belum ada data</td></tr>' :
            bottom5.map(p => `<tr><td>${p[0]}</td><td>${p[1]}</td><td>Rp ${(p[1] * 0).toLocaleString()}</td></tr>`).join('');
    }
    
    const rekomendasi = document.getElementById('rekomendasiList');
    if (rekomendasi && top5.length > 0) {
        rekomendasi.innerHTML = `
            <div class="rekomendasi-item">🔥 ${top5[0][0]} adalah produk terlaris! Pertahankan stok dan promosi!</div>
            ${bottom5[0] ? `<div class="rekomendasi-item">⚠️ ${bottom5[0][0]} kurang laris. Coba diskon atau bundling!</div>` : ''}
            <div class="rekomendasi-item">📊 Total ${penjualanData.length} transaksi tercatat. Terus semangat! 💪</div>
        `;
    }
}

// ========== SIMPAN CATATAN STRATEGI ==========
if (document.getElementById('simpanCatatan')) {
    const savedNote = localStorage.getItem('catatanStrategi') || '';
    if (document.getElementById('catatanStrategi')) {
        document.getElementById('catatanStrategi').value = savedNote;
    }
    document.getElementById('simpanCatatan').addEventListener('click', () => {
        const note = document.getElementById('catatanStrategi').value;
        localStorage.setItem('catatanStrategi', note);
        alert('Catatan tersimpan!');
    });
}

// ========== EXPORT EXCEL ==========
if (document.getElementById('btnExport')) {
    document.getElementById('btnExport').addEventListener('click', () => {
        let csv = 'Tanggal,Marketplace,Produk,Jumlah,Harga,Total,Status\n';
        penjualanData.forEach(p => {
            csv += `${p.tanggal},${p.marketplace},${p.produk},${p.jumlah},${p.harga},${p.jumlah * p.harga},${p.status}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'penjualan_cylla.csv';
        link.click();
    });
}

// ========== SEARCH & FILTER REAL-TIME ==========
if (document.getElementById('searchInput')) {
    document.getElementById('searchInput').addEventListener('keyup', () => renderPenjualan());
    document.getElementById('filterMarketplace')?.addEventListener('change', () => renderPenjualan());
}
if (document.getElementById('searchStok')) {
    document.getElementById('searchStok').addEventListener('keyup', () => renderStok());
}

// ========== INIT ALL ==========
renderPenjualan();
renderStok();
updateDashboard();
updateStok();
updateKeuangan();
updateStrategi();
