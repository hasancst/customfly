import { describe, it, expect, vi } from 'vitest';
import crypto from 'crypto';

// Use hoisted data for integration simulations
const { mockProductGql, mockSession } = vi.hoisted(() => ({
    mockProductGql: {
        id: 'gid://shopify/Product/123',
        title: 'Proxy Product'
    },
    mockSession: {
        id: 'offline_test.com',
        shop: 'test.com',
        isActive: () => true
    }
}));

describe('App Proxy Signature Validation', () => {
    const validateSignature = (query, secret) => {
        const { signature, ...params } = query;
        if (!signature) return false;

        const message = Object.keys(params)
            .sort()
            .map(key => {
                const val = params[key];
                return `${key}=${Array.isArray(val) ? val.join(',') : val}`;
            })
            .join('');

        const generatedSignature = crypto
            .createHmac('sha256', secret)
            .update(message)
            .digest('hex');

        return generatedSignature === signature;
    };

    it('should verify a valid signature', () => {
        const secret = 'hush';
        const query = {
            shop: 'test.com',
            timestamp: '1234567890',
            path_prefix: '/apps/customfly'
        };

        // Generate signature for test
        const sortedParams = Object.keys(query).sort().map(k => `${k}=${query[k]}`).join('');
        const signature = crypto.createHmac('sha256', secret).update(sortedParams).digest('hex');

        const fullQuery = { ...query, signature };
        expect(validateSignature(fullQuery, secret)).toBe(true);
    });

    it('should reject an invalid signature', () => {
        const query = { shop: 'test.com', signature: 'wrong' };
        expect(validateSignature(query, 'secret')).toBe(false);
    });
});

describe('Public API Logic Simulation', () => {
    // Simulated handler for GET /imcst_api/public/config/:productId
    const handleGetConfig = async (productId, shop, prismaMock) => {
        if (!shop) throw new Error("Shop parameter required");
        const config = await prismaMock.merchantConfig.findUnique({
            where: { shop_shopifyProductId: { shop, shopifyProductId: productId } },
        });
        return config || {};
    };

    it('should return config when found in DB', async () => {
        const prismaMock = {
            merchantConfig: {
                findUnique: vi.fn().mockResolvedValue({ id: 'conf1', shopifyProductId: '123' })
            }
        };
        const result = await handleGetConfig('123', 'test.com', prismaMock);
        expect(result.id).toBe('conf1');
        expect(prismaMock.merchantConfig.findUnique).toHaveBeenCalledWith({
            where: { shop_shopifyProductId: { shop: 'test.com', shopifyProductId: '123' } }
        });
    });

    it('should return empty object when not found', async () => {
        const prismaMock = {
            merchantConfig: {
                findUnique: vi.fn().mockResolvedValue(null)
            }
        };
        const result = await handleGetConfig('999', 'test.com', prismaMock);
        expect(result).toEqual({});
    });
});

describe('Authentication Middleware Simulation', () => {
    // Simulated middleware logic
    const simulateAuth = async (authHeader, shopifyMock) => {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return { status: 401, code: 'NO_AUTH_HEADER' };
        }

        const token = authHeader.substring(7);
        try {
            const payload = await shopifyMock.api.session.decodeSessionToken(token);
            const shop = payload.dest.replace('https://', '').replace('http://', '');
            const sessionId = `offline_${shop}`;
            const session = await shopifyMock.config.sessionStorage.loadSession(sessionId);

            if (!session) return { status: 401, code: 'SESSION_NOT_FOUND' };
            if (!session.isActive()) return { status: 401, code: 'SESSION_EXPIRED' };

            return { status: 200, session };
        } catch (e) {
            return { status: 500, code: 'AUTH_ERROR' };
        }
    };

    it('should return 401 if header is missing', async () => {
        const result = await simulateAuth(null, {});
        expect(result.status).toBe(401);
        expect(result.code).toBe('NO_AUTH_HEADER');
    });

    it('should allow valid session', async () => {
        const shopifyMock = {
            api: {
                session: {
                    decodeSessionToken: vi.fn().mockResolvedValue({ dest: 'https://test.com' })
                }
            },
            config: {
                sessionStorage: {
                    loadSession: vi.fn().mockResolvedValue({ isActive: () => true })
                }
            }
        };
        const result = await simulateAuth('Bearer valid-token', shopifyMock);
        expect(result.status).toBe(200);
        expect(result.session).toBeDefined();
    });
});
