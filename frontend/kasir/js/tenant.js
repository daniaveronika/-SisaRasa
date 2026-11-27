"use strict";

const $ = id => document.getElementById(id);

const API = "/api/kasir/tenant";

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

    wallet: `
        <rect x="3" y="5" width="18" height="15" rx="3"/>
        <path d="M3 9h18m-5 5h2"/>
    `,

    trend: `
        <path d="m3 17 6-6 4 4 8-8m-6 0h6v6"/>
    `,

    box: `
        <path d="M3 7 12 3l9 4v10l-9 4-9-4V7Z"/>
        <path d="m3 7 9 5 9-5m-9 5v9M7 5l10 5"/>
    `,

    calendar: `
        <rect x="3" y="5" width="18" height="16" rx="2"/>
        <path d="M7 3v4m10-4v4M3 10h18"/>
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

const number = value =>
    Number(value).toLocaleString("id-ID");

function compact(value) {

    return new Intl.NumberFormat("id-ID", {

        notation: "compact",

        maximumFractionDigits: 1

    }).format(value);

}

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

let data = null;

let activeTenant =
    Number(
        new URLSearchParams(location.search).get("id")
    ) || 1;

let page = 1;

const pageSize = 5;

let toastTimer;

function currentTenant() {

    return data?.tenants.find(
        tenant => tenant.id === activeTenant
    );

}

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
   FETCH BACKEND
========================================= */

async function loadData() {

    $("refresh").disabled = true;

    $("refresh").classList.add("spinning");

    $("tenant-error").hidden = true;

    try {

        const response = await fetch(API, {
            cache: "no-store"
        });

        if (!response.ok) {

            throw new Error(
                "Data tenant gagal dimuat."
            );

        }

        data = await response.json();

        if (!currentTenant()) {

            activeTenant = data.tenants[0]?.id;

        }

        if (data.date) {

            const date = new Date(
                data.date + "T00:00:00+07:00"
            );

            $("date").textContent =
                new Intl.DateTimeFormat("id-ID", {

                    weekday: "short",

                    day: "numeric",

                    month: "long",

                    year: "numeric",

                    timeZone: "Asia/Jakarta"

                }).format(date);

        }

        renderAll();

    } catch (error) {

        $("tenant-error").textContent =
            "Gagal memuat data tenant. " +
            "Pastikan backend berjalan dan API Tenant tersedia.";

        $("tenant-error").hidden = false;

        console.error(error);

    } finally {

        $("refresh").disabled = false;

        $("refresh").classList.remove("spinning");

    }

}

/* =========================================
   TENANT TABS
========================================= */

function renderTenants() {

    if (!data) return;

    $("tenant-tabs").innerHTML = data.tenants
        .map(tenant => `

            <button
                class="tenant-tab ${
                    tenant.id === activeTenant
                    ? "active"
                    : ""
                }"
                data-tenant="${tenant.id}"
                title="${escapeHTML(tenant.name)}"
                aria-pressed="${tenant.id === activeTenant}"
            >

                Tenant ${tenant.id}

            </button>

        `)
        .join("");

}

/* =========================================
   ANIMASI STATISTIK
========================================= */

function animateValue(element, end, currency) {

    const format = currency ? rupiah : number;

    if (
        matchMedia("(prefers-reduced-motion: reduce)")
            .matches
    ) {

        element.textContent = format(end);

        return;

    }

    const start = performance.now();

    const duration = 600;

    function frame(now) {

        if (!element.isConnected) return;

        const progress = Math.min(
            (now - start) / duration,
            1
        );

        const easing =
            1 - Math.pow(1 - progress, 3);

        element.textContent = format(

            Math.round(end * easing)

        );

        if (progress < 1) {

            requestAnimationFrame(frame);

        }

    }

    requestAnimationFrame(frame);

}

/* =========================================
   STATISTIC CARDS
========================================= */

function renderStats() {

    const tenant = currentTenant();

    if (!tenant) return;

    const metrics = [

        {
            title: "Total Pendapatan",
            value: tenant.revenue,
            icon: "wallet",
            note: "Pendapatan bersih hari ini",
            currency: true
        },

        {
            title: "Total Transaksi",
            value: tenant.transactions,
            icon: "receipt",
            note: "Transaksi hari ini",
            currency: false
        },

        {
            title: "Produk Terjual",
            value: tenant.soldToday,
            icon: "trend",
            note: "Porsi terjual hari ini",
            currency: false
        },

        {
            title: "Sisa Makanan",
            value: tenant.remainingStock,
            icon: "box",
            note: "Stok makanan tersedia",
            currency: false
        }

    ];

    $("stats").innerHTML = metrics
        .map((metric, index) => `

            <article
                class="stat-card"
                style="--i:${index}"
            >

                <div class="stat-top">

                    <span class="stat-label">
                        ${metric.title}
                    </span>

                    <span class="stat-icon">
                        ${svg(metric.icon)}
                    </span>

                </div>

                <strong class="stat-value"
                        id="metric-${index}">
                    —
                </strong>

                <div class="stat-meta">
                    ${metric.note}
                </div>

            </article>

        `)
        .join("");

    metrics.forEach((metric, index) => {

        animateValue(

            $(`metric-${index}`),

            metric.value,

            metric.currency

        );

    });

}

/* =========================================
   REVENUE BAR CHART
========================================= */

function renderRevenue() {

    const tenant = currentTenant();

    if (!tenant) return;

    $("chart-total").textContent =
        rupiah(tenant.revenue);

    const peak = Math.max(

        0,

        ...tenant.revenueChart.map(item => item.value)

    );

    const peakItem = tenant.revenueChart.find(

        item => item.value === peak && peak > 0

    );

    $("revenue-chart").innerHTML =
        tenant.revenueChart.map(item => {

            const height = peak > 0

                ? item.value / peak * 100

                : 0;

            return `

                <div class="chart-column">

                    <span class="chart-bar-value">

                        ${escapeHTML(compact(item.value))}

                    </span>

                    <div class="chart-bar-track">

                        <div
                            class="chart-bar
                                ${item.value === 0 ? "zero" : ""}
                                ${
                                    item.value === peak && peak > 0
                                    ? "peak"
                                    : ""
                                }"

                            style="--height:${height}%"

                            title="${escapeHTML(
                                item.label + ": " +
                                rupiah(item.value)
                            )}"

                            role="img"

                            aria-label="${escapeHTML(
                                item.label + ": " +
                                rupiah(item.value)
                            )}"
                        >
                        </div>

                    </div>

                    <span class="chart-time">

                        ${escapeHTML(item.label)}

                    </span>

                </div>

            `;

        }).join("");

    $("peak-time").textContent =
        peakItem ? peakItem.label : "—";

    $("peak-revenue").textContent =
        rupiah(peak);

}

/* =========================================
   STOCK DONUT CHART
========================================= */

function renderStock() {

    const tenant = currentTenant();

    if (!tenant) return;

    const percentage = tenant.initialStock > 0

        ? tenant.soldAllTime /
            tenant.initialStock * 100

        : 0;

    $("stock-donut").style.setProperty(

        "--percent",

        Math.max(
            0,
            Math.min(100, percentage)
        ) + "%"

    );

    $("stock-percent").textContent =
        Math.round(percentage) + "%";

    $("initial-stock").textContent =
        number(tenant.initialStock);

    $("sold-stock").textContent =
        number(tenant.soldAllTime);

    $("remaining-stock").textContent =
        number(tenant.remainingStock);

}

/* =========================================
   SALES HISTORY TABLE
========================================= */

function renderHistory() {

    const tenant = currentTenant();

    if (!tenant) return;

    const globalSearch = $("global-search")
        .value.trim().toLowerCase();

    const localSearch = $("history-search")
        .value.trim().toLowerCase();

    const filtered = tenant.products.filter(product => {

        const name = product.name.toLowerCase();

        return name.includes(globalSearch) &&
               name.includes(localSearch);

    });

    const totalPages = Math.max(

        1,

        Math.ceil(filtered.length / pageSize)

    );

    page = Math.max(
        1,
        Math.min(page, totalPages)
    );

    const start = (page - 1) * pageSize;

    const rows = filtered.slice(
        start,
        start + pageSize
    );

    $("history-rows").innerHTML = rows
        .map(product => `

            <tr>

                <td>

                    <div class="product-cell">

                        <img
                            class="product-thumbnail"
                            src="${escapeHTML(product.image)}"
                            alt="${escapeHTML(product.name)}"
                        >

                        ${escapeHTML(product.name)}

                    </div>

                </td>

                <td>${rupiah(product.price)}</td>

                <td>${number(product.transactions)}</td>

                <td>${number(product.soldToday)}</td>

                <td>

                    <span class="sales-stock ${
                        product.stock === 0

                        ? "empty-stock"

                        : product.stock <= 5

                        ? "low"

                        : ""
                    }">

                        ${number(product.stock)}

                    </span>

                </td>

                <td>

                    <button
                        class="detail-btn"
                        data-product="${product.id}"
                    >

                        Lihat Detail ›

                    </button>

                </td>

            </tr>

        `)
        .join("");

    if (!rows.length) {

        $("history-rows").innerHTML = `

            <tr>

                <td colspan="6" class="empty">

                    Menu tidak ditemukan.

                </td>

            </tr>

        `;

    }

    $("table-info").textContent = filtered.length

        ? `Menampilkan ${start + 1}–${start + rows.length}
           dari ${filtered.length} menu`

        : "0 menu ditemukan";

    $("page-number").textContent =
        `${page} / ${totalPages}`;

    $("prev").disabled = page <= 1;

    $("next").disabled = page >= totalPages;

}

/* =========================================
   POPUP DETAIL MAKANAN
========================================= */

function showDetail(id) {

    const tenant = currentTenant();

    const product = tenant?.products.find(

        item => item.id === id

    );

    if (!product) return;

    $("modal-content").innerHTML = `

        <div class="modal-food">

            <img
                src="${escapeHTML(product.image)}"
                alt="${escapeHTML(product.name)}"
            >

            <div>

                <h3>
                    ${escapeHTML(product.name)}
                </h3>

                <p>
                    ${escapeHTML(tenant.name)}
                </p>

            </div>

        </div>

        <div class="modal-row">

            <span>Harga Satuan</span>

            <strong>${rupiah(product.price)}</strong>

        </div>

        <div class="modal-row">

            <span>Total Transaksi Hari Ini</span>

            <strong>${number(product.transactions)}</strong>

        </div>

        <div class="modal-row">

            <span>Terjual Hari Ini</span>

            <strong>${number(product.soldToday)} porsi</strong>

        </div>

        <div class="modal-row">

            <span>Persediaan Awal</span>

            <strong>${number(product.initialStock)} porsi</strong>

        </div>

        <div class="modal-row">

            <span>Stok Tersisa</span>

            <strong>${number(product.stock)} porsi</strong>

        </div>

        <div class="modal-row">

            <span>Pendapatan Hari Ini</span>

            <strong>${rupiah(product.revenue)}</strong>

        </div>

    `;

    $("detail-modal").showModal();

}

/* =========================================
   EVENT LISTENERS
========================================= */

$("tenant-tabs").addEventListener("click", event => {

    const button = event.target.closest("[data-tenant]");

    if (!button) return;

    activeTenant = Number(button.dataset.tenant);

    page = 1;

    $("history-search").value = "";

    $("global-search").value = "";

    renderAll();

});

$("history-rows").addEventListener("click", event => {

    const button = event.target.closest("[data-product]");

    if (!button) return;

    showDetail(Number(button.dataset.product));

});

$("global-search").addEventListener("input", () => {

    page = 1;

    renderHistory();

});

$("history-search").addEventListener("input", () => {

    page = 1;

    renderHistory();

});

$("prev").addEventListener("click", () => {

    page--;

    renderHistory();

});

$("next").addEventListener("click", () => {

    page++;

    renderHistory();

});

$("refresh").addEventListener("click", loadData);

$("close-modal").addEventListener("click", () => {

    $("detail-modal").close();

});

$("detail-modal").addEventListener("click", event => {

    if (event.target === $("detail-modal")) {

        $("detail-modal").close();

    }

});

$("logout").addEventListener("click", () => {

    toast("Fitur logout belum diintegrasikan.");

});

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

    const tenant = currentTenant();

    if (!tenant) return;

    $("tenant-name").textContent = tenant.name;

    renderTenants();

    renderStats();

    renderRevenue();

    renderStock();

    renderHistory();

}

loadData();