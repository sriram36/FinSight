import pytest
from datetime import timedelta
from fastapi.testclient import TestClient
from backend.security import create_access_token

def test_auth_registration_and_login(client):
    email = "sarah.connor@example.com"
    # Register
    reg_res = client.post("/auth/register", json={
        "name": "Sarah Connor",
        "email": email,
        "password": "Password123!"
    })
    assert reg_res.status_code == 200
    user_data = reg_res.json()
    assert user_data["name"] == "Sarah Connor"
    assert user_data["email"] == email
    assert "token" in user_data

    # Duplicate registration rejected
    dup_res = client.post("/auth/register", json={
        "name": "Sarah Connor",
        "email": email,
        "password": "Password123!"
    })
    assert dup_res.status_code == 400

    # Login with correct password
    login_res = client.post("/auth/login", json={
        "email": email,
        "password": "Password123!"
    })
    assert login_res.status_code == 200
    token = login_res.json()["token"]
    assert token is not None

    # Login with wrong password rejected
    wrong_pwd = client.post("/auth/login", json={
        "email": email,
        "password": "WrongPassword999!"
    })
    assert wrong_pwd.status_code == 401

    # Login with non-existent email rejected
    non_existent = client.post("/auth/login", json={
        "email": "ghost@example.com",
        "password": "Password123!"
    })
    assert non_existent.status_code == 401

    # Get current user profile with valid Bearer token
    me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["user"]["email"] == email

    # Tampered token rejected
    tampered_token = token[:-4] + "abcd"
    bad_res = client.get("/auth/me", headers={"Authorization": f"Bearer {tampered_token}"})
    assert bad_res.status_code == 401

    # Expired token rejected
    expired_token = create_access_token(user_id=user_data["id"], email=email, expires_delta=timedelta(seconds=-10))
    exp_res = client.get("/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert exp_res.status_code == 401

def test_demo_user_auth(client):
    res = client.post("/auth/login", json={
        "email": "jordan@finsight.local",
        "password": "any"
    })
    assert res.status_code == 200
    assert res.json()["id"] == "default_user"
    assert "token" in res.json()
