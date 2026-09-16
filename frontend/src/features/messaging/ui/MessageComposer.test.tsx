/**
 * Tests MessageComposer — Entrée envoie et vide, Maj+Entrée saut de ligne,
 * bouton désactivé si vide / isSending / disabled, maxLength et compteur,
 * validation > 4000, conservation du texte et notification en cas d'échec.
 * Références (M3) : `@` ouvre le sélecteur, sélection attache une chip et
 * retire `@query`, bouton « Insérer une référence », suppression d'une chip,
 * envoi transmet `entityRefs` puis vide les chips, Échap, clavier, plafond.
 * Pièces jointes (M4) : ajout via l'input fichier (chips « nom · taille »),
 * refus > 5 / trop volumineux / extension interdite (notifications), retrait,
 * envoi avec fichiers (corps vide autorisé), collage d'une image, vidage.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { setup, server } from '@test/test-utils';
import { createMockCampaign, createMockFa, createMockFsec } from '@test/mocks/handlers';
import { MAX_ATTACHMENT_SIZE_BYTES } from '@entities/messaging';
import { useNotificationStore } from '@shared/lib/notification';
import { MessageComposer } from './MessageComposer';

const FSEC_UUID = 'f5ec0000-0000-4000-8000-000000000001';
const CAMPAIGN_UUID = 'ca000000-0000-4000-8000-000000000001';
const CAMPAIGN_SLUG = '2025-s2-lmj-alpha';

/**
 * Deux campagnes ; « Campagne Alpha » (première : 2025 S2) porte les FSEC
 * « Alpha » (uuid connu) et « Beta ». Le sélecteur est en deux étapes :
 * campagne, puis références de cette campagne.
 */
function seedPicker() {
    server.use(
        http.get('/api/v1/campaigns/', () =>
            HttpResponse.json([
                createMockCampaign({ name: 'Campagne Omega', year: 2025, semester: 'S1' }),
                createMockCampaign({
                    uuid: CAMPAIGN_UUID,
                    slug: CAMPAIGN_SLUG,
                    name: 'Campagne Alpha',
                    year: 2025,
                    semester: 'S2',
                }),
            ]),
        ),
        http.get('/api/v1/fsecs/active/', () =>
            HttpResponse.json([
                createMockFsec({ name: 'Alpha', fsec_uuid: FSEC_UUID, campaign_id: CAMPAIGN_UUID }),
                createMockFsec({
                    name: 'Beta',
                    fsec_uuid: 'f5ec0000-0000-4000-8000-000000000002',
                    campaign_id: CAMPAIGN_UUID,
                }),
            ]),
        ),
        http.get('/api/v1/fas/', () => HttpResponse.json([])),
    );
}

/** Étape 1 → étape 2 : ouvre « Campagne Alpha ». */
const pickCampaignAlpha = async (user: ReturnType<typeof setup>['user']) =>
    user.click(await screen.findByRole('menuitem', { name: /Campagne Alpha/ }));

const getInput = () => screen.getByLabelText('Nouveau message');
const queryPicker = () => screen.queryByTestId('entity-ref-picker');
const attachedRefs = () => screen.queryByRole('group', { name: 'Références attachées' });

describe('MessageComposer', () => {
    beforeEach(() => {
        useNotificationStore.getState().clearAll();
    });

    it('envoie le texte strippé avec Entrée puis vide le champ', async () => {
        const onSend = vi.fn().mockResolvedValue(undefined);
        const { user } = setup(<MessageComposer onSend={onSend} isSending={false} />);

        const input = getInput();
        await user.type(input, '  Bonjour  {Enter}');

        await waitFor(() => expect(onSend).toHaveBeenCalledWith('Bonjour', [], []));
        await waitFor(() => expect(input).toHaveValue(''));
    });

    it('Maj+Entrée insère un retour à la ligne sans envoyer', async () => {
        const onSend = vi.fn();
        const { user } = setup(<MessageComposer onSend={onSend} isSending={false} />);

        const input = getInput();
        await user.type(input, 'ligne 1{Shift>}{Enter}{/Shift}ligne 2');

        expect(input).toHaveValue('ligne 1\nligne 2');
        expect(onSend).not.toHaveBeenCalled();
    });

    it('désactive le bouton Envoyer tant que le champ est vide (ou espaces)', async () => {
        const { user } = setup(<MessageComposer onSend={vi.fn()} isSending={false} />);

        const button = screen.getByRole('button', { name: 'Envoyer' });
        expect(button).toBeDisabled();

        const input = getInput();
        await user.type(input, '   ');
        expect(button).toBeDisabled();

        await user.type(input, 'a');
        expect(button).toBeEnabled();
    });

    it('envoie au clic sur le bouton', async () => {
        const onSend = vi.fn().mockResolvedValue(undefined);
        const { user } = setup(<MessageComposer onSend={onSend} isSending={false} />);

        await user.type(getInput(), 'Clic');
        await user.click(screen.getByRole('button', { name: 'Envoyer' }));

        await waitFor(() => expect(onSend).toHaveBeenCalledWith('Clic', [], []));
    });

    it('limite la saisie à 4000 caractères et affiche le compteur à partir de 3500', () => {
        setup(<MessageComposer onSend={vi.fn()} isSending={false} />);

        const input = getInput();
        expect(input).toHaveAttribute('maxlength', '4000');
        expect(screen.queryByText(/\/ 4000/)).not.toBeInTheDocument();

        fireEvent.change(input, { target: { value: 'a'.repeat(3499) } });
        expect(screen.queryByText(/\/ 4000/)).not.toBeInTheDocument();

        fireEvent.change(input, { target: { value: 'a'.repeat(3500) } });
        expect(screen.getByText('3500 / 4000')).toBeInTheDocument();
    });

    it('refuse un message > 4000 caractères (validation) sans appeler onSend', async () => {
        const onSend = vi.fn();
        const { user } = setup(<MessageComposer onSend={onSend} isSending={false} />);

        const input = getInput();
        // maxLength ne s'applique pas à un changement programmatique : on teste la validation zod.
        fireEvent.change(input, { target: { value: 'x'.repeat(4001) } });
        await user.click(screen.getByRole('button', { name: 'Envoyer' }));

        expect(await screen.findByText('Le message ne doit pas dépasser 4000 caractères')).toBeInTheDocument();
        expect(onSend).not.toHaveBeenCalled();

        // La saisie efface l'erreur.
        await user.type(input, '{Backspace}');
        expect(screen.queryByText('Le message ne doit pas dépasser 4000 caractères')).not.toBeInTheDocument();
    });

    it('isSending désactive le bouton et bloque Entrée', async () => {
        const onSend = vi.fn();
        const { user } = setup(<MessageComposer onSend={onSend} isSending />);

        const input = getInput();
        await user.type(input, 'En cours{Enter}');

        expect(screen.getByRole('button', { name: 'Envoyer' })).toBeDisabled();
        expect(onSend).not.toHaveBeenCalled();
        expect(input).toHaveValue('En cours');
    });

    it('disabled désactive le champ, Envoyer et Insérer une référence', () => {
        setup(<MessageComposer onSend={vi.fn()} isSending={false} disabled />);

        expect(getInput()).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Envoyer' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Insérer une référence' })).toBeDisabled();
    });

    it('conserve le texte et notifie une erreur si onSend échoue', async () => {
        const onSend = vi.fn().mockRejectedValue(new Error('Réseau indisponible'));
        const { user } = setup(<MessageComposer onSend={onSend} isSending={false} />);

        const input = getInput();
        await user.type(input, 'Perdu ?{Enter}');

        await waitFor(() => expect(onSend).toHaveBeenCalled());
        expect(input).toHaveValue('Perdu ?');
        await waitFor(() => {
            const notifications = useNotificationStore.getState().notifications;
            expect(notifications.some((n) => n.type === 'error')).toBe(true);
        });
    });

    /* ---------- Références ---------- */

    it('n’ouvre pas le sélecteur sans `@` ni pour un `@` collé à un mot', async () => {
        const { user } = setup(<MessageComposer onSend={vi.fn()} isSending={false} />);

        await user.type(getInput(), 'mail@exemple');

        expect(queryPicker()).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Insérer une référence' })).toHaveAttribute('aria-expanded', 'false');
    });

    it('`@` ouvre le sélecteur, le texte qui suit filtre les campagnes, la sélection (campagne puis FSEC) attache une chip et retire `@query`', async () => {
        seedPicker();
        const { user } = setup(<MessageComposer onSend={vi.fn()} isSending={false} />);
        const input = getInput();

        await user.type(input, 'Voir @al');

        const picker = await screen.findByTestId('entity-ref-picker');
        expect(screen.getByRole('button', { name: 'Insérer une référence' })).toHaveAttribute('aria-expanded', 'true');
        // Étape 1 : « al » filtre les campagnes.
        expect(await within(picker).findByRole('menuitem', { name: /Campagne Alpha/ })).toBeInTheDocument();
        expect(within(picker).queryByRole('menuitem', { name: /Campagne Omega/ })).not.toBeInTheDocument();

        // Étape 2 : les FSEC de la campagne.
        await user.click(within(picker).getByRole('menuitem', { name: /Campagne Alpha/ }));
        expect(
            await within(picker).findByRole('menuitem', { name: /^Fsec ?2025-LMJ_Campagne Test_Beta/ }),
        ).toBeInTheDocument();
        await user.click(within(picker).getByRole('menuitem', { name: /^Fsec ?2025-LMJ_Campagne Test_Alpha/ }));

        expect(queryPicker()).not.toBeInTheDocument();
        expect(input).toHaveValue('Voir ');
        expect(input).toHaveFocus();
        const refs = attachedRefs();
        expect(refs).toHaveTextContent('Alpha');
        // Chip du composer : jamais un lien.
        expect(within(refs as HTMLElement).queryByRole('link')).not.toBeInTheDocument();
    });

    it('un `@` suivi d’un espace referme le sélecteur ; Échap ferme sans rien retirer', async () => {
        seedPicker();
        const { user } = setup(<MessageComposer onSend={vi.fn()} isSending={false} />);
        const input = getInput();

        await user.type(input, '@al');
        await screen.findByTestId('entity-ref-picker');
        await user.type(input, ' ');
        expect(queryPicker()).not.toBeInTheDocument();

        await user.type(input, '@be');
        await screen.findByTestId('entity-ref-picker');
        await user.keyboard('{Escape}');

        expect(queryPicker()).not.toBeInTheDocument();
        expect(input).toHaveValue('@al @be');
        expect(attachedRefs()).not.toBeInTheDocument();
    });

    it('le bouton « Insérer une référence » insère `@` (précédé d’un espace si besoin) et ouvre le sélecteur', async () => {
        seedPicker();
        const { user } = setup(<MessageComposer onSend={vi.fn()} isSending={false} />);
        const input = getInput();

        await user.type(input, 'Bonjour');
        await user.click(screen.getByRole('button', { name: 'Insérer une référence' }));

        expect(input).toHaveValue('Bonjour @');
        const picker = await screen.findByTestId('entity-ref-picker');
        await pickCampaignAlpha(user);
        await user.click(await within(picker).findByRole('menuitem', { name: /^Fsec ?2025-LMJ_Campagne Test_Beta/ }));

        expect(input).toHaveValue('Bonjour ');
        expect(attachedRefs()).toHaveTextContent('Beta');

        // Champ vide : `@` seul, sans espace.
        await user.clear(input);
        await user.click(screen.getByRole('button', { name: 'Insérer une référence' }));
        expect(input).toHaveValue('@');
    });

    it('↓ déplace le focus sur la première campagne, Entrée l’ouvre, ↓ puis Entrée sélectionnent une FSEC', async () => {
        seedPicker();
        const { user } = setup(<MessageComposer onSend={vi.fn()} isSending={false} />);
        const input = getInput();

        await user.type(input, '@');
        const firstCampaign = await screen.findByRole('menuitem', { name: /Campagne Alpha/ });
        expect(input).toHaveFocus();

        await user.keyboard('{ArrowDown}');
        await waitFor(() => expect(firstCampaign).toHaveFocus());
        await user.keyboard('{Enter}');

        // Étape 2 : le champ de filtre a le focus, ↓ entre dans la liste.
        const filter = await screen.findByRole('textbox', { name: 'Filtrer les références' });
        expect(filter).toHaveFocus();
        await user.keyboard('{ArrowDown}');
        expect(screen.getByRole('menuitem', { name: /Référencer la campagne/ })).toHaveFocus();
        await user.keyboard('{ArrowDown}{ArrowDown}');
        expect(screen.getByRole('menuitem', { name: /^Fsec ?2025-LMJ_Campagne Test_Beta/ })).toHaveFocus();

        await user.keyboard('{Enter}');

        expect(attachedRefs()).toHaveTextContent('Beta');
        expect(input).toHaveValue('');
        expect(input).toHaveFocus();
    });

    it('Échap depuis la liste ou le filtre de l’étape 2 referme le sélecteur et rend le focus au champ', async () => {
        seedPicker();
        const { user } = setup(<MessageComposer onSend={vi.fn()} isSending={false} />);
        const input = getInput();

        await user.type(input, '@al');
        const first = await screen.findByRole('menuitem', { name: /Campagne Alpha/ });
        await user.keyboard('{Enter}');
        await waitFor(() => expect(first).toHaveFocus());

        await user.keyboard('{Escape}');

        expect(queryPicker()).not.toBeInTheDocument();
        expect(input).toHaveValue('@al');
        expect(input).toHaveFocus();

        // Étape 2 : Échap depuis le champ de filtre rend aussi le focus au champ.
        await user.click(screen.getByRole('button', { name: 'Insérer une référence' }));
        await pickCampaignAlpha(user);
        expect(await screen.findByRole('textbox', { name: 'Filtrer les références' })).toHaveFocus();
        await user.keyboard('{Escape}');

        expect(queryPicker()).not.toBeInTheDocument();
        expect(input).toHaveValue('@al @');
        expect(input).toHaveFocus();
    });

    it('la croix d’une chip retire la référence', async () => {
        seedPicker();
        const { user } = setup(<MessageComposer onSend={vi.fn()} isSending={false} />);

        await user.type(getInput(), '@al');
        await pickCampaignAlpha(user);
        await user.click(await screen.findByRole('menuitem', { name: /^Fsec ?2025-LMJ_Campagne Test_Alpha/ }));
        expect(attachedRefs()).toHaveTextContent('Alpha');

        await user.click(screen.getByLabelText('Retirer la référence 2025-LMJ_Campagne Test_Alpha'));

        expect(attachedRefs()).not.toBeInTheDocument();
    });

    it('l’envoi transmet les références (type + uuid) puis vide les chips ; le corps reste requis', async () => {
        seedPicker();
        const onSend = vi.fn().mockResolvedValue(undefined);
        const { user } = setup(<MessageComposer onSend={onSend} isSending={false} />);
        const input = getInput();

        await user.type(input, '@al');
        await pickCampaignAlpha(user);
        await user.click(await screen.findByRole('menuitem', { name: /^Fsec ?2025-LMJ_Campagne Test_Alpha/ }));
        expect(input).toHaveValue('');
        expect(screen.getByRole('button', { name: 'Envoyer' })).toBeDisabled();

        await user.type(input, 'Regarde{Enter}');

        await waitFor(() =>
            expect(onSend).toHaveBeenCalledWith('Regarde', [{ entityType: 'fsec', entityUuid: FSEC_UUID }], []),
        );
        await waitFor(() => expect(attachedRefs()).not.toBeInTheDocument());
        expect(input).toHaveValue('');
    });

    it('conserve les chips si l’envoi échoue', async () => {
        seedPicker();
        const onSend = vi.fn().mockRejectedValue(new Error('KO'));
        const { user } = setup(<MessageComposer onSend={onSend} isSending={false} />);
        const input = getInput();

        await user.type(input, '@al');
        await pickCampaignAlpha(user);
        await user.click(await screen.findByRole('menuitem', { name: /^Fsec ?2025-LMJ_Campagne Test_Alpha/ }));
        await user.type(input, 'Regarde{Enter}');

        await waitFor(() => expect(onSend).toHaveBeenCalled());
        expect(attachedRefs()).toHaveTextContent('Alpha');
        expect(input).toHaveValue('Regarde');
    });

    it('refuse une 11e référence avec la notification « 10 références maximum »', async () => {
        seedPicker();
        server.use(
            http.get('/api/v1/fsecs/active/', () =>
                HttpResponse.json(
                    Array.from({ length: 8 }, (_, i) =>
                        createMockFsec({ name: `FSEC ${i}`, campaign_id: CAMPAIGN_UUID }),
                    ),
                ),
            ),
            http.get('/api/v1/fas/', () =>
                HttpResponse.json(
                    Array.from({ length: 2 }, (_, i) =>
                        createMockFa({ identifier: `FA-${i}`, campaign_slug: CAMPAIGN_SLUG }),
                    ),
                ),
            ),
        );
        const { user } = setup(<MessageComposer onSend={vi.fn()} isSending={false} />);
        const input = getInput();

        // Campagne Alpha : elle-même + 8 FSEC + 2 FA = 11 références ; on attache les 10 premières (les attachées sont exclues).
        for (let i = 0; i < 10; i += 1) {
            await user.type(input, '@');
            await pickCampaignAlpha(user);
            const picker = await screen.findByTestId('entity-ref-picker');
            const [firstItem] = await within(picker).findAllByRole('menuitem');
            await user.click(firstItem);
        }
        expect(within(attachedRefs() as HTMLElement).getAllByLabelText(/^Retirer la référence/)).toHaveLength(10);

        await user.type(input, '@');
        await pickCampaignAlpha(user);
        const picker = await screen.findByTestId('entity-ref-picker');
        const [eleventh] = await within(picker).findAllByRole('menuitem');
        await user.click(eleventh);

        expect(within(attachedRefs() as HTMLElement).getAllByLabelText(/^Retirer la référence/)).toHaveLength(10);
        await waitFor(() => {
            const notifications = useNotificationStore.getState().notifications;
            expect(notifications.some((n) => n.message === '10 références maximum')).toBe(true);
        });
        expect(queryPicker()).not.toBeInTheDocument();
    });
});

/* ------------------------------------------------------------------ */
/*  Vague M4 — pièces jointes                                          */
/* ------------------------------------------------------------------ */

const getFileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;
const pendingFiles = () => screen.queryByRole('group', { name: 'Pièces jointes en attente' });
const getSendButton = () => screen.getByRole('button', { name: 'Envoyer' });
const getAttachButton = () => screen.getByRole('button', { name: 'Joindre des fichiers' });

const pdfFile = (name = 'rapport.pdf', content = 'x'.repeat(12 * 1024)) =>
    new File([content], name, { type: 'application/pdf' });
const pngFile = (name = 'photo.png') => new File([new Uint8Array(2048)], name, { type: 'image/png' });

/** Fichier dont `size` dépasse le plafond sans allouer 10 Mo (jsdom). */
function oversizedFile(name = 'gros.pdf') {
    const file = new File(['x'], name, { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: MAX_ATTACHMENT_SIZE_BYTES + 1 });
    return file;
}

const warningMessages = () =>
    useNotificationStore
        .getState()
        .notifications.filter((n) => n.type === 'warning')
        .map((n) => n.message);

describe('MessageComposer — pièces jointes (M4)', () => {
    beforeEach(() => {
        useNotificationStore.getState().clearAll();
    });

    it('expose un input fichier masqué (multiple, accept limité) derrière « Joindre des fichiers »', () => {
        setup(<MessageComposer onSend={vi.fn()} isSending={false} />);

        const input = getFileInput();
        expect(input).toHaveAttribute('multiple');
        expect(input).toHaveAttribute('hidden');
        expect(input).toHaveAttribute('accept', expect.stringContaining('.pdf'));
        expect(input).toHaveAttribute('accept', expect.stringContaining('.png'));
        expect(input.getAttribute('accept')).not.toContain('.exe');
        expect(getAttachButton()).toBeEnabled();
        expect(pendingFiles()).not.toBeInTheDocument();
    });

    it('un fichier choisi apparaît en chip « nom · taille » et active Envoyer même sans corps', async () => {
        const { user } = setup(<MessageComposer onSend={vi.fn()} isSending={false} />);
        expect(getSendButton()).toBeDisabled();

        await user.upload(getFileInput(), pdfFile());

        const group = pendingFiles() as HTMLElement;
        expect(group).toBeInTheDocument();
        expect(within(group).getByText('rapport.pdf · 12 Ko')).toBeInTheDocument();
        expect(within(group).getByRole('button', { name: 'Retirer la pièce jointe rapport.pdf' })).toBeInTheDocument();
        expect(getSendButton()).toBeEnabled();
        expect(warningMessages()).toHaveLength(0);
    });

    it('accepte plusieurs fichiers d’un coup et un même nom deux fois', async () => {
        const { user } = setup(<MessageComposer onSend={vi.fn()} isSending={false} />);

        await user.upload(getFileInput(), [pdfFile(), pngFile()]);
        await user.upload(getFileInput(), pdfFile());

        const group = pendingFiles() as HTMLElement;
        expect(within(group).getAllByText('rapport.pdf · 12 Ko')).toHaveLength(2);
        expect(within(group).getByText('photo.png · 2 Ko')).toBeInTheDocument();
        expect(within(group).getAllByRole('button', { name: /^Retirer la pièce jointe/ })).toHaveLength(3);
    });

    it('refuse le 6e fichier avec la notification « Nombre maximal … » et désactive « Joindre »', async () => {
        const { user } = setup(<MessageComposer onSend={vi.fn()} isSending={false} />);

        await user.upload(
            getFileInput(),
            Array.from({ length: 5 }, (_, i) => pdfFile(`doc-${i}.pdf`)),
        );
        expect(within(pendingFiles() as HTMLElement).getAllByRole('button', { name: /^Retirer/ })).toHaveLength(5);
        expect(getAttachButton()).toBeDisabled();

        await user.upload(getFileInput(), pdfFile('doc-6.pdf'));

        expect(within(pendingFiles() as HTMLElement).getAllByRole('button', { name: /^Retirer/ })).toHaveLength(5);
        expect(screen.queryByText(/doc-6\.pdf/)).not.toBeInTheDocument();
        await waitFor(() =>
            expect(warningMessages()).toContain('Nombre maximal de pièces jointes atteint (5 par message)'),
        );
    });

    it('au-delà du plafond en une seule sélection : les 5 premiers sont gardés, une seule notification', async () => {
        const { user } = setup(<MessageComposer onSend={vi.fn()} isSending={false} />);

        await user.upload(
            getFileInput(),
            Array.from({ length: 7 }, (_, i) => pdfFile(`doc-${i}.pdf`)),
        );

        const group = pendingFiles() as HTMLElement;
        expect(within(group).getAllByRole('button', { name: /^Retirer/ })).toHaveLength(5);
        expect(within(group).getByText('doc-4.pdf · 12 Ko')).toBeInTheDocument();
        expect(within(group).queryByText(/doc-5\.pdf/)).not.toBeInTheDocument();
        await waitFor(() => expect(warningMessages()).toHaveLength(1));
    });

    it('refuse un fichier trop volumineux (notification) sans l’ajouter', async () => {
        const { user } = setup(<MessageComposer onSend={vi.fn()} isSending={false} />);

        await user.upload(getFileInput(), oversizedFile());

        expect(pendingFiles()).not.toBeInTheDocument();
        expect(getSendButton()).toBeDisabled();
        await waitFor(() =>
            expect(warningMessages().some((m) => m.includes('gros.pdf') && m.includes('trop volumineux'))).toBe(true),
        );
    });

    it('refuse une extension interdite (notification) mais garde les fichiers valides du même lot', async () => {
        setup(<MessageComposer onSend={vi.fn()} isSending={false} />);

        // `fireEvent.change` contourne le filtre `accept` du navigateur (user.upload l'applique) :
        // c'est la validation du composant qui doit refuser le fichier.
        fireEvent.change(getFileInput(), {
            target: { files: [new File(['MZ'], 'virus.exe', { type: 'application/octet-stream' }), pdfFile()] },
        });

        const group = await screen.findByRole('group', { name: 'Pièces jointes en attente' });
        expect(within(group).getByText('rapport.pdf · 12 Ko')).toBeInTheDocument();
        expect(within(group).queryByText(/virus\.exe/)).not.toBeInTheDocument();
        await waitFor(() =>
            expect(
                warningMessages().some((m) => m.includes('virus.exe') && m.includes('type de fichier non autorisé')),
            ).toBe(true),
        );
    });

    it('la croix d’une chip retire la pièce jointe (Envoyer redevient inactif sans corps)', async () => {
        const { user } = setup(<MessageComposer onSend={vi.fn()} isSending={false} />);

        await user.upload(getFileInput(), [pdfFile(), pngFile()]);
        await user.click(screen.getByRole('button', { name: 'Retirer la pièce jointe rapport.pdf' }));

        const group = pendingFiles() as HTMLElement;
        expect(within(group).queryByText(/rapport\.pdf/)).not.toBeInTheDocument();
        expect(within(group).getByText('photo.png · 2 Ko')).toBeInTheDocument();
        expect(getSendButton()).toBeEnabled();

        await user.click(screen.getByRole('button', { name: 'Retirer la pièce jointe photo.png' }));

        expect(pendingFiles()).not.toBeInTheDocument();
        expect(getSendButton()).toBeDisabled();
        expect(getAttachButton()).toBeEnabled();
    });

    it("envoie un message sans corps avec un seul fichier : onSend('', [], [file]) puis vide les chips", async () => {
        const onSend = vi.fn().mockResolvedValue(undefined);
        const { user } = setup(<MessageComposer onSend={onSend} isSending={false} />);
        const file = pdfFile();

        await user.upload(getFileInput(), file);
        await user.click(getSendButton());

        await waitFor(() => expect(onSend).toHaveBeenCalledTimes(1));
        expect(onSend).toHaveBeenCalledWith('', [], [file]);
        await waitFor(() => expect(pendingFiles()).not.toBeInTheDocument());
        expect(getSendButton()).toBeDisabled();
    });

    it('Entrée envoie aussi avec corps vide et fichier (sans erreur « ne peut pas être vide »)', async () => {
        const onSend = vi.fn().mockResolvedValue(undefined);
        const { user } = setup(<MessageComposer onSend={onSend} isSending={false} />);

        await user.upload(getFileInput(), pngFile());
        await user.type(getInput(), '{Enter}');

        await waitFor(() => expect(onSend).toHaveBeenCalledTimes(1));
        expect(onSend.mock.calls[0][0]).toBe('');
        expect(screen.queryByText('Le message ne peut pas être vide')).not.toBeInTheDocument();
    });

    it('envoie corps + fichiers : le 3e argument contient les File dans l’ordre', async () => {
        const onSend = vi.fn().mockResolvedValue(undefined);
        const { user } = setup(<MessageComposer onSend={onSend} isSending={false} />);
        const first = pdfFile();
        const second = pngFile();

        await user.upload(getFileInput(), [first, second]);
        await user.type(getInput(), 'Ci-joint{Enter}');

        await waitFor(() => expect(onSend).toHaveBeenCalledTimes(1));
        const [body, refs, files] = onSend.mock.calls[0] as [string, unknown[], File[]];
        expect(body).toBe('Ci-joint');
        expect(refs).toEqual([]);
        expect(files).toHaveLength(2);
        expect(files[0]).toBe(first);
        expect(files[1]).toBe(second);
        expect(files[0]).toBeInstanceOf(File);
        await waitFor(() => expect(getInput()).toHaveValue(''));
        expect(pendingFiles()).not.toBeInTheDocument();
    });

    it('conserve les fichiers si l’envoi échoue', async () => {
        const onSend = vi.fn().mockRejectedValue(new Error('KO'));
        const { user } = setup(<MessageComposer onSend={onSend} isSending={false} />);

        await user.upload(getFileInput(), pdfFile());
        await user.type(getInput(), 'Perdu ?{Enter}');

        await waitFor(() => expect(onSend).toHaveBeenCalled());
        expect(within(pendingFiles() as HTMLElement).getByText('rapport.pdf · 12 Ko')).toBeInTheDocument();
        expect(getInput()).toHaveValue('Perdu ?');
    });

    it('le collage d’une image dans le champ l’ajoute en pièce jointe', async () => {
        const onSend = vi.fn().mockResolvedValue(undefined);
        const { user } = setup(<MessageComposer onSend={onSend} isSending={false} />);
        const pasted = new File([new Uint8Array(4096)], 'capture.png', { type: 'image/png' });

        fireEvent.paste(getInput(), { clipboardData: { files: [pasted], items: [] } });

        const group = await screen.findByRole('group', { name: 'Pièces jointes en attente' });
        expect(within(group).getByText('capture.png · 4 Ko')).toBeInTheDocument();

        await user.click(getSendButton());
        await waitFor(() => expect(onSend).toHaveBeenCalledWith('', [], [pasted]));
    });

    it('un collage sans fichier (texte) ne fait rien', async () => {
        setup(<MessageComposer onSend={vi.fn()} isSending={false} />);

        fireEvent.paste(getInput(), { clipboardData: { files: [], items: [], getData: () => 'texte' } });

        expect(pendingFiles()).not.toBeInTheDocument();
        expect(warningMessages()).toHaveLength(0);
    });

    it('un collage d’un fichier interdit est refusé avec notification', async () => {
        setup(<MessageComposer onSend={vi.fn()} isSending={false} />);

        fireEvent.paste(getInput(), {
            clipboardData: { files: [new File(['x'], 'script.sh', { type: 'text/x-sh' })], items: [] },
        });

        await waitFor(() => expect(warningMessages().some((m) => m.includes('script.sh'))).toBe(true));
        expect(pendingFiles()).not.toBeInTheDocument();
    });

    it('disabled désactive « Joindre des fichiers »', () => {
        setup(<MessageComposer onSend={vi.fn()} isSending={false} disabled />);

        expect(getAttachButton()).toBeDisabled();
        expect(getFileInput()).toBeDisabled();
    });
});
