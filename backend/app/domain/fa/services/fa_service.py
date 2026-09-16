"""Service FA - Logique métier pour les Fiches d'Anomalie."""

import logging
import re
from datetime import date
from typing import Any, Dict, List, Optional

from app.domain.campaign.interface.campaign_repository import ICampaignRepository
from app.domain.exceptions import (
    ConflictException,
    InvalidDataException,
    NotFoundException,
    ValidationException,
)
from app.domain.fa.interface.fa_repository import IFaRepository
from app.domain.fa.models.fa_bean import FaBean
from app.domain.fa.models.fa_constants import FaStatus
from app.domain.fa.models.fa_creation_context_bean import FaCreationContextBean
from app.domain.fsec.interface.fsec_repository import IFsecRepository
from app.domain.user.interface.user_repository import IUserRepository
from app.domain.user.models.user_bean import ROLE_CHEF_LABO, ROLE_IEC

logger = logging.getLogger(__name__)


# Roles autorises a valider une phase FA (open / in_progress / close).
# chef_labo est inclus en super-utilisateur conformement aux choix metier.
_FA_VALIDATOR_ROLES = (ROLE_IEC, ROLE_CHEF_LABO)


def _resolve_validator_user(user_repository: IUserRepository, validator_user_uuid: str):
    """Retourne le UserBean si role autorise a valider une FA, sinon leve 400.

    Strategie :
    - user inconnu -> ValidationException("validator_user_uuid", "USER_NOT_FOUND")
    - aucun role iec/chef_labo -> ValidationException("validator_user_uuid",
      "VALIDATOR_ROLE_INVALID")

    Renvoie le bean (utile pour propager le nom legacy en complement de la FK
    pendant la phase de coexistence).
    """
    user = user_repository.get_by_uuid(validator_user_uuid)
    if user is None:
        raise ValidationException(
            "validator_user_uuid",
            f"Utilisateur introuvable : {validator_user_uuid}",
        )
    # Multi-roles : il suffit d'UN role habilite parmi ceux portes par le membre.
    if not user.has_role(*_FA_VALIDATOR_ROLES):
        raise ValidationException(
            "validator_user_uuid",
            (
                f"Les roles {user.roles} ne permettent pas de valider une FA. "
                f"Roles autorises : {', '.join(_FA_VALIDATOR_ROLES)}"
            ),
        )
    return user


def _format_validator_legacy_name(user) -> str:
    """Construit le 'validator_name' texte a stocker en complement de la FK."""
    full = f"{user.first_name or ''} {user.last_name or ''}".strip()
    return full or user.username


def generate_fa_identifier(
    campaign_name: str, fsec_name: str, year: int, sequence: int = 1
) -> str:
    """Génère l'identifiant unique de la FA.

    Format: FA_{année}_{campagne}_{fsec}_{sequence:02d}

    Une FSEC peut avoir plusieurs FA ; le suffixe séquentiel (01, 02, ...)
    distingue chaque FA pour la même FSEC sur une même année/campagne.

    Dédoublonnage campagne/FSEC (R13) : par convention, le nom d'une FSEC
    reprend souvent le nom complet de la cible, qui contient déjà le nom de
    la campagne (ex. campagne « TAGADA » + FSEC « TAGADA_C01 », ou nom complet
    « 2026-LMJ_TAGADA_C01 »). Dans ce cas le segment campagne n'est pas
    répété : le recouvrement est détecté de façon insensible à la casse, par
    SEGMENTS délimités par underscore (égalité, préfixe ou segment interne —
    « TAG » ne dédoublonne donc pas « TAGADA_C01 »).
    """
    # Nettoyer les noms pour l'identifiant : remplacer espaces/tirets
    # et supprimer tout caractère spécial non alphanumérique/underscore
    clean_campaign = campaign_name.replace(" ", "_").replace("-", "_")
    clean_campaign = re.sub(r"[^A-Za-z0-9_]", "", clean_campaign)
    clean_fsec = fsec_name.replace(" ", "_").replace("-", "_")
    clean_fsec = re.sub(r"[^A-Za-z0-9_]", "", clean_fsec)

    # Dédoublonnage insensible à la casse : la campagne n'est pas répétée quand
    # elle apparaît déjà comme suite de segments (délimités par underscore) du
    # nom FSEC — égalité, préfixe « {campagne}_… » ou segment interne
    # (« 2026_LMJ_TAGADA_C01 » pour la campagne « TAGADA »). L'encadrement par
    # underscores évite les faux positifs de sous-chaîne (« TAG » vs « TAGADA »).
    # NB : pas de règle symétrique (campagne se terminant par le nom FSEC) —
    # elle ferait converger des FSEC distinctes vers le même identifiant.
    lc_camp, lc_fsec = clean_campaign.lower(), clean_fsec.lower()
    if not clean_campaign or f"_{lc_camp}_" in f"_{lc_fsec}_":
        middle = clean_fsec
    else:
        middle = f"{clean_campaign}_{clean_fsec}"
    return f"FA_{year}_{middle}_{sequence:02d}"


def _parse_fa_sequence(identifier: str) -> int:
    """Extrait le suffixe séquentiel ``_NN`` d'un identifiant FA (1 par défaut).

    Le nom de campagne et de FSEC peuvent contenir des underscores : on lit donc
    uniquement le groupe de chiffres en fin de chaîne, jamais par split.
    """
    match = re.search(r"_(\d{2,})$", identifier or "")
    return int(match.group(1)) if match else 1


def regenerate_fa_identifiers_for_fsec(
    repository: IFaRepository,
    fsec_version_id: str,
    campaign_name: str,
    fsec_name: str,
    year: int,
) -> int:
    """Réaligne l'identifiant des FA d'une version FSEC sur le contexte courant.

    L'identifiant FA encode ``(année, campagne, nom FSEC, séquence)`` et sert de
    « nom » à la FA (affiché tel quel côté front). Quand la FSEC est renommée ou
    rattachée à une autre campagne, on régénère les identifiants pour que ce nom
    suive — en PRÉSERVANT le numéro de séquence de chaque FA (son rang historique
    pour cette FSEC ne change pas).

    Retourne le nombre de FA effectivement réécrites.
    """
    fas = repository.get_all_by_fsec_version_id(fsec_version_id)
    updated = 0
    for fa in fas:
        sequence = _parse_fa_sequence(fa.identifier)
        new_identifier = generate_fa_identifier(
            campaign_name, fsec_name, year, sequence
        )
        if new_identifier == fa.identifier:
            continue
        # Contrainte unique sur l'identifier : collision très improbable (la paire
        # campagne+nom FSEC est unique), mais on bascule sur le prochain numéro
        # libre si jamais, pour ne pas faire échouer le renommage de la FSEC.
        if repository.exists_by_identifier(new_identifier):
            next_seq = repository.max_sequence_by_fsec_version_id(fsec_version_id) + 1
            new_identifier = generate_fa_identifier(
                campaign_name, fsec_name, year, next_seq
            )
        repository.update_identifier(fa.uuid, new_identifier)
        updated += 1
    if updated:
        logger.info(
            "Réaligné %d identifiant(s) FA sur le contexte FSEC version_uuid=%s",
            updated,
            fsec_version_id,
        )
    return updated


def regenerate_fa_identifiers_for_campaign(
    fa_repository: IFaRepository,
    fsec_repository: IFsecRepository,
    campaign_uuid: str,
    campaign_name: str,
    year: int,
) -> int:
    """Réaligne l'identifiant des FA de TOUTES les FSEC d'une campagne renommée.

    L'identifiant FA encode ``(année, campagne, nom FSEC, séquence)`` ; l'année et
    le nom de campagne proviennent de la campagne parente. Quand celle-ci est
    renommée ou change d'année, on régénère les identifiants de chaque FSEC
    rattachée (toutes versions confondues) pour que le « nom » des FA suive — en
    préservant le numéro de séquence de chaque FA via
    :func:`regenerate_fa_identifiers_for_fsec`.

    Retourne le nombre total de FA effectivement réécrites.
    """
    total = 0
    for fsec in fsec_repository.get_by_campaign_id(campaign_uuid):
        total += regenerate_fa_identifiers_for_fsec(
            fa_repository, fsec.version_uuid, campaign_name, fsec.name, year
        )
    if total:
        logger.info(
            "Réaligné %d identifiant(s) FA sur le contexte campagne uuid=%s",
            total,
            campaign_uuid,
        )
    return total


def create_fa(
    repository: IFaRepository,
    bean: FaBean,
    campaign_name: str,
    fsec_name: str,
    year: int,
) -> FaBean:
    """Crée une nouvelle FA après validation.

    Args:
        repository: Le repository FA
        bean: Le bean FA à créer
        campaign_name: Nom de la campagne (pour générer l'identifiant)
        fsec_name: Nom de la FSEC (pour générer l'identifiant)
        year: Année de la campagne (pour générer l'identifiant)

    Returns:
        Le bean FA créé

    Raises:
        ConflictException: Si l'identifiant généré entre en collision (race condition rare)
    """
    # Calcule le prochain numéro de séquence pour cette FSEC à partir du plus
    # grand suffixe existant (+1). On n'utilise pas un count de lignes : une FA
    # supprimée définitivement ne doit jamais voir son identifier réutilisé.
    sequence = repository.max_sequence_by_fsec_version_id(bean.fsec_version_id) + 1
    bean.identifier = generate_fa_identifier(campaign_name, fsec_name, year, sequence)

    # Le dédoublonnage R13 peut faire converger deux FSEC vers le même « nom »
    # de FA (ex. FSEC « C01 » et FSEC « TAGADA_C01 » de la campagne « TAGADA ») :
    # on avance alors la séquence jusqu'au premier numéro libre, comme le fait
    # déjà le réalignement au renommage de la FSEC. La borne évite toute boucle
    # pathologique ; au-delà (course concurrente extrême), 409 propre.
    attempts = 0
    while repository.exists_by_identifier(bean.identifier):
        attempts += 1
        if attempts > 100:
            raise ConflictException("identifier", bean.identifier)
        sequence += 1
        bean.identifier = generate_fa_identifier(
            campaign_name, fsec_name, year, sequence
        )

    bean.status_id = FaStatus.OPEN

    # Date d'ouverture = date de création de la FA. Si le client en a fourni
    # une explicitement (cas rare : import, backfill), on la respecte.
    if bean.iec_validation_open_date is None:
        bean.iec_validation_open_date = date.today()

    result = repository.create(bean)
    logger.info("FA créée: %s (fsec=%s)", result.identifier, result.fsec_version_id)
    return result


def resolve_fa_creation_context(
    bean: FaBean,
    fsec_repository: IFsecRepository,
    campaign_repository: ICampaignRepository,
) -> FaCreationContextBean:
    """Résout le contexte nécessaire à la création d'une FA.

    Récupère la FSEC et la campagne associée pour déduire campaign_name, fsec_name et year.

    Args:
        bean: Le bean FA (doit contenir fsec_version_id)
        fsec_repository: Repository FSEC (interface IFsecRepository)
        campaign_repository: Repository Campaign (interface ICampaignRepository)

    Returns:
        FaCreationContextBean avec campaign_name, fsec_name, year

    Raises:
        InvalidDataException: Si fsec_version_id est manquant
        NotFoundException: Si la FSEC n'existe pas
    """
    if not bean.fsec_version_id:
        raise InvalidDataException("fsec_version_id est obligatoire pour la création")

    fsec = fsec_repository.get_by_version_uuid(bean.fsec_version_id)
    if fsec is None:
        raise NotFoundException("FSEC", bean.fsec_version_id)

    campaign_name = "Unknown"
    year = date.today().year
    if fsec.campaign_id:
        campaign = campaign_repository.get_by_uuid(fsec.campaign_id)
        if campaign:
            campaign_name = campaign.name
            year = campaign.year

    context = FaCreationContextBean(
        campaign_name=campaign_name,
        fsec_name=fsec.name,
        year=year,
    )
    logger.info(
        "Contexte FA résolu: campagne=%s, fsec=%s, année=%d",
        campaign_name,
        fsec.name,
        year,
    )
    return context


def get_fa_by_uuid(repository: IFaRepository, uuid: str) -> FaBean:
    """Récupère une FA par son UUID."""
    bean = repository.get_by_uuid(uuid)
    if bean is None:
        raise NotFoundException("FA", uuid)
    return bean


def get_fa_by_slug(repository: IFaRepository, slug: str) -> FaBean:
    """Récupère une FA par son slug d'URL."""
    bean = repository.get_by_slug(slug)
    if bean is None:
        raise NotFoundException("FA", slug)
    return bean


def get_all_fas(
    repository: IFaRepository, limit: Optional[int] = None, offset: int = 0
) -> List[FaBean]:
    """Récupère toutes les FA."""
    return repository.get_all(limit=limit, offset=offset)


def count_all_fas(repository: IFaRepository) -> int:
    """Retourne le nombre total de FA."""
    return repository.count_all()


def get_fas_by_fsec_version_id(
    repository: IFaRepository, fsec_version_id: str
) -> List[FaBean]:
    """Récupère toutes les FA actives associées à une FSEC.

    Une FSEC peut avoir 0, 1 ou plusieurs FA. Retourne une liste vide si
    aucune FA n'existe (pas d'exception).
    """
    return repository.get_all_by_fsec_version_id(fsec_version_id)


_PROTECTED_MERGE_FIELDS = {
    "uuid",
    "fsec_version_id",
    "identifier",
    "status_id",
    "iec_validation_open",
    "iec_validation_open_date",
    "iec_validation_open_name",
    "iec_validation_open_user_uuid",
    "iec_validation_progress",
    "iec_validation_progress_name",
    "iec_validation_progress_user_uuid",
    "closure_validation",
    "closure_date",
    "closure_validator_name",
    "closure_validator_user_uuid",
    "created_at",
    "last_updated",
}


def _merge_fa_beans(existing: FaBean, updated: FaBean) -> FaBean:
    """Fusionne un bean mis à jour avec les données existantes.

    Les champs non-None du bean updated écrasent les champs existants.
    Les champs protégés (workflow/IEC/statut/metadata) conservent les valeurs existantes.
    Le statut ne peut être changé que via validate_open_phase, validate_progress_phase, close_fa.
    Les champs de clôture sont modifiables si la FA est déjà clôturée.
    """
    from dataclasses import fields

    protected = set(_PROTECTED_MERGE_FIELDS)
    # Permettre la modification des champs de clôture si la FA est déjà fermée
    if existing.status_id == FaStatus.CLOSED:
        protected -= {
            "closure_validation",
            "closure_date",
            "closure_validator_name",
            "closure_validator_user_uuid",
        }

    merged_kwargs = {}
    for field in fields(existing):
        name = field.name
        if name in protected:
            merged_kwargs[name] = getattr(existing, name)
        else:
            updated_val = getattr(updated, name)
            merged_kwargs[name] = (
                updated_val if updated_val is not None else getattr(existing, name)
            )
    return FaBean(**merged_kwargs)


def update_fa(repository: IFaRepository, bean: FaBean) -> FaBean:
    """Met à jour une FA avec merge des données existantes.

    Seuls les champs fournis (non vides) sont mis à jour.
    Les champs vides/None conservent leur valeur existante.
    """
    existing = repository.get_by_uuid(bean.uuid)
    if existing is None:
        raise NotFoundException("FA", bean.uuid)

    merged = _merge_fa_beans(existing, bean)
    return repository.update(merged)


def delete_fa(repository: IFaRepository, uuid: str) -> bool:
    """Supprime définitivement une FA (hard delete)."""
    if not repository.delete(uuid):
        raise NotFoundException("FA", uuid)
    logger.info("FA supprimée définitivement: %s", uuid)
    return True


def patch_fa(
    repository: IFaRepository, uuid: str, partial_data: Dict[str, Any]
) -> FaBean:
    """Met à jour partiellement une FA (PATCH).

    Args:
        repository: Le repository FA
        uuid: UUID de la FA
        partial_data: Dictionnaire des champs à mettre à jour

    Returns:
        Le bean FA mis à jour

    Raises:
        NotFoundException: Si la FA n'existe pas
    """
    existing = repository.get_by_uuid(uuid)
    if existing is None:
        raise NotFoundException("FA", uuid)

    # Champs protégés qui ne peuvent pas être modifiés via PATCH
    # On réutilise la constante globale pour éviter le drift de configuration
    protected_fields = set(_PROTECTED_MERGE_FIELDS)

    # Dans un contexte PATCH, si on souhaite autoriser la modification du statut
    # de façon isolée (hors workflow standard strict), on peut l'enlever ici.
    protected_fields.discard("status_id")

    # Permettre la modification des champs de clôture si la FA est déjà fermée
    if existing.status_id == FaStatus.CLOSED:
        protected_fields -= {
            "closure_validation",
            "closure_date",
            "closure_validator_name",
            "closure_validator_user_uuid",
        }

    new_status = partial_data.get("status_id")
    if (
        "status_id" in partial_data
        and new_status is not None
        and new_status != existing.status_id
    ):
        logger.info(
            "FA %s: status_id modifié via PATCH (bypass workflow strict) %s -> %s",
            uuid,
            existing.status_id,
            new_status,
            extra={
                "action": "fa_status_bypass",
                "entity_type": "FA",
                "entity_id": uuid,
                "extra_data": {
                    "from_status": existing.status_id,
                    "to_status": new_status,
                },
            },
        )

    # Fusion des données (seuls les champs fournis sont mis à jour)
    for key, value in partial_data.items():
        if key in protected_fields:
            continue  # Ignorer les champs protégés
        # Empêcher la mise à null de status_id (NOT NULL en base)
        if key == "status_id" and value is None:
            continue
        if hasattr(existing, key):
            setattr(existing, key, value)

    logger.info("FA %s: patch appliqué (%d champs)", uuid, len(partial_data))
    return repository.update(existing)


def _resolve_validator_inputs(
    user_repository: Optional[IUserRepository],
    validator_user_uuid: Optional[str],
    validator_name: Optional[str],
) -> tuple[Optional[str], str]:
    """Centralise la resolution validator_user_uuid + validator_name.

    Strategie pendant la phase de coexistence FK + nom legacy :
    - validator_user_uuid fourni : valider role + reconstruire le nom legacy
      depuis le UserBean (source de verite). Le validator_name explicite est
      ignore (la FK gagne).
    - validator_user_uuid absent : exiger validator_name non vide (legacy).

    Returns:
        (validator_user_uuid_resolved, validator_name_resolved)

    Raises:
        ValidationException: si role invalide ou aucun input fourni.
    """
    if validator_user_uuid:
        if user_repository is None:
            # Defense en profondeur : un appelant qui passe une FK doit aussi
            # fournir le repository (le controller le fait toujours).
            raise ValidationException(
                "validator_user_uuid",
                "user_repository requis pour valider le role du validateur",
            )
        user = _resolve_validator_user(user_repository, validator_user_uuid)
        return validator_user_uuid, _format_validator_legacy_name(user)

    if not validator_name or not validator_name.strip():
        raise ValidationException(
            "validator_name",
            "validator_name ou validator_user_uuid est requis",
        )
    return None, validator_name


def validate_open_phase(
    repository: IFaRepository,
    uuid: str,
    validator_name: Optional[str] = None,
    validation_date: Optional[date] = None,
    validator_user_uuid: Optional[str] = None,
    user_repository: Optional[IUserRepository] = None,
) -> FaBean:
    """Valide la phase Ouvert et passe à En cours.

    Args:
        repository: Le repository FA.
        uuid: UUID de la FA.
        validator_name: Nom legacy du valideur IEC (transition).
        validation_date: Date de validation (défaut: aujourd'hui).
        validator_user_uuid: UUID UserProfile du validateur (source de vérité).
        user_repository: Repository user (requis si validator_user_uuid fourni).

    Returns:
        Le bean FA mis à jour.

    Raises:
        NotFoundException: Si la FA n'existe pas.
        ConflictException: Si la FA n'est pas au statut Ouvert.
        ValidationException: Si le role du validateur n'est pas iec/chef_labo
            ou si ni validator_user_uuid ni validator_name n'est fourni.
    """
    if validation_date is None:
        validation_date = date.today()

    user_uuid, name = _resolve_validator_inputs(
        user_repository, validator_user_uuid, validator_name
    )

    bean = repository.get_by_uuid(uuid)
    if bean is None:
        raise NotFoundException("FA", uuid)

    if bean.status_id != FaStatus.OPEN:
        raise ConflictException(
            "status",
            f"La FA doit être au statut 'Ouvert' pour être validée. Statut actuel : {bean.status_id}",
        )

    # Vérifier la cohérence chronologique
    if bean.event_date and validation_date < bean.event_date:
        raise InvalidDataException(
            f"La date de validation ({validation_date}) ne peut pas être antérieure "
            f"à la date de l'évènement ({bean.event_date})"
        )

    bean.iec_validation_open = True
    bean.iec_validation_open_date = validation_date
    bean.iec_validation_open_name = name
    bean.iec_validation_open_user_uuid = user_uuid
    bean.status_id = FaStatus.IN_PROGRESS

    logger.info("FA %s: validation phase Ouvert par %s", uuid, name)
    return repository.update(bean)


def validate_progress_phase(
    repository: IFaRepository,
    uuid: str,
    validator_name: Optional[str] = None,
    validation_date: Optional[date] = None,
    validator_user_uuid: Optional[str] = None,
    user_repository: Optional[IUserRepository] = None,
) -> FaBean:
    """Valide la phase En cours et passe à Clos.

    Voir validate_open_phase pour la sémantique des paramètres et exceptions.

    `validation_date` est accepté pour compatibilité historique mais n'est plus
    persisté : la chronologie des FA se limite à ouverture → clôture.
    """
    # Le paramètre est conservé pour ne pas casser les appelants existants.
    del validation_date

    user_uuid, name = _resolve_validator_inputs(
        user_repository, validator_user_uuid, validator_name
    )

    bean = repository.get_by_uuid(uuid)
    if bean is None:
        raise NotFoundException("FA", uuid)

    if bean.status_id != FaStatus.IN_PROGRESS:
        raise ConflictException(
            "status",
            f"La FA doit être au statut 'En cours' pour être validée. Statut actuel : {bean.status_id}",
        )

    bean.iec_validation_progress = True
    bean.iec_validation_progress_name = name
    bean.iec_validation_progress_user_uuid = user_uuid

    logger.info("FA %s: validation phase En cours par %s", uuid, name)
    return repository.update(bean)


def close_fa(
    repository: IFaRepository,
    uuid: str,
    validator_name: Optional[str] = None,
    closure_validation: str = "",
    closure_date: Optional[date] = None,
    validator_user_uuid: Optional[str] = None,
    user_repository: Optional[IUserRepository] = None,
) -> FaBean:
    """Ferme définitivement une FA.

    Voir validate_open_phase pour la sémantique des paramètres validateur.
    Requiert que la phase En cours ait été validée par l'IEC.

    Note: l'ordre des arguments positionnels (validator_name avant
    closure_validation) est conservé pour la compatibilité avec les appels
    historiques.
    """
    if closure_date is None:
        closure_date = date.today()

    user_uuid, name = _resolve_validator_inputs(
        user_repository, validator_user_uuid, validator_name
    )

    bean = repository.get_by_uuid(uuid)
    if bean is None:
        raise NotFoundException("FA", uuid)

    if bean.status_id != FaStatus.IN_PROGRESS:
        raise ConflictException(
            "status",
            f"La FA doit être au statut 'En cours' pour être fermée. Statut actuel : {bean.status_id}",
        )

    if not bean.iec_validation_progress:
        raise ConflictException(
            "iec_validation_progress",
            "La validation IEC de la phase 'En cours' est requise avant la fermeture",
        )

    # Cohérence chronologique : fermeture >= ouverture.
    # On ne contraint plus contre une "date de passage en cours" — ce champ a
    # été supprimé, seuls ouverture et clôture importent.
    if bean.iec_validation_open_date and closure_date < bean.iec_validation_open_date:
        raise InvalidDataException(
            f"La date de fermeture ({closure_date}) ne peut pas être antérieure "
            f"à la date d'ouverture ({bean.iec_validation_open_date})"
        )

    bean.closure_validation = closure_validation
    bean.closure_date = closure_date
    bean.closure_validator_name = name
    bean.closure_validator_user_uuid = user_uuid
    bean.status_id = FaStatus.CLOSED

    logger.info("FA %s: fermeture par %s", uuid, name)
    return repository.update(bean)
