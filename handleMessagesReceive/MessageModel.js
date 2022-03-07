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
    }
);

const MessageModel = dynamoose.model('messages', schema, {
    create: false,
});

module.exports = { MessageModel };
