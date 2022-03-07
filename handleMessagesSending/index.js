const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
const ssm = new AWS.SSM();
const SES = new AWS.SES({ region: 'us-west-1' });

const ssmTableParamName = `TABLE_NAME`;
const sesFromParamName = `SES_FROM`;

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

const sendEmail = async (from, to, text) => {
    const sesParams = {
        Destination: {
            ToAddresses: [to],
        },
        Message: {
            Body: {
                Html: {
                    Charset: 'UTF-8',
                    Data: text,
                },
            },
            Subject: {
                Charset: 'UTF-8',
                Data: text,
            },
        },
        Source: from,
    };

    return SES.sendEmail(sesParams).promise();
}

exports.handler = async (event) => {
    if (!event.Records || !event.Records.length) {
        return formatErrorResponse(HttpStatusCodes.BadRequest, 'No records')
    }

    try {
        const { Parameters } = await ssm
            .getParameters({ Names: [ ssmTableParamName, sesFromParamName ] })
            .promise();

        const { Value: tableName } = Parameters.find(param => param.Name === ssmTableParamName);
        const { Value: sesFrom } = Parameters.find(param => param.Name === sesFromParamName);

        for (const record of event.Records) {
            const parsedBody = JSON.parse(record.body);

            for (const message of parsedBody) {
                if (message.email) {
                    await sendEmail(sesFrom, message.email, message.text)
                }

                if (message.phoneNumber) {
                    // can be implemented integration with twillio, for example
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
