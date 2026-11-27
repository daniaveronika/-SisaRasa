"use strict";

const $ = (id) => document.getElementById(id);

const API = "/api/kasir/transaksi";

/* =========================================
   ICONS
========================================= */

const icons = {

    dashboard: `
        <rect x="3" y="3" width="7" height="7" rx="1.4"/>
        <rect x="14" y="3" width="7" height="7" rx="1.4"/>
        <rect x="3" y="14" width="7" height="7" rx="1.4"/>
        <rect x="14" y="14" width="7" height="7" rx="1.4"/>
    `,

    receipt: `
        <path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z"/>
        <path d="M9 8h6m-6 4h6"/>
    `,

    store: `
        <path d="M3 10 5 4h14l2 6M4 10v10h16V10"/>
        <path d="M9 20v-6h6v6M3 10h18"/>
    `,

    ticket: `
        <path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V6Z"/>
        <path d="M15 8v1m0 3v1m0 3v1"/>
    `,

    logout: `
        <path d="M10 17l5-5-5-5m5 5H3m12-8h5v16h-5"/>
    `,

    search: `
        <circle cx="10.5" cy="10.5" r="6.5"/>
        <path d="m16 16 5 5"/>
    `,

    refresh: `
        <path d="M20 7v5h-5M4 17v-5h5"/>
        <path d="M5 8a8 8 0 0 1 13-3l2 3M4 16l2 3a8 8 0 0 0 13-3"/>
    `,

    history: `
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 7v5l4 2"/>
    `,

    wallet: `
        <rect x="3" y="5" width="18" height="15" rx="3"/>
        <path d="M3 9h18m-5 5h2"/>
    `,

    qr: `
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <path d="M14 14h3v3h4m-7 4v-4m7-3v1m0 5v1"/>
    `,

    cart: `
        <path d="M3 3h2l3 13h12l2-9H6"/>
        <circle cx="9" cy="21" r="1"/>
        <circle cx="19" cy="21" r="1"/>
    `

};

function svg(name) {

    return `
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
        >
            ${icons[name] || ""}
        </svg>
    `;

}

document.querySelectorAll("[data-icon]").forEach(element => {

    element.innerHTML = svg(element.dataset.icon);

});

/* =========================================
   FORMAT DATA
========================================= */

const rupiah = value =>
    "Rp " + Number(value).toLocaleString("id-ID");

function escapeHTML(value) {

    return String(value ?? "").replace(
        /[&<>"']/g,
        character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]
    );

}

/* =========================================
   STATE
========================================= */

let state = {
    tenants: [],
    products: [],
    orders: [],
    voucher: null
};

let activeTenant = 1;

let cart = {};

let selectedPayment = "cash";

let appliedVoucher = "";

let busy = false;

let toastTimer;

/* =========================================
   NOTIFICATION
========================================= */

function toast(message) {

    $("toast").textContent = message;
    $("toast").hidden = false;

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {

        $("toast").hidden = true;

    }, 3000);

}

/* =========================================
   FETCH DATA BACKEND
========================================= */

async function loadData() {

    if (busy) return false;

    $("refresh").disabled = true;
    $("refresh").classList.add("spinning");

    $("notice").hidden = true;

    try {

        const response = await fetch(API, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("Gagal memuat menu.");
        }

        state = await response.json();
        if (
    appliedVoucher &&
    !(state.vouchers || []).some(
        item => item.code === appliedVoucher &&
                item.status === "active"
    )
) {

    appliedVoucher = "";

    $("voucher-message").textContent =
        "Voucher tidak lagi tersedia.";

    $("voucher-message").style.color = "#c75c4b";

}
        // Sesuaikan keranjang dengan stok terbaru.

        for (const id of Object.keys(cart)) {

            const product = state.products.find(
                item => item.id === Number(id)
            );

            if (!product || product.stock <= 0) {

                delete cart[id];

            } else {

                cart[id] = Math.min(
                    cart[id],
                    product.stock
                );

            }

        }

        renderAll();

        return true;

    } catch (error) {

        $("notice").textContent =
            "Data menu gagal dimuat. Pastikan backend berjalan.";

        $("notice").hidden = false;

        console.error(error);

        return false;

    } finally {

        $("refresh").disabled = false;
        $("refresh").classList.remove("spinning");

    }

}

/* =========================================
   TENANT FILTER
========================================= */

function renderTenants() {

    $("tenant-tabs").innerHTML = state.tenants
        .map(tenant => `

            <button
                class="tenant-tab ${
                    tenant.id === activeTenant ? "active" : ""
                }"
                data-tenant="${tenant.id}"
                aria-pressed="${tenant.id === activeTenant}"
                title="${escapeHTML(tenant.name)}"
            >
                Tenant ${tenant.id}
            </button>

        `)
        .join("");

}

/* =========================================
   RENDER PRODUCT CARDS
========================================= */

function renderProducts(animate = true) {

    const search = $("menu-search")
        .value
        .trim()
        .toLowerCase();

    const products = state.products.filter(product => {

        return (
            product.tenantId === activeTenant &&
            product.name.toLowerCase().includes(search)
        );

    });

    const tenant = state.tenants.find(
        item => item.id === activeTenant
    );

    $("menu-count").textContent =
        `${tenant?.name || "Tenant"} • ${products.length} menu`;

    $("food-grid").innerHTML = products.map((product, index) => {

        const quantity = cart[product.id] || 0;

        return `

            <article
                class="food-card ${quantity > 0 ? "in-cart" : ""}"
                style="--i:${index};${animate ? "" : "animation:none"}"
            >

                <div class="food-image">

                    <span>🍽️</span>

                    <img
                        src="${escapeHTML(product.image)}"
                        alt="${escapeHTML(product.name)}"
                    >

                    <span class="food-stock ${
                        product.stock === 0 ? "sold-out" : ""
                    }">

                        ${
                            product.stock === 0
                            ? "Habis"
                            : "Stok " + product.stock
                        }

                    </span>

                </div>

                <div class="food-info">

                    <div class="food-name">
                        ${escapeHTML(product.name)}
                    </div>

                    <div class="food-price">
                        ${rupiah(product.price)}
                    </div>

                </div>

                <div class="quantity-control">

                    <button
                        class="quantity-btn"
                        data-action="minus"
                        data-id="${product.id}"
                        aria-label="Kurangi ${escapeHTML(product.name)}"
                        ${quantity === 0 || busy ? "disabled" : ""}
                    >
                        −
                    </button>

                    <span class="quantity-value">
                        ${quantity}
                    </span>

                    <button
                        class="quantity-btn plus"
                        data-action="plus"
                        data-id="${product.id}"
                        aria-label="Tambah ${escapeHTML(product.name)}"
                        ${quantity >= product.stock || busy
                            ? "disabled"
                            : ""
                        }
                    >
                        +
                    </button>

                </div>

            </article>

        `;

    }).join("");

    if (products.length === 0) {

        $("food-grid").innerHTML = `
            <p class="empty">
                Menu tidak ditemukan.
            </p>
        `;

    }

}

/* =========================================
   CART FUNCTIONS
========================================= */

function getCartItems() {

    return Object.entries(cart)
        .map(([id, quantity]) => {

            const product = state.products.find(
                item => item.id === Number(id)
            );

            if (!product) return null;

            return {
                ...product,
                quantity,
                total: product.price * quantity
            };

        })
        .filter(Boolean);

}

function changeQuantity(id, amount) {

    if (busy) return;

    const product = state.products.find(
        item => item.id === id
    );

    if (!product) return;

    const oldQuantity = cart[id] || 0;

    const newQuantity = oldQuantity + amount;

    if (newQuantity > product.stock) {

        toast("Jumlah pesanan melebihi stok.");

        return;

    }

    if (newQuantity <= 0) {

        delete cart[id];

    } else {

        cart[id] = newQuantity;

    }

    renderProducts(false);
    renderCart();

}

/* =========================================
   RENDER CART
========================================= */

function renderCart() {

    const items = getCartItems();

    const totalQuantity = items.reduce(
        (total, item) => total + item.quantity,
        0
    );

    $("order-count").textContent =
        `${totalQuantity} item pesanan`;

    $("clear-cart").disabled =
        totalQuantity === 0 || busy;

    if (items.length === 0) {

        $("cart-items").innerHTML = `

            <div class="empty-cart">

                <div class="empty-cart-icon">
                    ${svg("cart")}
                </div>

                <strong>Belum ada pesanan</strong>

                <p>
                    Pilih menu makanan untuk menambahkan
                    pesanan pelanggan.
                </p>

            </div>

        `;

    } else {

        $("cart-items").innerHTML = items.map(item => {

            const tenant = state.tenants.find(
                tenant => tenant.id === item.tenantId
            );

            return `

                <article class="cart-item">

                    <img
                        class="cart-image"
                        src="${escapeHTML(item.image)}"
                        alt="${escapeHTML(item.name)}"
                    >

                    <div class="cart-info">

                        <div class="cart-name">
                            ${escapeHTML(item.name)}
                        </div>

                        <div class="cart-tenant">
                            ${escapeHTML(tenant?.name || "")}
                        </div>

                        <div class="cart-bottom">

                            <div class="cart-quantity">

                                <button
                                    data-action="minus"
                                    data-id="${item.id}"
                                    aria-label="Kurangi pesanan"
                                    ${busy ? "disabled" : ""}
                                >
                                    −
                                </button>

                                <span>${item.quantity}</span>

                                <button
                                    data-action="plus"
                                    data-id="${item.id}"
                                    aria-label="Tambah pesanan"
                                    ${
                                        busy || item.quantity >= item.stock
                                        ? "disabled"
                                        : ""
                                    }
                                >
                                    +
                                </button>

                            </div>

                            <span class="cart-price">
                                ${rupiah(item.total)}
                            </span>

                        </div>

                    </div>

                </article>

            `;

        }).join("");

    }

    renderPayment();

}

/* =========================================
   PAYMENT CALCULATION
========================================= */

function calculatePayment() {

    const subtotal = getCartItems().reduce(

        (total, item) => total + item.total,

        0

    );

    const voucher = (state.vouchers || []).find(

        item => item.code === appliedVoucher &&
                item.status === "active"

    );

    const discount = voucher

        ? Math.round(
            subtotal * voucher.percent / 100
        )

        : 0;

    return {

        subtotal,

        discount,

        total: subtotal - discount

    };

}

function renderPayment() {

    const payment = calculatePayment();

    $("subtotal").textContent = rupiah(payment.subtotal);

    $("discount").textContent =
        payment.discount > 0
        ? "− " + rupiah(payment.discount)
        : rupiah(0);

    $("total").textContent = rupiah(payment.total);

    $("checkout").disabled =
        getCartItems().length === 0 || busy;

}

/* =========================================
   APPLY VOUCHER
========================================= */

$("apply-voucher").addEventListener("click", () => {

    if (busy) return;

    const code = $("voucher-code")
        .value
        .trim()
        .toUpperCase();

    const message = $("voucher-message");

    appliedVoucher = "";

    if (!code) {

        message.textContent = "";

        renderPayment();

        return;

    }

    const voucher = (state.vouchers || []).find(

        item => item.code === code

    );

    if (!voucher) {

        message.textContent =
            "Kode voucher tidak valid.";

        message.style.color = "#c75c4b";

    } else if (voucher.status !== "active") {

        message.textContent =
            "Kuota voucher sudah habis.";

        message.style.color = "#c75c4b";

    } else {

        appliedVoucher = voucher.code;

        message.textContent =
            `Voucher berhasil! Diskon ${voucher.percent}%.`;

        message.style.color = "#57912f";

        toast("Voucher berhasil digunakan.");

    }

    renderPayment();

});

$("voucher-code").addEventListener("input", () => {

    if (
        $("voucher-code").value.trim().toUpperCase()
        !== appliedVoucher
    ) {

        appliedVoucher = "";

        $("voucher-message").textContent = "";

        renderPayment();

    }

});

/* =========================================
   PAYMENT METHOD SELECTION
========================================= */

document.querySelectorAll("[data-payment]").forEach(button => {

    button.addEventListener("click", () => {

        if (busy) return;

        selectedPayment = button.dataset.payment;

        document
            .querySelectorAll("[data-payment]")
            .forEach(item => {

                const active =
                    item.dataset.payment === selectedPayment;

                item.classList.toggle("selected", active);

                item.setAttribute("aria-pressed", active);

            });

    });

});

/* =========================================
   CHECKOUT
========================================= */

$("checkout").addEventListener("click", async () => {

    if (busy || getCartItems().length === 0) return;

    const paymentLabel =
        selectedPayment === "cash"
        ? "Tunai"
        : "QRIS (simulasi)";

    const confirmed = window.confirm(
        `Total: ${rupiah(calculatePayment().total)}\n` +
        `Pembayaran: ${paymentLabel}\n\n` +
        "Simpan transaksi ini?"
    );

    if (!confirmed) return;

    busy = true;

    renderProducts(false);
    renderCart();

    $("checkout").textContent = "Memproses...";

    try {

        const response = await fetch(API, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                items: getCartItems().map(item => ({
                    id: item.id,
                    quantity: item.quantity
                })),

                voucher: appliedVoucher,

                payment: selectedPayment

            })

        });

        const result = await response.json();

        if (!response.ok) {

            throw new Error(
                result.message || "Checkout gagal."
            );

        }

        // Reset keranjang setelah backend berhasil.

        cart = {};

        appliedVoucher = "";

        $("voucher-code").value = "";

        $("voucher-message").textContent = "";

        state = result.data;

        showSuccess(result.order);

        toast("Transaksi berhasil disimpan.");

    } catch (error) {

        toast(error.message);

    } finally {

        busy = false;

        $("checkout").innerHTML = `
            ${svg("receipt")}
            Checkout
            <span>→</span>
        `;

        renderAll();

    }

});

/* =========================================
   CHECKOUT SUCCESS MODAL
========================================= */

function showSuccess(order) {

    $("modal-title").textContent =
        "Transaksi Berhasil";

    $("modal-content").innerHTML = `

        <div class="success-content">

            <div class="success-icon">✓</div>

            <h3>Pesanan berhasil disimpan!</h3>

            <p>${escapeHTML(order.id)}</p>

            <strong>
                ${rupiah(order.total)}
            </strong>

            <p>
                ${
                    order.payment === "cash"
                    ? "Pembayaran Tunai"
                    : "Pembayaran QRIS — Simulasi"
                }
            </p>

            <button
                class="checkout-btn"
                data-action="finish"
            >
                Selesai
            </button>

        </div>

    `;

    $("transaction-modal").showModal();

}

/* =========================================
   TRANSACTION HISTORY
========================================= */

function showHistory(filter = "all") {

    $("modal-title").textContent =
        "Riwayat Transaksi";

    const today = jakartaDate(new Date());

    const orders = state.orders.filter(order => {

        if (filter === "today") {

            return jakartaDate(order.createdAt) === today;

        }

        if (filter === "normal") {

            return !order.voucher &&
                jakartaDate(order.createdAt) === today;

        }

        if (filter === "voucher") {

            return Boolean(order.voucher);

        }

        return true;

    });

    $("modal-content").innerHTML = `

        <select class="history-filter" id="history-filter">

            <option value="all"
                ${filter === "all" ? "selected" : ""}>
                Semua transaksi
            </option>

            <option value="today"
                ${filter === "today" ? "selected" : ""}>
                Transaksi hari ini
            </option>

            <option value="normal"
                ${filter === "normal" ? "selected" : ""}>
                Penjualan normal hari ini
            </option>

            <option value="voucher"
                ${filter === "voucher" ? "selected" : ""}>
                Transaksi dengan voucher
            </option>

        </select>

        ${
            orders.length === 0

            ? '<p class="empty">Belum ada riwayat transaksi.</p>'

            : orders.map(order => `

                <div class="history-item">

                    <div>

                        <h4>
                            ${escapeHTML(order.id)}
                        </h4>

                        <p>
                            ${escapeHTML(
                                new Date(order.createdAt)
                                    .toLocaleString("id-ID", {
                                        timeZone: "Asia/Jakarta"
                                    })
                            )}
                        </p>

                        <p>
                            ${order.items.map(item =>
                                `${escapeHTML(item.name)}
                                 × ${item.quantity}`
                            ).join(", ")}
                        </p>

                        <p>
                            ${
                                order.payment === "cash"
                                ? "Tunai"
                                : "QRIS — Simulasi"
                            }

                            ${order.voucher
                                ? " • " + escapeHTML(order.voucher)
                                : ""
                            }
                        </p>

                    </div>

                    <strong>
                        ${rupiah(order.total)}
                    </strong>

                </div>

            `).join("")
        }

    `;

    if (!$("transaction-modal").open) {

        $("transaction-modal").showModal();

    }

    $("history-filter").addEventListener("change", event => {

        showHistory(event.target.value);

    });

}

function jakartaDate(value) {

    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date(value));

}

/* =========================================
   EVENTS
========================================= */

document.addEventListener("click", event => {

    const tenantButton = event.target.closest("[data-tenant]");

    if (tenantButton) {

        activeTenant = Number(tenantButton.dataset.tenant);

        renderTenants();
        renderProducts();

    }

    const action = event.target.closest("[data-action]");

    if (!action) return;

    const id = Number(action.dataset.id);

    if (action.dataset.action === "plus") {

        changeQuantity(id, 1);

    }

    if (action.dataset.action === "minus") {

        changeQuantity(id, -1);

    }

    if (action.dataset.action === "finish") {

        $("transaction-modal").close();

    }

});

$("menu-search").addEventListener("input", () => {

    renderProducts(false);

});

$("clear-cart").addEventListener("click", () => {

    if (busy) return;

    cart = {};

    renderProducts(false);
    renderCart();

    toast("Pesanan dikosongkan.");

});

$("refresh").addEventListener("click", loadData);

$("history").addEventListener("click", () => {

    showHistory();

});

$("close-modal").addEventListener("click", () => {

    $("transaction-modal").close();

});

$("transaction-modal").addEventListener("click", event => {

    if (event.target === $("transaction-modal")) {

        $("transaction-modal").close();

    }

});

$("logout").addEventListener("click", () => {

    toast("Fitur logout belum diintegrasikan.");

});

/* Fallback apabila foto gagal dimuat */

document.addEventListener("error", event => {

    if (
        event.target instanceof HTMLImageElement &&
        !event.target.classList.contains("brand-logo")
    ) {

        event.target.style.visibility = "hidden";

    }

}, true);

/* =========================================
   INITIALIZATION
========================================= */

function renderAll() {

    renderTenants();
    renderProducts();
    renderCart();

}

async function initialize() {

    renderCart();

    const loaded = await loadData();

    if (!loaded) return;

    const params = new URLSearchParams(location.search);

    if (params.get("view") === "history") {

        showHistory(
            params.get("filter") || "all"
        );

    }

}

initialize();