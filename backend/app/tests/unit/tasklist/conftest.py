"""Fixtures des tests unitaires du module Listes de tâches partagées."""

from unittest.mock import MagicMock

import pytest

OWNER_UUID = "11111111-1111-4111-8111-111111111111"
MEMBER_UUID = "22222222-2222-4222-8222-222222222222"
OTHER_UUID = "33333333-3333-4333-8333-333333333333"
LIST_UUID = "44444444-4444-4444-8444-444444444444"
TASK_UUID = "55555555-5555-4555-8555-555555555555"
COMMENT_UUID = "66666666-6666-4666-8666-666666666666"


@pytest.fixture
def owner_uuid() -> str:
    return OWNER_UUID


@pytest.fixture
def member_uuid() -> str:
    return MEMBER_UUID


@pytest.fixture
def other_uuid() -> str:
    return OTHER_UUID


@pytest.fixture
def sample_task_list_bean():
    """Liste partagée type : un propriétaire et un membre invité."""
    from app.domain.tasklist.models.task_list_bean import TaskListBean

    return TaskListBean(
        uuid=LIST_UUID,
        name="Essais cryogénie",
        description="Suivi des essais",
        color="blue",
        owner_uuid=OWNER_UUID,
        member_uuids=[MEMBER_UUID],
        task_count=2,
        done_count=1,
    )


@pytest.fixture
def sample_task_item_bean():
    """Tâche type rattachée à la liste de `sample_task_list_bean`."""
    from app.domain.tasklist.models.task_item_bean import TaskItemBean

    return TaskItemBean(
        uuid=TASK_UUID,
        task_list_uuid=LIST_UUID,
        title="Préparer la salle",
        note="Vérifier l'azote",
        priority="high",
        done=False,
        position=0,
        created_by_uuid=OWNER_UUID,
    )


@pytest.fixture
def sample_task_comment_bean():
    """Commentaire type du membre sur la tâche."""
    from app.domain.tasklist.models.task_comment_bean import TaskCommentBean

    return TaskCommentBean(
        uuid=COMMENT_UUID,
        task_uuid=TASK_UUID,
        author_uuid=MEMBER_UUID,
        text="Salle réservée pour jeudi",
    )


@pytest.fixture
def mock_task_list_repository(sample_task_list_bean):
    """Mock du ITaskListRepository avec des défauts permissifs."""
    mock = MagicMock()
    mock.get_by_uuid.return_value = sample_task_list_bean
    mock.get_detail_by_uuid.return_value = sample_task_list_bean
    mock.get_all_for_user.return_value = [sample_task_list_bean]
    mock.existing_user_uuids.side_effect = lambda uuids: list(uuids)
    mock.remove_member.return_value = True
    mock.delete.return_value = True
    return mock


@pytest.fixture
def mock_task_item_repository(sample_task_item_bean):
    """Mock du ITaskItemRepository avec des défauts permissifs."""
    mock = MagicMock()
    mock.get_by_uuid.return_value = sample_task_item_bean
    mock.next_position.return_value = 0
    mock.delete.return_value = True
    return mock


@pytest.fixture
def mock_task_comment_repository(sample_task_comment_bean):
    """Mock du ITaskCommentRepository avec des défauts permissifs."""
    mock = MagicMock()
    mock.get_by_uuid.return_value = sample_task_comment_bean
    mock.get_by_task.return_value = [sample_task_comment_bean]
    mock.delete.return_value = True
    return mock
