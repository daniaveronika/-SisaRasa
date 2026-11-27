"use strict";

const $ = id => document.getElementById(id);

const API = "/api/kasir/voucher";

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

    check: `
        <circle cx="12" cy="12" r="9"/>
        <path d="m8 12 3 3 5-6"/>
    `,

    copy: `
        <rect x="8" y="8" width="12" height="12" rx="2"/>
        <path d="M16 8V4H4v12h4"/>
    `

};

function svg(name) {

    return `
        <svg viewBox="0 0 24 24"
             fill="none"
             stroke="currentColor"
             stroke-width="1.8"
             stroke-linecap="round"
             stroke-linejoin="round"
             aria-hidden="true">

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

let activeFilter = "all";

let toastTimer;

/* =========================================
   TOAST NOTIFICATION
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
   FETCH API
========================================= */

async function loadData() {

    $("refresh").disabled = true;

    $("error").hidden = true;

    try {

        const response = await fetch(API, {
            cache: "no-store"
        });

        if (!response.ok) {

            throw new Error(
                "API Voucher gagal dimuat. HTTP " +
                response.status
            );

        }

        data = await response.json();

        renderStats();

        renderVouchers();

    } catch (error) {

        $("error").textContent =
            "Gagal memuat data voucher. " +
            error.message;

        $("error").hidden = false;

        console.error(error);

    } finally {

        $("refresh").disabled = false;

    }

}

/* =========================================
   STATISTIC ANIMATION
========================================= */

function animateValue(element, value, currency) {

    const format = currency ? rupiah : number;

    if (
        matchMedia("(prefers-reduced-motion: reduce)")
            .matches
    ) {

        element.textContent = format(value);

        return;

    }

    const start = performance.now();

    function frame(now) {

        if (!element.isConnected) return;

        const progress = Math.min(
            (now - start) / 650,
            1
        );

        const easing =
            1 - Math.pow(1 - progress, 3);

        element.textContent = format(
            Math.round(value * easing)
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

    const summary = data.summary;

    const metrics = [

        {
            label: "Total Potongan Voucher",
            value: summary.totalDiscount,
            currency: true,
            icon: "wallet",
            note: "Akumulasi diskon pelanggan"
        },

        {
            label: "Voucher Tersedia",
            value: summary.activeVouchers,
            currency: false,
            icon: "ticket",
            note: "Kode voucher yang masih aktif"
        },

        {
            label: "Total Digunakan",
            value: summary.totalUsed,
            currency: false,
            icon: "check",
            note: "Total penggunaan voucher"
        }

    ];

    $("stats").innerHTML = metrics
        .map((item, index) => `

            <article class="stat-card"
                     style="--i:${index}">

                <div class="stat-top">

                    <span class="stat-label">
                        ${item.label}
                    </span>

                    <span class="stat-icon">
                        ${svg(item.icon)}
                    </span>

                </div>

                <strong class="stat-value"
                        id="metric-${index}">
                    —
                </strong>

                <p class="stat-note">
                    ${item.note}
                </p>

            </article>

        `).join("");

    metrics.forEach((item, index) => {

        animateValue(
            $(`metric-${index}`),
            item.value,
            item.currency
        );

    });

}

/* =========================================
   VOUCHER CARDS
========================================= */

function renderVouchers() {

    if (!data) return;

    const query = $("search")
        .value.trim().toLowerCase();

    const vouchers = data.vouchers.filter(voucher => {

        const matchSearch =
            (voucher.name + " " + voucher.code)
                .toLowerCase()
                .includes(query);

        const matchStatus =
            activeFilter === "all" ||
            voucher.status === activeFilter;

        return matchSearch && matchStatus;

    });

    $("voucher-count").textContent =
        `${vouchers.length} voucher ditemukan`;

    $("voucher-grid").innerHTML = vouchers.map(

        (voucher, index) => {

            const progress = Math.min(
                100,
                voucher.used / voucher.limit * 100
            );

            const active =
                voucher.status === "active";

            return `

                <article class="voucher-card"
                         style="--i:${index}">

                    <div class="voucher-header">

                        <div>

                            <span class="voucher-status
                                ${active ? "" : "exhausted"}">

                                ${active
                                    ? "Voucher Aktif"
                                    : "Kuota Habis"}

                            </span>

                            <h3 class="voucher-name">

                                ${escapeHTML(voucher.name)}

                            </h3>

                            <p class="voucher-description">
                                Diskon untuk pesanan pelanggan
                            </p>

                        </div>

                        <div class="discount-badge">

                            <strong>
                                ${voucher.percent}%
                            </strong>

                            <small>OFF</small>

                        </div>

                    </div>

                    <div class="usage">

                        <div class="usage-label">

                            <span>Penggunaan</span>

                            <strong>
                                ${voucher.used}/${voucher.limit}
                            </strong>

                        </div>

                        <div class="progress-track"
                             role="progressbar"
                             aria-label="Penggunaan voucher"
                             aria-valuenow="${progress}"
                             aria-valuemin="0"
                             aria-valuemax="100">

                            <div class="progress-fill"
                                 style="--progress:${progress}%">
                            </div>

                        </div>

                    </div>

                    <div class="code-box">

                        <span class="voucher-code">

                            ${escapeHTML(voucher.code)}

                        </span>

                        <button
                            class="copy-btn"
                            data-copy="${escapeHTML(voucher.code)}"
                            ${active ? "" : "disabled"}
                        >

                            ${svg("copy")}
                            Salin

                        </button>

                    </div>

                    <button class="detail-btn"
                            data-detail="${escapeHTML(voucher.code)}">

                        Lihat Detail →

                    </button>

                </article>

            `;

        }

    ).join("");

    if (!vouchers.length) {

        $("voucher-grid").innerHTML = `
            <div class="empty">
                Tidak ada voucher yang ditemukan.
            </div>
        `;

    }

}

/* =========================================
   COPY VOUCHER CODE
========================================= */

async function copyCode(code) {

    try {

        await navigator.clipboard.writeText(code);

        toast(`Kode ${code} berhasil disalin.`);

    } catch {

        toast(`Salin secara manual: ${code}`);

    }

}

/* =========================================
   VOUCHER DETAIL POPUP
========================================= */

function showDetail(code) {

    const voucher = data?.vouchers.find(
        item => item.code === code
    );

    if (!voucher) return;

    $("modal-content").innerHTML = `

        <div class="modal-offer">

            <strong>${voucher.percent}% OFF</strong>

            <p>${escapeHTML(voucher.name)}</p>

        </div>

        <div class="modal-row">

            <span>Kode Voucher</span>

            <strong>${escapeHTML(voucher.code)}</strong>

        </div>

        <div class="modal-row">

            <span>Status</span>

            <strong>
                ${voucher.status === "active"
                    ? "Aktif"
                    : "Kuota Habis"}
            </strong>

        </div>

        <div class="modal-row">

            <span>Total Kuota</span>

            <strong>${voucher.limit}</strong>

        </div>

        <div class="modal-row">

            <span>Sudah Digunakan</span>

            <strong>${voucher.used}</strong>

        </div>

        <div class="modal-row">

            <span>Kuota Tersisa</span>

            <strong>${voucher.remaining}</strong>

        </div>

        <p class="modal-note">

            Voucher berlaku untuk total pesanan
            selama kuota masih tersedia.
            Satu voucher dapat digunakan
            dalam setiap transaksi.

        </p>

        <button class="modal-action"
                data-copy="${escapeHTML(voucher.code)}"
                ${voucher.status === "active"
                    ? ""
                    : "disabled"}>

            Salin Kode Voucher

        </button>

    `;

    $("detail-modal").showModal();

}

/* =========================================
   EVENTS
========================================= */

document.querySelectorAll("[data-filter]").forEach(button => {

    button.addEventListener("click", () => {

        activeFilter = button.dataset.filter;

        document.querySelectorAll("[data-filter]")
            .forEach(item => {

                item.classList.toggle(
                    "active",
                    item === button
                );

            });

        renderVouchers();

    });

});

document.addEventListener("click", event => {

    const copy = event.target.closest("[data-copy]");

    const detail = event.target.closest("[data-detail]");

    if (copy && !copy.disabled) {

        copyCode(copy.dataset.copy);

    }

    if (detail) {

        showDetail(detail.dataset.detail);

    }

});

$("search").addEventListener("input", renderVouchers);

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

/* =========================================
   INITIALIZATION
========================================= */

loadData();