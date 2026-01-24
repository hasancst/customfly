import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppBridge } from '@shopify/app-bridge-react';
import { History } from '@shopify/app-bridge/actions';

/**
 * Propagates the internal React route to the parent Shopify frame.
 * This ensures that the Shopify browser URL updates as you navigate.
 */
export function RoutePropagator() {
    const location = useLocation();
    const app = useAppBridge();

    useEffect(() => {
        const history = History.create(app);

        // Construct the path including search params
        const path = location.pathname + location.search;

        console.log('Propagating route to App Bridge History:', path);

        // This updates the browser URL in the parent window
        history.dispatch(History.Action.PUSH, path);

    }, [location, app]);

    return null;
}
