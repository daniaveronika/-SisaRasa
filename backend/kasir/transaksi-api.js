"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const {
    getVouchers,
    getVoucherOverview
} = require("./voucher-api");

const DATA_FILE = path.join(
    __dirname,
    "transaksi-data.json"
);

/* =========================================
   MASTER DATA TENANT
========================================= */

const tenants = [
    "Yes Resto",
    "Jajangga",
    "Fit Me",
    "Kopi Kenangan",
    "Dapur Nusantara",
    "Nasi & Rasa"
].map((name, index) => ({
    id: index + 1,
    name
}));

/* =========================================
   MASTER DATA MAKANAN
========================================= */

const menus = [
    ["Ayam Kremes", 15000, "kremes.jpg", 20],
    ["Karaage", 15000, "karaage.jpg", 25],
    ["Nasi Katsu", 15000, "katsu.jpg", 18],
    ["Fish and Chips", 15000, "fish.jpg", 15],
    ["Nasi Goreng", 15000, "goreng.jpg", 30],
    ["Bihun Goreng", 15000, "bihun.jpg", 18],
    ["Nasi Soto", 15000, "soto.jpg", 22],
    ["Nasi Pecel", 15000, "pecel.jpg", 20],
    ["Kwetiau", 15000, "kwetiau.jpg", 16],
    ["Mie Pangsit", 15000, "pangsit.jpg", 20]
];

const selections = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 4, 5],
    [2, 3, 7],
    [0, 8, 9],
    [4, 6, 7],
    [0, 5, 9]
];

const products = tenants.flatMap(tenant =>

    selections[tenant.id - 1].map(index => {

        const [name, price, image, stock] =
            menus[index];

        return {
            id: tenant.id * 100 + index + 1,
            tenantId: tenant.id,
            name,
            price,
            image: "/assets/foods/" + image,
            stock
        };

    })

);

/* =========================================
   READ TRANSACTION DATA
========================================= */

function readOrders() {

    try {

        const orders = JSON.parse(
            fs.readFileSync(DATA_FILE, "utf8")
        );

        if (!Array.isArray(orders)) {
            throw new Error(
                "Format transaksi-data.json tidak valid."
            );
        }

        return orders;

    } catch (error) {

        if (error.code === "ENOENT") {
            return [];
        }

        throw error;

    }

}

/* =========================================
   SAVE TRANSACTION DATA
========================================= */

function saveOrders(orders) {

    const temporary = DATA_FILE + ".tmp";

    fs.writeFileSync(
        temporary,
        JSON.stringify(orders, null, 2),
        "utf8"
    );

    fs.renameSync(temporary, DATA_FILE);

}

/* =========================================
   GET TRANSACTION DATA AND STOCK
========================================= */

function getData(orders = readOrders()) {

    const sold = new Map();

    for (const order of orders) {

        for (const item of order.items) {

            sold.set(
                item.id,
                (sold.get(item.id) || 0) +
                item.quantity
            );

        }

    }

    const vouchers = getVouchers(orders);

    return {

        tenants,

        products: products.map(product => ({

            ...product,

            stock: Math.max(
                0,
                product.stock -
                (sold.get(product.id) || 0)
            )

        })),

        orders: [...orders].reverse(),

        voucher: vouchers.find(
            item =>
                item.code === "SISA20" &&
                item.status === "active"
        ) || null,

        vouchers

    };

}

/* =========================================
   JSON RESPONSE
========================================= */

function json(response, status, data) {

    response.writeHead(status, {
        "Content-Type":
            "application/json; charset=utf-8",

        "Cache-Control": "no-store"
    });

    response.end(JSON.stringify(data));

}

/* =========================================
   ERROR VALIDATION
========================================= */

function fail(message, status = 400) {

    const error = new Error(message);

    error.status = status;

    throw error;

}

/* =========================================
   READ REQUEST BODY
========================================= */

async function readBody(request) {

    let body = "";

    for await (const chunk of request) {

        body += chunk;

        if (Buffer.byteLength(body) > 65536) {
            fail("Data terlalu besar.", 413);
        }

    }

    try {

        return JSON.parse(body);

    } catch {

        fail("Format data tidak valid.");

    }

}

/* =========================================
   CHECKOUT TRANSACTION
========================================= */

function checkout(input) {

    if (
        !input ||
        !Array.isArray(input.items) ||
        input.items.length === 0
    ) {
        fail("Keranjang masih kosong.");
    }

    if (!["cash", "qris"].includes(input.payment)) {
        fail("Metode pembayaran tidak valid.");
    }

    const orders = readOrders();

    const data = getData(orders);

    const quantities = new Map();

    /* VALIDASI JUMLAH PESANAN */

    for (const item of input.items) {

        if (
            !item ||
            !Number.isSafeInteger(item.id) ||
            !Number.isSafeInteger(item.quantity) ||
            item.quantity < 1
        ) {
            fail("Jumlah pesanan tidak valid.");
        }

        const quantity =
            (quantities.get(item.id) || 0) +
            item.quantity;

        if (!Number.isSafeInteger(quantity)) {
            fail("Jumlah pesanan tidak valid.");
        }

        quantities.set(item.id, quantity);

    }

    const items = [];

    /* VALIDASI STOK */

    for (const [id, quantity] of quantities) {

        const product = data.products.find(
            item => item.id === id
        );

        if (!product) {
            fail("Menu tidak ditemukan.");
        }

        if (quantity > product.stock) {

            fail(
                `Stok ${product.name} tidak mencukupi.`,
                409
            );

        }

        items.push({
            id,
            tenantId: product.tenantId,
            name: product.name,
            price: product.price,
            quantity,
            total: product.price * quantity
        });

    }

    /* VALIDASI VOUCHER */

    const code = String(input.voucher || "")
        .trim()
        .toUpperCase();

    const selectedVoucher = getVouchers(orders).find(
        voucher => voucher.code === code
    );

    if (code && !selectedVoucher) {
        fail("Kode voucher tidak valid.");
    }

    if (
        selectedVoucher &&
        selectedVoucher.remaining <= 0
    ) {
        fail("Kuota voucher sudah habis.", 409);
    }

    /* HITUNG PEMBAYARAN */

    const subtotal = items.reduce(
        (sum, item) => sum + item.total,
        0
    );

    const discount = selectedVoucher

        ? Math.round(
            subtotal * selectedVoucher.percent / 100
        )

        : 0;

    const total = subtotal - discount;

    /* SIMPAN TRANSAKSI */

    const order = {

        id: "TRX-" +
            randomUUID().slice(0, 8).toUpperCase(),

        createdAt: new Date().toISOString(),

        items,

        subtotal,

        discount,

        total,

        voucher: code || null,

        payment: input.payment

    };

    orders.push(order);

    saveOrders(orders);

    return {

        message: "Transaksi berhasil disimpan.",

        order,

        data: getData(orders)

    };

}

/* =========================================
   DATE CONFIGURATION - ASIA/JAKARTA
========================================= */

function dateKey(value) {

    const parts = Object.fromEntries(

        new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Jakarta",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        })
        .formatToParts(new Date(value))
        .map(part => [
            part.type,
            part.value
        ])

    );

    return `${parts.year}-${parts.month}-${parts.day}`;

}

function getHour(value) {

    return Number(

        new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Jakarta",
            hour: "2-digit",
            hourCycle: "h23"
        }).format(new Date(value))

    );

}

/* =========================================
   TENANT OVERVIEW
========================================= */

function getTenantOverview() {

    const data = getData();

    const today = dateKey(new Date());

    const summaries = data.tenants.map(tenant => ({

        id: tenant.id,

        name: tenant.name,

        revenue: 0,

        transactions: 0,

        soldToday: 0,

        soldAllTime: 0,

        initialStock: 0,

        remainingStock: 0,

        revenueChart: [
            { label: "00–04", value: 0 },
            { label: "04–08", value: 0 },
            { label: "08–12", value: 0 },
            { label: "12–16", value: 0 },
            { label: "16–20", value: 0 },
            { label: "20–24", value: 0 }
        ],

        products: []

    }));

    const tenantMap = new Map(

        summaries.map(tenant => [
            tenant.id,
            tenant
        ])

    );

    const productMap = new Map();

    /* HITUNG STOK MAKANAN */

    for (const product of data.products) {

        const tenant = tenantMap.get(
            product.tenantId
        );

        if (!tenant) continue;

        const masterProduct = products.find(
            item => item.id === product.id
        );

        const initialStock = masterProduct

            ? masterProduct.stock

            : product.stock;

        const soldAllTime = Math.max(
            0,
            initialStock - product.stock
        );

        const item = {

            ...product,

            initialStock,

            soldAllTime,

            soldToday: 0,

            transactions: 0,

            revenue: 0

        };

        tenant.products.push(item);

        tenant.initialStock += initialStock;

        tenant.remainingStock += product.stock;

        tenant.soldAllTime += soldAllTime;

        productMap.set(product.id, item);

    }

    /* FILTER TRANSAKSI HARI INI */

    const todayOrders = data.orders.filter(
        order => dateKey(order.createdAt) === today
    );

    /* HITUNG STATISTIK TENANT */

    for (const order of todayOrders) {

        if (order.subtotal <= 0) continue;

        const hour = getHour(order.createdAt);

        const chartIndex = Math.min(
            5,
            Math.floor(hour / 4)
        );

        const countedTenants = new Set();

        const countedProducts = new Set();

        let cumulativeGross = 0;

        let previousAllocated = 0;

        for (const item of order.items) {

            cumulativeGross += item.total;

            const allocatedRevenue = Math.round(

                order.total *
                cumulativeGross /
                order.subtotal

            );

            const netRevenue =
                allocatedRevenue - previousAllocated;

            previousAllocated = allocatedRevenue;

            const tenant = tenantMap.get(
                item.tenantId
            );

            const product = productMap.get(
                item.id
            );

            if (!tenant || !product) continue;

            /* PENDAPATAN TENANT */

            tenant.revenue += netRevenue;

            tenant.soldToday += item.quantity;

            tenant.revenueChart[
                chartIndex
            ].value += netRevenue;

            /* PENDAPATAN PRODUK */

            product.soldToday += item.quantity;

            product.revenue += netRevenue;

            /* TOTAL TRANSAKSI TENANT */

            if (!countedTenants.has(tenant.id)) {

                tenant.transactions++;

                countedTenants.add(tenant.id);

            }

            /* TOTAL TRANSAKSI PRODUK */

            if (!countedProducts.has(product.id)) {

                product.transactions++;

                countedProducts.add(product.id);

            }

        }

    }

    /* SORT PRODUK TERLARIS */

    for (const tenant of summaries) {

        tenant.products.sort(

            (a, b) =>
                b.soldToday - a.soldToday ||
                a.name.localeCompare(b.name)

        );

    }

    return {

        date: today,

        tenants: summaries

    };

}

/* =========================================
   REST API HANDLER
   TRANSAKSI, TENANT, VOUCHER
========================================= */

async function handleTransaksi(request, response) {

    const url = new URL(
        request.url,
        "http://localhost"
    );

    const isTransaksi =
        url.pathname === "/api/kasir/transaksi";

    const isTenant =
        url.pathname === "/api/kasir/tenant";

    const isVoucher =
        url.pathname === "/api/kasir/voucher";

    if (!isTransaksi && !isTenant && !isVoucher) {

        return false;

    }

    try {

        /* GET TRANSAKSI */

        if (
            isTransaksi &&
            request.method === "GET"
        ) {

            json(
                response,
                200,
                getData()
            );

            return true;

        }

        /* POST CHECKOUT */

        if (
            isTransaksi &&
            request.method === "POST"
        ) {

            const input = await readBody(request);

            json(
                response,
                201,
                checkout(input)
            );

            return true;

        }

        /* GET TENANT */

        if (
            isTenant &&
            request.method === "GET"
        ) {

            json(
                response,
                200,
                getTenantOverview()
            );

            return true;

        }

        /* GET VOUCHER */

        if (
            isVoucher &&
            request.method === "GET"
        ) {

            json(
                response,
                200,
                getVoucherOverview(readOrders())
            );

            return true;

        }

        /* METHOD NOT ALLOWED */

        json(response, 405, {
            message: "Metode tidak diizinkan."
        });

    } catch (error) {

        console.error(error);

        json(
            response,
            error.status || 500,
            {
                message: error.status

                    ? error.message

                    : "Terjadi kesalahan server."
            }
        );

    }

    return true;

}

module.exports = handleTransaksi;