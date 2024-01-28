import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ConnectionTableName = process.env.CONNECTION_TABLE_NAME!;

export const handler: APIGatewayProxyHandler = async (event, context) => {
    console.log(event);
    const connectionId = event.requestContext.connectionId!;

    try {
        await removeConnectionId(connectionId);
        return { statusCode: 200, body: "Disconnected." };
    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: "Disconnection failed." };
    }
}

const removeConnectionId = async (connectionId: string) => {
    return await client.send(
        new DeleteCommand({
            TableName: ConnectionTableName,
            Key: {
                connectionId,
            },
        }),
    );
};
