import pytest
from fastapi.testclient import TestClient
from backend.main import app

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

    # Login
    login_res = client.post("/auth/login", json={
        "email": email,
        "password": "Password123!"
    })
    assert login_res.status_code == 200
    assert "token" in login_res.json()

    # Get current user
    me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {user_data['token']}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == email

def test_demo_user_auth(client):
    # Demo user login
    res = client.post("/auth/login", json={
        "email": "jordan@finsight.local",
        "password": "any"
    })
    assert res.status_code == 200
    assert res.json()["id"] == "default_user"
