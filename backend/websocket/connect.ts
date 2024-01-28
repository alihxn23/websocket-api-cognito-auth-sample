import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ConnectionTableName = process.env.CONNECTION_TABLE_NAME!;

export const handler: APIGatewayProxyHandler = async (event, context) => {
    console.log(event);
    const routeKey = event.requestContext.routeKey!;
    const connectionId = event.requestContext.connectionId!;

    // const userId = event.requestContext.authorizer!.userId;
    // const groups = event.requestContext.authorizer!.groups;

    try {
        await client.send(
            new PutCommand({
                TableName: ConnectionTableName,
                Item: {
                    // userId: userId,
                    connectionId: connectionId,
                    // groups: groups,
                    removedAt: Math.ceil(Date.now() / 1000) + 3600 * 3,
                },
            }),
        );
        return { statusCode: 200, body: "Connected." };
    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: "Connection failed." };
    }
}