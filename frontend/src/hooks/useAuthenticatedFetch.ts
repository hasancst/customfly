import { useCallback } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { getSessionToken } from "@shopify/app-bridge-utils";

/**
 * A hook that returns a function to make authenticated fetch requests to the backend.
 * It retrieves the Shopify session token from App Bridge and injects it into the Authorization header.
 * This hook MUST be used inside a component wrapped by AppBridgeProvider.
 */
export function useAuthenticatedFetch() {
    // Get App Bridge instance from React context (only works in admin context)
    const app = useAppBridge();

    return useCallback(async (uri: string, options?: any) => {
        let token = '';

        if (app) {
            try {
                token = await getSessionToken(app);
                console.log('[AUTH] Session token retrieved successfully');
            } catch (e) {
                console.warn("[AUTH] Failed to get session token:", e);
            }
        } else {
            console.warn("[AUTH] App Bridge not available");
        }

        const headers = {
            ...(options?.headers || {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        // Extract shop from token as fallback
        let shopFromToken = '';
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.dest) {
                    shopFromToken = new URL(payload.dest).hostname;
                    console.log('[AUTH] Shop from token:', shopFromToken);
                }
            } catch (e) {
                console.warn("[AUTH] Failed to decode token for shop:", e);
            }
        }

        // Append current window query params (host, shop, etc) to the URI
        const currentSearch = window.location.search;
        const params = new URLSearchParams(currentSearch);
        const cleanParams = new URLSearchParams();

        params.forEach((value, key) => {
            if (value !== 'undefined' && value !== 'null' && value !== '') {
                cleanParams.set(key, value);
            }
        });

        // Ensure shop is present (fallback to token if missing from URL)
        if (!cleanParams.has('shop') && shopFromToken) {
            cleanParams.set('shop', shopFromToken);
        }

        const paramsStr = cleanParams.toString();
        const separator = uri.includes('?') ? '&' : '?';
        const finalUri = paramsStr ? `${uri}${separator}${paramsStr}` : uri;

        console.log(`[AUTH] Fetching: ${finalUri}`, {
            hasToken: !!token,
            shopFromToken,
            paramsStr
        });

        const response = await fetch(finalUri, {
            ...options,
            headers,
        });

        console.log(`[AUTH] Response from ${finalUri}:`, {
            status: response.status,
            ok: response.ok,
            reauthorize: response.headers.get("X-Shopify-API-Request-Failure-Reauthorize")
        });

        // Handle potential re-authorization from the backend
        if (response.headers.get("X-Shopify-API-Request-Failure-Reauthorize") === "1" || response.status === 401) {
            const authUrlHeader = response.headers.get("X-Shopify-API-Request-Failure-Reauthorize-Url");
            if (authUrlHeader && !authUrlHeader.includes('shop=undefined')) {
                console.log('[AUTH] Redirecting via header:', authUrlHeader);
                window.location.href = authUrlHeader;
            } else {
                const rawShop = params.get('shop');
                const shop = (rawShop && rawShop !== 'undefined' && rawShop !== 'null') ? rawShop : shopFromToken;
                const authUrl = shop ? `/api/auth?shop=${shop}` : "/api/auth";
                console.warn('[AUTH] Manual redirect triggered. Shop source:', { rawShop, shopFromToken });
                console.log('[AUTH] Redirecting to:', authUrl);
                window.location.href = authUrl;
            }
            return response;
        }

        return response;
    }, [app]);
}
