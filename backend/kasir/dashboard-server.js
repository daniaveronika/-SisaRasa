"use strict";

const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const handleTransaksi = require("./transaksi-api");

/* =========================================
   SERVER CONFIGURATION
========================================= */

const PORT = Number(
    process.env.DASHBOARD_PORT || 3101
);

const ROOT = path.resolve(
    __dirname,
    "../../frontend/kasir"
);

/* =========================================
   DASHBOARD DATA
========================================= */

const tenants = [

    {
        id: 1,
        name: "Yes Resto",
        revenue: 3500000,
        transactions: 95,
        stock: 61,
        normalRevenue: 3200000
    },

    {
        id: 2,
        name: "Jajangga",
        revenue: 2550000,
        transactions: 80,
        stock: 8,
        normalRevenue: 2300000
    },

    {
        id: 3,
        name: "Fit Me",
        revenue: 2050000,
        transactions: 70,
        stock: 17,
        normalRevenue: 1850000
    },

    {
        id: 4,
        name: "Kopi Kenangan",
        revenue: 1100000,
        transactions: 37,
        stock: 13,
        normalRevenue: 1000000
    },

    {
        id: 5,
        name: "Dapur Nusantara",
        revenue: 550000,
        transactions: 48,
        stock: 11,
        normalRevenue: 500000
    },

    {
        id: 6,
        name: "Nasi & Rasa",
        revenue: 400000,
        transactions: 40,
        stock: 9,
        normalRevenue: 300000
    }

];

/* =========================================
   MENU UNGGULAN
========================================= */

const menus = [

    {
        id: 1,
        tenant: "Yes Resto",
        name: "Nasi Katsu",
        price: 15000,
        sold: 58,
        image: "/assets/foods/katsu.jpg",
        emoji: "🍛",
        credit: "Foto menu lokal",
        source: "/assets/foods/katsu.jpg"
    },

    {
        id: 2,
        tenant: "Yes Resto",
        name: "Karaage",
        price: 15000,
        sold: 46,
        image: "/assets/foods/karaage.jpg",
        emoji: "🍗",
        credit: "Foto menu lokal",
        source: "/assets/foods/karaage.jpg"
    },

    {
        id: 3,
        tenant: "Yes Resto",
        name: "Ayam Kremes",
        price: 15000,
        sold: 39,
        image: "/assets/foods/kremes.jpg",
        emoji: "🍗",
        credit: "Foto menu lokal",
        source: "/assets/foods/kremes.jpg"
    }

];

/* =========================================
   DASHBOARD STATISTICS
========================================= */

function sum(key) {

    return tenants.reduce(
        (total, tenant) => total + tenant[key],
        0
    );

}

function getDashboardData() {

    return {

        summary: {

            transactions: sum("transactions"),

            revenue: sum("revenue"),

            normalRevenue: sum("normalRevenue"),

            activeVouchers: 10

        },

        tenants,

        menus: [...menus].sort(
            (a, b) => b.sold - a.sold
        ),

        demo: true

    };

}

/* =========================================
   JSON RESPONSE
========================================= */

function json(response, statusCode, data) {

    response.writeHead(statusCode, {

        "Content-Type":
            "application/json; charset=utf-8",

        "Cache-Control": "no-store"

    });

    response.end(JSON.stringify(data));

}

/* =========================================
   MIME TYPES
========================================= */

const mime = {

    ".html": "text/html; charset=utf-8",

    ".css": "text/css; charset=utf-8",

    ".js": "text/javascript; charset=utf-8",

    ".json": "application/json; charset=utf-8",

    ".svg": "image/svg+xml",

    ".png": "image/png",

    ".jpg": "image/jpeg",

    ".jpeg": "image/jpeg",

    ".webp": "image/webp",

    ".woff2": "font/woff2",

    ".woff": "font/woff",

    ".ttf": "font/ttf",

    ".ico": "image/x-icon"

};

/* =========================================
   PAGE ROUTES
========================================= */

const pages = {

    "/": "pages/dashboard.html",

    "/dashboard": "pages/dashboard.html",

    "/transaksi": "pages/transaksi.html",

    "/tenant": "pages/tenant.html",

    "/voucher": "pages/voucher.html"

};

/* =========================================
   MAIN SERVER
========================================= */

const server = http.createServer(

    async (request, response) => {

        try {

            /* =================================
               API TRANSAKSI, TENANT, VOUCHER
            ================================= */

            const handled = await handleTransaksi(
                request,
                response
            );

            if (handled) {
                return;
            }

            /* =================================
               VALIDATE REQUEST METHOD
            ================================= */

            if (request.method !== "GET") {

                return json(response, 405, {

                    message: "Metode tidak diizinkan."

                });

            }

            const url = new URL(

                request.url,

                "http://localhost"

            );

            /* =================================
               API DASHBOARD
            ================================= */

            if (
                url.pathname === "/api/kasir/dashboard"
            ) {

                return json(

                    response,

                    200,

                    getDashboardData()

                );

            }

            /* =================================
               UNKNOWN API
            ================================= */

            if (url.pathname.startsWith("/api/")) {

                return json(response, 404, {

                    message: "Endpoint tidak ditemukan.",

                    endpoint: url.pathname

                });

            }

            /* =================================
               FRONTEND FILES
            ================================= */

            const relativePath =
                pages[url.pathname] ||

                decodeURIComponent(url.pathname)
                    .replace(/^\/+/, "");

            const filePath = path.resolve(

                ROOT,

                relativePath

            );

            /* SECURITY VALIDATION */

            if (
                !filePath.startsWith(ROOT + path.sep)
            ) {

                return json(response, 403, {

                    message: "Akses ditolak."

                });

            }

            const file = await fs.readFile(filePath);

            const extension = path.extname(
                filePath
            ).toLowerCase();

            response.writeHead(200, {

                "Content-Type":
                    mime[extension] ||
                    "application/octet-stream",

                "Cache-Control": "no-cache"

            });

            response.end(file);

        } catch (error) {

            console.error(error);

            if (response.headersSent) {
                response.end();
                return;
            }

            const notFound =
                error.code === "ENOENT" ||
                error.code === "EISDIR";

            json(

                response,

                notFound ? 404 : 500,

                {

                    message: notFound

                        ? "File tidak ditemukan."

                        : "Terjadi kesalahan server."

                }

            );

        }

    }

);

/* =========================================
   SERVER ERROR HANDLER
========================================= */

server.on("error", error => {

    if (error.code === "EADDRINUSE") {

        console.error(
            `Port ${PORT} sedang digunakan.`
        );

    } else {

        console.error(error.message);

    }

    process.exitCode = 1;

});

/* =========================================
   START SERVER
========================================= */

server.listen(PORT, "127.0.0.1", () => {

    console.log("");

    console.log("======================================");

    console.log(" SISARASA CASHIER SYSTEM");

    console.log("======================================");

    console.log(`Dashboard : http://127.0.0.1:${PORT}/`);

    console.log(`Transaksi : http://127.0.0.1:${PORT}/transaksi`);

    console.log(`Tenant    : http://127.0.0.1:${PORT}/tenant`);

    console.log(`Voucher   : http://127.0.0.1:${PORT}/voucher`);

    console.log("--------------------------------------");

    console.log("API Dashboard : /api/kasir/dashboard");

    console.log("API Transaksi : /api/kasir/transaksi");

    console.log("API Tenant    : /api/kasir/tenant");

    console.log("API Voucher   : /api/kasir/voucher");

    console.log("--------------------------------------");

    console.log("Status : Server Running");

    console.log("======================================");

});