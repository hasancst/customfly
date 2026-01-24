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

        const response = await fetch(uri, {
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
