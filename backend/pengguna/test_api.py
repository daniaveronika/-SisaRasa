import json
import urllib.error
import urllib.request
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000"


def request(method: str, path: str, body: dict | None = None, token: str | None = None):
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))


def run_tests():
    # 1. Health
    code, body = request("GET", "/api/health")
    assert code == 200, (code, body)
    print("HEALTH OK:", body)

    # 2. Products list, filter, sort
    code, body = request("GET", "/api/products")
    assert code == 200 and body["total"] == 11, (code, body)

    code, body_cat = request("GET", "/api/products?category=Minuman,Jajanan&sort_by=price_asc")
    assert code == 200 and body_cat["total"] == 5, (code, body_cat)
    prices = [p["price"] for p in body_cat["items"]]
    assert prices == sorted(prices)
    print("PRODUCTS FILTER/SORT OK:", body_cat["total"], prices)

    # 3. Flash sales
    code, body_fs = request("GET", "/api/flash-sales?category=Makanan&sort_by=price_asc")
    assert code == 200 and body_fs["total"] == 6, (code, body_fs)
    print("FLASH SALES OK:", body_fs["total"])

    # 4. Demo Login
    code, body_login = request(
        "POST",
        "/api/auth/login",
        {"email": "demo@sisarasa.id", "password": "sisarasa123"},
    )
    assert code == 200, (code, body_login)
    demo_token = body_login["access_token"]
    print("DEMO LOGIN OK:", body_login["user"]["name"])

    # 5. Demo Vouchers across all 3 statuses
    code, body_v = request("GET", "/api/vouchers", token=demo_token)
    assert code == 200
    statuses = {v["status"] for v in body_v["items"]}
    assert statuses == {"Aktif", "Digunakan", "Kedaluwarsa"}, statuses
    print("DEMO VOUCHERS STATUSES OK:", statuses)

    # 6. Register new user
    import time
    uniq_email = f"budi_{int(time.time())}@example.com"
    code, body_reg = request(
        "POST",
        "/api/auth/register",
        {
            "name": "Budi Santoso",
            "email": uniq_email,
            "password": "password123",
            "phone": "08111222333",
        },
    )
    assert code == 201, (code, body_reg)
    budi_token = body_reg["access_token"]
    print("REGISTER OK:", body_reg["user"]["email"])

    # 7. Claim flash sale voucher & verify stock decrement + duplicate protection
    fs_id = body_fs["items"][0]["id"]
    initial_stock = body_fs["items"][0]["stock"]
    code, v_claimed = request(
        "POST", "/api/vouchers/claim", {"flash_sale_id": fs_id}, token=budi_token
    )
    assert code == 201, (code, v_claimed)
    assert v_claimed["status"] == "Aktif"
    assert v_claimed["voucher_code"].startswith("SR-")
    print("CLAIM OK:", v_claimed["voucher_code"])

    code, fs_after = request("GET", f"/api/flash-sales/{fs_id}")
    assert code == 200 and fs_after["stock"] == initial_stock - 1

    code, dup_resp = request(
        "POST", "/api/vouchers/claim", {"flash_sale_id": fs_id}, token=budi_token
    )
    assert code == 409, (code, dup_resp)
    print("DUPLICATE CLAIM BLOCKED OK")

    # 8. Redeem voucher & block reuse
    v_id = v_claimed["id"]
    code, redeemed = request("POST", f"/api/vouchers/{v_id}/redeem", token=budi_token)
    assert code == 200 and redeemed["status"] == "Digunakan", (code, redeemed)
    code, reuse = request("POST", f"/api/vouchers/{v_id}/redeem", token=budi_token)
    assert code == 409, (code, reuse)
    print("REDEEM & REUSE BLOCK OK")

    # 9. Impact stats
    code, imp = request("GET", "/api/stats/impact", token=budi_token)
    assert code == 200 and imp["used_count"] == 1, (code, imp)
    print("IMPACT STATS OK:", imp)


if __name__ == "__main__":
    run_tests()
