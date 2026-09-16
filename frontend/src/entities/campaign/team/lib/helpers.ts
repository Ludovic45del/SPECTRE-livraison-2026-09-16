import { CampaignTeamMember } from '../model';

/**
 * Find a campaign team member by their role label
 */
export const getMemberByRole = (
    members: CampaignTeamMember[] | undefined,
    roleLabel: string,
): CampaignTeamMember | undefined => {
    return members?.find((m) => m.role?.label === roleLabel);
};

/**
 * Get a campaign team member's name by their role label, or '-' if not found.
 *
 * Note: après bascule UserSelect, le `name` n'est rempli que pour MOE (texte
 * libre). Pour les autres rôles, on a un `userUuid` mais pas le nom — il faut
 * appeler `useUserLookup()` côté UI pour résoudre l'affichage.
 */
export const getMemberNameByRole = (members: CampaignTeamMember[] | undefined, roleLabel: string): string => {
    return getMemberByRole(members, roleLabel)?.name || '-';
};
