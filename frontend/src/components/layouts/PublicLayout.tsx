import { ReactNode } from 'react';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';

interface PublicLayoutProps {
    children: ReactNode;
    showHeader?: boolean;
    showFooter?: boolean;
}

export function PublicLayout({
    children,
    showHeader = true,
    showFooter = false
}: PublicLayoutProps) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
            {showHeader && <PublicHeader />}
            <main className="flex-1 w-full">
                {children}
            </main>
            {showFooter && <PublicFooter />}
        </div>
    );
}
