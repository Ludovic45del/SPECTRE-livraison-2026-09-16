/**
 * Helpers de construction du payload `MachineInput` à partir d'une machine
 * existante : chaque section ne touche qu'à ses propres champs, le reste
 * est repris tel quel (le PUT serveur remplace l'intégralité de la ressource).
 *
 * @module features/material/view-machine/ui
 */

import type { Machine, MachineInput, MachineLinkInput } from '@entities/material';

/**
 * Construit un `MachineInput` complet à partir de l'état actuel de la machine,
 * sans aucune modification. Sert de base à laquelle on applique des `overrides`
 * dans chaque section éditable.
 */
export function machineToInput(machine: Machine): MachineInput {
    return {
        name: machine.name,
        roomId: machine.roomId,
        reference: machine.reference,
        manufacturer: machine.manufacturer,
        model: machine.model,
        commissioningDate: machine.commissioningDate,
        status: machine.status,
        responsibleUserUuid: machine.responsibleUserUuid,
        description: machine.description,
        links: machine.links.map(
            (link): MachineLinkInput => ({
                label: link.label,
                url: link.url,
                position: link.position,
            }),
        ),
    };
}
