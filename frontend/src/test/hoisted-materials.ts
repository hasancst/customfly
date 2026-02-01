export const mockProductData = {
    id: '123',
    title: 'Test Product',
    handle: 'test-product',
    shop: 'test-shop.myshopify.com',
    variants: [
        {
            id: 'v1',
            product_id: '123',
            title: 'Black / Small',
            option1: 'Black',
            option2: 'Small',
            price: '10.00',
            image: 'https://example.com/black.png'
        },
        {
            id: 'v2',
            product_id: '123',
            title: 'Blue / Small',
            option1: 'Blue',
            option2: 'Small',
            price: '12.00',
            image: 'https://example.com/blue.png'
        },
        {
            id: 'v3',
            product_id: '123',
            title: 'Pink / Medium',
            option1: 'Pink',
            option2: 'Medium',
            price: '15.00',
            image: 'https://example.com/pink.png'
        }
    ],
    options: [
        { id: 'opt1', product_id: '123', name: 'Color', position: 1, values: ['Black', 'Blue', 'Pink'] },
        { id: 'opt2', product_id: '123', name: 'Size', position: 2, values: ['Small', 'Medium'] }
    ]
};

export const mockAssetsData = {
    fonts: [
        { id: 'f1', name: 'Roboto', value: 'Roboto', config: {} },
        { id: 'f2', name: 'Inter', value: 'Inter', config: { productId: '123' } },
        { id: 'f3', name: 'Open Sans', value: 'Open Sans', config: { productId: '456' } },
    ],
    colors: [
        { id: 'c1', name: 'Global Palette', value: '#FF0000,#00FF00,#0000FF', type: 'color' },
        { id: 'c2', name: 'Product Palette', value: '#000000,#FFFFFF', config: { productId: '123' }, type: 'color' },
    ]
};
