const API_URL = '/api';

const gameForm = document.getElementById('game-form');
const productForm = document.getElementById('product-form');
const catalogList = document.getElementById('catalog-list');
const loadBtn = document.getElementById('load-games');
const notificationArea = document.getElementById('notification-area');

// State
let allData = {};

const adminSecretInput = document.getElementById('admin-secret-input');

// Load saved secret
if (adminSecretInput) {
    adminSecretInput.value = localStorage.getItem('admin_secret') || '';
    adminSecretInput.addEventListener('input', (e) => {
        localStorage.setItem('admin_secret', e.target.value);
    });
}

function getAdminSecret() {
    return localStorage.getItem('admin_secret') || '';
}

function showNotification(message, type = 'success') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    notificationArea.appendChild(alert);
    setTimeout(() => alert.remove(), 5000);
}

function setLoading(btnId, isLoading, defaultText) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = isLoading;
    btn.innerHTML = isLoading ? `<span class="loading-spinner"></span> Processing...` : defaultText;
}

// Fetch initial data
async function fetchGames() {
    try {
        const response = await fetch(`${API_URL}/games`);
        const data = await response.json();
        
        if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
            allData = data;
        } else {
            console.error('Expected object of categories, got:', data);
            allData = {};
            if (data.error) {
                catalogList.innerHTML = `<div class="card shadow-sm" style="border-color: var(--danger); background: #fef2f2; grid-column: 1/-1;">
                    <h3 style="color: var(--danger); margin: 0;">Configuration Error</h3>
                    <p>${data.error}</p>
                    <p><small>${data.details || 'Check your environment variables (.env)'}</small></p>
                </div>`;
                return;
            }
        }
        
        renderCatalog();
        updateGameSelect();
    } catch (error) {
        console.error('Error fetching data:', error);
        catalogList.innerHTML = '<p style="text-align:center; grid-column: 1/-1; color: var(--danger);">Failed to connect to backend server.</p>';
    }
}

// Render the catalog
function renderCatalog() {
    catalogList.innerHTML = '';
    
    const categories = Object.keys(allData);
    
    if (categories.length === 0) {
        catalogList.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">No data found. Add some!</p>';
        return;
    }

    categories.forEach(categoryName => {
        // Category Header with Toggle
        const catHeader = document.createElement('h2');
        catHeader.className = 'category-title';
        catHeader.innerHTML = `<span>📁 ${categoryName}</span> <span class="toggle-icon">▼</span>`;
        
        const catContainer = document.createElement('div');
        catContainer.className = 'category-container';

        catHeader.onclick = () => {
            catContainer.classList.toggle('collapsed');
            catHeader.classList.toggle('collapsed');
        };

        catalogList.appendChild(catHeader);
        catalogList.appendChild(catContainer);

        const items = allData[categoryName];
        
        items.forEach(item => {
            const gameCard = document.createElement('div');
            gameCard.className = 'game-card shadow-sm';
            
            const productsHtml = item.products.length > 0 
                ? item.products.map(p => `
                    <div class="product-item">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            ${p.icon ? `<img src="${p.icon}" class="product-icon" alt="">` : ''}
                            <div>
                                <strong>${p.name}</strong>
                                <div class="price">Rp ${p.price.toLocaleString()}</div>
                            </div>
                        </div>
                        <span style="color: var(--success); font-weight: 500; font-size: 0.85rem;">Berhasil</span>
                    </div>
                `).join('')
                : '<p style="color: #94a3b8; font-style: italic;">No products added yet.</p>';

            gameCard.innerHTML = `
                <div class="game-header" onclick="this.nextElementSibling.classList.toggle('collapsed'); this.parentElement.classList.toggle('collapsed-card');">
                    <img src="${item.poster}" alt="${item.name}" class="game-poster" onerror="this.src='https://placehold.co/80x80?text=No+Image'">
                    <div class="game-info">
                        <h3>${item.name}</h3>
                        <span style="font-size: 0.8rem; color: var(--text-muted);">${item.products.length} Products</span>
                    </div>
                    <span class="toggle-icon">▼</span>
                </div>
                <div class="product-list collapsed">
                    <h4>Products</h4>
                    ${productsHtml}
                </div>
            `;
            catContainer.appendChild(gameCard);
        });
    });
}

// Update the dropdown for adding products
const gameSelectHidden = document.getElementById('game_id');
const selectTrigger = document.getElementById('item-select-trigger');
const selectDropdown = document.getElementById('item-select-dropdown');
const optionsList = document.getElementById('item-options-list');
const selectedLabel = document.getElementById('selected-item-label');
const fileInput = document.getElementById('poster');
const fileLabel = document.getElementById('file-label');
const iconInput = document.getElementById('product_icon');
const iconLabel = document.getElementById('icon-file-label');

// File Upload Area Logic
fileInput.addEventListener('change', (e) => {
    const fileName = e.target.files[0] ? e.target.files[0].name : 'Click to upload image';
    fileLabel.textContent = fileName;
});

iconInput.addEventListener('change', (e) => {
    const fileName = e.target.files[0] ? e.target.files[0].name : 'Click to upload icon';
    iconLabel.textContent = fileName;
});

// Form Switcher Logic
const switchBtns = document.querySelectorAll('.switch-btn');
const formSlider = document.getElementById('form-slider');

function switchTab(tab) {
    const btn = document.querySelector(`.switch-btn[data-tab="${tab}"]`);
    if (!btn) return;

    // Toggle Active Button
    switchBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Slide Track
    if (tab === 'item') {
        formSlider.style.transform = 'translateX(0)';
    } else {
        formSlider.style.transform = 'translateX(-50%)';
    }
}

switchBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        switchTab(tab);
    });
});

// Swipe & Drag Logic for Slider
let touchStartX = 0;
let touchEndX = 0;
let isMouseDown = false;

formSlider.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

formSlider.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
}, { passive: true });

// Mouse Drag Support
formSlider.addEventListener('mousedown', e => {
    touchStartX = e.screenX;
    isMouseDown = true;
    formSlider.style.cursor = 'grabbing';
});

window.addEventListener('mouseup', e => {
    if (!isMouseDown) return;
    touchEndX = e.screenX;
    isMouseDown = false;
    formSlider.style.cursor = 'grab';
    handleSwipe();
});

formSlider.style.cursor = 'grab';

function handleSwipe() {
    const swipeThreshold = 50; // pixels
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // Swiped/Dragged Left -> Show Product
            switchTab('product');
        } else {
            // Swiped/Dragged Right -> Show Item
            switchTab('item');
        }
    }
}

// Dropdown Logic
selectTrigger.addEventListener('click', () => {
    selectDropdown.classList.toggle('show');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('#item-select-wrapper')) {
        selectDropdown.classList.remove('show');
    }
});

function updateGameSelect() {
    optionsList.innerHTML = '';
    let foundCount = 0;
    
    Object.keys(allData).forEach(cat => {
        allData[cat].forEach(item => {
            const option = document.createElement('div');
            option.className = 'option-item';
            option.innerHTML = `
                <span class="cat-label">${cat}</span>
                <span class="item-label">${item.name}</span>
            `;
            option.onclick = () => {
                gameSelectHidden.value = item.id;
                selectedLabel.textContent = `[${cat}] ${item.name}`;
                selectDropdown.classList.remove('show');
            };
            optionsList.appendChild(option);
            foundCount++;
        });
    });

    if (foundCount === 0) {
        optionsList.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-muted);">No items found</div>';
    }
}

// Price Formatting Logic
const priceInput = document.getElementById('price');

priceInput.addEventListener('input', (e) => {
    const input = e.target;
    let value = input.value.replace(/[^0-9]/g, '');
    
    // Save selection info
    let selectionStart = input.selectionStart;
    let digitsBeforeCursor = input.value.substring(0, selectionStart).replace(/[^0-9]/g, '').length;

    if (value) {
        const formatted = new Intl.NumberFormat('id-ID').format(value);
        input.value = formatted;

        // Restore cursor position by counting digits
        let newSelectionStart = 0;
        let digitsSeen = 0;
        for (let i = 0; i < formatted.length && digitsSeen < digitsBeforeCursor; i++) {
            if (/[0-9]/.test(formatted[i])) {
                digitsSeen++;
            }
            newSelectionStart = i + 1;
        }
        input.setSelectionRange(newSelectionStart, newSelectionStart);
    } else {
        input.value = '';
    }
});

// Event Listeners
gameForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const category = document.getElementById('category').value;
    const posterFile = document.getElementById('poster').files[0];

    const formData = new FormData();
    formData.append('name', name);
    formData.append('category', category);
    formData.append('poster', posterFile);

    setLoading('game-form-btn', true, 'Add Item');

    try {
        const response = await fetch(`${API_URL}/add`, {
            method: 'POST',
            headers: {
                'x-admin-secret': getAdminSecret()
            },
            body: formData
        });

        const result = await response.json().catch(() => ({ error: 'Gagal memproses respon server' }));

        if (response.ok) {
            gameForm.reset();
            fileLabel.textContent = 'Click to upload image';
            showNotification('Item berhasil ditambahkan ke GitHub!');
            await fetchGames();
        } else {
            showNotification(result.error || 'Gagal menambah item', 'error');
        }
    } catch (error) {
        console.error('Error adding item:', error);
        showNotification('Kesalahan koneksi atau konfigurasi server', 'error');
    } finally {
        setLoading('game-form-btn', false, 'Add Item');
    }
});

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const gameId = gameSelectHidden.value;
    const name = document.getElementById('product_name').value;
    const priceFormatted = document.getElementById('price').value;
    const price = priceFormatted.replace(/\./g, ''); // Remove formatting for API
    const priceValue = parseInt(price, 10);

    if (isNaN(priceValue) || priceValue < 500) {
        return showNotification('Minimal harga adalah Rp 500', 'error');
    }

    if (priceValue > 5000000) {
        return showNotification('Maksimal harga adalah Rp 5.000.000', 'error');
    }

    const iconFile = document.getElementById('product_icon').files[0];

    if (!gameId) return showNotification('Please select a game first', 'error');

    setLoading('product-form-btn', true, 'Add Product');

    const formData = new FormData();
    formData.append('gameId', gameId);
    formData.append('name', name);
    formData.append('price', price);
    if (iconFile) {
        formData.append('icon', iconFile);
    }

    try {
        const response = await fetch(`${API_URL}/add`, {
            method: 'POST',
            headers: {
                'x-admin-secret': getAdminSecret()
            },
            body: formData
        });

        const result = await response.json().catch(() => ({ error: 'Gagal memproses respon server' }));

        if (response.ok) {
            productForm.reset();
            gameSelectHidden.value = '';
            selectedLabel.textContent = '-- Select Item --';
            iconLabel.textContent = 'Click to upload icon';
            showNotification('Produk berhasil disimpan ke GitHub!');
            await fetchGames();
        } else {
            showNotification(result.error || 'Gagal menambah produk', 'error');
        }
    } catch (error) {
        console.error('Error adding product:', error);
        showNotification('Kesalahan koneksi', 'error');
    } finally {
        setLoading('product-form-btn', false, 'Add Product');
    }
});

// Sidebar Logic
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const closeSidebar = document.getElementById('close-sidebar');

// Sidebar Logic continued...

// Documentation Logic
const docModal = document.getElementById('doc-modal');
const docTitle = document.getElementById('doc-title');
const docBody = document.getElementById('doc-body');
const closeDoc = document.getElementById('close-doc');
const mainDocsLink = document.getElementById('main-docs-link');
const tutorialLink = document.getElementById('tutorial-link');
const infoLink = document.getElementById('info-link');

function toggleSidebar() {
    sidebar.classList.toggle('show');
    sidebarOverlay.classList.toggle('show');
}

menuToggle.addEventListener('click', toggleSidebar);
closeSidebar.addEventListener('click', toggleSidebar);
sidebarOverlay.addEventListener('click', toggleSidebar);

const DOCS = {
    full: {
        title: 'Dokumentasi Lengkap',
        content: `
            <div class="doc-section">
                <h4 style="color:var(--primary); font-size:1.1rem; border-bottom:1px solid var(--border); padding-bottom:0.5rem; margin-bottom:1rem;">1. Cara di Localhost</h4>
                <p>Ikuti langkah ini untuk menjalankan project di komputer pribadi Anda.</p>
                
                <p><strong>Langkah 1:</strong> Download Script</p>
                <div class="code-block-header">Terminal / Termux</div>
                <div class="code-block-vscode">
<pre><code><span class="code-comment"># Struktur Folder</span>
produk-topup
├── .env.example
├── .gitignore
├── api/
│   ├── _lib/
│   │   └── github.ts
│   ├── add.ts
│   └── games.ts
├── metadata.json
├── package.json
├── public/
│   ├── assets/
│   │   └── profile/
│   │       └── readme.txt
│   ├── app.js
│   ├── index.html
│   └── style.css
├── server.ts
├── tsconfig.json
└── vite.config.ts

<span class="code-comment">#Buat repo di github</span>
nama-repo
├── db.json
└── assets/
    ├── poster/
    │   └── <span class="code-comment">#tempat foto poster</span>
    └── icon/
        └── <span class="code-comment">#tempat logo produk</span>

<span class="code-comment"># Masuk ke folder</span>
cd /nama-folder

<span class="code-comment"># Install dependencies</span>
npm install</code></pre>
                </div>

                <p><strong>Langkah 2:</strong> Buat file konfigurasi <code>.env</code></p>
                <div class="code-block-header">File: .env</div>
                <div class="code-block-vscode">
<pre><code><span class="code-comment"># Koneksi Database GitHub</span>
GITHUB_TOKEN=<span class="code-string">"ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"</span>
GITHUB_OWNER=<span class="code-string">"Username_GitHub"</span>
GITHUB_REPO=<span class="code-string">"Nama_Repository"</span>
GITHUB_BRANCH=<span class="code-string">"main"</span>

<span class="code-comment"># Kunci Keamanan Access</span>
ADMIN_SECRET=<span class="code-string">"Password 123"</span></code></pre>
                </div>

                <p><strong>Langkah 3:</strong> Jalankan Server</p>
                <div class="code-block-header">Terminal / Termux</div>
                <div class="code-block-vscode">
<pre><code><span class="code-func">npm run dev</span></code></pre>
                </div>
            </div>

            <div class="doc-section" style="margin-top:3rem;">
                <h4 style="color:var(--primary); font-size:1.1rem; border-bottom:1px solid var(--border); padding-bottom:0.5rem; margin-bottom:1rem;">2. Cara Hosting di Vercel</h4>
                <p>Untuk hosting online agar bisa diakses publik.</p>
                <p><strong>Vercel:</strong> Hubungkan repo Anda ke Vercel. Project ini sudah dilengkapi dengan <code>vercel.json</code> dan script build yang benar. Tambahkan Environment Variables di dashboard Vercel sesuai file <code>.env</code>. Vercel akan otomatis mendeteksi folder <code>api/</code> sebagai serverless functions dan <code>dist/</code> sebagai output statis.</p>
            </div>

            <div class="doc-section" style="margin-top:3rem;">
                <h4 style="color:var(--primary); font-size:1.1rem; border-bottom:1px solid var(--border); padding-bottom:0.5rem; margin-bottom:1rem;">3. Cara Mendapatkan Endpoint</h4>
                <p>Berikut adalah cara melakukan <strong>Fetch GET</strong> untuk mengambil data produk menggunakan JavaScript.</p>
                <div class="code-block-header">JavaScript</div>
                <div class="code-block-vscode">
<pre><code><span class="code-keyword">const</span> <span class="code-prop">API_URL</span> = <span class="code-string">"https://domain-anda.com/api/games"</span>;

<span class="code-keyword">async function</span> <span class="code-func">fetchKatalog</span>() {
  <span class="code-keyword">try</span> {
    <span class="code-keyword">const</span> res = <span class="code-keyword">await</span> <span class="code-func">fetch</span>(<span class="code-prop">API_URL</span>);
    <span class="code-keyword">const</span> data = <span class="code-keyword">await</span> res.<span class="code-func">json</span>();
    
    <span class="code-comment">// Menampilkan hasil ke console</span>
    console.<span class="code-func">log</span>(<span class="code-string">"Katalog Berhasil Load:"</span>, data);
    
    <span class="code-comment">// Contoh akses Kategori Game</span>
    data.<span class="code-prop">Game</span>.<span class="code-func">forEach</span>(item => {
      console.<span class="code-func">log</span>(<span class="code-string">\`Nama Game: \${item.name}\`</span>);
    });
  } <span class="code-keyword">catch</span> (err) {
    console.<span class="code-error">error</span>(<span class="code-string">"Gagal fetch data:"</span>, err);
  }
}

<span class="code-func">fetchKatalog</span>();</code></pre>
                </div>
            </div>

            <div class="doc-section" style="margin-top:3rem;">
                <h4 style="color:var(--primary); font-size:1.1rem; border-bottom:1px solid var(--border); padding-bottom:0.5rem; margin-bottom:1rem;">4. Cara Integrasi</h4>
                <p>Anda dapat menambah item (kategori) atau produk secara otomatis dari skrip eksternal (integrasi) dengan mengirimkan <strong>Header Keamanan</strong>.</p>
                
                <div class="code-block-header">Contoh Request: Tambah Item (Node.js / Fetch)</div>
                <div class="code-block-vscode">
<pre><code><span class="code-keyword">const</span> <span class="code-prop">API_URL</span> = <span class="code-string">"https://domain-anda.com/api/add"</span>;
<span class="code-keyword">const</span> <span class="code-prop">ADMIN_SECRET</span> = <span class="code-string">"Password 123"</span>;

<span class="code-keyword">async</span> <span class="code-keyword">function</span> <span class="code-func">tambahItemOtomatis</span>() {
  <span class="code-keyword">const</span> <span class="code-prop">formData</span> = <span class="code-keyword">new</span> <span class="code-func">FormData</span>();
  <span class="code-prop">formData</span>.<span class="code-func">append</span>(<span class="code-string">"type"</span>, <span class="code-string">"game"</span>);
  <span class="code-prop">formData</span>.<span class="code-func">append</span>(<span class="code-string">"name"</span>, <span class="code-string">"Mobile Legends"</span>);
  <span class="code-prop">formData</span>.<span class="code-func">append</span>(<span class="code-string">"category"</span>, <span class="code-string">"Game"</span>);
  <span class="code-comment">// formData.append("image", fileInput.files[0]); // Jika ada file</span>

  <span class="code-keyword">const</span> <span class="code-prop">res</span> = <span class="code-keyword">await</span> <span class="code-func">fetch</span>(<span class="code-prop">API_URL</span>, {
    method: <span class="code-string">"POST"</span>,
    headers: { <span class="code-string">"x-admin-secret"</span>: <span class="code-prop">ADMIN_SECRET</span> },
    body: <span class="code-prop">formData</span>
  });
  <span class="code-prop">console</span>.<span class="code-func">log</span>(<span class="code-keyword">await</span> <span class="code-prop">res</span>.<span class="code-func">json</span>());
}</code></pre>
                </div>

                <div class="code-block-header" style="margin-top:1.5rem;">Contoh Request: Tambah Produk (Node.js / Fetch)</div>
                <div class="code-block-vscode">
<pre><code><span class="code-keyword">const</span> <span class="code-prop">API_URL</span> = <span class="code-string">"https://domain-anda.com/api/add"</span>;
<span class="code-keyword">const</span> <span class="code-prop">ADMIN_SECRET</span> = <span class="code-string">"Password 123"</span>;

<span class="code-keyword">async</span> <span class="code-keyword">function</span> <span class="code-func">tambahProdukOtomatis</span>() {
  <span class="code-keyword">const</span> <span class="code-prop">formData</span> = <span class="code-keyword">new</span> <span class="code-func">FormData</span>();
  <span class="code-prop">formData</span>.<span class="code-func">append</span>(<span class="code-string">"type"</span>, <span class="code-string">"product"</span>);
  <span class="code-prop">formData</span>.<span class="code-func">append</span>(<span class="code-string">"gameId"</span>, <span class="code-string">"id-game-anda"</span>);
  <span class="code-prop">formData</span>.<span class="code-func">append</span>(<span class="code-string">"name"</span>, <span class="code-string">"Diamond 100"</span>);
  <span class="code-prop">formData</span>.<span class="code-func">append</span>(<span class="code-string">"price"</span>, <span class="code-string">"15000"</span>);
  <span class="code-comment">// formData.append("icon", fileInput.files[0]); // Jika ada file</span>

  <span class="code-keyword">const</span> <span class="code-prop">res</span> = <span class="code-keyword">await</span> <span class="code-func">fetch</span>(<span class="code-prop">API_URL</span>, {
    method: <span class="code-string">"POST"</span>,
    headers: { <span class="code-string">"x-admin-secret"</span>: <span class="code-prop">ADMIN_SECRET</span> },
    body: <span class="code-prop">formData</span>
  });
  <span class="code-prop">console</span>.<span class="code-func">log</span>(<span class="code-keyword">await</span> <span class="code-prop">res</span>.<span class="code-func">json</span>());
}</code></pre>
                </div>
            </div>

            <div class="doc-section" style="margin-top:3rem;">
                <h4 style="color:var(--primary); font-size:1.1rem; border-bottom:1px solid var(--border); padding-bottom:0.5rem; margin-bottom:1rem;">5. Cek Endpoint</h4>
                <p>Untuk cek endpoint sesuai dengan domain anda contoh seperti web ini: <a href="https://hex-produk.vercel.app/games" target="_blank" style="color:var(--primary); text-decoration:underline;">https://hex-produk.vercel.app/games</a></p>
            </div>

            <div class="doc-section" style="margin-top:3rem;">
                <h4 style="color:var(--primary); font-size:1.1rem; border-bottom:1px solid var(--border); padding-bottom:0.5rem; margin-bottom:1rem;">6. Pengaturan tambahan</h4>
                
                <p><strong>Ganti Foto Profil:</strong></p>
                <p>Simpan foto Anda di folder <code>public/assets/profile/</code> dengan nama <code>me.jpg</code>.</p>

                <p><strong>Ganti Nama Admin:</strong></p>
                <p>Buka file <code>public/index.html</code>, cari baris sekitar <strong>31-33</strong>. Ubah teks yang ada di dalam tag <code>&lt;span&gt;</code> di bawah div <code>profile-container</code>.</p>
                
                <p><strong>Ganti Link Sosmed:</strong></p>
                <p>Buka file <code>public/index.html</code>, cari baris sekitar <strong>35-45</strong>. Cari tag <code>&lt;div class="social-links"&gt;</code> dan ubah <code>href</code> yang ada di dalamnya.</p>
            </div>
        `
    },
    tutorial: {
        title: 'Tutorial Penggunaan',
        content: `
            <div class="doc-section">
                <h4 style="color:var(--primary); font-size:1.1rem; border-bottom:1px solid var(--border); padding-bottom:0.5rem; margin-bottom:1rem;">1. Cara Menambah Item (Game/Kategori)</h4>
                <p>Gunakan tab "Add Item" pada menu utama untuk menambahkan kategori baru seperti "Mobile Legends", "Free Fire", atau "Pulsa".</p>
                <ul>
                    <li>Pilih tab <strong>Add Item</strong>.</li>
                    <li>Isi <strong>Item Name</strong> (Contoh: Mobile Legends).</li>
                    <li>Pilih <strong>Category</strong> yang sesuai (Game, Pulsa, atau lainnya).</li>
                    <li>Klik kotak upload untuk memilih <strong>Poster Gambar</strong>.</li>
                    <li>Klik tombol <strong>Add Item</strong>. Sistem akan mengupload gambar dan menyimpan data ke GitHub.</li>
                </ul>
            </div>

            <div class="doc-section" style="margin-top:2rem;">
                <h4 style="color:var(--primary); font-size:1.1rem; border-bottom:1px solid var(--border); padding-bottom:0.5rem; margin-bottom:1rem;">2. Cara Menambah Produk (Layanan)</h4>
                <p>Setelah Item dibuat, Anda bisa menambahkan produk ke dalamnya (Misal: Diamond, Membership, dll).</p>
                <ul>
                    <li>Pilih tab <strong>Add Product</strong>.</li>
                    <li>Klik <strong>Select Item</strong> dan cari nama game/item yang sudah Anda buat sebelumnya.</li>
                    <li>Isi <strong>Product Name</strong> (Contoh: 86 Diamonds).</li>
                    <li>Isi <strong>Price</strong> (Harga akan otomatis terformat rupiah).</li>
                    <li>Upload <strong>Icon Produk</strong> (Opsional).</li>
                    <li>Klik tombol <strong>Add Product</strong>.</li>
                </ul>
            </div>

            <div class="doc-section" style="margin-top:2rem; padding:1.5rem; background:rgba(var(--primary-rgb), 0.1); border-radius:1rem; border:1px dashed var(--primary);">
                <h4 style="color:var(--primary); margin-top:0;">💡 Hasil Output</h4>
                <p style="margin-bottom:0;">Hasil dari penambahan item dan produk dapat Anda lihat di <strong>Beranda paling bawah</strong>. Klik pada header item untuk melihat daftar produk yang ada di dalamnya.</p>
            </div>
        `
    },
    info: {
        title: 'Informasi Penting',
        content: `
            <div class="doc-section">
                <p>Website ini dibuat untuk membantu programmer pemula dalam mengembangkan website top-up berbasis simulasi, tanpa harus melalui proses yang kompleks seperti menambahkan produk, poster, dan harga secara manual satu per satu.</p>
                <div style="margin-top:1.5rem; padding:1rem; background:rgba(239, 68, 68, 0.1); border-left:4px solid #ef4444; border-radius:0.5rem;">
                    <p style="margin:0; color:#ef4444; font-weight:600;">⚠️ Peringatan:</p>
                    <p style="margin-top:0.5rem; margin-bottom:0;">Dilarang keras menyalahgunakan script atau website ini untuk tujuan yang melanggar hukum, termasuk namun tidak terbatas pada tindakan penipuan dan aktivitas ilegal lainnya.</p>
                </div>
            </div>
        `
    }
};

function openDocs(type) {
    const doc = DOCS[type];
    if (!doc) return;
    
    docTitle.innerText = doc.title;
    docBody.innerHTML = doc.content;
    docModal.classList.add('show');
    toggleSidebar(); 
}

if (mainDocsLink) {
    mainDocsLink.addEventListener('click', (e) => {
        e.preventDefault();
        openDocs('full');
    });
}

if (tutorialLink) {
    tutorialLink.addEventListener('click', (e) => {
        e.preventDefault();
        openDocs('tutorial');
    });
}

if (infoLink) {
    infoLink.addEventListener('click', (e) => {
        e.preventDefault();
        openDocs('info');
    });
}

closeDoc.addEventListener('click', () => {
    docModal.classList.remove('show');
});

docModal.addEventListener('click', (e) => {
    if (e.target === docModal) docModal.classList.remove('show');
});

loadBtn.addEventListener('click', async () => {
    const originalText = loadBtn.innerText;
    loadBtn.innerText = 'Synchronizing...';
    loadBtn.disabled = true;
    
    try {
        await fetchGames();
        showNotification('Data synchronized with GitHub');
    } catch (error) {
        showNotification('Failed to sync: ' + error.message, 'error');
    } finally {
        loadBtn.innerText = originalText;
        loadBtn.disabled = false;
    }
});

// Initialize
if (window.lucide) {
    window.lucide.createIcons();
}
fetchGames();
if (window.lucide) {
    window.lucide.createIcons();
}
