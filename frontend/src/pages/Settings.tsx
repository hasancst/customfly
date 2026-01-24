import { Page, Layout, Card, Text } from '@shopify/polaris';

export default function Settings() {
    return (
        <Page title="Settings">
            <Layout>
                <Layout.Section>
                    <Card>
                        <div className="p-4">
                            <Text as="p" variant="bodyMd">
                                Configure your application settings and preferences here. (Coming Soon)
                            </Text>
                        </div>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
