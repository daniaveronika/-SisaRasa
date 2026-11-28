from contextlib import asynccontextmanager
from datetime import datetime
import secrets
import string
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware

from auth import create_access_token, get_current_user
from database import get_connection, hash_password, init_db, verify_password
from schemas import (
    AuthResponse,
    ClaimVoucherRequest,
    FlashSaleResponse,
    LoginRequest,
    ProductResponse,
    RegisterRequest,
    UserResponse,
    VoucherResponse,
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="SisaRasa Analytics — Customer API",
    description="API Konsumen untuk redistribusi makanan berlebih UMKM katering via flash sale & voucher digital.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _sync_expired_vouchers(conn) -> None:
    now_iso = datetime.now().isoformat(timespec="seconds")
    conn.execute(
        """
        UPDATE vouchers
        SET status = 'Kedaluwarsa'
        WHERE status = 'Aktif' AND expires_at < ?
        """,
        (now_iso,),
    )
    conn.commit()


def _generate_unique_voucher_code(conn, tenant_code: str) -> str:
    prefix = "".join(ch for ch in tenant_code.upper() if ch.isalnum())[:4] or "SR"
    alphabet = string.ascii_uppercase + string.digits
    for _ in range(20):
        suffix = "".join(secrets.choice(alphabet) for _ in range(4))
        mid = "".join(secrets.choice(string.digits) for _ in range(4))
        code = f"SR-{prefix}-{mid}{suffix[:2]}"
        exists = conn.execute(
            "SELECT 1 FROM vouchers WHERE voucher_code = ?", (code,)
        ).fetchone()
        if not exists:
            return code
    return f"SR-{secrets.token_hex(4).upper()}"


def _row_to_product(row) -> ProductResponse:
    return ProductResponse(
        id=row["id"],
        tenant_id=row["tenant_id"],
        tenant_code=row["tenant_code"],
        tenant_name=row["tenant_name"],
        tenant_address=row["tenant_address"],
        tenant_open_hours=row["tenant_open_hours"],
        name=row["name"],
        category=row["category"],
        description=row["description"],
        price=row["price"],
        image_url=row["image_url"],
        is_featured=bool(row["is_featured"]),
        flash_sale_id=row["flash_sale_id"],
        discount_price=row["discount_price"],
        flash_sale_stock=row["flash_sale_stock"],
        best_before=row["best_before"],
    )


def _row_to_flash_sale(row) -> FlashSaleResponse:
    normal_p = row["normal_price"]
    disc_p = row["discount_price"]
    disc_pct = round(((normal_p - disc_p) / normal_p) * 100) if normal_p > 0 else 0
    return FlashSaleResponse(
        id=row["id"],
        product_id=row["product_id"],
        tenant_id=row["tenant_id"],
        tenant_code=row["tenant_code"],
        tenant_name=row["tenant_name"],
        tenant_address=row["tenant_address"],
        tenant_open_hours=row["tenant_open_hours"],
        name=row["name"],
        category=row["category"],
        description=row["description"],
        image_url=row["image_url"],
        normal_price=normal_p,
        discount_price=disc_p,
        discount_percent=disc_pct,
        stock=row["stock"],
        initial_stock=row["initial_stock"],
        best_before=row["best_before"],
        expires_at=row["expires_at"],
        is_active=bool(row["is_active"]),
    )


def _row_to_voucher(row) -> VoucherResponse:
    return VoucherResponse(
        id=row["id"],
        user_id=row["user_id"],
        flash_sale_id=row["flash_sale_id"],
        product_id=row["product_id"],
        tenant_id=row["tenant_id"],
        tenant_code=row["tenant_code"],
        tenant_name=row["tenant_name"],
        tenant_address=row["tenant_address"],
        tenant_open_hours=row["tenant_open_hours"],
        product_name=row["product_name"],
        product_category=row["product_category"],
        product_description=row["product_description"],
        image_url=row["image_url"],
        normal_price=row["normal_price"],
        voucher_code=row["voucher_code"],
        price_paid=row["price_paid"],
        best_before=row["best_before"],
        expires_at=row["expires_at"],
        status=row["status"],
        claimed_at=row["claimed_at"],
        used_at=row["used_at"],
    )


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "sisarasa-customer-api"}


@app.post("/api/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest):
    email = payload.email.strip().lower()
    name = payload.name.strip()
    phone = payload.phone.strip()

    conn = get_connection()
    try:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email sudah terdaftar. Silakan masuk menggunakan akun Anda.",
            )
        now_iso = datetime.now().isoformat(timespec="seconds")
        pw_hash = hash_password(payload.password)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO users (name, email, password_hash, phone, created_at) VALUES (?, ?, ?, ?, ?)",
            (name, email, pw_hash, phone, now_iso),
        )
        user_id = cur.lastrowid
        conn.commit()
        user_row = conn.execute(
            "SELECT id, name, email, phone, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    finally:
        conn.close()

    user = UserResponse(**dict(user_row))
    token = create_access_token(user.id, user.email)
    return AuthResponse(access_token=token, user=user)


@app.post("/api/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest):
    email = payload.email.strip().lower()
    conn = get_connection()
    try:
        user_row = conn.execute(
            "SELECT id, name, email, password_hash, phone, created_at FROM users WHERE email = ?",
            (email,),
        ).fetchone()
    finally:
        conn.close()

    if not user_row or not verify_password(payload.password, user_row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau kata sandi tidak sesuai.",
        )

    user = UserResponse(
        id=user_row["id"],
        name=user_row["name"],
        email=user_row["email"],
        phone=user_row["phone"],
        created_at=user_row["created_at"],
    )
    token = create_access_token(user.id, user.email)
    return AuthResponse(access_token=token, user=user)


@app.get("/api/auth/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)


@app.get("/api/products")
def list_products(
    category: Optional[str] = Query(default=None, description="Comma-separated categories: Makanan,Minuman,Jajanan"),
    sort_by: str = Query(default="default", description="default, name_asc, name_desc, price_asc, price_desc"),
    search: Optional[str] = Query(default=None),
    featured: Optional[bool] = Query(default=None),
    limit: Optional[int] = Query(default=None, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    where_clauses = []
    params: list = []

    if category:
        cats = [c.strip() for c in category.split(",") if c.strip()]
        if cats:
            placeholders = ",".join("?" for _ in cats)
            where_clauses.append(f"p.category IN ({placeholders})")
            params.extend(cats)

    if search:
        like_q = f"%{search.strip()}%"
        where_clauses.append("(p.name LIKE ? OR p.description LIKE ? OR t.name LIKE ?)")
        params.extend([like_q, like_q, like_q])

    if featured is not None:
        where_clauses.append("p.is_featured = ?")
        params.append(1 if featured else 0)

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    order_map = {
        "default": "p.is_featured DESC, p.id ASC",
        "name_asc": "p.name ASC",
        "name_desc": "p.name DESC",
        "price_asc": "p.price ASC, p.name ASC",
        "price_desc": "p.price DESC, p.name ASC",
    }
    order_sql = order_map.get(sort_by, order_map["default"])

    base_select = f"""
        FROM products p
        JOIN tenants t ON t.id = p.tenant_id
        LEFT JOIN flash_sales fs ON fs.product_id = p.id AND fs.is_active = 1
        {where_sql}
    """

    conn = get_connection()
    try:
        total = conn.execute(f"SELECT COUNT(*) {base_select}", params).fetchone()[0]
        query = f"""
            SELECT
                p.id, p.tenant_id, t.code AS tenant_code, t.name AS tenant_name,
                t.address AS tenant_address, t.open_hours AS tenant_open_hours,
                p.name, p.category, p.description, p.price, p.image_url, p.is_featured,
                fs.id AS flash_sale_id, fs.discount_price, fs.stock AS flash_sale_stock, fs.best_before
            {base_select}
            ORDER BY {order_sql}
        """
        exec_params = list(params)
        if limit is not None:
            query += " LIMIT ? OFFSET ?"
            exec_params.extend([limit, offset])

        rows = conn.execute(query, exec_params).fetchall()
    finally:
        conn.close()

    return {
        "items": [_row_to_product(r) for r in rows],
        "total": total,
    }


@app.get("/api/products/{product_id}", response_model=ProductResponse)
def get_product_detail(product_id: int):
    conn = get_connection()
    try:
        row = conn.execute(
            """
            SELECT
                p.id, p.tenant_id, t.code AS tenant_code, t.name AS tenant_name,
                t.address AS tenant_address, t.open_hours AS tenant_open_hours,
                p.name, p.category, p.description, p.price, p.image_url, p.is_featured,
                fs.id AS flash_sale_id, fs.discount_price, fs.stock AS flash_sale_stock, fs.best_before
            FROM products p
            JOIN tenants t ON t.id = p.tenant_id
            LEFT JOIN flash_sales fs ON fs.product_id = p.id AND fs.is_active = 1
            WHERE p.id = ?
            """,
            (product_id,),
        ).fetchone()
    finally:
        conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan.")
    return _row_to_product(row)


@app.get("/api/flash-sales")
def list_flash_sales(
    category: Optional[str] = Query(default=None),
    sort_by: str = Query(default="default", description="default, name_asc, name_desc, price_asc, price_desc, stock_desc"),
    search: Optional[str] = Query(default=None),
    limit: Optional[int] = Query(default=None, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    where_clauses = ["fs.is_active = 1"]
    params: list = []

    if category:
        cats = [c.strip() for c in category.split(",") if c.strip()]
        if cats:
            placeholders = ",".join("?" for _ in cats)
            where_clauses.append(f"p.category IN ({placeholders})")
            params.extend(cats)

    if search:
        like_q = f"%{search.strip()}%"
        where_clauses.append("(p.name LIKE ? OR p.description LIKE ? OR t.name LIKE ?)")
        params.extend([like_q, like_q, like_q])

    where_sql = "WHERE " + " AND ".join(where_clauses)

    order_map = {
        "default": "fs.id ASC",
        "name_asc": "p.name ASC",
        "name_desc": "p.name DESC",
        "price_asc": "fs.discount_price ASC, p.name ASC",
        "price_desc": "fs.discount_price DESC, p.name ASC",
        "stock_desc": "fs.stock DESC, p.name ASC",
    }
    order_sql = order_map.get(sort_by, order_map["default"])

    base_select = f"""
        FROM flash_sales fs
        JOIN products p ON p.id = fs.product_id
        JOIN tenants t ON t.id = p.tenant_id
        {where_sql}
    """

    conn = get_connection()
    try:
        total = conn.execute(f"SELECT COUNT(*) {base_select}", params).fetchone()[0]
        query = f"""
            SELECT
                fs.id, fs.product_id, p.tenant_id, t.code AS tenant_code, t.name AS tenant_name,
                t.address AS tenant_address, t.open_hours AS tenant_open_hours,
                p.name, p.category, p.description, p.image_url,
                fs.normal_price, fs.discount_price, fs.stock, fs.initial_stock,
                fs.best_before, fs.expires_at, fs.is_active
            {base_select}
            ORDER BY {order_sql}
        """
        exec_params = list(params)
        if limit is not None:
            query += " LIMIT ? OFFSET ?"
            exec_params.extend([limit, offset])

        rows = conn.execute(query, exec_params).fetchall()
    finally:
        conn.close()

    return {
        "items": [_row_to_flash_sale(r) for r in rows],
        "total": total,
    }


@app.get("/api/flash-sales/{flash_sale_id}", response_model=FlashSaleResponse)
def get_flash_sale_detail(flash_sale_id: int):
    conn = get_connection()
    try:
        row = conn.execute(
            """
            SELECT
                fs.id, fs.product_id, p.tenant_id, t.code AS tenant_code, t.name AS tenant_name,
                t.address AS tenant_address, t.open_hours AS tenant_open_hours,
                p.name, p.category, p.description, p.image_url,
                fs.normal_price, fs.discount_price, fs.stock, fs.initial_stock,
                fs.best_before, fs.expires_at, fs.is_active
            FROM flash_sales fs
            JOIN products p ON p.id = fs.product_id
            JOIN tenants t ON t.id = p.tenant_id
            WHERE fs.id = ?
            """,
            (flash_sale_id,),
        ).fetchone()
    finally:
        conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Produk flash sale tidak ditemukan.")
    return _row_to_flash_sale(row)


@app.post("/api/vouchers/claim", response_model=VoucherResponse, status_code=status.HTTP_201_CREATED)
def claim_voucher(
    payload: ClaimVoucherRequest,
    current_user: dict = Depends(get_current_user),
):
    conn = get_connection()
    try:
        _sync_expired_vouchers(conn)
        cur = conn.cursor()
        cur.execute("BEGIN IMMEDIATE")

        fs = cur.execute(
            """
            SELECT fs.*, p.tenant_id, p.name AS product_name, t.code AS tenant_code
            FROM flash_sales fs
            JOIN products p ON p.id = fs.product_id
            JOIN tenants t ON t.id = p.tenant_id
            WHERE fs.id = ?
            """,
            (payload.flash_sale_id,),
        ).fetchone()

        if not fs or not fs["is_active"]:
            conn.rollback()
            raise HTTPException(status_code=404, detail="Penawaran flash sale tidak tersedia.")

        if fs["stock"] <= 0:
            conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Maaf, stok flash sale untuk produk ini sudah habis.",
            )

        now_iso = datetime.now().isoformat(timespec="seconds")
        if fs["expires_at"] < now_iso:
            conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Penawaran flash sale ini telah berakhir.",
            )

        # Prevent claiming again if user already holds an Active voucher for this same flash sale
        existing_active = cur.execute(
            """
            SELECT id FROM vouchers
            WHERE user_id = ? AND flash_sale_id = ? AND status = 'Aktif'
            """,
            (current_user["id"], payload.flash_sale_id),
        ).fetchone()
        if existing_active:
            conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Anda sudah memiliki voucher aktif untuk produk flash sale ini. Silakan cek halaman Voucher.",
            )

        # Decrement stock
        cur.execute(
            "UPDATE flash_sales SET stock = stock - 1 WHERE id = ? AND stock > 0",
            (payload.flash_sale_id,),
        )
        if cur.rowcount == 0:
            conn.rollback()
            raise HTTPException(status_code=409, detail="Stok flash sale baru saja habis.")

        voucher_code = _generate_unique_voucher_code(conn, fs["tenant_code"])
        cur.execute(
            """
            INSERT INTO vouchers (
                user_id, flash_sale_id, product_id, tenant_id, voucher_code,
                price_paid, best_before, expires_at, status, claimed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Aktif', ?)
            """,
            (
                current_user["id"],
                fs["id"],
                fs["product_id"],
                fs["tenant_id"],
                voucher_code,
                fs["discount_price"],
                fs["best_before"],
                fs["expires_at"],
                now_iso,
            ),
        )
        voucher_id = cur.lastrowid

        cur.execute(
            """
            INSERT INTO transactions (user_id, voucher_id, amount, status, created_at)
            VALUES (?, ?, ?, 'CLAIMED', ?)
            """,
            (current_user["id"], voucher_id, fs["discount_price"], now_iso),
        )
        conn.commit()

        row = conn.execute(
            """
            SELECT
                v.*, t.code AS tenant_code, t.name AS tenant_name,
                t.address AS tenant_address, t.open_hours AS tenant_open_hours,
                p.name AS product_name, p.category AS product_category,
                p.description AS product_description, p.image_url,
                fs.normal_price
            FROM vouchers v
            JOIN products p ON p.id = v.product_id
            JOIN tenants t ON t.id = v.tenant_id
            JOIN flash_sales fs ON fs.id = v.flash_sale_id
            WHERE v.id = ?
            """,
            (voucher_id,),
        ).fetchone()
    finally:
        conn.close()

    return _row_to_voucher(row)


@app.get("/api/vouchers")
def list_user_vouchers(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    search: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user),
):
    conn = get_connection()
    try:
        _sync_expired_vouchers(conn)
        where_clauses = ["v.user_id = ?"]
        params: list = [current_user["id"]]

        if status_filter and status_filter.lower() not in ("all", "semua"):
            where_clauses.append("v.status = ?")
            params.append(status_filter)

        if search:
            like_q = f"%{search.strip()}%"
            where_clauses.append(
                "(p.name LIKE ? OR t.name LIKE ? OR v.voucher_code LIKE ?)"
            )
            params.extend([like_q, like_q, like_q])

        where_sql = "WHERE " + " AND ".join(where_clauses)
        rows = conn.execute(
            f"""
            SELECT
                v.*, t.code AS tenant_code, t.name AS tenant_name,
                t.address AS tenant_address, t.open_hours AS tenant_open_hours,
                p.name AS product_name, p.category AS product_category,
                p.description AS product_description, p.image_url,
                fs.normal_price
            FROM vouchers v
            JOIN products p ON p.id = v.product_id
            JOIN tenants t ON t.id = v.tenant_id
            JOIN flash_sales fs ON fs.id = v.flash_sale_id
            {where_sql}
            ORDER BY
                CASE v.status WHEN 'Aktif' THEN 0 WHEN 'Digunakan' THEN 1 ELSE 2 END,
                v.claimed_at DESC
            """,
            params,
        ).fetchall()
    finally:
        conn.close()

    return {
        "items": [_row_to_voucher(r) for r in rows],
        "total": len(rows),
    }


@app.get("/api/vouchers/{voucher_id}", response_model=VoucherResponse)
def get_voucher_detail(
    voucher_id: int,
    current_user: dict = Depends(get_current_user),
):
    conn = get_connection()
    try:
        _sync_expired_vouchers(conn)
        row = conn.execute(
            """
            SELECT
                v.*, t.code AS tenant_code, t.name AS tenant_name,
                t.address AS tenant_address, t.open_hours AS tenant_open_hours,
                p.name AS product_name, p.category AS product_category,
                p.description AS product_description, p.image_url,
                fs.normal_price
            FROM vouchers v
            JOIN products p ON p.id = v.product_id
            JOIN tenants t ON t.id = v.tenant_id
            JOIN flash_sales fs ON fs.id = v.flash_sale_id
            WHERE v.id = ? AND v.user_id = ?
            """,
            (voucher_id, current_user["id"]),
        ).fetchone()
    finally:
        conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Voucher tidak ditemukan.")
    return _row_to_voucher(row)


@app.post("/api/vouchers/{voucher_id}/redeem", response_model=VoucherResponse)
def redeem_voucher(
    voucher_id: int,
    current_user: dict = Depends(get_current_user),
):
    conn = get_connection()
    try:
        _sync_expired_vouchers(conn)
        row = conn.execute(
            "SELECT * FROM vouchers WHERE id = ? AND user_id = ?",
            (voucher_id, current_user["id"]),
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Voucher tidak ditemukan.")

        if row["status"] == "Digunakan":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Voucher ini sudah digunakan sebelumnya dan tidak dapat digunakan kembali.",
            )

        if row["status"] == "Kedaluwarsa":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Voucher ini telah kedaluwarsa dan tidak dapat ditukarkan.",
            )

        now_iso = datetime.now().isoformat(timespec="seconds")
        conn.execute(
            "UPDATE vouchers SET status = 'Digunakan', used_at = ? WHERE id = ?",
            (now_iso, voucher_id),
        )
        conn.execute(
            "UPDATE transactions SET status = 'COMPLETED' WHERE voucher_id = ?",
            (voucher_id,),
        )
        conn.commit()

        updated = conn.execute(
            """
            SELECT
                v.*, t.code AS tenant_code, t.name AS tenant_name,
                t.address AS tenant_address, t.open_hours AS tenant_open_hours,
                p.name AS product_name, p.category AS product_category,
                p.description AS product_description, p.image_url,
                fs.normal_price
            FROM vouchers v
            JOIN products p ON p.id = v.product_id
            JOIN tenants t ON t.id = v.tenant_id
            JOIN flash_sales fs ON fs.id = v.flash_sale_id
            WHERE v.id = ?
            """,
            (voucher_id,),
        ).fetchone()
    finally:
        conn.close()

    return _row_to_voucher(updated)


@app.get("/api/stats/impact")
def get_customer_impact(current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    try:
        _sync_expired_vouchers(conn)
        rows = conn.execute(
            """
            SELECT v.status, v.price_paid, fs.normal_price, p.category
            FROM vouchers v
            JOIN flash_sales fs ON fs.id = v.flash_sale_id
            JOIN products p ON p.id = v.product_id
            WHERE v.user_id = ?
            """,
            (current_user["id"],),
        ).fetchall()
    finally:
        conn.close()

    total_vouchers = len(rows)
    active_count = sum(1 for r in rows if r["status"] == "Aktif")
    used_count = sum(1 for r in rows if r["status"] == "Digunakan")
    saved_money = sum(max(0, r["normal_price"] - r["price_paid"]) for r in rows if r["status"] != "Kedaluwarsa")
    # Estimated ~0.85 kg CO2e prevented per surplus meal rescued
    rescued_meals = sum(1 for r in rows if r["status"] != "Kedaluwarsa")
    co2_saved_kg = round(rescued_meals * 0.85, 2)

    by_category = {"Makanan": 0, "Minuman": 0, "Jajanan": 0}
    for r in rows:
        if r["category"] in by_category:
            by_category[r["category"]] += 1

    return {
        "total_vouchers": total_vouchers,
        "active_count": active_count,
        "used_count": used_count,
        "rescued_meals": rescued_meals,
        "saved_money": saved_money,
        "co2_saved_kg": co2_saved_kg,
        "category_breakdown": [
            {"category": k, "jumlah": v} for k, v in by_category.items()
        ],
    }
