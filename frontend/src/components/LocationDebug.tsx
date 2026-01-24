import { useLocation } from 'react-router-dom';

export function LocationDebug() {
    const location = useLocation();

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            right: 0,
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '10px',
            zIndex: 9999,
            fontSize: '12px',
            fontFamily: 'monospace'
        }}>
            <div>Path: {location.pathname}</div>
            <div>Search: {location.search}</div>
        </div>
    );
}
