const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
const ssm = new AWS.SSM();

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
}

const MessageStatuses = {
    NotSent: 1,
    Sent: 2
}

exports.handler = async (event) => {
    if (!event.Records || !event.Records.length) {
        return formatErrorResponse(HttpStatusCodes.BadRequest, 'No records')
    }

    try {
        const { Parameters } = await ssm
            .getParameters({ Names: [ ssmTableParamName ] })
            .promise();

        const { Value: tableName } = Parameters.find(param => param.Name === ssmTableParamName);

        for (const record of event.Records) {
            const parsedBody = JSON.parse(record.body);

            for (const message of parsedBody) {
                if (message.email) {

                }

                if (message.phoneNumber) {

                }

                await dynamoDB
                    .updateItem(
                        {
                            TableName: tableName,
                            Key: {
                                id: {
                                    S: message.id.S
                                },
                            },
                            UpdateExpression: "SET #st = :newStatus",
                            ExpressionAttributeValues: {
                                ":newStatus": {
                                    N: MessageStatuses.Sent.toString()
                                }
                            },
                            ExpressionAttributeNames: {
                                "#st": "status"
                            }
                        }
                    )
                    .promise()
            }
        }

        return {
            statusCode: HttpStatusCodes.OK,
            body: JSON.stringify(event),
        };
    } catch (e) {
        console.log(JSON.stringify(e))
        return formatErrorResponse(e.code, e.message)
    }
};
