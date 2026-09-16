/**
 * Tests des utilitaires de dates (sérialisation locale, parsing API, période semestrielle).
 *
 * Régression R12 : les Date construites à minuit LOCAL (DatePicker) doivent se
 * sérialiser en 'YYYY-MM-DD' SANS bascule UTC (bug J-1 pour Europe/Paris).
 * Les dates sont construites via `new Date(y, m, d)` (composantes locales) pour
 * que les assertions soient stables quel que soit le fuseau d'exécution.
 * @module shared/lib
 */
import { describe, it, expect } from 'vitest';
import { formatDateToIso, parseApiDate, semesterOfDate, formatSemesterPeriod } from './date';

describe('formatDateToIso', () => {
    it('sérialise une Date à minuit local sans décalage J-1, quel que soit le fuseau', () => {
        // Minuit local : c'est exactement ce que produit un DatePicker (dayjs.toDate()).
        expect(formatDateToIso(new Date(2026, 0, 15))).toBe('2026-01-15');
        expect(formatDateToIso(new Date(2026, 11, 31))).toBe('2026-12-31');
        expect(formatDateToIso(new Date(2026, 0, 1))).toBe('2026-01-01');
    });

    it('conserve la date locale pour un instant en cours de journée', () => {
        expect(formatDateToIso(new Date(2026, 5, 30, 23, 59, 59))).toBe('2026-06-30');
    });

    it('zéro-padde mois et jour', () => {
        expect(formatDateToIso(new Date(2026, 2, 5))).toBe('2026-03-05');
    });

    it('retourne null pour null/undefined et pour une Date invalide', () => {
        expect(formatDateToIso(null)).toBeNull();
        expect(formatDateToIso(undefined)).toBeNull();
        expect(formatDateToIso(new Date('invalid'))).toBeNull();
    });

    it('reste stable sur un aller-retour avec parseApiDate', () => {
        const iso = '2026-08-29';
        expect(formatDateToIso(parseApiDate(iso))).toBe(iso);
    });
});

describe('parseApiDate', () => {
    it("parse 'YYYY-MM-DD' en Date à minuit LOCAL (composantes locales)", () => {
        const date = parseApiDate('2026-01-15');
        expect(date).not.toBeNull();
        expect(date!.getFullYear()).toBe(2026);
        expect(date!.getMonth()).toBe(0);
        expect(date!.getDate()).toBe(15);
        expect(date!.getHours()).toBe(0);
        expect(date!.getMinutes()).toBe(0);
    });

    it("ne retient que la partie date d'une chaîne datetime ISO", () => {
        const date = parseApiDate('2026-07-01T14:30:00Z');
        expect(date).not.toBeNull();
        expect(date!.getFullYear()).toBe(2026);
        expect(date!.getMonth()).toBe(6);
        expect(date!.getDate()).toBe(1);
    });

    it('retourne null pour null/undefined/vide et pour une chaîne non parsable', () => {
        expect(parseApiDate(null)).toBeNull();
        expect(parseApiDate(undefined)).toBeNull();
        expect(parseApiDate('')).toBeNull();
        expect(parseApiDate('pas-une-date')).toBeNull();
    });

    it('rejette les composantes hors plage au lieu de déborder (30 février, 13e mois)', () => {
        expect(parseApiDate('2026-02-30')).toBeNull();
        expect(parseApiDate('2026-13-01')).toBeNull();
        expect(parseApiDate('2026-04-31')).toBeNull();
        expect(parseApiDate('2026-00-10')).toBeNull();
        expect(parseApiDate('2025-02-29')).toBeNull(); // 2025 non bissextile
    });

    it('accepte les bornes valides (29 février bissextile, 31 décembre)', () => {
        expect(formatDateToIso(parseApiDate('2024-02-29'))).toBe('2024-02-29');
        expect(formatDateToIso(parseApiDate('2026-12-31'))).toBe('2026-12-31');
    });
});

describe('semesterOfDate', () => {
    // semesterOfDate travaille en composantes UTC : les dates métier 'YYYY-MM-DD'
    // parsées via new Date(...) sont à minuit UTC (cf. campaign.schema.ts).
    it('classe janvier-juin en S1 et juillet-décembre en S2', () => {
        expect(semesterOfDate(new Date(Date.UTC(2027, 0, 1)))).toBe('2027-S1');
        expect(semesterOfDate(new Date(Date.UTC(2027, 11, 31)))).toBe('2027-S2');
    });

    it('borne juin/juillet : 30 juin → S1, 1er juillet → S2', () => {
        expect(semesterOfDate(new Date(Date.UTC(2026, 5, 30)))).toBe('2026-S1');
        expect(semesterOfDate(new Date(Date.UTC(2026, 6, 1)))).toBe('2026-S2');
    });

    it("reste cohérent avec le parsing UTC des dates API ('YYYY-MM-DD')", () => {
        expect(semesterOfDate(new Date('2026-06-30'))).toBe('2026-S1');
        expect(semesterOfDate(new Date('2026-07-01'))).toBe('2026-S2');
    });
});

describe('formatSemesterPeriod', () => {
    it('affiche un seul semestre quand début et fin sont dans le même semestre', () => {
        const start = new Date(Date.UTC(2027, 1, 1));
        const end = new Date(Date.UTC(2027, 4, 15));
        expect(formatSemesterPeriod(start, end, 2027, 'S1')).toBe('2027-S1');
    });

    it("affiche 'début/fin' pour une campagne à cheval sur deux semestres", () => {
        const start = new Date(Date.UTC(2026, 8, 1)); // septembre 2026 → S2
        const end = new Date(Date.UTC(2027, 2, 15)); // mars 2027 → S1
        expect(formatSemesterPeriod(start, end, 2027, 'S1')).toBe('2026-S2/2027-S1');
    });

    it("retombe sur l'attribution '{year}-{semester}' quand les dates sont nulles", () => {
        expect(formatSemesterPeriod(null, null, 2027, 'S1')).toBe('2027-S1');
    });

    it("campagne en cours (fin inconnue) : la période court du début jusqu'au semestre d'attribution", () => {
        // R18 : campagne 2027-S1 assemblée dès septembre 2026, pas encore terminée.
        const start = new Date(Date.UTC(2026, 8, 1));
        expect(formatSemesterPeriod(start, null, 2027, 'S1')).toBe('2026-S2/2027-S1');
        // Début dans le semestre d'attribution : un seul semestre.
        expect(formatSemesterPeriod(start, null, 2026, 'S2')).toBe('2026-S2');
    });

    it("fin seule renseignée : la période part du semestre d'attribution", () => {
        const end = new Date(Date.UTC(2027, 2, 15));
        expect(formatSemesterPeriod(null, end, 2026, 'S2')).toBe('2026-S2/2027-S1');
        expect(formatSemesterPeriod(null, end, 2027, 'S1')).toBe('2027-S1');
    });

    it('rend toujours les bornes dans l’ordre chronologique', () => {
        // Début après le semestre d'attribution (campagne S1 démarrée en août).
        const start = new Date(Date.UTC(2027, 7, 1));
        expect(formatSemesterPeriod(start, null, 2027, 'S1')).toBe('2027-S1/2027-S2');
    });

    it("traite une date invalide comme absente (remplacée par l'attribution)", () => {
        expect(formatSemesterPeriod(new Date('invalid'), new Date(Date.UTC(2027, 0, 1)), 2027, 'S1')).toBe('2027-S1');
        expect(formatSemesterPeriod(new Date('invalid'), new Date(Date.UTC(2027, 0, 1)), 2026, 'S2')).toBe(
            '2026-S2/2027-S1',
        );
        expect(formatSemesterPeriod(new Date('invalid'), new Date('invalid'), 2027, 'S1')).toBe('2027-S1');
    });
});
