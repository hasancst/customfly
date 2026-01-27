import { Session } from '@shopify/shopify-api';
const session = new Session({
    id: 'test',
    shop: 'test.myshopify.com',
    state: 'test',
    isOnline: false,
    scope: 'write_orders write_products read_orders read_products'
});
console.log('Scope property:', session.scope);
console.log('isActive with space scopes:', session.isActive('write_orders write_products read_orders read_products'));
console.log('isActive with commas:', session.isActive('write_orders,write_products,read_orders,read_products'));
