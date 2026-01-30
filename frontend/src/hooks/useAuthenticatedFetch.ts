import { useCallback } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { getSessionToken } from "@shopify/app-bridge-utils";
import { Redirect } from "@shopify/app-bridge/actions";

/**
 * A hook that returns a function to make authenticated fetch requests to the backend.
 * It manually retrieves the Shopify session token and injects it into the Authorization header.
 * This is a more robust approach when getAuthenticatedFetch fails in some environments.
 */
export function useAuthenticatedFetch() {
    const app = useAppBridge();

    return useCallback(async (uri: string, options?: any) => {
        const token = await getSessionToken(app);

        const headers = {
            ...(options?.headers || {}),
            Authorization: `Bearer ${token}`,
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
            // Redirect to the auth URL if provided
            const redirect = Redirect.create(app);
            if (authUrlHeader) {
                redirect.dispatch(Redirect.Action.REMOTE, authUrlHeader);
            } else {
                const rawShop = new URLSearchParams(window.location.search).get('shop');
                const shop = (rawShop && rawShop !== 'undefined' && rawShop !== 'null') ? rawShop : null;
                const authUrl = shop ? `/api/auth?shop=${shop}` : "/api/auth";
                redirect.dispatch(Redirect.Action.REMOTE, authUrl);
            }
            return response;
        }

        return response;
    }, [app]);
}
