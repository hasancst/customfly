export function validateShopParam(req, res, next) {
    const shop = req.query.shop;
    if (!shop || shop === 'undefined' || shop === 'null') {
        return res.status(400).json({
            error: "No shop provided",
            message: "Authentication requires a valid shop parameter."
        });
    }
    next();
}
