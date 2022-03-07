const dynamoose = require('dynamoose');

const schema = new dynamoose.Schema(
    {
        id: {
            type: String,
            hashKey: true,
        },
        email: String,
        phoneNumber: String,
        text: String,
        status: String,
    },
    {
        timestamps: true,
        waitForActive: false
    }
);

const MessageModel = dynamoose.model('tableName', schema, {
    create: false,
    waitForActive: false
});

module.exports = { MessageModel };
