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

        // Append current window query params (host, shop, etc) to the URI
        const currentSearch = window.location.search;
        let finalUri = uri;
        if (currentSearch) {
            const separator = uri.includes('?') ? '&' : '?';
            const params = new URLSearchParams(currentSearch);

            // Sanitize params: remove any "undefined" or "null" string values
            const cleanParams = new URLSearchParams();
            params.forEach((value, key) => {
                if (value !== 'undefined' && value !== 'null' && value !== '') {
                    cleanParams.set(key, value);
                }
            });

            const paramsStr = cleanParams.toString();
            finalUri = paramsStr ? `${uri}${separator}${paramsStr}` : uri;
        }

        const response = await fetch(finalUri, {
            ...options,
            headers,
        });

        // Handle potential re-authorization from the backend
        if (response.headers.get("X-Shopify-API-Request-Failure-Reauthorize") === "1") {
            const authUrlHeader = response.headers.get("X-Shopify-API-Request-Failure-Reauthorize-Url");
            if (authUrlHeader) {
                window.location.href = authUrlHeader;
            } else {
                const rawShop = new URLSearchParams(window.location.search).get('shop');
                const shop = (rawShop && rawShop !== 'undefined' && rawShop !== 'null') ? rawShop : null;
                const authUrl = shop ? `/api/auth?shop=${shop}` : "/api/auth";
                window.location.href = authUrl;
            }
            return response;
        }

        return response;
    }, [app]);
}
