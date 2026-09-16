"""Controller Messagerie interne — API REST /conversations/.

Toutes les routes exigent un utilisateur authentifié (`IsAuthenticated`) :
la messagerie est un espace personnel, ouvert aussi bien aux lecteurs qu'aux
opérateurs. Le périmètre de visibilité (« être membre de la conversation »)
est appliqué par les services du domaine, qui traitent toute conversation
invisible comme inexistante (404).

Les trois routes pollées par le frontend (liste, non-lus, nouveaux messages)
sortent du budget de débit global via le scope `messaging_poll` (cf.
`config/settings.py`).
"""

import json
from typing import Any, Dict, List

from django.core.serializers.json import DjangoJSONEncoder
from django.http import HttpResponse, JsonResponse
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.viewsets import ViewSet

from app.api.messaging.serializers import (
    ConversationCreateSerializer,
    ConversationMembersSerializer,
    ConversationUpdateSerializer,
    MentionsQuerySerializer,
    MessageCreateSerializer,
    MessageEditSerializer,
    MessagePageQuerySerializer,
    MessageSearchQuerySerializer,
)
from app.domain.exceptions import InvalidDataException
from app.domain.messaging.models.attachment_bean import AttachmentUploadBean
from app.domain.messaging.models.constants import (
    MAX_ATTACHMENT_SIZE_BYTES,
    MAX_ATTACHMENTS_PER_MESSAGE,
)
from app.domain.messaging.services import conversation_service, message_service
from app.mapper.messaging.messaging_api_mapper import (
    conversation_api_to_bean,
    conversation_bean_to_api,
    conversation_beans_to_api,
    entity_refs_api_to_tuples,
    mention_beans_to_api,
    message_bean_to_api,
    message_page_to_api,
)
from app.repository.messaging.repositories.conversation_repository import (
    ConversationRepository,
)
from app.repository.messaging.repositories.entity_ref_resolver import EntityRefResolver
from app.repository.messaging.repositories.message_repository import MessageRepository


def _profile_not_found_response() -> JsonResponse:
    """Réponse 404 quand l'utilisateur connecté n'a pas de profil SPECTRE."""
    return JsonResponse(
        {"error": "Profil utilisateur introuvable", "code": "USER_PROFILE_NOT_FOUND"},
        status=404,
    )


# Taille maximale acceptée pour une publication multipart : les pièces jointes
# autorisées (5 × 10 Mo) plus une marge pour le corps et les en-têtes de parties.
MAX_MESSAGE_REQUEST_BYTES = (
    MAX_ATTACHMENTS_PER_MESSAGE * MAX_ATTACHMENT_SIZE_BYTES + 1024 * 1024
)


def _reject_oversized_request(request) -> None:
    """Rejette (400) une requête dont le Content-Length dépasse le maximum admis."""
    try:
        content_length = int(request.META.get("CONTENT_LENGTH") or 0)
    except (TypeError, ValueError):
        content_length = 0
    if content_length > MAX_MESSAGE_REQUEST_BYTES:
        raise InvalidDataException(
            f"attachments: requête trop volumineuse ({content_length} octets, "
            f"maximum {MAX_MESSAGE_REQUEST_BYTES})"
        )


def _validate(serializer_class, data):
    """Valide les données d'entrée, lève InvalidDataException (HTTP 400) sinon."""
    serializer = serializer_class(data=data)
    if not serializer.is_valid():
        raise InvalidDataException(str(serializer.errors))
    return serializer.validated_data


def _message_payload(request) -> Dict[str, Any]:
    """Corps d'une publication, en JSON ou en multipart.

    En multipart, `entity_refs` arrive comme chaîne JSON (une liste encodée) :
    elle est décodée ici, 400 si elle n'est pas un JSON valide ou pas une liste.
    """
    data = request.data
    payload: Dict[str, Any] = {"body": data.get("body", "")}
    raw_refs = data.get("entity_refs")
    if isinstance(raw_refs, str):
        try:
            raw_refs = json.loads(raw_refs)
        except ValueError as exc:
            raise InvalidDataException("entity_refs: JSON invalide") from exc
        if not isinstance(raw_refs, list):
            raise InvalidDataException("entity_refs: une liste est attendue")
    if raw_refs is not None:
        payload["entity_refs"] = raw_refs
    return payload


def _uploaded_attachments(request) -> List[AttachmentUploadBean]:
    """Fichiers `attachments` d'une requête multipart, sous forme de beans opaques."""
    return [
        AttachmentUploadBean(
            name=uploaded.name,
            content_type=uploaded.content_type or "application/octet-stream",
            size=uploaded.size,
            file=uploaded,
        )
        for uploaded in request.FILES.getlist("attachments")
    ]


class ConversationController(ViewSet):
    """Conversations privées et de groupe, membres, messages et non-lus."""

    permission_classes = [IsAuthenticated]
    lookup_field = "uuid"

    #: Actions pollées par le frontend (~5 s) : voir `get_throttles`.
    POLLING_ACTIONS = {"list", "unread_count", "messages"}

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Resolver des références d'entités (FSEC active, campagne, FA), partagé
        # entre le repository des messages et le service de publication.
        self.entity_ref_resolver = EntityRefResolver()
        self.conversation_repository = ConversationRepository()
        self.message_repository = MessageRepository(resolver=self.entity_ref_resolver)

    def get_throttles(self):
        """Sort les endpoints pollés du budget global `user` (1000/h)."""
        if self.action in self.POLLING_ACTIONS and self.request.method == "GET":
            self.throttle_scope = "messaging_poll"
            return [ScopedRateThrottle()]
        return super().get_throttles()

    def _requester_uuid(self, request):
        """UUID du profil de l'utilisateur connecté, ou None si profil absent."""
        profile = getattr(request.user, "profile", None)
        return str(profile.uuid) if profile is not None else None

    # ------------------------------------------------------------------
    # Conversations
    # ------------------------------------------------------------------

    def list(self, request) -> JsonResponse:
        """GET /conversations/ — conversations du demandeur, les plus récentes d'abord."""
        requester = self._requester_uuid(request)
        if requester is None:
            return _profile_not_found_response()
        beans = conversation_service.get_conversations(
            self.conversation_repository, requester
        )
        return JsonResponse(
            conversation_beans_to_api(beans), safe=False, encoder=DjangoJSONEncoder
        )

    def create(self, request) -> JsonResponse:
        """POST /conversations/ — crée une conversation (201) ou renvoie la
        conversation privée déjà existante entre les deux membres (200)."""
        requester = self._requester_uuid(request)
        if requester is None:
            return _profile_not_found_response()
        payload = _validate(ConversationCreateSerializer, request.data)
        bean = conversation_api_to_bean(payload)
        member_uuids = [str(value) for value in payload.get("member_uuids", [])]
        result, created = conversation_service.create_conversation(
            self.conversation_repository,
            self.message_repository,
            requester,
            bean,
            member_uuids,
        )
        return JsonResponse(
            conversation_bean_to_api(result),
            status=201 if created else 200,
            encoder=DjangoJSONEncoder,
        )

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request) -> JsonResponse:
        """GET /conversations/unread-count/ — total des messages non lus."""
        requester = self._requester_uuid(request)
        if requester is None:
            return _profile_not_found_response()
        total = conversation_service.get_unread_total(
            self.conversation_repository, requester
        )
        return JsonResponse({"total_unread": total}, encoder=DjangoJSONEncoder)

    @action(detail=False, methods=["get"], url_path="mentions")
    def mentions(self, request) -> JsonResponse:
        """GET /conversations/mentions/?entity_type=&entity_uuid=&limit= — messages
        mentionnant une entité, dans les conversations du demandeur uniquement.

        Action `detail=False` : le `DefaultRouter` émet ces routes avant le
        lookup `{uuid}`, quel que soit l'ordre des méthodes — « mentions » n'est
        donc jamais interprété comme un uuid de conversation. Une cible inconnue
        ou supprimée renvoie `{"results": []}` (jamais 404). Débit par défaut
        (route non pollée).
        """
        requester = self._requester_uuid(request)
        if requester is None:
            return _profile_not_found_response()
        query = _validate(MentionsQuerySerializer, request.query_params)
        beans = message_service.get_mentions(
            self.message_repository,
            requester,
            query["entity_type"],
            str(query["entity_uuid"]),
            limit=query.get("limit"),
        )
        return JsonResponse(
            {"results": mention_beans_to_api(beans)}, encoder=DjangoJSONEncoder
        )

    @action(detail=False, methods=["get"], url_path="search")
    def search(self, request) -> JsonResponse:
        """GET /conversations/search/?q=&limit= — messages texte non supprimés des
        conversations du demandeur dont le corps contient `q` (2 à 100 caractères,
        insensible à la casse), même forme que `mentions/`. Débit par défaut."""
        requester = self._requester_uuid(request)
        if requester is None:
            return _profile_not_found_response()
        query = _validate(MessageSearchQuerySerializer, request.query_params)
        beans = message_service.search_messages(
            self.message_repository, requester, query["q"], limit=query.get("limit")
        )
        return JsonResponse(
            {"results": mention_beans_to_api(beans)}, encoder=DjangoJSONEncoder
        )

    def retrieve(self, request, uuid=None) -> JsonResponse:
        """GET /conversations/{uuid}/ — détail d'une conversation du demandeur."""
        requester = self._requester_uuid(request)
        if requester is None:
            return _profile_not_found_response()
        bean = conversation_service.get_conversation(
            self.conversation_repository, requester, uuid
        )
        return JsonResponse(conversation_bean_to_api(bean), encoder=DjangoJSONEncoder)

    def partial_update(self, request, uuid=None) -> JsonResponse:
        """PATCH /conversations/{uuid}/ — renomme un groupe (propriétaire)."""
        requester = self._requester_uuid(request)
        if requester is None:
            return _profile_not_found_response()
        changes = _validate(ConversationUpdateSerializer, request.data)
        result = conversation_service.rename_conversation(
            self.conversation_repository,
            self.message_repository,
            requester,
            uuid,
            changes["name"],
        )
        return JsonResponse(conversation_bean_to_api(result), encoder=DjangoJSONEncoder)

    def destroy(self, request, uuid=None) -> HttpResponse:
        """DELETE /conversations/{uuid}/ — supprime un groupe (propriétaire)."""
        requester = self._requester_uuid(request)
        if requester is None:
            return _profile_not_found_response()
        conversation_service.delete_conversation(
            self.conversation_repository, requester, uuid
        )
        return HttpResponse(status=204)

    # ------------------------------------------------------------------
    # Membres
    # ------------------------------------------------------------------

    @action(detail=True, methods=["post"], url_path="members")
    def add_members(self, request, uuid=None) -> JsonResponse:
        """POST /conversations/{uuid}/members/ — tout membre peut inviter."""
        requester = self._requester_uuid(request)
        if requester is None:
            return _profile_not_found_response()
        payload = _validate(ConversationMembersSerializer, request.data)
        member_uuids = [str(value) for value in payload["member_uuids"]]
        result = conversation_service.add_members(
            self.conversation_repository,
            self.message_repository,
            requester,
            uuid,
            member_uuids,
        )
        return JsonResponse(conversation_bean_to_api(result), encoder=DjangoJSONEncoder)

    @action(
        detail=True,
        methods=["delete"],
        url_path="members/(?P<member_uuid>[^/.]+)",
    )
    def remove_member(self, request, uuid=None, member_uuid=None) -> HttpResponse:
        """DELETE /conversations/{uuid}/members/{member_uuid}/ — retrait par le
        propriétaire (200 avec la conversation à jour) ou départ du demandeur (204)."""
        requester = self._requester_uuid(request)
        if requester is None:
            return _profile_not_found_response()
        result = conversation_service.remove_member(
            self.conversation_repository,
            self.message_repository,
            requester,
            uuid,
            member_uuid,
        )
        if result is None:
            return HttpResponse(status=204)
        return JsonResponse(conversation_bean_to_api(result), encoder=DjangoJSONEncoder)

    # ------------------------------------------------------------------
    # Lecture
    # ------------------------------------------------------------------

    @action(detail=True, methods=["post"], url_path="read")
    def read(self, request, uuid=None) -> JsonResponse:
        """POST /conversations/{uuid}/read/ — marque la conversation comme lue."""
        requester = self._requester_uuid(request)
        if requester is None:
            return _profile_not_found_response()
        result = conversation_service.mark_read(
            self.conversation_repository, requester, uuid
        )
        return JsonResponse(conversation_bean_to_api(result), encoder=DjangoJSONEncoder)

    # ------------------------------------------------------------------
    # Messages
    # ------------------------------------------------------------------

    @action(
        detail=True,
        methods=["get", "post"],
        url_path="messages",
        parser_classes=[JSONParser, MultiPartParser, FormParser],
    )
    def messages(self, request, uuid=None) -> JsonResponse:
        """GET/POST /conversations/{uuid}/messages/ — page par curseur ou publication.

        GET : `limit`, `before` | `after`, `updated_since` (seul ou avec `after`) →
        `{results, has_more, updated}`.
        POST (JSON ou multipart) : `body` (vide toléré avec au moins une pièce
        jointe), `entity_refs` (liste JSON, ou chaîne JSON en multipart),
        fichiers répétés dans le champ `attachments` (multipart).
        """
        requester = self._requester_uuid(request)
        if requester is None:
            return _profile_not_found_response()
        if request.method == "GET":
            query = _validate(MessagePageQuerySerializer, request.query_params)
            before = query.get("before")
            after = query.get("after")
            results, has_more, updated = message_service.get_messages(
                self.conversation_repository,
                self.message_repository,
                requester,
                uuid,
                limit=query.get("limit"),
                before_uuid=str(before) if before else None,
                after_uuid=str(after) if after else None,
                updated_since=query.get("updated_since"),
            )
            return JsonResponse(
                message_page_to_api(results, has_more, updated),
                encoder=DjangoJSONEncoder,
            )
        # Refus AVANT lecture du corps : sans cette garde, Django consomme tout
        # le multipart (fichiers temporaires) avant que le service ne vérifie les
        # tailles — un client pourrait faire écrire des gigaoctets en temporaire.
        _reject_oversized_request(request)
        payload = _validate(MessageCreateSerializer, _message_payload(request))
        result = message_service.post_message(
            self.conversation_repository,
            self.message_repository,
            requester,
            uuid,
            payload["body"],
            entity_refs=entity_refs_api_to_tuples(payload),
            resolver=self.entity_ref_resolver,
            attachments=_uploaded_attachments(request),
        )
        return JsonResponse(
            message_bean_to_api(result), status=201, encoder=DjangoJSONEncoder
        )

    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path="messages/(?P<message_uuid>[^/.]+)",
    )
    def message_detail(self, request, uuid=None, message_uuid=None) -> JsonResponse:
        """PATCH /conversations/{uuid}/messages/{message_uuid}/ — édition du corps
        par l'auteur (200, message avec `edited_at`).
        DELETE — suppression logique par l'auteur ou le propriétaire du groupe
        (200, message avec `is_deleted: true`, corps vide, sans pièce jointe)."""
        requester = self._requester_uuid(request)
        if requester is None:
            return _profile_not_found_response()
        if request.method == "PATCH":
            changes = _validate(MessageEditSerializer, request.data)
            result = message_service.edit_message(
                self.conversation_repository,
                self.message_repository,
                requester,
                uuid,
                message_uuid,
                changes["body"],
            )
        else:
            result = message_service.delete_message(
                self.conversation_repository,
                self.message_repository,
                requester,
                uuid,
                message_uuid,
            )
        return JsonResponse(message_bean_to_api(result), encoder=DjangoJSONEncoder)
