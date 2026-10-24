def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "FinSight AI"
    assert data["version"] == "1.0.0"

def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "FinSight AI" in response.json()["message"]
