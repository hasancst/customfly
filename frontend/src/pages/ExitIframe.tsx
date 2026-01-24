import { useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';

export default function ExitIframe() {
    const [searchParams] = useSearchParams();
    const app = useAppBridge();
    const redirectUri = searchParams.get('redirectUri');

    useEffect(() => {
        if (app && redirectUri) {
            const decodedUri = decodeURIComponent(redirectUri);
            const redirect = Redirect.create(app);
            redirect.dispatch(Redirect.Action.REMOTE, decodedUri);
        }
    }, [app, redirectUri]);

    return <div>Redirecting...</div>;
}
