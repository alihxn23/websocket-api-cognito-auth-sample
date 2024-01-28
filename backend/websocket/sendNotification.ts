import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { v4 as uuidv4 } from 'uuid';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ConnectionTableName = process.env.CONNECTION_TABLE_NAME!;
const NotificationTableName = process.env.NOTIFICATION_TABLE_NAME!;

export const handler: APIGatewayProxyHandler = async (event, context) => {
    console.log(event);
    const routeKey = event.requestContext.routeKey!;
    const connectionId = event.requestContext.connectionId!;
    const notificationId = uuidv4()
    const body = JSON.parse(event.body || '')
    console.log('request body', body)
    console.log('unique id', notificationId)

    // MANAGEMENT API START
    const domainName = event.requestContext.domainName!;
    // When we use a custom domain, we don't need to append a stage name
    const endpoint = domainName.endsWith("amazonaws.com")
        ? `https://${event.requestContext.domainName}/${event.requestContext.stage}`
        : `https://${event.requestContext.domainName}`;
    const managementApi = new ApiGatewayManagementApiClient({
        endpoint,
    });
    // MANAGEMENT API END

    // const userId = event.requestContext.authorizer!.userId;
    // const groups = event.requestContext.authorizer!.groups;

    // return { statusCode: 200, body: "sending message" }

    try {
        await client.send(
            new PutCommand({
                TableName: NotificationTableName,
                Item: {
                    // userId: userId,
                    notificationId: notificationId,
                    // groups: groups,
                    // removedAt: Math.ceil(Date.now() / 1000) + 3600 * 3,
                    content: body.content
                },
            }),
        );
        // return { statusCode: 200, body: "Saved to notifications table." };
    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: "Could save notification." };
    }

    try {
        await managementApi.send(
            new PostToConnectionCommand({ConnectionId: connectionId, Data: "Saved Notification"})
        )
    } catch (e: any) {
        if (e.statusCode == 410) {
            await removeConnectionId(connectionId);
          } else {
            console.log(e);
            throw e;
          }
    }

    return { statusCode: 200, body: "Saved to notifications table." };
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
