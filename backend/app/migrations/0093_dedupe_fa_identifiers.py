"""Data migration : dédoublonnage des identifiants FA existants (R13).

Quand le nom d'une FSEC reprend le nom complet de la cible (qui contient déjà,
par convention, le nom de la campagne), ``generate_fa_identifier`` concaténait
les deux segments et produisait un doublon dans le « nom » de la FA
(ex. campagne « TAGADA » + FSEC « TAGADA_C01 » → FA_2026_TAGADA_TAGADA_C01_01).

La logique de dédoublonnage a été ajoutée dans
app/domain/fa/services/fa_service.py ; cette migration réaligne les
identifiants déjà en base avec la MÊME logique, recopiée localement
(convention Django : une migration de données ne doit jamais importer le code
applicatif vivant, qui peut évoluer après elle).

Règles appliquées :
- SEULS les identifiants reconnus comme l'ancienne composition nominale
  ``FA_{année}_{campagne}_{fsec}_{NN}`` (avec un vrai suffixe séquentiel) sont
  réécrits : tout identifiant non reconnu — déjà dédoublonné, antérieur à
  l'introduction des séquences (un ``_NN`` final appartenant au nom serait
  sinon doublé en ``_NN_NN``), ou saisie exotique — est laissé intact ;
- l'identifiant est recomposé depuis le contexte courant (nom de campagne,
  année, nom de FSEC) en PRÉSERVANT le suffixe séquentiel ``_NN`` existant ;
- si le nouvel identifiant est identique à l'actuel, aucune écriture ;
- si le nouvel identifiant existe déjà en base (contrainte unique sur
  FA.identifier), la FA est sautée avec un log — pas de crash de migration,
  le réalignement se fera au prochain renommage de la FSEC ;
- une FA dont la FSEC n'a pas de campagne rattachée est sautée (impossible de
  recomposer le contexte de façon fiable).

Reverse = RunPython.noop : réintroduire le doublon n'a aucun intérêt
fonctionnel, et l'ancien identifiant n'est pas conservé (il reste dérivable du
contexte campagne/FSEC par l'ancienne logique si besoin). Le forward est
idempotent : le rejouer ne modifie plus rien.
"""

import logging
import re

from django.db import migrations

logger = logging.getLogger(__name__)

# Longueur max de FA.identifier (fa_entity.py : CharField(max_length=100)).
_IDENTIFIER_MAX_LENGTH = 100


def _clean_name(name: str) -> str:
    """Copie locale du nettoyage de generate_fa_identifier (espaces/tirets → _)."""
    cleaned = (name or "").replace(" ", "_").replace("-", "_")
    return re.sub(r"[^A-Za-z0-9_]", "", cleaned)


def _build_identifier(
    campaign_name: str, fsec_name: str, year: int, sequence: int
) -> str:
    """Copie locale de generate_fa_identifier AVEC dédoublonnage campagne/FSEC.

    Recouvrement détecté de façon insensible à la casse, par SEGMENTS délimités
    par underscore : égalité, préfixe ``{campagne}_…`` ou segment interne
    (« 2026_LMJ_TAGADA_C01 » pour la campagne « TAGADA »). Pas de règle
    symétrique (campagne se terminant par le nom FSEC) : elle ferait converger
    des FSEC distinctes vers le même identifiant.
    """
    clean_campaign = _clean_name(campaign_name)
    clean_fsec = _clean_name(fsec_name)
    lc_camp, lc_fsec = clean_campaign.lower(), clean_fsec.lower()
    if not clean_campaign or f"_{lc_camp}_" in f"_{lc_fsec}_":
        middle = clean_fsec  # le nom FSEC porte déjà le nom de campagne/cible
    else:
        middle = f"{clean_campaign}_{clean_fsec}"
    return f"FA_{year}_{middle}_{sequence:02d}"


def _parse_sequence(identifier: str) -> int:
    """Copie locale de _parse_fa_sequence : suffixe ``_NN`` final (1 par défaut)."""
    match = re.search(r"_(\d{2,})$", identifier or "")
    return int(match.group(1)) if match else 1


def forwards(apps, schema_editor):
    Fa = apps.get_model("app", "FaEntity")

    # select_related : la FK fsec_version_id pointe la FSEC, qui porte la
    # campagne parente (nom + année) nécessaire à la recomposition.
    queryset = Fa.objects.select_related("fsec_version_id__campaign_id").order_by(
        "created_at"
    )

    updated = 0
    skipped = 0
    for fa in queryset.iterator():
        fsec = fa.fsec_version_id
        campaign = fsec.campaign_id if fsec is not None else None
        if fsec is None or campaign is None:
            # Contexte incomplet : impossible de recomposer l'identifiant de
            # façon fiable, on ne touche pas à cette FA.
            skipped += 1
            continue

        sequence = _parse_sequence(fa.identifier)

        # Garde de décomposition : ne réécrire que si l'identifiant actuel EST
        # l'ancienne composition nominale (campagne + FSEC + vrai suffixe de
        # séquence). Une FA antérieure à l'introduction des séquences, dont le
        # nom se termine par « _NN », serait sinon suffixée une seconde fois
        # (« …_NN_NN ») ; un identifiant déjà dédoublonné ou exotique est
        # également laissé intact.
        nominal = (
            f"FA_{campaign.year}_{_clean_name(campaign.name)}"
            f"_{_clean_name(fsec.name)}_{sequence:02d}"
        )
        if (fa.identifier or "").lower() != nominal.lower():
            continue

        new_identifier = _build_identifier(
            campaign.name, fsec.name, campaign.year, sequence
        )

        if new_identifier == fa.identifier:
            continue

        if len(new_identifier) > _IDENTIFIER_MAX_LENGTH:
            # Garde-fou : ne jamais provoquer de DataError sur la colonne.
            logger.warning(
                "0093_dedupe_fa_identifiers: identifiant recomposé trop long pour FA %s, ignoré",
                fa.uuid,
            )
            skipped += 1
            continue

        # Contrainte unique sur identifier : si la cible existe déjà (autre FA
        # portant déjà l'identifiant dédoublonné), on saute plutôt que de faire
        # échouer la migration.
        if Fa.objects.filter(identifier=new_identifier).exclude(uuid=fa.uuid).exists():
            logger.warning(
                "0093_dedupe_fa_identifiers: collision sur %s pour FA %s, ignorée",
                new_identifier,
                fa.uuid,
            )
            skipped += 1
            continue

        Fa.objects.filter(uuid=fa.uuid).update(identifier=new_identifier)
        updated += 1

    if updated or skipped:
        logger.info(
            "0093_dedupe_fa_identifiers: %d identifiant(s) FA dédoublonné(s), %d ignoré(s)",
            updated,
            skipped,
        )


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0092_relax_assembly_item_unicity"),
    ]

    operations = [
        # Reverse noop : voir docstring du module (dédoublonnage sans perte,
        # ancien identifiant non conservé et sans valeur fonctionnelle).
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
