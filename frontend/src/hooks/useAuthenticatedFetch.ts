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
            // removing potentially conflicting params if necessary, but usually passing all is safer for context
            finalUri = `${uri}${separator}${params.toString()}`;
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
                redirect.dispatch(Redirect.Action.REMOTE, "/api/auth");
            }
            return response;
        }

        return response;
    }, [app]);
}
