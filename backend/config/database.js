import { PrismaClient } from "@prisma/client";
import { tenantContext } from '../middleware/tenantIsolation.js';

let prismaClient;

export function getPrismaClient() {
    if (!prismaClient) {
        const baseClient = new PrismaClient();

        prismaClient = baseClient.$extends({
            query: {
                $allModels: {
                    async $allOperations({ model, operation, args, query }) {
                        const context = tenantContext.getStore();
                        const shop = context?.shop;

                        // List of operations that should have the shop filter applied to 'where'
                        const filteredOperations = [
                            'findFirst', 'findFirstOrThrow', 'findMany', 'findUnique', 'findUniqueOrThrow',
                            'update', 'updateMany', 'upsert', 'delete', 'deleteMany', 'count', 'aggregate', 'groupBy'
                        ];

                        // Skip filtering for Session model as it's needed for authentication bootup
                        // Also skip if no shop is in context (e.g., initial auth or internal tasks)
                        if (shop && model !== 'Session' && model !== 'GoogleFont' && filteredOperations.includes(operation)) {
                            args.where = args.where || {};
                            // Ensure the model has a shop field before applying filter
                            // In this schema, almost all major entities have 'shop'
                            if (!args.where.shop) {
                                args.where.shop = shop;
                            }
                        }

                        // For create operations, automatically inject shop
                        if (shop && model !== 'Session' && model !== 'GoogleFont' && (operation === 'create' || operation === 'createMany')) {
                            if (operation === 'create') {
                                args.data = args.data || {};
                                if (!args.data.shop) args.data.shop = shop;
                            } else if (operation === 'createMany') {
                                if (Array.isArray(args.data)) {
                                    args.data = args.data.map(item => ({
                                        ...item,
                                        shop: item.shop || shop
                                    }));
                                }
                            }
                        }

                        return query(args);
                    }
                }
            }
        });
    }
    return prismaClient;
}

const prisma = getPrismaClient();
export { prisma };
export default prisma;
