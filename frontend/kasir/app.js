'use strict';

/* =========================
   DATA TENANT
========================= */

const tenants = [
    { id: 1, name: 'Yes Resto', revenue: 2150000, transactions: 78 },
    { id: 2, name: 'Ayamku', revenue: 3500000, transactions: 90 },
    { id: 3, name: 'Fit Me', revenue: 1500000, transactions: 50 },
    { id: 4, name: 'Kopi Kencana', revenue: 950000, transactions: 37 },
    { id: 5, name: 'Dapur Kampus', revenue: 1250000, transactions: 70 },
    { id: 6, name: 'Selera Nusantara', revenue: 800000, transactions: 45 }
];

/* =========================
   DATA MENU
========================= */

const menuData = [
    ['Ayam Kremes', 15000, '🍗', 'ayam-kremes'],
    ['Karage', 15000, '🍗', 'karage'],
    ['Nasi Katsu', 15000, '🍛', 'nasi-katsu'],
    ['Fish and Chips', 20000, '🍟', 'fish-chips'],
    ['Nasi Goreng', 12000, '🍚', 'nasi-goreng'],
    ['Bihun Goreng', 12000, '🍜', 'bihun-goreng'],
    ['Nasi Soto', 12000, '🥣', 'nasi-soto'],
    ['Nasi Pecel', 10000, '🥗', 'nasi-pecel'],
    ['Kwetiau', 18000, '🍝', 'kwetiau'],
    ['Mie Pangsit', 15000, '🍜', 'mie-pangsit']
];

const products = tenants.flatMap(tenant =>
    menuData.map((menu, index) => ({
        id: `${tenant.id}-${index + 1}`,
        tenantId: tenant.id,
        name: menu[0],
        price: menu[1],
        emoji: menu[2],
        image: `assets/${menu[3]}.jpg`,
        initial: 15 + index % 4 * 3,
        sold: 8 + index % 5,
        stock: 7 + index % 4 * 3 - index % 5
    }))
);

/* =========================
   DATA VOUCHER
========================= */

const vouchers = Array.from({ length: 8 }, (_, index) => ({
    id: `SR-${String(index + 1).padStart(3, '0')}`,
    tenantId: index % 6 + 1,
    name: 'Flash Sale Ayam Kremes',
    discount: 20,
    limit: 10 + index % 3 * 5,
    used: index % 4 + 1,
    active: true
}));

/* =========================
   LOCAL STORAGE
========================= */

const storageKey = 'sisarasa-kasir-demo-v1';

function load() {
    try {
        return JSON.parse(localStorage.getItem(storageKey)) || {};
    } catch {
        return {};
    }
}

const saved = load();

let transactions = Array.isArray(saved.transactions)
    ? saved.transactions
    : [];

let redeemed = Array.isArray(saved.redeemed)
    ? saved.redeemed
    : [];

let cart = new Map();

let page = 'dashboard';
let transactionTenant = 1;
let detailTenant = 1;
let dashboardPage = 1;
let historyPage = 1;
let search = '';
let tenantSearch = '';
let voucherApplied = null;

function save() {
    try {
        localStorage.setItem(
            storageKey,
            JSON.stringify({ transactions, redeemed })
        );
    } catch {
        notify('Data hanya disimpan selama sesi ini.');
    }
}

/* =========================
   HELPER FUNCTIONS
========================= */

const $ = id => document.getElementById(id);

const rupiah = number =>
    `Rp ${Math.round(number).toLocaleString('id-ID')}`;

const safe = value => String(value).replace(
    /[&<>"']/g,
    char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char])
);

const tenantById = id => tenants.find(t => t.id === id);

const productById = id => products.find(p => p.id === id);

const sum = (items, fn) =>
    items.reduce((total, item) => total + fn(item), 0);

const sales = product =>
    sum(transactions, transaction =>
        sum(
            transaction.items.filter(item => item.id === product.id),
            item => item.qty
        )
    );

const stock = product =>
    Math.max(0, product.stock - sales(product));

const sold = product =>
    product.sold + sales(product);

const remaining = voucher =>
    Math.max(
        0,
        voucher.limit - voucher.used -
        redeemed.filter(id => id === voucher.id).length
    );

const isUsed = voucher =>
    redeemed.includes(voucher.id);

const activeVouchers = () =>
    vouchers.filter(voucher =>
        voucher.active &&
        remaining(voucher) > 0 &&
        !isUsed(voucher)
    );

const matches = (...values) =>
    values.join(' ').toLowerCase().includes(search.toLowerCase());

function tenantStats(tenant) {

    const tenantProducts = products.filter(
        product => product.tenantId === tenant.id
    );

    const relevant = transactions.filter(transaction =>
        transaction.items.some(item =>
            productById(item.id)?.tenantId === tenant.id
        )
    );

    const additionalRevenue = sum(relevant, transaction => {
        const revenue = sum(
            transaction.items.filter(item =>
                productById(item.id)?.tenantId === tenant.id
            ),
            item => item.qty * item.price
        );

        const discount =
            transaction.voucherTenant === tenant.id
                ? transaction.discount
                : 0;

        return revenue - discount;
    });

    return {
        revenue: tenant.revenue + additionalRevenue,
        transactions: tenant.transactions + relevant.length,
        sold: sum(tenantProducts, sold),
        stock: sum(tenantProducts, stock),
        initial: sum(tenantProducts, p => p.initial)
    };
}

/* =========================
   FOOD IMAGE
========================= */

function photo(product) {
    return `
        <div class="food-photo" aria-hidden="true">
            <span>${product.emoji}</span>
            <img src="${product.image}" alt="" loading="lazy">
        </div>
    `;
}

function hideBrokenImages() {
    document.querySelectorAll('.food-photo img').forEach(img => {
        img.addEventListener('error', () => img.remove(), {
            once: true
        });

        if (img.complete && !img.naturalWidth) {
            img.remove();
        }
    });
}

/* =========================
   STATISTIC CARD
========================= */

function cards(id, items) {

    $(id).innerHTML = items.map(([label, value]) => `
        <article class="stat">
            <span class="stat-label">${safe(label)}</span>
            <div class="stat-value">${safe(value)}</div>
        </article>
    `).join('');
}

/* =========================
   PAGINATION
========================= */

function paginate(id, count, current, action) {

    const totalPages = Math.max(1, count);

    $(id).innerHTML = totalPages === 1 ? '' :
        Array.from({ length: totalPages }, (_, index) => `
            <button
                data-action="${action}"
                data-value="${index + 1}"
                class="${index + 1 === current ? 'active' : ''}"
            >
                ${index + 1}
            </button>
        `).join('');
}

/* =========================
   TENANT FILTER
========================= */

function tabs(id, active, action) {

    $(id).innerHTML = tenants.map(tenant => `
        <button
            data-action="${action}"
            data-value="${tenant.id}"
            class="${tenant.id === active ? 'active' : ''}"
            aria-pressed="${tenant.id === active}"
        >
            Tenant ${tenant.id}
        </button>
    `).join('');
}

/* =========================
   DASHBOARD
========================= */

function renderDashboard() {

    const revenue = sum(
        tenants,
        tenant => tenantStats(tenant).revenue
    );

    const totalTransactions = sum(
        tenants,
        tenant => tenantStats(tenant).transactions
    );

    cards('dashboard-stats', [
        ['Total Transaksi', totalTransactions],
        ['Total Pendapatan', rupiah(revenue)],
        [
            'Total Penjualan Normal',
            rupiah(
                revenue - 1000000 -
                sum(
                    transactions.filter(t => t.voucherId),
                    t => t.total
                )
            )
        ],
        ['Total Voucher Diklaim', 10 + redeemed.length]
    ]);

    const list = tenants.filter(tenant =>
        matches(tenant.name, `Tenant ${tenant.id}`) &&
        tenant.name.toLowerCase().includes(
            tenantSearch.toLowerCase()
        )
    );

    const perPage = 4;

    dashboardPage = Math.min(
        dashboardPage,
        Math.max(1, Math.ceil(list.length / perPage))
    );

    $('dashboard-tenants').innerHTML = list
        .slice(
            (dashboardPage - 1) * perPage,
            dashboardPage * perPage
        )
        .map(tenant => {

            const stats = tenantStats(tenant);

            return `
                <tr>
                    <td>${safe(tenant.name)}</td>
                    <td>${rupiah(stats.revenue)}</td>
                    <td>${stats.transactions}</td>
                    <td>${stats.stock}</td>
                    <td>
                        <button
                            class="table-action"
                            data-action="open-tenant"
                            data-value="${tenant.id}"
                        >
                            Lihat tenant
                        </button>
                    </td>
                </tr>
            `;
        }).join('') ||
        '<tr><td colspan="5">Tenant tidak ditemukan.</td></tr>';

    paginate(
        'dashboard-pagination',
        Math.ceil(list.length / perPage),
        dashboardPage,
        'dashboard-page'
    );

    const featured = [
        products[2],
        products[1],
        products[0]
    ];

    $('featured-menu').innerHTML = featured
        .filter(product =>
            matches(
                product.name,
                tenantById(product.tenantId).name
            )
        )
        .map(product => `
            <article class="featured-card">

                ${photo(product)}

                <small>
                    Tenant ${product.tenantId} ·
                    ${safe(tenantById(product.tenantId).name)}
                </small>

                <h3>${safe(product.name)}</h3>

                <p>${rupiah(product.price)}</p>

            </article>
        `).join('') ||
        '<p class="empty">Menu tidak ditemukan.</p>';
}

/* =========================
   HALAMAN TRANSAKSI
========================= */

function renderTransaction() {

    tabs(
        'transaction-tabs',
        transactionTenant,
        'transaction-tenant'
    );

    $('product-grid').innerHTML = products
        .filter(product =>
            product.tenantId === transactionTenant &&
            matches(product.name)
        )
        .map(product => {

            const qty = cart.get(product.id) || 0;

            return `
                <article class="product-card">

                    <div class="product-info">

                        ${photo(product)}

                        <div>
                            <h3>${safe(product.name)}</h3>
                            <p>${rupiah(product.price)}</p>
                            <small>Stok: ${stock(product)}</small>
                        </div>

                    </div>

                    <div class="qty">

                        <button
                            data-action="minus"
                            data-value="${product.id}"
                            ${qty === 0 ? 'disabled' : ''}
                        >
                            −
                        </button>

                        <strong>${qty}</strong>

                        <button
                            class="plus ${qty ? 'selected' : ''}"
                            data-action="plus"
                            data-value="${product.id}"
                            ${qty >= stock(product) ? 'disabled' : ''}
                        >
                            +
                        </button>

                    </div>

                </article>
            `;
        }).join('') ||
        '<p class="empty">Menu tidak ditemukan.</p>';

    renderCart();
}

/* =========================
   SHOPPING CART
========================= */

function cartItems() {

    return Array.from(cart, ([id, qty]) => ({
        ...productById(id),
        qty
    })).filter(item => item.qty > 0);
}

function pricing() {

    const items = cartItems();

    const subtotal = sum(
        items,
        item => item.price * item.qty
    );

    const eligible = voucherApplied
        ? items.find(item =>
            item.tenantId === voucherApplied.tenantId &&
            item.name === 'Ayam Kremes'
        )
        : null;

    const discount = eligible
        ? Math.round(
            eligible.price * voucherApplied.discount / 100
        )
        : 0;

    return {
        subtotal,
        discount,
        total: subtotal - discount,
        items
    };
}

function renderCart() {

    const {
        items,
        subtotal,
        discount,
        total
    } = pricing();

    $('order-count').textContent =
        `${sum(items, item => item.qty)} item`;

    $('cart-items').innerHTML = items.map(item => `
        <div class="cart-row">

            ${photo(item)}

            <div class="cart-info">

                <h3>${safe(item.name)}</h3>

                <p>
                    Tenant ${item.tenantId} · ${item.qty} item
                </p>

            </div>

            <strong>${rupiah(item.price * item.qty)}</strong>

        </div>
    `).join('') ||
    '<p class="muted" style="padding:20px 0">Belum ada pesanan.</p>';

    $('subtotal').textContent = rupiah(subtotal);
    $('discount').textContent = rupiah(discount);
    $('total').textContent = rupiah(total);

    $('checkout').disabled = !items.length;
    $('clear-cart').disabled = !items.length;
}

/* =========================
   HALAMAN TENANT
========================= */

function renderTenant() {

    tabs('detail-tabs', detailTenant, 'detail-tenant');

    const tenant = tenantById(detailTenant);
    const stats = tenantStats(tenant);

    cards('tenant-stats', [
        ['Total Pendapatan', rupiah(stats.revenue)],
        ['Total Transaksi', stats.transactions],
        ['Produk Terjual', stats.sold],
        ['Sisa Makanan', stats.stock]
    ]);

    /* Grafik Pendapatan */

    const hours = [
        '08:00',
        '10:00',
        '12:00',
        '14:00',
        '16:00',
        '18:00'
    ];

    const base = [0.10, 0.08, 0.33, 0.29, 0.15, 0.05];

    const amounts = base.map(
        value => Math.round(tenant.revenue * value)
    );

    transactions.forEach(transaction => {

        const hour = new Date(transaction.date).getHours();

        const index = Math.max(
            0,
            Math.min(5, Math.floor((hour - 8) / 2))
        );

        amounts[index] += sum(
            transaction.items.filter(item =>
                productById(item.id)?.tenantId === tenant.id
            ),
            item => item.qty * item.price
        ) - (
            transaction.voucherTenant === tenant.id
                ? transaction.discount
                : 0
        );
    });

    const max = Math.max(...amounts, 1);

    const peak = amounts.indexOf(max);

    $('bar-chart').innerHTML = amounts.map((amount, index) => `
        <div class="bar-slot">

            <div
                class="bar"
                style="height:${amount / max * 100}%"
                title="${hours[index]}: ${rupiah(amount)}"
            >
            </div>

            <small>${hours[index]}</small>

        </div>
    `).join('');

    $('peak-time').textContent = hours[peak];
    $('peak-value').textContent = rupiah(max);

    /* Grafik Stok */

    const percentage = stats.initial
        ? stats.sold / stats.initial * 100
        : 0;

    $('donut').style.background = `
        conic-gradient(
            var(--dark) 0 ${percentage}%,
            #ddd ${percentage}% 100%
        )
    `;

    $('donut').setAttribute(
        'aria-label',
        `${stats.sold} terjual, ${stats.stock} belum terjual`
    );

    $('stock-in').textContent = stats.initial;
    $('stock-sold').textContent = stats.sold;
    $('stock-left').textContent = stats.stock;

    /* Histori Penjualan */

    const tenantProducts = products.filter(product =>
        product.tenantId === detailTenant &&
        matches(product.name)
    );

    const perPage = 8;

    historyPage = Math.min(
        historyPage,
        Math.max(
            1,
            Math.ceil(tenantProducts.length / perPage)
        )
    );

    $('sales-history').innerHTML = tenantProducts
        .slice(
            (historyPage - 1) * perPage,
            historyPage * perPage
        )
        .map(product => `
            <tr>

                <td>${safe(product.name)}</td>
                <td>${rupiah(product.price)}</td>
                <td>${sold(product)}</td>
                <td>${stock(product)}</td>

                <td>
                    <button
                        class="table-action"
                        data-action="menu-detail"
                        data-value="${product.id}"
                    >
                        Lihat detail
                    </button>
                </td>

            </tr>
        `).join('') ||
        '<tr><td colspan="5">Menu tidak ditemukan.</td></tr>';

    paginate(
        'history-pagination',
        Math.ceil(tenantProducts.length / perPage),
        historyPage,
        'history-page'
    );
}

/* =========================
   HALAMAN VOUCHER
========================= */

function renderVoucher() {

    const list = activeVouchers();

    cards('voucher-stats', [
        [
            'Total Voucher Aktif',
            rupiah(
                sum(list, voucher =>
                    remaining(voucher) * 15000 *
                    (1 - voucher.discount / 100)
                )
            )
        ],
        ['Voucher Tersedia', sum(list, remaining)],
        [
            'Total Terpakai',
            sum(vouchers, voucher => voucher.used) + redeemed.length
        ]
    ]);

    $('voucher-grid').innerHTML = list
        .filter(voucher =>
            matches(
                voucher.name,
                voucher.id,
                tenantById(voucher.tenantId).name,
                `Tenant ${voucher.tenantId}`
            )
        )
        .map(voucher => `
            <article class="voucher-card">

                <small>Tenant ${voucher.tenantId}</small>

                <h3>${safe(voucher.name)}</h3>

                <div class="voucher-description">
                    <span>Penggunaan</span>
                    <span>
                        ${voucher.limit - remaining(voucher)}
                        / ${voucher.limit} terpakai
                    </span>
                </div>

                <div class="voucher-bottom">
                    <span>Diskon Spesial</span>
                    <b>${voucher.discount}% OFF</b>
                </div>

                <button
                    class="table-action"
                    data-action="voucher-detail"
                    data-value="${voucher.id}"
                >
                    Lihat detail
                </button>

            </article>
        `).join('') ||
        '<p class="empty">Tidak ada voucher aktif.</p>';
}

/* =========================
   NAVIGATION
========================= */

function render() {

    if (page === 'dashboard') renderDashboard();
    if (page === 'transaksi') renderTransaction();
    if (page === 'tenant') renderTenant();
    if (page === 'voucher') renderVoucher();

    hideBrokenImages();
}

function route() {

    const target = location.hash.slice(1);

    const allowedPages = [
        'dashboard',
        'transaksi',
        'tenant',
        'voucher'
    ];

    page = allowedPages.includes(target)
        ? target
        : 'dashboard';

    $('page-title').textContent =
        page[0].toUpperCase() + page.slice(1);

    document.querySelectorAll('.page').forEach(element => {
        element.hidden = element.id !== `page-${page}`;
    });

    document.querySelectorAll('[data-page]').forEach(element => {

        const active = element.dataset.page === page;

        element.classList.toggle('active', active);

        if (active) {
            element.setAttribute('aria-current', 'page');
        } else {
            element.removeAttribute('aria-current');
        }
    });

    search = '';
    $('global-search').value = '';

    render();
}

function navigate(target) {

    if (location.hash === `#${target}`) {
        route();
    } else {
        location.hash = target;
    }
}

/* =========================
   NOTIFICATION
========================= */

let toastTimer;

function notify(message) {

    $('toast').textContent = message;
    $('toast').hidden = false;

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        $('toast').hidden = true;
    }, 3200);
}

/* =========================
   MODAL
========================= */

function modal(title, body, confirmLabel, callback) {

    $('modal-title').textContent = title;
    $('modal-body').innerHTML = body;

    const button = $('modal-confirm');

    button.hidden = !callback;
    button.textContent = confirmLabel || 'Konfirmasi';
    button.onclick = callback || null;

    $('modal-cancel').textContent =
        callback ? 'Batal' : 'Tutup';

    if (!$('modal').open) {
        $('modal').showModal();
    }
}

function closeModal() {
    $('modal').close();
}

/* =========================
   VALIDASI VOUCHER
========================= */

function validateVoucher() {

    modal(
        'Validasi Voucher',
        `
            <p>Masukkan kode voucher pelanggan.</p>

            <p>Kode demo: SR-001 sampai SR-008.</p>

            <label for="voucher-code">Kode voucher</label>

            <input
                id="voucher-code"
                placeholder="SR-001"
                autocomplete="off"
            >

            <p class="error" id="voucher-error" role="alert"></p>
        `,
        'Validasi',
        () => {

            const code = $('voucher-code')
                .value.trim().toUpperCase();

            const voucher = vouchers.find(
                item => item.id === code
            );

            if (
                !voucher ||
                !voucher.active ||
                isUsed(voucher) ||
                remaining(voucher) <= 0
            ) {
                $('voucher-error').textContent =
                    'Voucher tidak valid atau sudah digunakan.';
                return;
            }

            const product = products.find(item =>
                item.tenantId === voucher.tenantId &&
                item.name === 'Ayam Kremes'
            );

            if (!product || stock(product) < 1) {
                $('voucher-error').textContent =
                    'Stok makanan tidak tersedia.';
                return;
            }

            voucherApplied = voucher;
            transactionTenant = voucher.tenantId;

            if (!cart.get(product.id)) {
                cart.set(product.id, 1);
            }

            closeModal();

            navigate('transaksi');

            notify(
                'Voucher valid. Diskon diterapkan pada satu porsi.'
            );
        }
    );
}

/* =========================
   CHECKOUT
========================= */

function checkout() {

    const order = pricing();

    if (!order.items.length) return;

    modal(
        'Konfirmasi Checkout',
        `
            <p>
                Jumlah pesanan:
                <b>${sum(order.items, item => item.qty)} porsi</b>
            </p>

            <p>
                Total pembayaran:
                <b>${rupiah(order.total)}</b>
            </p>

            <p>Pastikan pesanan dan pembayaran sudah sesuai.</p>
        `,
        'Simpan Transaksi',
        () => {

            const current = pricing();

            if (!current.items.length) return;

            if (current.items.some(item => item.qty > stock(item))) {

                closeModal();

                notify('Stok tidak mencukupi. Periksa pesanan.');

                return;
            }

            if (
                voucherApplied &&
                current.discount > 0 &&
                isUsed(voucherApplied)
            ) {

                closeModal();

                notify('Voucher sudah digunakan.');

                return;
            }

            const voucher = current.discount > 0
                ? voucherApplied
                : null;

            transactions.push({
                id: Date.now(),
                date: new Date().toISOString(),
                items: current.items.map(({ id, qty, price }) => ({
                    id,
                    qty,
                    price
                })),
                total: current.total,
                discount: current.discount,
                voucherId: voucher?.id || null,
                voucherTenant: voucher?.tenantId || null
            });

            if (voucher) {
                redeemed.push(voucher.id);
            }

            cart.clear();
            voucherApplied = null;

            save();

            closeModal();

            render();

            notify('Transaksi berhasil disimpan (demo).');
        }
    );
}

/* =========================
   EVENT LISTENER
========================= */

document.addEventListener('click', event => {

    const button = event.target.closest('[data-action]');

    if (!button || button.disabled) return;

    const { action, value } = button.dataset;

    switch (action) {

        case 'dashboard-page':
            dashboardPage = Number(value);
            break;

        case 'history-page':
            historyPage = Number(value);
            break;

        case 'open-tenant':
            detailTenant = Number(value);
            historyPage = 1;
            navigate('tenant');
            return;

        case 'transaction-tenant':
            transactionTenant = Number(value);
            break;

        case 'detail-tenant':
            detailTenant = Number(value);
            historyPage = 1;
            break;

        case 'plus': {

            const product = productById(value);
            const qty = cart.get(value) || 0;

            if (qty < stock(product)) {
                cart.set(value, qty + 1);
            }

            break;
        }

        case 'minus': {

            const qty = cart.get(value) || 0;

            if (qty <= 1) {
                cart.delete(value);
            } else {
                cart.set(value, qty - 1);
            }

            break;
        }

        case 'menu-detail': {

            const product = productById(value);

            modal(
                product.name,
                `
                    <p>
                        Tenant ${product.tenantId} ·
                        ${safe(tenantById(product.tenantId).name)}
                    </p>

                    <p>Harga: ${rupiah(product.price)}</p>

                    <p>Terjual: ${sold(product)} porsi</p>

                    <p>Sisa: ${stock(product)} porsi</p>
                `
            );

            return;
        }

        case 'voucher-detail': {

            const voucher = vouchers.find(
                item => item.id === value
            );

            modal(
                voucher.name,
                `
                    <p>
                        Tenant ${voucher.tenantId} ·
                        Diskon ${voucher.discount}%
                    </p>

                    <p>
                        Kode demo:
                        <span class="code">${safe(voucher.id)}</span>
                    </p>

                    <p>
                        Voucher berlaku untuk satu porsi Ayam Kremes.
                    </p>
                `,
                'Validasi kode',
                validateVoucher
            );

            return;
        }
    }

    render();
});

/* =========================
   SEARCH
========================= */

$('global-search').addEventListener('input', event => {

    search = event.target.value;

    dashboardPage = 1;
    historyPage = 1;

    render();
});

$('tenant-search').addEventListener('input', event => {

    tenantSearch = event.target.value;
    dashboardPage = 1;

    render();
});

/* =========================
   ACTION BUTTONS
========================= */

$('clear-cart').onclick = () => {

    cart.clear();
    voucherApplied = null;

    render();
};

$('checkout').onclick = checkout;

$('validate-voucher').onclick = validateVoucher;

$('notification').onclick = () => {

    modal(
        'Notifikasi',
        '<p>Tidak ada notifikasi baru.</p>'
    );
};

$('logout').onclick = () => {

    modal(
        'Keluar dari halaman kasir?',
        `
            <p>Keranjang yang belum di-checkout akan dikosongkan.</p>
            <p>Autentikasi akun belum terhubung ke backend.</p>
        `,
        'Keluar',
        () => {

            cart.clear();
            voucherApplied = null;

            closeModal();

            navigate('dashboard');

            notify('Keranjang dikosongkan. Mode demo masih aktif.');
        }
    );
};

/* =========================
   INITIALIZATION
========================= */

window.addEventListener('hashchange', route);

route();