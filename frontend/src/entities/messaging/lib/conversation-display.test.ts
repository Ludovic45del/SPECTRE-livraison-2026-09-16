/**
 * Conversation Display Tests — titre, initiales, autre membre, propriétaire.
 * @module entities/messaging/lib
 */

import { describe, it, expect } from 'vitest';
import { ConversationSchema } from '../model';
import {
    formatUserSummaryName,
    getConversationInitials,
    getConversationTitle,
    getOtherMember,
    isConversationOwner,
} from './conversation-display';
import {
    MOCK_ME_UUID,
    MOCK_OTHER_UUID,
    createMockConversation,
    createMockConversationMember,
} from '@test/mocks/messaging-handlers';

const THIRD_UUID = '33333333-3333-4333-8333-333333333333';

const directConversation = ConversationSchema.parse(createMockConversation());
const groupConversation = ConversationSchema.parse(
    createMockConversation({
        kind: 'group',
        name: 'Projet Cryo',
        owner_uuid: MOCK_OTHER_UUID,
        members: [
            createMockConversationMember(),
            createMockConversationMember({ uuid: MOCK_OTHER_UUID, username: 'mmartin' }),
            createMockConversationMember({ uuid: THIRD_UUID, username: 'tiers', first_name: '', last_name: '' }),
        ],
    }),
);

describe('formatUserSummaryName', () => {
    it('affiche « Prénom Nom »', () => {
        expect(formatUserSummaryName({ firstName: 'Pierre', lastName: 'Dupont', username: 'chef' })).toBe(
            'Pierre Dupont',
        );
    });

    it('ignore la partie manquante', () => {
        expect(formatUserSummaryName({ firstName: 'Pierre', lastName: '', username: 'chef' })).toBe('Pierre');
        expect(formatUserSummaryName({ firstName: '', lastName: 'Dupont', username: 'chef' })).toBe('Dupont');
    });

    it('retombe sur le matricule si aucun nom', () => {
        expect(formatUserSummaryName({ firstName: '', lastName: '  ', username: 'chef' })).toBe('chef');
    });
});

describe('getOtherMember', () => {
    it('renvoie l’autre membre d’une privée', () => {
        expect(getOtherMember(directConversation, MOCK_ME_UUID)?.uuid).toBe(MOCK_OTHER_UUID);
        expect(getOtherMember(directConversation, MOCK_OTHER_UUID)?.uuid).toBe(MOCK_ME_UUID);
    });

    it('renvoie undefined pour un groupe', () => {
        expect(getOtherMember(groupConversation, MOCK_ME_UUID)).toBeUndefined();
    });

    it('renvoie undefined si je suis le seul membre', () => {
        const alone = ConversationSchema.parse(createMockConversation({ members: [createMockConversationMember()] }));
        expect(getOtherMember(alone, MOCK_ME_UUID)).toBeUndefined();
    });
});

describe('getConversationTitle', () => {
    it('privée : nom de l’autre membre', () => {
        expect(getConversationTitle(directConversation, MOCK_ME_UUID)).toBe('Marie Martin');
    });

    it('privée sans autre membre : repli « Conversation »', () => {
        const alone = ConversationSchema.parse(createMockConversation({ members: [createMockConversationMember()] }));
        expect(getConversationTitle(alone, MOCK_ME_UUID)).toBe('Conversation');
    });

    it('groupe : nom du groupe, repli si vide', () => {
        expect(getConversationTitle(groupConversation, MOCK_ME_UUID)).toBe('Projet Cryo');
        const unnamed = ConversationSchema.parse(createMockConversation({ kind: 'group', name: '  ' }));
        expect(getConversationTitle(unnamed, MOCK_ME_UUID)).toBe('Conversation');
    });
});

describe('getConversationInitials', () => {
    it('prend les initiales des deux premiers mots', () => {
        expect(getConversationInitials(directConversation, MOCK_ME_UUID)).toBe('MM');
        expect(getConversationInitials(groupConversation, MOCK_ME_UUID)).toBe('PC');
    });

    it('prend les deux premières lettres d’un mot unique', () => {
        const single = ConversationSchema.parse(createMockConversation({ kind: 'group', name: 'cryogénie' }));
        expect(getConversationInitials(single, MOCK_ME_UUID)).toBe('CR');
    });

    it('gère les espaces multiples et le repli', () => {
        const spaced = ConversationSchema.parse(createMockConversation({ kind: 'group', name: '  équipe   labo ' }));
        expect(getConversationInitials(spaced, MOCK_ME_UUID)).toBe('ÉL');
        const alone = ConversationSchema.parse(createMockConversation({ members: [createMockConversationMember()] }));
        expect(getConversationInitials(alone, MOCK_ME_UUID)).toBe('CO');
    });
});

describe('isConversationOwner', () => {
    it('compare ownerUuid à meUuid', () => {
        expect(isConversationOwner(directConversation, MOCK_ME_UUID)).toBe(true);
        expect(isConversationOwner(groupConversation, MOCK_ME_UUID)).toBe(false);
        expect(isConversationOwner(groupConversation, MOCK_OTHER_UUID)).toBe(true);
    });
});
