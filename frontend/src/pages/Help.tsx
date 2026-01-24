import { Page, Layout, Card, Text } from '@shopify/polaris';

export default function Help() {
    return (
        <Page title="Help & Support">
            <Layout>
                <Layout.Section>
                    <Card>
                        <div className="p-4">
                            <Text as="p" variant="bodyMd">
                                Need help? Documentation and support contacts will be available here. (Coming Soon)
                            </Text>
                        </div>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
