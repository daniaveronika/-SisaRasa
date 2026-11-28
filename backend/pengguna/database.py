import hashlib
import os
import secrets
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "sisarasa.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def hash_password(password: str, salt: str | None = None) -> str:
    if salt is None:
        salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, digest = stored_hash.split("$", 1)
    except ValueError:
        return False
    check = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000).hex()
    return secrets.compare_digest(check, digest)


def init_db() -> None:
    conn = get_connection()
    cur = conn.cursor()

    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            phone TEXT DEFAULT '',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tenants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            address TEXT NOT NULL,
            open_hours TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            category TEXT NOT NULL CHECK(category IN ('Makanan', 'Minuman', 'Jajanan')),
            description TEXT NOT NULL,
            price INTEGER NOT NULL,
            image_url TEXT NOT NULL,
            is_featured INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        );

        CREATE TABLE IF NOT EXISTS flash_sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            normal_price INTEGER NOT NULL,
            discount_price INTEGER NOT NULL,
            stock INTEGER NOT NULL,
            initial_stock INTEGER NOT NULL,
            best_before TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            FOREIGN KEY (product_id) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS vouchers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            flash_sale_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            tenant_id INTEGER NOT NULL,
            voucher_code TEXT NOT NULL UNIQUE,
            price_paid INTEGER NOT NULL,
            best_before TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('Aktif', 'Digunakan', 'Kedaluwarsa')),
            claimed_at TEXT NOT NULL,
            used_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (flash_sale_id) REFERENCES flash_sales(id),
            FOREIGN KEY (product_id) REFERENCES products(id),
            FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            voucher_id INTEGER NOT NULL,
            amount INTEGER NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (voucher_id) REFERENCES vouchers(id)
        );
        """
    )

    conn.commit()
    seed_data(conn)
    conn.close()


def seed_data(conn: sqlite3.Connection) -> None:
    cur = conn.cursor()
    existing_tenants = cur.execute("SELECT COUNT(*) FROM tenants").fetchone()[0]
    if existing_tenants > 0:
        return

    now = datetime.now()
    now_iso = now.isoformat(timespec="seconds")

    # Demo customer user
    demo_pw = hash_password("sisarasa123")
    cur.execute(
        "INSERT INTO users (name, email, password_hash, phone, created_at) VALUES (?, ?, ?, ?, ?)",
        ("Rina Wijaya", "demo@sisarasa.id", demo_pw, "0812-3456-7890", now_iso),
    )
    demo_user_id = cur.lastrowid

    # Tenants matching mockup PDF & prompt
    tenants = [
        ("Tenant 1", "Yes Resto", "Katering & restoran hidangan nusantara dan western siap saji berkualitas.", "Jl. Merdeka No. 18, Food Court Blok A", "08.00 - 21.30 WIB", now_iso),
        ("Tenant 2", "Kopi Kampus", "Kedai kopi & minuman kekinian favorit mahasiswa dengan bahan premium.", "Jl. Kampus Raya No. 7, Gedung Kreatif", "07.30 - 22.00 WIB", now_iso),
        ("Tenant 3", "Nijon", "Spesialis jajanan renyah ala street food dengan saus pilihan.", "Jl. Taman Sari No. 24, Kios 3", "10.00 - 21.30 WIB", now_iso),
    ]
    cur.executemany(
        "INSERT INTO tenants (code, name, description, address, open_hours, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        tenants,
    )

    tenant_map = {
        row["name"]: row["id"]
        for row in cur.execute("SELECT id, name FROM tenants").fetchall()
    }

    # Products matching mockup PDF & prompt
    products = [
        (
            tenant_map["Yes Resto"],
            "Ayam Kremes",
            "Makanan",
            "Ayam goreng renyah dengan taburan kremes gurih, nasi hangat, lalapan segar, dan sambal terasi spesial.",
            25000,
            "/images/ayam-kremes.jpg",
            1,
            now_iso,
        ),
        (
            tenant_map["Yes Resto"],
            "Fish and Chips",
            "Makanan",
            "Fillet ikan dori goreng tepung renyah disajikan bersama kentang goreng renyah, lemon, dan saus tartar.",
            32000,
            "/images/fish-and-chips.jpg",
            0,
            now_iso,
        ),
        (
            tenant_map["Yes Resto"],
            "Karage",
            "Makanan",
            "Ayam karage Jepang berbumbu khas yang juicy di dalam dan renyah di luar, lengkap dengan saus manis gurih.",
            25000,
            "/images/karage.jpg",
            1,
            now_iso,
        ),
        (
            tenant_map["Yes Resto"],
            "Chicken Cordon Bleu",
            "Makanan",
            "Dada ayam fillet gulung isi smoked beef dan keju lumer berlapis tepung roti renyah.",
            35000,
            "/images/chicken-cordon-bleu.jpg",
            0,
            now_iso,
        ),
        (
            tenant_map["Yes Resto"],
            "Nasi Kotak",
            "Makanan",
            "Paket nasi kotak katering lengkap dengan ayam panggang bumbu manis, lauk pendamping, dan sambal.",
            28000,
            "/images/nasi-kotak.jpg",
            1,
            now_iso,
        ),
        (
            tenant_map["Yes Resto"],
            "Nasi Goreng",
            "Makanan",
            "Nasi goreng spesial bumbu rempah lengkap dengan udang, telur mata sapi, acar, dan kerupuk renyah.",
            25000,
            "/images/nasi-goreng.jpg",
            0,
            now_iso,
        ),
        (
            tenant_map["Kopi Kampus"],
            "Americano",
            "Minuman",
            "Es kopi hitam pilihan dari biji arabika panggang medium dengan cita rasa bersih dan menyegarkan.",
            18000,
            "/images/americano.jpg",
            0,
            now_iso,
        ),
        (
            tenant_map["Kopi Kampus"],
            "Matcha",
            "Minuman",
            "Perpaduan bubuk matcha autentik Jepang dengan susu segar creamy, nikmat diminum dingin.",
            22000,
            "/images/matcha.jpg",
            0,
            now_iso,
        ),
        (
            tenant_map["Kopi Kampus"],
            "Taro Latte",
            "Minuman",
            "Minuman susu creamy rasa talas ungu manis lembut yang menenangkan dan menyegarkan.",
            22000,
            "/images/taro-latte.jpg",
            0,
            now_iso,
        ),
        (
            tenant_map["Nijon"],
            "Chik Lien",
            "Jajanan",
            "Potongan ayam crispy Taiwan berbumbu gurih pedas manis yang renyah dan cocok untuk camilan.",
            18000,
            "/images/chik-lien.jpg",
            0,
            now_iso,
        ),
        (
            tenant_map["Nijon"],
            "Chikuro",
            "Jajanan",
            "Churros gurih-manis renyah berlapis keju leleh hangat, camilan populer favorit semua kalangan.",
            20000,
            "/images/chikuro.jpg",
            0,
            now_iso,
        ),
    ]

    cur.executemany(
        """
        INSERT INTO products (tenant_id, name, category, description, price, image_url, is_featured, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        products,
    )

    product_map = {
        row["name"]: row
        for row in cur.execute("SELECT id, name, price, tenant_id FROM products").fetchall()
    }

    today_end = (now + timedelta(hours=6)).isoformat(timespec="seconds")
    tomorrow_end = (now + timedelta(hours=8)).isoformat(timespec="seconds")

    # Flash sales (surplus food available at discounted prices)
    flash_sales_seed = [
        ("Nasi Goreng", 25000, 15000, 8, 12, "Hari ini, 21.00 WIB", today_end),
        ("Karage", 25000, 14000, 6, 10, "Hari ini, 20.30 WIB", today_end),
        ("Ayam Kremes", 25000, 15000, 5, 10, "Hari ini, 21.00 WIB", today_end),
        ("Chicken Cordon Bleu", 35000, 20000, 3, 6, "Hari ini, 21.30 WIB", tomorrow_end),
        ("Fish and Chips", 32000, 18000, 4, 8, "Hari ini, 20.30 WIB", today_end),
        ("Nasi Kotak", 28000, 16000, 10, 15, "Hari ini, 20.00 WIB", today_end),
        ("Americano", 18000, 10000, 7, 10, "Hari ini, 22.00 WIB", tomorrow_end),
        ("Matcha", 22000, 13000, 5, 8, "Hari ini, 21.30 WIB", tomorrow_end),
        ("Taro Latte", 22000, 13000, 4, 8, "Hari ini, 21.30 WIB", tomorrow_end),
        ("Chik Lien", 18000, 10000, 9, 12, "Hari ini, 21.00 WIB", today_end),
        ("Chikuro", 20000, 12000, 6, 10, "Hari ini, 21.00 WIB", today_end),
    ]

    for prod_name, normal_p, disc_p, stock, init_stock, best_before, expires_at in flash_sales_seed:
        p = product_map[prod_name]
        cur.execute(
            """
            INSERT INTO flash_sales (product_id, normal_price, discount_price, stock, initial_stock, best_before, expires_at, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
            """,
            (p["id"], normal_p, disc_p, stock, init_stock, best_before, expires_at, now_iso),
        )

    fs_map = {
        row["product_id"]: row["id"]
        for row in cur.execute("SELECT id, product_id FROM flash_sales").fetchall()
    }

    # Pre-seeded demo vouchers across all 3 statuses (Aktif, Digunakan, Kedaluwarsa)
    seed_vouchers = [
        (
            demo_user_id,
            fs_map[product_map["Nasi Goreng"]["id"]],
            product_map["Nasi Goreng"]["id"],
            product_map["Nasi Goreng"]["tenant_id"],
            "SR-YES1-8421",
            15000,
            "Hari ini, 21.00 WIB",
            (now + timedelta(hours=5)).isoformat(timespec="seconds"),
            "Aktif",
            (now - timedelta(minutes=35)).isoformat(timespec="seconds"),
            None,
        ),
        (
            demo_user_id,
            fs_map[product_map["Ayam Kremes"]["id"]],
            product_map["Ayam Kremes"]["id"],
            product_map["Ayam Kremes"]["tenant_id"],
            "SR-YES1-3905",
            15000,
            "Hari ini, 21.00 WIB",
            (now + timedelta(hours=4)).isoformat(timespec="seconds"),
            "Aktif",
            (now - timedelta(hours=1)).isoformat(timespec="seconds"),
            None,
        ),
        (
            demo_user_id,
            fs_map[product_map["Karage"]["id"]],
            product_map["Karage"]["id"],
            product_map["Karage"]["tenant_id"],
            "SR-YES1-5172",
            14000,
            "Kemarin, 20.30 WIB",
            (now - timedelta(days=1)).isoformat(timespec="seconds"),
            "Digunakan",
            (now - timedelta(days=1, hours=3)).isoformat(timespec="seconds"),
            (now - timedelta(days=1, hours=1)).isoformat(timespec="seconds"),
        ),
        (
            demo_user_id,
            fs_map[product_map["Chicken Cordon Bleu"]["id"]],
            product_map["Chicken Cordon Bleu"]["id"],
            product_map["Chicken Cordon Bleu"]["tenant_id"],
            "SR-YES1-1094",
            20000,
            "2 hari lalu, 21.00 WIB",
            (now - timedelta(days=2)).isoformat(timespec="seconds"),
            "Kedaluwarsa",
            (now - timedelta(days=2, hours=5)).isoformat(timespec="seconds"),
            None,
        ),
    ]

    for v in seed_vouchers:
        cur.execute(
            """
            INSERT INTO vouchers (
                user_id, flash_sale_id, product_id, tenant_id, voucher_code,
                price_paid, best_before, expires_at, status, claimed_at, used_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            v,
        )
        voucher_id = cur.lastrowid
        cur.execute(
            """
            INSERT INTO transactions (user_id, voucher_id, amount, status, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (v[0], voucher_id, v[5], "COMPLETED" if v[8] == "Digunakan" else "CLAIMED", v[9]),
        )

    conn.commit()
