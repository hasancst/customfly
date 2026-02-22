import axios from 'axios';

// Printful API v2 — requires Bearer Token (Private Token from dashboard)
// Docs: https://developers.printful.com/docs/
const PRINTFUL_API_V2 = 'https://api.printful.com/v2';
const PRINTFUL_API_V1 = 'https://api.printful.com'; // For mockup-generator (still v1)

/**
 * Printful API Service
 * Uses Printful API v2 with Private Token (Bearer auth)
 */
class PrintfulService {
    constructor(accessToken) {
        this.accessToken = accessToken;

        // v2 client — for stores, catalog, orders
        this.client = axios.create({
            baseURL: PRINTFUL_API_V2,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        // v1 client — for mockup-generator (not yet in v2)
        this.v1Client = axios.create({
            baseURL: PRINTFUL_API_V1,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
    }

    /**
     * Get list of stores — used to validate token
     * v2: GET /v2/stores
     */
    async getStoreInfo() {
        try {
            const response = await this.client.get('/stores');
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Get catalog products (Printful's product base catalog)
     * v2: GET /v2/catalog-products
     */
    async getCatalogProducts(params = {}) {
        try {
            const response = await this.client.get('/catalog-products', { params });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Get catalog product by ID
     * v2: GET /v2/catalog-products/{id}
     */
    async getCatalogProduct(productId) {
        try {
            const response = await this.client.get(`/catalog-products/${productId}`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Get catalog product variants (colors/sizes)
     * v2: GET /v2/catalog-products/{id}/catalog-variants
     */
    async getCatalogVariants(productId) {
        try {
            const response = await this.client.get(`/catalog-products/${productId}/catalog-variants`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Get product print techniques and print areas
     * v2: GET /v2/catalog-products/{id}/techniques
     * NOTE: Not all products have this endpoint — returns empty on 404
     */
    async getProductTechniques(productId) {
        try {
            const response = await this.client.get(`/catalog-products/${productId}/techniques`);
            return response.data;
        } catch (error) {
            // 404 = this product doesn't have techniques defined — not a fatal error
            if (error.response?.status === 404) {
                return { data: [] };
            }
            throw this.handleError(error);
        }
    }

    /**
     * Get mockup templates for a catalog product
     * Still uses v1 API (mockup-generator not in v2 yet)
     * v1: GET /mockup-generator/templates/{productId}
     */
    async getMockupTemplates(productId) {
        try {
            const response = await this.v1Client.get(`/mockup-generator/templates/${productId}`);
            return response.data;
        } catch (error) {
            // Return empty if mockup templates not available
            return { result: [] };
        }
    }

    /**
     * Create an order to Printful
     * v2: POST /v2/orders
     */
    async createOrder(orderData) {
        try {
            const response = await this.client.post('/orders', orderData);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Get order by ID
     * v2: GET /v2/orders/{id}
     */
    async getOrder(orderId) {
        try {
            const response = await this.client.get(`/orders/${orderId}`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Handle API errors — normalize Printful error shape
     */
    handleError(error) {
        if (error.response) {
            const { status, data } = error.response;
            const msg = data?.error?.message || data?.result || data?.message || 'Unknown error';
            return new Error(`Printful API Error (${status}): ${msg}`);
        }
        if (error.request) {
            return new Error('Printful API: No response received (timeout or network error)');
        }
        return error;
    }
}

export default PrintfulService;
