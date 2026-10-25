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

def test_cross_user_data_isolation(client):
    """
    Verifies strict multi-tenant boundary enforcement:
    A user cannot read, mutate, or access another user's financial records.
    """
    # 1. Register Alice
    res_alice = client.post("/auth/register", json={
        "name": "Alice Tester",
        "email": "alice@finsight.test",
        "password": "PasswordAlice123!"
    })
    assert res_alice.status_code == 200
    alice = res_alice.json()
    alice_headers = {"Authorization": f"Bearer {alice['token']}"}

    # 2. Register Bob
    res_bob = client.post("/auth/register", json={
        "name": "Bob Tester",
        "email": "bob@finsight.test",
        "password": "PasswordBob123!"
    })
    assert res_bob.status_code == 200
    bob = res_bob.json()
    bob_headers = {"Authorization": f"Bearer {bob['token']}"}

    # 3. Alice creates a private transaction
    create_res = client.post("/transactions", json={
        "user_id": alice["id"],
        "description": "Alice Confidential Medical",
        "amount": 450.0,
        "direction": "spending",
        "category": "Healthcare",
        "transaction_date": "2026-10-15"
    }, headers=alice_headers)
    assert create_res.status_code == 201
    tx_id = create_res.json()["id"]

    # Alice can read her own transaction
    alice_txs = client.get("/transactions", headers=alice_headers)
    assert alice_txs.status_code == 200
    assert any(t["id"] == tx_id for t in alice_txs.json()["items"])

    # 4. Bob attempts to read Alice's transactions explicitly -> 403 Forbidden
    bob_snoop = client.get(f"/transactions?user_id={alice['id']}", headers=bob_headers)
    assert bob_snoop.status_code == 403

    # 5. Bob reads his own transactions -> Alice's transaction is not there
    bob_own_txs = client.get("/transactions", headers=bob_headers)
    assert bob_own_txs.status_code == 200
    assert len(bob_own_txs.json()["items"]) == 0

    # 6. Bob attempts to delete Alice's transaction -> 403 Forbidden
    bob_delete = client.delete(f"/transactions/{tx_id}?user_id={alice['id']}", headers=bob_headers)
    assert bob_delete.status_code == 403

    # 7. Bob attempts to access Alice's budgets -> 403 Forbidden
    bob_budgets = client.get(f"/budgets?user_id={alice['id']}", headers=bob_headers)
    assert bob_budgets.status_code == 403

    # 8. Bob attempts to access Alice's goals -> 403 Forbidden
    bob_goals = client.get(f"/goals?user_id={alice['id']}", headers=bob_headers)
    assert bob_goals.status_code == 403

    # 9. Bob attempts to query chat copilot as Alice -> 403 Forbidden
    bob_chat = client.post("/chat/query", json={
        "user_id": alice["id"],
        "message": "What did I spend on healthcare?"
    }, headers=bob_headers)
    assert bob_chat.status_code == 403

def test_jwt_secret_production_enforcement(monkeypatch):
    """
    Verifies that get_jwt_secret refuses to use fallback in production.
    """
    from backend.security import get_jwt_secret
    
    monkeypatch.delenv("JWT_SECRET", raising=False)
    monkeypatch.setenv("APP_ENV", "production")
    
    with pytest.raises(RuntimeError) as exc_info:
        get_jwt_secret()
    assert "FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing" in str(exc_info.value)

