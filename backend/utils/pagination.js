/**
 * Standard pagination utility for UniSkill API endpoints
 */
function getPaginationParams(req, defaultLimit = 10, maxLimit = 100) {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(req.query.limit, 10) || defaultLimit));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}

function buildPaginationMetadata(totalRecords, page, limit) {
    const totalPages = Math.ceil(totalRecords / limit) || 1;
    return {
        currentPage: page,
        pageSize: limit,
        totalRecords,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
    };
}

module.exports = {
    getPaginationParams,
    buildPaginationMetadata
};
