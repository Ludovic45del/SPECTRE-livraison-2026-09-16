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
 * Get a campaign team member's name by their role label, or empty string if not found
 */
export const getMemberNameByRole = (members: CampaignTeamMember[] | undefined, roleLabel: string): string => {
    return getMemberByRole(members, roleLabel)?.name ?? '';
};
