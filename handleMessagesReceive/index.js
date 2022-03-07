const { MessageModel } = require('./MessageModel');

const formatErrorResponse = (code, message) => {
    return {
        statusCode: code,
        headers: { 'Content-Type': 'application/javascript' },
        body: JSON.stringify({ message })
    }
}

const HttpStatusCodes = {
    OK: 200,
    BadRequest: 400,
    Forbidden: 403,
}

exports.handler = async (event) => {
    let param, result, searchParams = {};

    if (event.httpMethod !== 'GET') {
        return formatErrorResponse(HttpStatusCodes.Forbidden, 'Method not allowed')
    }

    try {
        param = event.queryStringParameters;

        if (!param || (!param.email && !param.phoneNumber)) {
            return formatErrorResponse(HttpStatusCodes.BadRequest, 'Allowed search by email or phone number')
        }

        if (param.email) {
            searchParams.email = {
                eq: param.email
            }
        }

        if (param.phoneNumber) {
            searchParams.phoneNumber = {
                eq: param.phoneNumber
            }
        }

        result = await MessageModel
            .scan(
                searchParams,
                param.email && param.phoneNumber ? { conditionalOperator: 'OR' } : null
            )
            .exec()

        return {
            statusCode: HttpStatusCodes.OK,
            body: JSON.stringify(result),
        };
    } catch (e) {
        console.log(JSON.stringify(e))
        return formatErrorResponse(e.code, e.message)
    }
};
