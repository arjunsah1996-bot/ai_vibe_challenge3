"""API integration tests via FastAPI TestClient."""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, engine


@pytest.fixture(autouse=True)
def reset_db():
    """Create fresh tables for each test and re-seed emission factors."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    # Re-seed emission factors (they get dropped with the tables)
    from app.main import _seed_emission_factors
    _seed_emission_factors()
    yield



client = TestClient(app)


class TestHealth:
    def test_health_check(self):
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"


class TestAuth:
    def test_register_success(self):
        response = client.post("/api/auth/register", json={
            "email": "test@example.com",
            "password": "testpass123",
            "region": "india",
            "household_size": 2,
        })
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "test@example.com"

    def test_register_duplicate(self):
        client.post("/api/auth/register", json={
            "email": "dup@example.com",
            "password": "testpass123",
        })
        response = client.post("/api/auth/register", json={
            "email": "dup@example.com",
            "password": "testpass456",
        })
        assert response.status_code == 409

    def test_login_success(self):
        client.post("/api/auth/register", json={
            "email": "login@example.com",
            "password": "testpass123",
        })
        response = client.post("/api/auth/login", json={
            "email": "login@example.com",
            "password": "testpass123",
        })
        assert response.status_code == 200
        assert "access_token" in response.json()

    def test_login_wrong_password(self):
        client.post("/api/auth/register", json={
            "email": "wrong@example.com",
            "password": "testpass123",
        })
        response = client.post("/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass",
        })
        assert response.status_code == 401

    def test_me_unauthorized(self):
        response = client.get("/api/auth/me")
        assert response.status_code == 401


class TestFactors:
    def test_list_factors(self):
        response = client.get("/api/factors")
        assert response.status_code == 200
        factors = response.json()
        assert len(factors) > 30  # We have 43 factors

    def test_list_categories(self):
        response = client.get("/api/factors/categories")
        assert response.status_code == 200
        categories = response.json()
        category_names = [c["category"] for c in categories]
        assert "transport" in category_names
        assert "household_energy" in category_names


class TestActivities:
    def _auth_header(self) -> dict:
        """Register and return auth header."""
        response = client.post("/api/auth/register", json={
            "email": "activity@example.com",
            "password": "testpass123",
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_log_activity(self):
        headers = self._auth_header()
        # Get a factor ID
        factors = client.get("/api/factors").json()
        electricity_factor = next(f for f in factors if f["activity_type"] == "electricity")

        response = client.post("/api/activities", json={
            "factor_id": electricity_factor["id"],
            "quantity": 10.0,
        }, headers=headers)
        assert response.status_code == 201
        data = response.json()
        assert abs(data["computed_co2e"] - 7.36) < 0.01
        assert data["category"] == "household_energy"

    def test_list_activities(self):
        headers = self._auth_header()
        factors = client.get("/api/factors").json()
        factor = factors[0]

        # Log 3 activities
        for _ in range(3):
            client.post("/api/activities", json={
                "factor_id": factor["id"],
                "quantity": 5.0,
            }, headers=headers)

        response = client.get("/api/activities", headers=headers)
        assert response.status_code == 200
        assert response.json()["total"] == 3


class TestDashboard:
    def test_dashboard_empty(self):
        """Dashboard works even with no data."""
        response = client.post("/api/auth/register", json={
            "email": "dash@example.com",
            "password": "testpass123",
        })
        headers = {"Authorization": f"Bearer {response.json()['access_token']}"}

        response = client.get("/api/insights/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "world_state" in data
        assert "daily_totals" in data
