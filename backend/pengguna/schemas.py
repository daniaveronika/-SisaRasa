from typing import Optional
from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=120)
    password: str = Field(..., min_length=6, max_length=100)
    phone: str = Field(default="", max_length=30)


class LoginRequest(BaseModel):
    email: str
    password: str


class ClaimVoucherRequest(BaseModel):
    flash_sale_id: int


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    created_at: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ProductResponse(BaseModel):
    id: int
    tenant_id: int
    tenant_code: str
    tenant_name: str
    tenant_address: str
    tenant_open_hours: str
    name: str
    category: str
    description: str
    price: int
    image_url: str
    is_featured: bool
    flash_sale_id: Optional[int] = None
    discount_price: Optional[int] = None
    flash_sale_stock: Optional[int] = None
    best_before: Optional[str] = None


class FlashSaleResponse(BaseModel):
    id: int
    product_id: int
    tenant_id: int
    tenant_code: str
    tenant_name: str
    tenant_address: str
    tenant_open_hours: str
    name: str
    category: str
    description: str
    image_url: str
    normal_price: int
    discount_price: int
    discount_percent: int
    stock: int
    initial_stock: int
    best_before: str
    expires_at: str
    is_active: bool


class VoucherResponse(BaseModel):
    id: int
    user_id: int
    flash_sale_id: int
    product_id: int
    tenant_id: int
    tenant_code: str
    tenant_name: str
    tenant_address: str
    tenant_open_hours: str
    product_name: str
    product_category: str
    product_description: str
    image_url: str
    normal_price: int
    voucher_code: str
    price_paid: int
    best_before: str
    expires_at: str
    status: str
    claimed_at: str
    used_at: Optional[str] = None
