const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

const ssmTableParamName = `TABLE_NAME`;

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
    let data, response, searchParam = {};

    if (event.httpMethod !== 'GET') {
        return formatErrorResponse(HttpStatusCodes.Forbidden, 'Method not allowed')
    }

    try {
        data = JSON.parse(event.body);

        const { Parameters } = await ssm
            .getParameters({ Names: [ ssmTableParamName] })
            .promise();
        const { Value: tableName } = Parameters.find(param => param.Name === ssmTableParamName);

        if (data.email) {
            searchParam.email = {
                N: data.email
            }
        }

        if (data.phone) {
            searchParam.phone = {
                N: data.phone
            }
        }

        response = await dynamoDB
            .getItem({
                TableName: tableName,
                Key: searchParam
            })
            .promise()

        return {
            statusCode: HttpStatusCodes.OK,
            body: JSON.stringify(response),
        };
    } catch (e) {
        return formatErrorResponse(e.code, e.message)
    }
};
