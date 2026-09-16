"""Tests d'intégration de l'API /api/v1/task-lists/.

Scénarios de visibilité restreinte : trois utilisateurs (propriétaire,
membre invité, tiers non invité) exercent l'API réelle via le client Django.
"""

import json

import pytest
from django.contrib.auth.models import Group, User
from django.test import Client

from app.repository.tasklist.models.task_comment_entity import TaskCommentEntity
from app.repository.tasklist.models.task_item_entity import TaskItemEntity
from app.repository.tasklist.models.task_list_entity import TaskListEntity
from app.repository.tasklist.models.task_list_member_entity import TaskListMemberEntity
from app.repository.user.models.user_profile_entity import UserProfileEntity

BASE = "/api/v1/task-lists/"


def _make_user(username: str, role: str = "iec") -> tuple[Client, str]:
    """Crée un utilisateur avec profil + client connecté. Renvoie (client, uuid)."""
    user, created = User.objects.get_or_create(username=username)
    if created:
        user.set_password("pass")
        user.save()
    group, _ = Group.objects.get_or_create(name="operateur")
    user.groups.add(group)
    profile, _ = UserProfileEntity.objects.get_or_create(
        user=user, defaults={"roles": [role], "force_password_change": False}
    )
    client = Client()
    client.force_login(user)
    return client, str(profile.uuid)


@pytest.fixture
def owner():
    return _make_user("tl_owner")


@pytest.fixture
def member():
    return _make_user("tl_member")


@pytest.fixture
def outsider():
    return _make_user("tl_outsider")


def _post(client: Client, url: str, payload: dict):
    return client.post(url, data=json.dumps(payload), content_type="application/json")


def _patch(client: Client, url: str, payload: dict):
    return client.patch(url, data=json.dumps(payload), content_type="application/json")


@pytest.fixture
def shared_list(owner, member):
    """Liste créée par `owner` avec `member` invité. Renvoie le dict API."""
    owner_client, _ = owner
    _, member_uuid = member
    response = _post(
        owner_client,
        BASE,
        {"name": "Essais S2", "color": "green", "member_uuids": [member_uuid]},
    )
    assert response.status_code == 201
    return response.json()


@pytest.mark.integration
@pytest.mark.django_db
class TestTaskListCrud:
    def test_create_returns_owner_and_members(self, owner, member):
        owner_client, owner_uuid = owner
        _, member_uuid = member
        response = _post(
            owner_client,
            BASE,
            {
                "name": "Ma liste",
                "description": "desc",
                "member_uuids": [member_uuid],
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["owner_uuid"] == owner_uuid
        assert data["member_uuids"] == [member_uuid]
        assert data["task_count"] == 0

    def test_create_rejects_blank_name(self, owner):
        owner_client, _ = owner
        response = _post(owner_client, BASE, {"name": "   "})
        assert response.status_code == 400

    def test_create_rejects_unknown_member(self, owner):
        owner_client, _ = owner
        response = _post(
            owner_client,
            BASE,
            {
                "name": "Liste",
                "member_uuids": ["99999999-9999-4999-8999-999999999999"],
            },
        )
        assert response.status_code == 400

    def test_list_visible_for_owner_and_member_only(
        self, owner, member, outsider, shared_list
    ):
        owner_client, _ = owner
        member_client, _ = member
        outsider_client, _ = outsider

        owner_lists = owner_client.get(BASE).json()
        member_lists = member_client.get(BASE).json()
        outsider_lists = outsider_client.get(BASE).json()

        assert [item["uuid"] for item in owner_lists] == [shared_list["uuid"]]
        assert [item["uuid"] for item in member_lists] == [shared_list["uuid"]]
        assert outsider_lists == []

    def test_detail_hidden_from_outsider(self, outsider, shared_list):
        outsider_client, _ = outsider
        response = outsider_client.get(f"{BASE}{shared_list['uuid']}/")
        assert response.status_code == 404

    def test_detail_includes_tasks(self, owner, shared_list):
        owner_client, _ = owner
        _post(
            owner_client,
            f"{BASE}{shared_list['uuid']}/tasks/",
            {"title": "Première tâche", "priority": "high"},
        )
        response = owner_client.get(f"{BASE}{shared_list['uuid']}/")
        assert response.status_code == 200
        data = response.json()
        assert len(data["tasks"]) == 1
        assert data["tasks"][0]["title"] == "Première tâche"
        assert data["task_count"] == 1
        assert data["done_count"] == 0

    def test_member_cannot_rename(self, member, shared_list):
        member_client, _ = member
        response = _patch(
            member_client, f"{BASE}{shared_list['uuid']}/", {"name": "Piratée"}
        )
        assert response.status_code == 403

    def test_owner_renames(self, owner, shared_list):
        owner_client, _ = owner
        response = _patch(
            owner_client,
            f"{BASE}{shared_list['uuid']}/",
            {"name": "Renommée", "color": "purple"},
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Renommée"
        assert response.json()["color"] == "purple"

    def test_member_cannot_delete(self, member, shared_list):
        member_client, _ = member
        response = member_client.delete(f"{BASE}{shared_list['uuid']}/")
        assert response.status_code == 403

    def test_owner_deletes_cascade(self, owner, member, shared_list):
        owner_client, _ = owner
        task = _post(
            owner_client,
            f"{BASE}{shared_list['uuid']}/tasks/",
            {"title": "Tâche"},
        ).json()
        _post(
            owner_client,
            f"{BASE}{shared_list['uuid']}/tasks/{task['uuid']}/comments/",
            {"text": "Un commentaire"},
        )
        response = owner_client.delete(f"{BASE}{shared_list['uuid']}/")
        assert response.status_code == 204
        assert not TaskListEntity.objects.filter(uuid=shared_list["uuid"]).exists()
        assert not TaskListMemberEntity.objects.filter(
            task_list_id=shared_list["uuid"]
        ).exists()
        assert not TaskItemEntity.objects.filter(uuid=task["uuid"]).exists()
        assert not TaskCommentEntity.objects.filter(task_id=task["uuid"]).exists()

    def test_unauthenticated_rejected(self, shared_list):
        anonymous = Client()
        response = anonymous.get(BASE)
        assert response.status_code in (401, 403)


@pytest.mark.integration
@pytest.mark.django_db
class TestTaskListMembers:
    def test_owner_invites_then_new_member_sees_list(
        self, owner, outsider, shared_list
    ):
        owner_client, _ = owner
        outsider_client, outsider_uuid = outsider
        response = _post(
            owner_client,
            f"{BASE}{shared_list['uuid']}/members/",
            {"user_uuids": [outsider_uuid]},
        )
        assert response.status_code == 200
        assert outsider_uuid in response.json()["member_uuids"]
        lists = outsider_client.get(BASE).json()
        assert [item["uuid"] for item in lists] == [shared_list["uuid"]]

    def test_member_cannot_invite(self, member, outsider, shared_list):
        member_client, _ = member
        _, outsider_uuid = outsider
        response = _post(
            member_client,
            f"{BASE}{shared_list['uuid']}/members/",
            {"user_uuids": [outsider_uuid]},
        )
        assert response.status_code == 403

    def test_duplicate_invitation_conflicts(self, owner, member, shared_list):
        owner_client, _ = owner
        _, member_uuid = member
        response = _post(
            owner_client,
            f"{BASE}{shared_list['uuid']}/members/",
            {"user_uuids": [member_uuid]},
        )
        assert response.status_code == 409

    def test_owner_removes_member(self, owner, member, shared_list):
        owner_client, _ = owner
        member_client, member_uuid = member
        response = owner_client.delete(
            f"{BASE}{shared_list['uuid']}/members/{member_uuid}/"
        )
        assert response.status_code == 204
        assert member_client.get(BASE).json() == []

    def test_member_leaves_list(self, member, shared_list):
        member_client, member_uuid = member
        response = member_client.delete(
            f"{BASE}{shared_list['uuid']}/members/{member_uuid}/"
        )
        assert response.status_code == 204
        assert member_client.get(BASE).json() == []

    def test_member_cannot_remove_other_member(
        self, owner, member, outsider, shared_list
    ):
        owner_client, _ = owner
        member_client, _ = member
        _, outsider_uuid = outsider
        _post(
            owner_client,
            f"{BASE}{shared_list['uuid']}/members/",
            {"user_uuids": [outsider_uuid]},
        )
        response = member_client.delete(
            f"{BASE}{shared_list['uuid']}/members/{outsider_uuid}/"
        )
        assert response.status_code == 403

    def test_owner_cannot_be_removed(self, owner, shared_list):
        owner_client, owner_uuid = owner
        response = owner_client.delete(
            f"{BASE}{shared_list['uuid']}/members/{owner_uuid}/"
        )
        assert response.status_code == 400


@pytest.mark.integration
@pytest.mark.django_db
class TestTaskItems:
    def test_member_creates_task_with_metadata(self, member, shared_list):
        member_client, member_uuid = member
        response = _post(
            member_client,
            f"{BASE}{shared_list['uuid']}/tasks/",
            {
                "title": "Contrôler le vide",
                "note": "Pompe primaire à vérifier",
                "priority": "critical",
                "due_date": "2026-07-15",
                "assignee_uuid": member_uuid,
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["priority"] == "critical"
        assert data["due_date"] == "2026-07-15"
        assert data["assignee_uuid"] == member_uuid
        assert data["created_by_uuid"] == member_uuid
        assert data["done"] is False

    def test_outsider_cannot_create_task(self, outsider, shared_list):
        outsider_client, _ = outsider
        response = _post(
            outsider_client,
            f"{BASE}{shared_list['uuid']}/tasks/",
            {"title": "Intrusion"},
        )
        assert response.status_code == 404

    def test_assignee_must_be_member(self, owner, outsider, shared_list):
        owner_client, _ = owner
        _, outsider_uuid = outsider
        response = _post(
            owner_client,
            f"{BASE}{shared_list['uuid']}/tasks/",
            {"title": "Tâche", "assignee_uuid": outsider_uuid},
        )
        assert response.status_code == 400

    def test_toggle_done_records_completion(self, owner, member, shared_list):
        owner_client, _ = owner
        member_client, member_uuid = member
        task = _post(
            owner_client, f"{BASE}{shared_list['uuid']}/tasks/", {"title": "Tâche"}
        ).json()
        response = _patch(
            member_client,
            f"{BASE}{shared_list['uuid']}/tasks/{task['uuid']}/",
            {"done": True},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["done"] is True
        assert data["completed_by_uuid"] == member_uuid
        assert data["completed_at"] is not None

        response = _patch(
            member_client,
            f"{BASE}{shared_list['uuid']}/tasks/{task['uuid']}/",
            {"done": False},
        )
        data = response.json()
        assert data["done"] is False
        assert data["completed_by_uuid"] is None
        assert data["completed_at"] is None

    def test_positions_increment(self, owner, shared_list):
        owner_client, _ = owner
        first = _post(
            owner_client, f"{BASE}{shared_list['uuid']}/tasks/", {"title": "A"}
        ).json()
        second = _post(
            owner_client, f"{BASE}{shared_list['uuid']}/tasks/", {"title": "B"}
        ).json()
        assert first["position"] == 0
        assert second["position"] == 1

    def test_update_rejects_invalid_priority(self, owner, shared_list):
        owner_client, _ = owner
        task = _post(
            owner_client, f"{BASE}{shared_list['uuid']}/tasks/", {"title": "Tâche"}
        ).json()
        response = _patch(
            owner_client,
            f"{BASE}{shared_list['uuid']}/tasks/{task['uuid']}/",
            {"priority": "hyper"},
        )
        assert response.status_code == 400

    def test_delete_task(self, owner, shared_list):
        owner_client, _ = owner
        task = _post(
            owner_client, f"{BASE}{shared_list['uuid']}/tasks/", {"title": "Tâche"}
        ).json()
        response = owner_client.delete(
            f"{BASE}{shared_list['uuid']}/tasks/{task['uuid']}/"
        )
        assert response.status_code == 204
        assert not TaskItemEntity.objects.filter(uuid=task["uuid"]).exists()

    def test_task_of_other_list_not_found(self, owner, shared_list):
        owner_client, _ = owner
        other_list = _post(owner_client, BASE, {"name": "Autre liste"}).json()
        task = _post(
            owner_client, f"{BASE}{shared_list['uuid']}/tasks/", {"title": "Tâche"}
        ).json()
        response = _patch(
            owner_client,
            f"{BASE}{other_list['uuid']}/tasks/{task['uuid']}/",
            {"title": "X"},
        )
        assert response.status_code == 404


@pytest.mark.integration
@pytest.mark.django_db
class TestTaskComments:
    @pytest.fixture
    def task(self, owner, shared_list):
        owner_client, _ = owner
        return _post(
            owner_client, f"{BASE}{shared_list['uuid']}/tasks/", {"title": "Tâche"}
        ).json()

    def test_member_comments_and_counts(self, owner, member, shared_list, task):
        owner_client, _ = owner
        member_client, member_uuid = member
        url = f"{BASE}{shared_list['uuid']}/tasks/{task['uuid']}/comments/"
        response = _post(member_client, url, {"text": "Fait à 80%"})
        assert response.status_code == 201
        assert response.json()["author_uuid"] == member_uuid

        comments = member_client.get(url).json()
        assert len(comments) == 1

        detail = owner_client.get(f"{BASE}{shared_list['uuid']}/").json()
        assert detail["tasks"][0]["comment_count"] == 1

    def test_outsider_cannot_read_comments(self, outsider, shared_list, task):
        outsider_client, _ = outsider
        url = f"{BASE}{shared_list['uuid']}/tasks/{task['uuid']}/comments/"
        assert outsider_client.get(url).status_code == 404

    def test_empty_comment_rejected(self, member, shared_list, task):
        member_client, _ = member
        url = f"{BASE}{shared_list['uuid']}/tasks/{task['uuid']}/comments/"
        assert _post(member_client, url, {"text": "   "}).status_code == 400

    def test_author_deletes_own_comment(self, member, shared_list, task):
        member_client, _ = member
        url = f"{BASE}{shared_list['uuid']}/tasks/{task['uuid']}/comments/"
        comment = _post(member_client, url, {"text": "À supprimer"}).json()
        response = member_client.delete(f"{url}{comment['uuid']}/")
        assert response.status_code == 204

    def test_owner_deletes_member_comment(self, owner, member, shared_list, task):
        owner_client, _ = owner
        member_client, _ = member
        url = f"{BASE}{shared_list['uuid']}/tasks/{task['uuid']}/comments/"
        comment = _post(member_client, url, {"text": "Modération"}).json()
        response = owner_client.delete(f"{url}{comment['uuid']}/")
        assert response.status_code == 204

    def test_member_cannot_delete_owner_comment(self, owner, member, shared_list, task):
        owner_client, _ = owner
        member_client, _ = member
        url = f"{BASE}{shared_list['uuid']}/tasks/{task['uuid']}/comments/"
        comment = _post(owner_client, url, {"text": "Note du chef"}).json()
        response = member_client.delete(f"{url}{comment['uuid']}/")
        assert response.status_code == 403
