"use strict";

const $ = (id) => document.getElementById(id);

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

    leaf: `
        <path d="M20 4C9 3 4 9 5 15s11 8 15-11ZM4 20 15 10"/>
    `,

    search: `
        <circle cx="10.5" cy="10.5" r="6.5"/>
        <path d="m16 16 5 5"/>
    `,

    refresh: `
        <path d="M20 7v5h-5M4 17v-5h5"/>
        <path d="M5 8a8 8 0 0 1 13-3l2 3M4 16l2 3a8 8 0 0 0 13-3"/>
    `,

    calendar: `
        <rect x="3" y="5" width="18" height="16" rx="2"/>
        <path d="M7 3v4m10-4v4M3 10h18"/>
    `,

    wallet: `
        <rect x="3" y="5" width="18" height="15" rx="3"/>
        <path d="M3 9h18m-5 5h2"/>
    `,

    trend: `
        <path d="m3 17 6-6 4 4 8-8m-6 0h6v6"/>
    `,

    flame: `
        <path d="M12 3c2 5 7 7 7 12a7 7 0 1 1-14 0c0-3 2-6 4-8 0 3 1 4 2 4 2-3 1-5 1-8Z"/>
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

document.querySelectorAll("[data-icon]").forEach((element) => {
    element.innerHTML = svg(element.dataset.icon);
});

/* =========================================
   FORMAT DATA
========================================= */

const rupiah = (value) =>
    "Rp " + Number(value).toLocaleString("id-ID");

const number = (value) =>
    Number(value).toLocaleString("id-ID");

function escapeHTML(value) {
    return String(value ?? "").replace(
        /[&<>"']/g,
        (character) => ({
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
let page = 1;
let requestId = 0;
let toastTimer;

const pageSize = 4;

const metricDefinitions = [
    {
        title: "Total Transaksi",
        icon: "receipt",
        key: "transactions",
        note: "Transaksi tercatat",
        currency: false
    },
    {
        title: "Total Pendapatan",
        icon: "wallet",
        key: "revenue",
        note: "Pendapatan penjualan",
        currency: true
    },
    {
        title: "Total Penjualan Normal",
        icon: "trend",
        key: "normalRevenue",
        note: "Penjualan tanpa voucher",
        currency: true
    },
    {
        title: "Total Voucher Dibuka",
        icon: "ticket",
        key: "activeVouchers",
        note: "Voucher aktif",
        currency: false
    }
];

/* =========================================
   ANIMASI COUNT UP
========================================= */

function animateValue(element, end, currency) {

    const format = currency ? rupiah : number;

    if (
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches
    ) {
        element.textContent = format(end);
        return;
    }

    const duration = 650;
    const start = performance.now();

    function frame(now) {

        if (!element.isConnected) return;

        const progress = Math.min(
            (now - start) / duration,
            1
        );

        const easing = 1 - Math.pow(1 - progress, 3);

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
   RENDER STATISTIC CARDS
========================================= */

function renderStats() {

    $("stats").innerHTML = metricDefinitions
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

                <strong
                    class="stat-value"
                    id="metric-${metric.key}"
                >
                    —
                </strong>

                <div class="stat-meta">
                    ${metric.note}
                </div>

            </article>
        `)
        .join("");

    if (!data) return;

    metricDefinitions.forEach((metric) => {

        animateValue(
            $(`metric-${metric.key}`),
            data.summary[metric.key],
            metric.currency
        );

    });
}

/* =========================================
   SEARCH FUNCTION
========================================= */

function matches(value, query) {

    return value
        .toLowerCase()
        .includes(query.trim().toLowerCase());

}

/* =========================================
   RENDER TABLE TENANT
========================================= */

function renderTenants() {

    if (!data) return;

    const globalQuery = $("global-search").value;
    const localQuery = $("tenant-search").value;

    const filtered = data.tenants.filter((tenant) => {

        return (
            matches(tenant.name, globalQuery) &&
            matches(tenant.name, localQuery)
        );

    });

    const totalPages = Math.max(
        1,
        Math.ceil(filtered.length / pageSize)
    );

    page = Math.max(1, Math.min(page, totalPages));

    const start = (page - 1) * pageSize;

    const rows = filtered.slice(
        start,
        start + pageSize
    );

    $("tenant-rows").innerHTML = rows
        .map((tenant) => `

            <tr>

                <td>
                    <div class="tenant-name">

                        <span class="tenant-icon">
                            ${escapeHTML(
                                tenant.name
                                    .slice(0, 2)
                                    .toUpperCase()
                            )}
                        </span>

                        ${escapeHTML(tenant.name)}

                    </div>
                </td>

                <td>
                    ${rupiah(tenant.revenue)}
                </td>

                <td>
                    ${number(tenant.transactions)}
                </td>

                <td>
                    <span class="stock ${
                        tenant.stock <= 10 ? "low" : ""
                    }">
                        ${number(tenant.stock)}
                    </span>
                </td>

                <td>
                    <button
                        class="detail-btn"
                        data-id="${Number(tenant.id)}"
                    >
                        Lihat Detail ›
                    </button>
                </td>

            </tr>

        `)
        .join("");

    if (rows.length === 0) {

        $("tenant-rows").innerHTML = `
            <tr>
                <td colspan="5" class="empty">
                    Tenant tidak ditemukan.
                </td>
            </tr>
        `;

    }

    $("table-info").textContent = filtered.length
        ? `Menampilkan ${start + 1}–${start + rows.length}
           dari ${filtered.length} tenant`
        : "0 tenant ditemukan";

    $("page-number").textContent =
        `${page} / ${totalPages}`;

    $("prev").disabled = page <= 1;

    $("next").disabled = page >= totalPages;
}

/* =========================================
   RENDER MENU UNGGULAN
========================================= */

function renderMenus() {

    if (!data) return;

    const query = $("global-search").value;

    const menus = data.menus.filter((menu) =>
        matches(menu.name + " " + menu.tenant, query)
    );

    $("menus").innerHTML = menus
        .map((menu, index) => `

            <article
                class="menu-card"
                style="--i:${index}"
            >

                <div class="menu-photo">

                    <span class="food-fallback">
                        ${escapeHTML(menu.emoji)}
                    </span>

                    <img
                        src="${escapeHTML(menu.image)}"
                        alt="${escapeHTML(menu.name)}"
                        loading="lazy"
                    >

                    <span class="rank">
                        #${data.menus.indexOf(menu) + 1} Terlaris
                    </span>

                </div>

                <div class="menu-content">

                    <span class="tenant-label">
                        ${escapeHTML(menu.tenant)}
                    </span>

                    <h3>
                        ${escapeHTML(menu.name)}
                    </h3>

                    <div class="menu-bottom">

                        <strong class="menu-price">
                            ${rupiah(menu.price)}
                        </strong>

                        <span class="sold">
                            ${number(menu.sold)} terjual
                        </span>

                    </div>

                </div>

            </article>

        `)
        .join("");

    if (menus.length === 0) {
        $("menus").innerHTML = `
            <p class="empty">
                Menu tidak ditemukan.
            </p>
        `;
    }

    // Fallback apabila foto makanan gagal dimuat
    document
        .querySelectorAll(".menu-photo img")
        .forEach((image) => {

            image.addEventListener("error", () => {
                image.hidden = true;
            }, { once: true });

            if (image.complete && !image.naturalWidth) {
                image.hidden = true;
            }

        });

    $("credits").innerHTML = menus
        .map((menu) => `
            <a
                href="${escapeHTML(menu.source)}"
                target="_blank"
                rel="noopener noreferrer"
            >
                ${escapeHTML(menu.name)}
                — ${escapeHTML(menu.credit)}
            </a>
        `)
        .join("");
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

    }, 3200);
}

/* =========================================
   FETCH API BACKEND
========================================= */

async function load() {

    const id = ++requestId;

    $("refresh").disabled = true;
    $("refresh").classList.add("spinning");
    $("error").hidden = true;

    try {

        const response = await fetch(
            "/api/kasir/dashboard",
            { cache: "no-store" }
        );

        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        const result = await response.json();

        if (id !== requestId) return;

        data = result;

        renderStats();
        renderTenants();
        renderMenus();

        $("demo-label").textContent = data.demo
            ? "• Data demonstrasi"
            : "• Data dashboard";

    } catch (error) {

        console.error(error);

        $("error").textContent =
            "Dashboard gagal memuat data. " +
            "Pastikan backend berjalan.";

        $("error").hidden = false;

    } finally {

        if (id === requestId) {

            $("refresh").disabled = false;
            $("refresh").classList.remove("spinning");

        }
    }
}

/* =========================================
   SEARCH EVENTS
========================================= */

$("global-search").addEventListener("input", () => {

    page = 1;
    renderTenants();
    renderMenus();

});

$("tenant-search").addEventListener("input", () => {

    page = 1;
    renderTenants();

});

/* =========================================
   PAGINATION EVENTS
========================================= */

$("prev").addEventListener("click", () => {

    page--;
    renderTenants();

});

$("next").addEventListener("click", () => {

    page++;
    renderTenants();

});

/* =========================================
   REFRESH DATA
========================================= */

$("refresh").addEventListener("click", load);

/* =========================================
   POPUP DETAIL TENANT
========================================= */

$("tenant-rows").addEventListener("click", (event) => {

    const button = event.target.closest("[data-id]");

    if (!button || !data) return;

    const tenant = data.tenants.find(
        (item) => item.id === Number(button.dataset.id)
    );

    if (!tenant) return;

    const details = [
        ["Pendapatan", rupiah(tenant.revenue)],
        ["Penjualan normal", rupiah(tenant.normalRevenue)],
        ["Transaksi", number(tenant.transactions)],
        ["Sisa makanan", number(tenant.stock)]
    ];

    $("detail-content").innerHTML = `
        <h3>${escapeHTML(tenant.name)}</h3>

        ${details.map(([label, value]) => `

            <div class="modal-row">
                <span>${label}</span>
                <strong>${value}</strong>
            </div>

        `).join("")}
    `;

    $("detail").showModal();

});

$("close-detail").addEventListener("click", () => {

    $("detail").close();

});

$("detail").addEventListener("click", (event) => {

    if (event.target === $("detail")) {
        $("detail").close();
    }

});

/* =========================================
   SIDEBAR NAVIGATION
========================================= */

document.querySelectorAll(".future").forEach((button) => {

    button.addEventListener("click", () => {

        toast(
            `${button.dataset.page} belum dihubungkan. ` +
            "Modul ini khusus Dashboard."
        );

    });

});

/* =========================================
   DISPLAY DATE
========================================= */

const today = new Date();

$("date").textContent = new Intl.DateTimeFormat(
    "id-ID",
    {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Jakarta"
    }
).format(today);

$("year").textContent = today.getFullYear();

/* =========================================
   INITIALIZATION
========================================= */

renderStats();
load();