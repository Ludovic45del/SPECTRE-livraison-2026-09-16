/**
 * User Queries Tests — avatar & signature (upload / suppression).
 *
 * Couvre les mutations useUploadAvatar/useDeleteAvatar et useUploadSignature/
 * useDeleteSignature (POST/DELETE /auth/me/{avatar,signature}/) via MSW, et la
 * rétro-compat du schéma quand avatar_url / signature_url sont absents.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, it, expect } from 'vitest';
import { useUploadAvatar, useDeleteAvatar, useUploadSignature, useDeleteSignature } from './user.queries';
import { UserSchema } from '../model';
import { createQueryWrapper, server } from '@test/test-utils';

const mockUserApi = {
    uuid: '11111111-1111-4111-8111-111111111111',
    username: 'jdoe',
    first_name: 'Jean',
    last_name: 'Doe',
    roles: ['assembleur'],
    role: 'assembleur',
    permission_group: 'operateur',
    laboratoire: '',
    service: '',
    numero: '',
    bureau: '',
    avatar_url: '/api/media/users/avatars/abc123.jpg',
    signature_url: '/api/media/users/signatures/sig123.png',
    is_active: true,
    force_password_change: false,
    last_login: null,
    created_at: null,
    updated_at: null,
};

describe('useUploadAvatar', () => {
    it('POST /auth/me/avatar/ renvoie le profil avec avatarUrl', async () => {
        let sawContentType: string | null = null;
        server.use(
            http.post('/api/v1/auth/me/avatar/', ({ request }) => {
                // Le corps est un multipart : le navigateur/undici pose le header
                // multipart/form-data avec boundary (pas de Content-Type forcé côté client).
                sawContentType = request.headers.get('content-type');
                return HttpResponse.json(mockUserApi);
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useUploadAvatar(), { wrapper });

        const file = new File([new Uint8Array([1, 2, 3])], 'avatar.jpg', { type: 'image/jpeg' });
        result.current.mutate(file);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(sawContentType).toContain('multipart/form-data');
        expect(result.current.data?.avatarUrl).toBe('/api/media/users/avatars/abc123.jpg');
    });
});

describe('useDeleteAvatar', () => {
    it('DELETE /auth/me/avatar/ renvoie le profil avec avatarUrl null', async () => {
        server.use(
            http.delete('/api/v1/auth/me/avatar/', () => HttpResponse.json({ ...mockUserApi, avatar_url: null })),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useDeleteAvatar(), { wrapper });

        result.current.mutate();

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.avatarUrl).toBeNull();
    });
});

describe('useUploadSignature', () => {
    it('POST /auth/me/signature/ (multipart) renvoie le profil avec signatureUrl', async () => {
        let sawContentType: string | null = null;
        server.use(
            http.post('/api/v1/auth/me/signature/', ({ request }) => {
                sawContentType = request.headers.get('content-type');
                return HttpResponse.json(mockUserApi);
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useUploadSignature(), { wrapper });

        const file = new File([new Uint8Array([1, 2, 3])], 'signature.png', { type: 'image/png' });
        result.current.mutate(file);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(sawContentType).toContain('multipart/form-data');
        expect(result.current.data?.signatureUrl).toBe('/api/media/users/signatures/sig123.png');
    });
});

describe('useDeleteSignature', () => {
    it('DELETE /auth/me/signature/ renvoie le profil avec signatureUrl null', async () => {
        server.use(
            http.delete('/api/v1/auth/me/signature/', () => HttpResponse.json({ ...mockUserApi, signature_url: null })),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useDeleteSignature(), { wrapper });

        result.current.mutate();

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.signatureUrl).toBeNull();
    });
});

describe('UserSchema avatarUrl / signatureUrl', () => {
    it('mappe avatar_url -> avatarUrl', () => {
        expect(UserSchema.parse(mockUserApi).avatarUrl).toBe('/api/media/users/avatars/abc123.jpg');
    });

    it('mappe signature_url -> signatureUrl', () => {
        expect(UserSchema.parse(mockUserApi).signatureUrl).toBe('/api/media/users/signatures/sig123.png');
    });

    it('défaut null quand avatar_url est absent (rétro-compat)', () => {
        const withoutAvatar: Record<string, unknown> = { ...mockUserApi };
        delete withoutAvatar.avatar_url;
        expect(UserSchema.parse(withoutAvatar).avatarUrl).toBeNull();
    });

    it('défaut null quand signature_url est absent (rétro-compat)', () => {
        const withoutSignature: Record<string, unknown> = { ...mockUserApi };
        delete withoutSignature.signature_url;
        expect(UserSchema.parse(withoutSignature).signatureUrl).toBeNull();
    });
});
