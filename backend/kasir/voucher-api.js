"use strict";

const voucherList = [
    {
        id: 1,
        name: "Flash Sale",
        code: "SISA20",
        percent: 20,
        limit: 30
    },
    {
        id: 2,
        name: "Green Deals",
        code: "GREEN15",
        percent: 15,
        limit: 30
    },
    {
        id: 3,
        name: "Hemat Makan",
        code: "HEMAT10",
        percent: 10,
        limit: 30
    },
    {
        id: 4,
        name: "Food Rescue",
        code: "RESCUE25",
        percent: 25,
        limit: 30
    },
    {
        id: 5,
        name: "Special Deal",
        code: "SPECIAL30",
        percent: 30,
        limit: 30
    },
    {
        id: 6,
        name: "Lunch Deals",
        code: "LUNCH15",
        percent: 15,
        limit: 30
    },
    {
        id: 7,
        name: "Surplus Saver",
        code: "SURPLUS20",
        percent: 20,
        limit: 30
    },
    {
        id: 8,
        name: "SisaRasa Deals",
        code: "RASA10",
        percent: 10,
        limit: 30
    }
];

/* =========================================
   VOUCHER USAGE
========================================= */

function getVouchers(orders = []) {

    return voucherList.map(voucher => {

        const used = orders.filter(
            order => order.voucher === voucher.code
        ).length;

        const remaining = Math.max(
            0,
            voucher.limit - used
        );

        return {
            ...voucher,

            used,

            remaining,

            status: remaining > 0
                ? "active"
                : "exhausted"
        };

    });

}

/* =========================================
   VOUCHER OVERVIEW
========================================= */

function getVoucherOverview(orders = []) {

    const vouchers = getVouchers(orders);

    const codes = new Set(
        vouchers.map(voucher => voucher.code)
    );

    const voucherOrders = orders.filter(
        order => codes.has(order.voucher)
    );

    const totalDiscount = voucherOrders.reduce(
        (sum, order) => sum + Number(order.discount || 0),
        0
    );

    return {

        summary: {

            totalDiscount,

            activeVouchers: vouchers.filter(
                voucher => voucher.status === "active"
            ).length,

            totalUsed: voucherOrders.length,

            remainingQuota: vouchers.reduce(
                (sum, voucher) => sum + voucher.remaining,
                0
            )

        },

        vouchers

    };

}

module.exports = {
    getVouchers,
    getVoucherOverview
};