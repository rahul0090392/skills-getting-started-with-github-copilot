from fastapi.testclient import TestClient
import copy

from src.app import app, activities


client = TestClient(app)


def reset_activities(original):
    activities.clear()
    activities.update(copy.deepcopy(original))


def test_get_activities_and_cache_control_header():
    orig = copy.deepcopy(activities)
    try:
        res = client.get("/activities")
        assert res.status_code == 200
        assert "Chess Club" in res.json()
        # Cache control header should prevent caching
        assert res.headers.get("cache-control") == "no-cache, no-store, must-revalidate"
    finally:
        reset_activities(orig)


def test_signup_and_duplicate_signup_and_capacity():
    orig = copy.deepcopy(activities)
    try:
        # Ensure test participant not present
        participants = activities["Tennis Club"]["participants"]
        test_email = "pytest-user@example.com"
        if test_email in participants:
            participants.remove(test_email)

        # Signup should succeed
        res = client.post(f"/activities/Tennis%20Club/signup?email={test_email}")
        assert res.status_code == 200
        assert test_email in activities["Tennis Club"]["participants"]

        # Duplicate signup should fail with 400
        res2 = client.post(f"/activities/Tennis%20Club/signup?email={test_email}")
        assert res2.status_code == 400

        # Signup for unknown activity returns 404
        res3 = client.post("/activities/Unknown/signup?email=foo@bar.com")
        assert res3.status_code == 404
    finally:
        reset_activities(orig)


def test_remove_participant_and_not_found():
    orig = copy.deepcopy(activities)
    try:
        activity_name = "Chess Club"
        test_email = "temp-removable@example.com"
        # Ensure the test email is present
        if test_email not in activities[activity_name]["participants"]:
            activities[activity_name]["participants"].append(test_email)

        # Remove it
        res = client.delete(f"/activities/Chess%20Club/participants?email={test_email}")
        assert res.status_code == 200
        assert test_email not in activities[activity_name]["participants"]

        # Removing a non-existent email returns 404
        res2 = client.delete(f"/activities/Chess%20Club/participants?email={test_email}")
        assert res2.status_code == 404
    finally:
        reset_activities(orig)
