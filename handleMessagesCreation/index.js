const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const sqs = new AWS.SQS({ region : 'us-west-1' });
const dynamoDB = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
const ssm = new AWS.SSM();

const ssmSQSParamName = `SQS_NAME`;
const ssmTableParamName = `TABLE_NAME`;

const formatErrorResponse = (code, message) => ({
    statusCode: code,
    headers: { 'Content-Type': 'application/javascript' },
    body: JSON.stringify({ message })
})

const HttpStatusCodes = {
    OK: 200,
    BadRequest: 400,
    Forbidden: 403,
}

const MessageStatuses = {
    NotSent: 1,
    Sent: 2
}

exports.handler = async (event, context) => {
    let data, payloadForDb = { RequestItems: {} };

    if (event.httpMethod !== 'POST') {
        return formatErrorResponse(HttpStatusCodes.Forbidden, 'Method not allowed')
    }

    const awsAccountId = context.invokedFunctionArn.split(':')[4]
    const awsAccountRegion = context.invokedFunctionArn.split(':')[3]

    try {
        data = JSON.parse(event.body);

        if (!data || !data.messages || !data.messages.length) {
            throw ({ code: HttpStatusCodes.BadRequest, message: 'Bad request' });
        }

        const { Parameters } = await ssm
            .getParameters({ Names: [ ssmSQSParamName, ssmTableParamName] })
            .promise();

        const { Value: sqsName } = Parameters.find(param => param.Name === ssmSQSParamName);
        const { Value: tableName } = Parameters.find(param => param.Name === ssmTableParamName);
        const queueUrl = `https://sqs.${awsAccountRegion}.amazonaws.com/${awsAccountId}/${sqsName}`;

        const formattedMessages = data.messages.map(message => {
            const messageData = {
                id: {
                    S: uuidv4()
                },
                text: {
                    S: message.text
                },
                status: {
                    N: MessageStatuses.NotSent.toString()
                }
            }

            if (message.email) {
                messageData.email = {
                    S: message.email
                }
            }

            if (message.phoneNumber) {
                messageData.phoneNumber = {
                    S: message.phoneNumber
                }
            }

            return messageData;
        })

        await sqs
            .sendMessage({
                MessageBody: JSON.stringify(formattedMessages),
                QueueUrl: queueUrl
            })
            .promise()

        payloadForDb.RequestItems = {
            [tableName]: formattedMessages.map(formattedMessage => ({
                PutRequest: {
                    Item: formattedMessage
                }
            }))
        }

        await dynamoDB
            .batchWriteItem(payloadForDb)
            .promise()

        return {
            statusCode: HttpStatusCodes.OK,
            body: JSON.stringify(formattedMessages),
        };
    } catch (e) {
        console.log(JSON.stringify(e))
        return formatErrorResponse(e.code, e.message)
    }
};
