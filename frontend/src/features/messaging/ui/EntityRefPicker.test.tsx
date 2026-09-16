/**
 * Tests EntityRefPicker (deux étapes) — étape 1 : campagnes triées
 * (« Récentes » : année, semestre, nom, avec bandes d'année ; « A → Z » : nom
 * numérique), tri mémorisé en session, filtre `query` (nom / slug / année,
 * casse et accents) et champ interne synchronisé, sous-titre « S1 · LMJ »
 * (ou « 2025 · S1 »), plafond de 50 + nombre de campagnes masquées, états
 * chargement / vide / erreur ; étape 2 : bouton retour, campagne elle-même,
 * FSEC (`campaignId`) et FA (`campaignSlug`) de la campagne seulement, bandes
 * « FSEC · N » / « FA · N », filtre interne, exclusion, plafond de 8 par
 * groupe, états vides ; clavier (↑/↓/Entrée, champs de filtre, Échap, Tab),
 * `onResultsChange` par étape, remise à l'étape 1 à la réouverture, clic à
 * l'extérieur, rendu en place sans ancrage, rien si fermé.
 */
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import type { ComponentProps } from 'react';

import { setup, server, errorHandlers } from '@test/test-utils';
import { createMockCampaign, createMockFa, createMockFsec } from '@test/mocks/handlers';
import { CAMPAIGN_SORT_STORAGE_KEY } from '../lib/entity-refs';
import { EntityRefPicker } from './EntityRefPicker';

const CAMPAIGN_A = { uuid: 'ca000000-0000-4000-8000-00000000000a', slug: '2025-s2-lmj-alpha' };
const CAMPAIGN_B = { uuid: 'ca000000-0000-4000-8000-00000000000b', slug: '2025-s1-omega-beta' };
const CAMPAIGN_C = { uuid: 'ca000000-0000-4000-8000-00000000000c', slug: '2024-s2-lmj-gamma' };
const FSEC_A1_UUID = 'f5ec0000-0000-4000-8000-0000000000a1';
const FA_A1_UUID = 'fa000000-0000-4000-8000-0000000000a1';

const campaignA = () => createMockCampaign({ ...CAMPAIGN_A, name: 'Campagne Alpha', year: 2025, semester: 'S2' });
const campaignB = () => createMockCampaign({ ...CAMPAIGN_B, name: 'Campagne Bêta', year: 2025, semester: 'S1' });
const campaignC = () => createMockCampaign({ ...CAMPAIGN_C, name: 'Campagne Gamma', year: 2024, semester: 'S2' });

/**
 * Trois campagnes (servies dans le désordre) ; la campagne A porte deux FSEC
 * actives, une inactive et une FA ; la campagne B une FSEC et une FA ; la
 * campagne C rien.
 */
function seed({
    fsecs = [
        createMockFsec({
            name: 'FSEC A1',
            fsec_uuid: FSEC_A1_UUID,
            slug: 'a1-eprouvette',
            campaign_id: CAMPAIGN_A.uuid,
        }),
        createMockFsec({ name: 'FSEC A2', slug: 'a2-cible', campaign_id: CAMPAIGN_A.uuid }),
        createMockFsec({ name: 'FSEC A inactive', campaign_id: CAMPAIGN_A.uuid, is_active: false }),
        createMockFsec({ name: 'FSEC B1', campaign_id: CAMPAIGN_B.uuid }),
    ],
    fas = [
        createMockFa({ identifier: 'FA-A-1', uuid: FA_A1_UUID, slug: 'fa-a-1', campaign_slug: CAMPAIGN_A.slug }),
        createMockFa({ identifier: 'FA-B-1', slug: 'fa-b-1', campaign_slug: CAMPAIGN_B.slug }),
    ],
    campaigns = [campaignC(), campaignB(), campaignA()],
} = {}) {
    server.use(
        http.get('/api/v1/campaigns/', () => HttpResponse.json(campaigns)),
        http.get('/api/v1/fsecs/active/', () => HttpResponse.json(fsecs)),
        http.get('/api/v1/fas/', () => HttpResponse.json(fas)),
    );
}

type PickerProps = ComponentProps<typeof EntityRefPicker>;

function renderPicker(props: Partial<PickerProps> = {}) {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const baseProps: PickerProps = {
        open: true,
        anchorEl: document.body,
        query: '',
        excluded: [],
        onSelect,
        onClose,
        ...props,
    };
    const utils = setup(
        <>
            <button type="button">Ailleurs</button>
            <EntityRefPicker {...baseProps} />
        </>,
    );
    const rerenderPicker = (next: Partial<PickerProps>) =>
        utils.rerender(
            <>
                <button type="button">Ailleurs</button>
                <EntityRefPicker {...baseProps} {...next} />
            </>,
        );
    return { ...utils, onSelect, onClose, rerenderPicker };
}

const findCampaignMenu = () => screen.findByRole('menu', { name: 'Campagnes disponibles' });
const findRefMenu = () => screen.findByRole('menu', { name: 'Références disponibles' });
const getFilterField = () => screen.getByRole('textbox', { name: 'Filtrer les références' });
const getCampaignFilterField = () => screen.getByRole('textbox', { name: 'Filtrer les campagnes' });
const getBackButton = () => screen.getByRole('button', { name: 'Toutes les campagnes' });
const getSortButton = (label: 'Récentes' | 'A → Z') => screen.getByRole('button', { name: label });

/** Le texte des pastilles (« C », « Fsec », « FA ») est ignoré : seuls les en-têtes de groupe sont visés. */
const HEADER_QUERY = { ignore: '[role="img"] *' } as const;
const getHeader = (menu: HTMLElement, label: string | RegExp) => within(menu).getByText(label, HEADER_QUERY);
const queryHeader = (menu: HTMLElement, label: string | RegExp) => within(menu).queryByText(label, HEADER_QUERY);

/** Bandes d'année de l'étape 1 (tri « Récentes »), dans l'ordre d'affichage. */
const yearBands = (menu: HTMLElement) =>
    Array.from(menu.querySelectorAll('.MuiListSubheader-root')).map((band) => band.textContent);

/** Libellés des éléments de menu, pastille de type retirée. */
const itemTexts = (menu: HTMLElement) =>
    within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent?.replace(/^(C|Fsec|FA)/, ''));

/** Ouvre l'étape 2 sur la campagne demandée. */
async function pickCampaign(user: ReturnType<typeof setup>['user'], name: RegExp) {
    await user.click(await screen.findByRole('menuitem', { name }));
    return findRefMenu();
}

beforeEach(() => {
    sessionStorage.clear();
});

describe('EntityRefPicker — étape 1 (campagnes)', () => {
    it('ne rend rien quand il est fermé', () => {
        renderPicker({ open: false });
        expect(screen.queryByTestId('entity-ref-picker')).not.toBeInTheDocument();
    });

    it('affiche le chargement puis l’en-tête « Campagnes », les campagnes « Récentes » (année, semestre, nom) sous des bandes d’année, avec « semestre · installation »', async () => {
        seed({
            campaigns: [
                campaignC(),
                createMockCampaign({ name: 'Zulu', year: 2025, semester: 'S1', installation_id: 1 }),
                campaignB(),
                createMockCampaign({ name: 'Éole', year: 2025, semester: 'S1', installation_id: null }),
                campaignA(),
            ],
        });
        const { onSelect } = renderPicker();

        expect(screen.getByRole('status', { name: 'Chargement des références' })).toBeInTheDocument();

        const menu = await findCampaignMenu();
        expect(screen.getByRole('heading', { name: 'Campagnes' })).toBeInTheDocument();
        // Sous-titre « S1 · OMEGA » (installation connue) ou « 2025 · S1 » (sans installation).
        expect(itemTexts(menu)).toEqual([
            'Campagne AlphaS2 · LMJ',
            'Campagne BêtaS1 · LMJ',
            'Éole2025 · S1',
            'ZuluS1 · OMEGA',
            'Campagne GammaS2 · LMJ',
        ]);
        expect(yearBands(menu)).toEqual(['2025', '2024']);
        expect(within(menu).getAllByRole('img', { name: 'C' })).toHaveLength(5);
        expect(getSortButton('Récentes')).toHaveAttribute('aria-pressed', 'true');
        expect(getSortButton('A → Z')).toHaveAttribute('aria-pressed', 'false');
        expect(getCampaignFilterField()).toHaveValue('');
        expect(getCampaignFilterField()).toHaveAttribute('placeholder', 'Nom, année…');
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        expect(screen.queryByRole('menu', { name: 'Références disponibles' })).not.toBeInTheDocument();
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('le champ « Filtrer les campagnes » est pré-rempli avec `query`, filtre seul, et `query` reprend la main quand il change', async () => {
        seed();
        const { user, rerenderPicker } = renderPicker({ query: 'alpha' });

        const menu = await findCampaignMenu();
        expect(getCampaignFilterField()).toHaveValue('alpha');
        expect(within(menu).getAllByRole('menuitem')).toHaveLength(1);

        // Le champ interne filtre par lui-même (sélecteur ouvert par le bouton, `query` vide).
        await user.clear(getCampaignFilterField());
        await waitFor(() => expect(screen.getAllByRole('menuitem')).toHaveLength(3));
        await user.type(getCampaignFilterField(), 'GAMMA');
        await waitFor(() => expect(screen.getAllByRole('menuitem')).toHaveLength(1));
        expect(screen.getByRole('menuitem', { name: /Campagne Gamma/ })).toBeInTheDocument();

        // Un nouveau `query` (frappe après `@`) remplace la valeur du champ.
        rerenderPicker({ query: 'bêta' });
        await waitFor(() => expect(getCampaignFilterField()).toHaveValue('bêta'));
        expect(screen.getAllByRole('menuitem')).toHaveLength(1);
        expect(screen.getByRole('menuitem', { name: /Campagne Bêta/ })).toBeInTheDocument();
    });

    it('↓ depuis le champ « Filtrer les campagnes » rejoint la première campagne ; Entrée l’ouvre (rien sans résultat)', async () => {
        seed();
        const { user, onSelect } = renderPicker();

        await findCampaignMenu();
        await user.click(getCampaignFilterField());
        await user.keyboard('{ArrowDown}');
        expect(screen.getByRole('menuitem', { name: /Campagne Alpha/ })).toHaveFocus();

        await user.click(getCampaignFilterField());
        await user.type(getCampaignFilterField(), 'zzz{Enter}');
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();

        await user.clear(getCampaignFilterField());
        await user.type(getCampaignFilterField(), 'gamma{Enter}');
        await findRefMenu();
        expect(screen.getByRole('heading', { name: 'Campagne Gamma' })).toBeInTheDocument();
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('« A → Z » trie par nom (numérique, accents ignorés) sans bande d’année ; « Récentes » rétablit les bandes', async () => {
        seed({
            campaigns: [
                createMockCampaign({ name: 'Tir 10', year: 2024, semester: 'S1' }),
                createMockCampaign({ name: 'Tir 2', year: 2025, semester: 'S2' }),
                createMockCampaign({ name: 'Éclair', year: 2023, semester: 'S1' }),
                createMockCampaign({ name: 'Alpha', year: 2025, semester: 'S1' }),
            ],
        });
        const { user } = renderPicker();

        const menu = await findCampaignMenu();
        expect(itemTexts(menu).map((text) => text?.replace(/S\d · LMJ$/, ''))).toEqual([
            'Tir 2',
            'Alpha',
            'Tir 10',
            'Éclair',
        ]);
        expect(yearBands(menu)).toEqual(['2025', '2024', '2023']);

        await user.click(getSortButton('A → Z'));

        expect(getSortButton('A → Z')).toHaveAttribute('aria-pressed', 'true');
        expect(getSortButton('Récentes')).toHaveAttribute('aria-pressed', 'false');
        const alphaMenu = await findCampaignMenu();
        expect(itemTexts(alphaMenu).map((text) => text?.replace(/S\d · LMJ$/, ''))).toEqual([
            'Alpha',
            'Éclair',
            'Tir 2',
            'Tir 10',
        ]);
        expect(yearBands(alphaMenu)).toEqual([]);

        // Re-cliquer l’option active ne désélectionne rien.
        await user.click(getSortButton('A → Z'));
        expect(getSortButton('A → Z')).toHaveAttribute('aria-pressed', 'true');

        await user.click(getSortButton('Récentes'));
        expect(yearBands(await findCampaignMenu())).toEqual(['2025', '2024', '2023']);
    });

    it('mémorise le tri pour la session (sessionStorage) et le retrouve à la réouverture', async () => {
        seed();
        const { user, rerenderPicker } = renderPicker();

        await findCampaignMenu();
        await user.click(getSortButton('A → Z'));
        expect(sessionStorage.getItem(CAMPAIGN_SORT_STORAGE_KEY)).toBe('alpha');

        rerenderPicker({ open: false });
        rerenderPicker({ open: true });

        await findCampaignMenu();
        expect(getSortButton('A → Z')).toHaveAttribute('aria-pressed', 'true');
        expect(yearBands(screen.getByRole('menu'))).toEqual([]);
    });

    it('filtre les campagnes avec `query` : nom (casse, accents), slug et année', async () => {
        seed();
        const { rerenderPicker } = renderPicker({ query: 'BETA' });

        const menu = await findCampaignMenu();
        expect(within(menu).getAllByRole('menuitem')).toHaveLength(1);
        expect(within(menu).getByRole('menuitem', { name: /Campagne Bêta/ })).toBeInTheDocument();

        rerenderPicker({ query: 'lmj' });
        await waitFor(() => expect(screen.getAllByRole('menuitem')).toHaveLength(2));
        expect(screen.getByRole('menuitem', { name: /Campagne Alpha/ })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /Campagne Gamma/ })).toBeInTheDocument();

        rerenderPicker({ query: '2024' });
        await waitFor(() => expect(screen.getAllByRole('menuitem')).toHaveLength(1));
        expect(screen.getByRole('menuitem', { name: /Campagne Gamma/ })).toBeInTheDocument();
    });

    it('affiche « Aucun résultat » quand `query` ne correspond à aucune campagne', async () => {
        seed();
        renderPicker({ query: 'zzz-introuvable' });

        expect(await screen.findByText('Aucun résultat')).toBeInTheDocument();
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('affiche « Aucune campagne » quand la liste est vide', async () => {
        seed({ campaigns: [] });
        renderPicker();

        expect(await screen.findByText('Aucune campagne')).toBeInTheDocument();
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('plafonne à 50 campagnes et indique le nombre de campagnes masquées', async () => {
        seed({
            campaigns: Array.from({ length: 54 }, (_, i) =>
                createMockCampaign({ name: `Campagne ${String(i).padStart(2, '0')}`, year: 2025, semester: 'S1' }),
            ),
        });
        const { rerenderPicker } = renderPicker();

        const menu = await findCampaignMenu();
        await waitFor(() => expect(within(menu).getAllByRole('menuitem')).toHaveLength(50));
        expect(within(menu).getByRole('menuitem', { name: /Campagne 49/ })).toBeInTheDocument();
        expect(within(menu).queryByRole('menuitem', { name: /Campagne 50/ })).not.toBeInTheDocument();
        expect(screen.getByText('4 campagnes supplémentaires — affinez la recherche')).toBeInTheDocument();

        // « Campagne 10 » à « Campagne 19 ».
        rerenderPicker({ query: 'campagne 1' });
        await waitFor(() => expect(screen.getAllByRole('menuitem')).toHaveLength(10));
        expect(screen.queryByText(/affinez la recherche/)).not.toBeInTheDocument();
    });

    it('affiche une alerte si les campagnes ne peuvent pas être chargées', async () => {
        server.use(errorHandlers.campaignServerError);
        renderPicker();

        expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de charger les campagnes');
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('reporte le nombre de campagnes affichées via onResultsChange', async () => {
        seed();
        const onResultsChange = vi.fn();
        const { rerenderPicker } = renderPicker({ onResultsChange });

        await findCampaignMenu();
        expect(onResultsChange).toHaveBeenLastCalledWith(3);

        rerenderPicker({ query: 'gamma' });
        await waitFor(() => expect(onResultsChange).toHaveBeenLastCalledWith(1));
    });
});

describe('EntityRefPicker — étape 2 (références de la campagne)', () => {
    it('choisir une campagne ouvre l’étape 2 : retour, nom en gras, filtre focalisé, groupes limités à la campagne', async () => {
        seed();
        const { user, onSelect } = renderPicker();

        const menu = await pickCampaign(user, /Campagne Alpha/);

        expect(onSelect).not.toHaveBeenCalled();
        expect(getBackButton()).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Campagne Alpha' })).toHaveStyle({ fontWeight: 700 });
        expect(getFilterField()).toHaveFocus();
        expect(getFilterField()).toHaveAttribute('placeholder', 'Filtrer FSEC / FA…');
        expect(screen.queryByRole('menu', { name: 'Campagnes disponibles' })).not.toBeInTheDocument();

        // Bandes de groupe : « CAMPAGNE », puis « FSEC · N » / « FA · N ».
        expect(getHeader(menu, 'CAMPAGNE')).toBeInTheDocument();
        expect(getHeader(menu, 'FSEC · 2')).toBeInTheDocument();
        expect(getHeader(menu, 'FA · 1')).toBeInTheDocument();
        expect(itemTexts(menu)).toEqual([
            'Référencer la campagneCampagne Alpha',
            '2025-LMJ_Campagne Test_FSEC A1a1-eprouvette',
            '2025-LMJ_Campagne Test_FSEC A2a2-cible',
            'FA-A-1fa-a-1',
        ]);
        expect(within(menu).queryByRole('menuitem', { name: /FSEC B1|FA-B-1|inactive/ })).not.toBeInTheDocument();
        // Pastilles : en-têtes + éléments.
        expect(within(menu).getAllByRole('img', { name: 'C' })).toHaveLength(2);
        expect(within(menu).getAllByRole('img', { name: 'Fsec' })).toHaveLength(3);
        expect(within(menu).getAllByRole('img', { name: 'FA' })).toHaveLength(2);
    });

    it('« Référencer la campagne » sélectionne la campagne elle-même (uuid, nom)', async () => {
        seed();
        const { user, onSelect } = renderPicker();

        const menu = await pickCampaign(user, /Campagne Alpha/);
        await user.click(within(menu).getByRole('menuitem', { name: /Référencer la campagne/ }));

        expect(onSelect).toHaveBeenCalledWith({
            entityType: 'campaign',
            entityUuid: CAMPAIGN_A.uuid,
            label: 'Campagne Alpha',
        });
    });

    it('sélectionne une FSEC (fsec_uuid) ou une FA (uuid) au clic', async () => {
        seed();
        const { user, onSelect } = renderPicker();

        const menu = await pickCampaign(user, /Campagne Alpha/);
        await user.click(within(menu).getByRole('menuitem', { name: /FSEC A1/ }));
        expect(onSelect).toHaveBeenLastCalledWith({
            entityType: 'fsec',
            entityUuid: FSEC_A1_UUID,
            label: '2025-LMJ_Campagne Test_FSEC A1',
        });

        await user.click(within(menu).getByRole('menuitem', { name: /FA-A-1/ }));
        expect(onSelect).toHaveBeenLastCalledWith({ entityType: 'fa', entityUuid: FA_A1_UUID, label: 'FA-A-1' });
    });

    it('le filtre interne agit sur libellé et slug (casse, accents) et ignore `query`', async () => {
        seed();
        const { user } = renderPicker({ query: 'alpha' });

        const menu = await pickCampaign(user, /Campagne Alpha/);
        await user.type(getFilterField(), 'ÉPROUVETTE');

        expect(within(menu).getAllByRole('menuitem')).toHaveLength(1);
        expect(within(menu).getByRole('menuitem', { name: /FSEC A1/ })).toBeInTheDocument();
        expect(getHeader(menu, 'FSEC · 1')).toBeInTheDocument();
        expect(queryHeader(menu, 'CAMPAGNE')).not.toBeInTheDocument();
        expect(queryHeader(menu, /^FA/)).not.toBeInTheDocument();

        await user.clear(getFilterField());
        await user.type(getFilterField(), 'fa-a');
        expect(within(menu).getAllByRole('menuitem')).toHaveLength(1);
        expect(within(menu).getByRole('menuitem', { name: /FA-A-1/ })).toBeInTheDocument();

        await user.clear(getFilterField());
        await user.type(getFilterField(), 'zzz');
        expect(await screen.findByText('Aucun résultat pour ce filtre')).toBeInTheDocument();
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('exclut les références déjà attachées (campagne elle-même et FSEC)', async () => {
        seed();
        const { user } = renderPicker({
            excluded: [
                { entityType: 'campaign', entityUuid: CAMPAIGN_A.uuid },
                { entityType: 'fsec', entityUuid: FSEC_A1_UUID },
            ],
        });

        const menu = await pickCampaign(user, /Campagne Alpha/);

        expect(within(menu).queryByRole('menuitem', { name: /Référencer la campagne/ })).not.toBeInTheDocument();
        expect(queryHeader(menu, 'CAMPAGNE')).not.toBeInTheDocument();
        expect(getHeader(menu, 'FSEC · 1')).toBeInTheDocument();
        expect(within(menu).queryByRole('menuitem', { name: /FSEC A1/ })).not.toBeInTheDocument();
        expect(within(menu).getByRole('menuitem', { name: /FSEC A2/ })).toBeInTheDocument();
        expect(within(menu).getByRole('menuitem', { name: /FA-A-1/ })).toBeInTheDocument();
    });

    it('affiche « Aucun FSEC ni FA dans cette campagne » (la campagne reste référençable)', async () => {
        seed();
        const { user } = renderPicker();

        const menu = await pickCampaign(user, /Campagne Gamma/);

        expect(screen.getByText('Aucun FSEC ni FA dans cette campagne')).toBeInTheDocument();
        expect(within(menu).getAllByRole('menuitem')).toHaveLength(1);
        expect(within(menu).getByRole('menuitem', { name: /Référencer la campagne/ })).toBeInTheDocument();
    });

    it('plafonne chaque groupe à 8 résultats, la bande indiquant le total', async () => {
        seed({
            fsecs: Array.from({ length: 10 }, (_, i) =>
                createMockFsec({ name: `FSEC ${i}`, campaign_id: CAMPAIGN_A.uuid }),
            ),
            fas: Array.from({ length: 9 }, (_, i) =>
                createMockFa({ identifier: `FA-${i}`, campaign_slug: CAMPAIGN_A.slug }),
            ),
        });
        const { user } = renderPicker();

        const menu = await pickCampaign(user, /Campagne Alpha/);

        expect(within(menu).getAllByRole('menuitem')).toHaveLength(1 + 8 + 8);
        expect(getHeader(menu, 'FSEC · 10')).toBeInTheDocument();
        expect(getHeader(menu, 'FA · 9')).toBeInTheDocument();
        expect(within(menu).getByRole('menuitem', { name: /FSEC 7/ })).toBeInTheDocument();
        expect(within(menu).queryByRole('menuitem', { name: /FSEC 8/ })).not.toBeInTheDocument();
        expect(within(menu).queryByRole('menuitem', { name: /FA-8/ })).not.toBeInTheDocument();
    });

    it('le bouton retour revient à l’étape 1 (première campagne focalisée) et vide le filtre interne', async () => {
        seed();
        const { user, onSelect } = renderPicker();

        await pickCampaign(user, /Campagne Alpha/);
        await user.type(getFilterField(), 'a1');
        await user.click(getBackButton());

        const menu = await findCampaignMenu();
        expect(within(menu).getAllByRole('menuitem')).toHaveLength(3);
        await waitFor(() => expect(within(menu).getByRole('menuitem', { name: /Campagne Alpha/ })).toHaveFocus());
        expect(screen.queryByRole('textbox', { name: 'Filtrer les références' })).not.toBeInTheDocument();
        expect(getCampaignFilterField()).toHaveValue('');

        await pickCampaign(user, /Campagne Bêta/);
        expect(getFilterField()).toHaveValue('');
        expect(screen.getByRole('menuitem', { name: /FSEC B1/ })).toBeInTheDocument();
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('reporte le nombre de références de l’étape 2 (puis de nouveau les campagnes au retour)', async () => {
        seed();
        const onResultsChange = vi.fn();
        const { user } = renderPicker({ onResultsChange });

        await findCampaignMenu();
        expect(onResultsChange).toHaveBeenLastCalledWith(3);

        await pickCampaign(user, /Campagne Alpha/);
        expect(onResultsChange).toHaveBeenLastCalledWith(4);

        await user.type(getFilterField(), 'a2');
        expect(onResultsChange).toHaveBeenLastCalledWith(1);

        await user.click(getBackButton());
        await findCampaignMenu();
        expect(onResultsChange).toHaveBeenLastCalledWith(3);
    });

    it('affiche le chargement des FSEC / FA à l’étape 2 puis une alerte si une liste échoue (sans masquer l’autre)', async () => {
        seed();
        server.use(
            http.get('/api/v1/fsecs/active/', async () => {
                await delay(150);
                return HttpResponse.json({ detail: 'KO' }, { status: 500 });
            }),
        );
        const { user } = renderPicker();

        await pickCampaign(user, /Campagne Alpha/);
        expect(screen.getByRole('status', { name: 'Chargement des références' })).toBeInTheDocument();

        expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de charger les références');
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        const menu = await findRefMenu();
        expect(within(menu).getByRole('menuitem', { name: /FA-A-1/ })).toBeInTheDocument();
        expect(queryHeader(menu, /^FSEC/)).not.toBeInTheDocument();
    });

    it('revient à l’étape 1 à chaque réouverture', async () => {
        seed();
        const { user, rerenderPicker } = renderPicker();

        await pickCampaign(user, /Campagne Alpha/);
        rerenderPicker({ open: false });
        expect(screen.queryByTestId('entity-ref-picker')).not.toBeInTheDocument();

        rerenderPicker({ open: true });
        await findCampaignMenu();
        expect(screen.queryByRole('button', { name: 'Toutes les campagnes' })).not.toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /Campagne Alpha/ })).toBeInTheDocument();
    });
});

describe('EntityRefPicker — clavier et fermeture', () => {
    it('autoFocusItem focalise la première campagne ; Entrée ouvre l’étape 2 ; ↓ depuis le filtre entre dans la liste ; Entrée sélectionne', async () => {
        seed();
        const { user, onSelect } = renderPicker({ autoFocusItem: true });

        const first = await screen.findByRole('menuitem', { name: /Campagne Alpha/ });
        await waitFor(() => expect(first).toHaveFocus());

        await user.keyboard('{ArrowDown}');
        expect(screen.getByRole('menuitem', { name: /Campagne Bêta/ })).toHaveFocus();
        await user.keyboard('{ArrowUp}{Enter}');

        await findRefMenu();
        expect(getFilterField()).toHaveFocus();
        expect(onSelect).not.toHaveBeenCalled();

        await user.keyboard('{ArrowDown}');
        expect(screen.getByRole('menuitem', { name: /Référencer la campagne/ })).toHaveFocus();
        await user.keyboard('{ArrowDown}');
        expect(screen.getByRole('menuitem', { name: /FSEC A1/ })).toHaveFocus();
        await user.keyboard('{Enter}');

        expect(onSelect).toHaveBeenCalledWith({
            entityType: 'fsec',
            entityUuid: FSEC_A1_UUID,
            label: '2025-LMJ_Campagne Test_FSEC A1',
        });
    });

    it('Entrée dans le champ de filtre sélectionne le premier résultat (rien sans résultat)', async () => {
        seed();
        const { user, onSelect } = renderPicker();

        await pickCampaign(user, /Campagne Alpha/);
        await user.type(getFilterField(), 'zzz{Enter}');
        expect(onSelect).not.toHaveBeenCalled();

        await user.clear(getFilterField());
        await user.type(getFilterField(), 'fa-a{Enter}');
        expect(onSelect).toHaveBeenCalledWith({ entityType: 'fa', entityUuid: FA_A1_UUID, label: 'FA-A-1' });
    });

    it('Échap ferme depuis la liste (étape 1), le champ de filtre et le bouton retour (étape 2)', async () => {
        seed();
        const { user, onClose } = renderPicker({ autoFocusItem: true });

        await waitFor(() => expect(screen.getByRole('menuitem', { name: /Campagne Alpha/ })).toHaveFocus());
        await user.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalledTimes(1);

        await pickCampaign(user, /Campagne Alpha/);
        await user.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalledTimes(2);

        await user.keyboard('{Shift>}{Tab}{/Shift}');
        expect(getBackButton()).toHaveFocus();
        await user.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalledTimes(3);
    });

    it('Tab depuis la liste ferme ; Maj+Tab remonte aux contrôles (tri et filtre à l’étape 1, filtre puis bouton retour à l’étape 2) sans fermer', async () => {
        seed();
        const { user, onClose } = renderPicker({ autoFocusItem: true });

        await waitFor(() => expect(screen.getByRole('menuitem', { name: /Campagne Alpha/ })).toHaveFocus());
        // Étape 1 : Maj+Tab remonte aux boutons de tri puis au filtre sans fermer ; Tab depuis la liste ferme.
        await user.keyboard('{Shift>}{Tab}{/Shift}');
        expect(getSortButton('A → Z')).toHaveFocus();
        expect(onClose).not.toHaveBeenCalled();
        await user.keyboard('{Shift>}{Tab}{/Shift}');
        expect(getSortButton('Récentes')).toHaveFocus();
        await user.keyboard('{Shift>}{Tab}{/Shift}');
        expect(getCampaignFilterField()).toHaveFocus();
        await user.keyboard('{Tab}{Tab}{Tab}');
        expect(screen.getByRole('menuitem', { name: /Campagne Alpha/ })).toHaveFocus();
        await user.keyboard('{Tab}');
        expect(onClose).toHaveBeenCalledTimes(1);

        await pickCampaign(user, /Campagne Alpha/);
        await user.keyboard('{ArrowDown}');
        expect(screen.getByRole('menuitem', { name: /Référencer la campagne/ })).toHaveFocus();

        await user.keyboard('{Shift>}{Tab}{/Shift}');
        expect(getFilterField()).toHaveFocus();
        await user.keyboard('{Shift>}{Tab}{/Shift}');
        expect(getBackButton()).toHaveFocus();
        expect(onClose).toHaveBeenCalledTimes(1);

        await user.keyboard('{Tab}{Tab}');
        expect(screen.getByRole('menuitem', { name: /Référencer la campagne/ })).toHaveFocus();
        await user.keyboard('{Tab}');
        expect(onClose).toHaveBeenCalledTimes(2);
    });

    it('un clic à l’extérieur appelle onClose', async () => {
        seed();
        const { user, onClose } = renderPicker();
        await findCampaignMenu();

        await user.click(screen.getByRole('button', { name: 'Ailleurs' }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('se rend en place (sans Popper) quand aucun ancrage n’est fourni', async () => {
        seed();
        const { container } = renderPicker({ anchorEl: null });

        const menu = await findCampaignMenu();
        expect(container).toContainElement(menu);
    });
});
