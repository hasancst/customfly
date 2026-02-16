import NodeCache from 'node-cache';

// Shared cache instance for assets and products
// Reduced TTL to 30 seconds for faster updates in production
const cache = new NodeCache({ stdTTL: 30, checkperiod: 10 });

export default cache;
