import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient, QueryCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { getManagementApi, removeConnectionId } from "./utils";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ConnectionTableName = process.env.CONNECTION_TABLE_NAME!;
const NotificationTableName = process.env.NOTIFICATION_TABLE_NAME!;

export const handler: APIGatewayProxyHandler = async (event, context) => {
    console.log(event);
    const routeKey = event.requestContext.routeKey!;
    const connectionId = event.requestContext.connectionId!;

    // const userId = event.requestContext.authorizer!.userId;
    const groups = event.requestContext.authorizer?.groups ?? '';
    const email = event.requestContext.authorizer?.email ?? 'none@email.com';

    try {
        await client.send(
            new PutCommand({
                TableName: ConnectionTableName,
                Item: {
                    // userId: userId,
                    connectionId: connectionId,
                    groups,
                    email,
                    removedAt: Math.ceil(Date.now() / 1000) + 3600 * 3,
                },
            }),
        );
        return { statusCode: 200, body: "Connected." };
    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: "Connection failed." };
    }

    // let k = await (await getNotificationsForUser()).map(n => n.content.S)
    // console.log('notifications for user', k)

    // let managementApi = getManagementApi(event.requestContext)

    // try {
    //     await managementApi.send(new PostToConnectionCommand({ ConnectionId: connectionId, Data: JSON.stringify({ "action": "notifications", content: k }) }))
    // } catch (e: any) {
    //     console.log('couldnt post to connection', e)
    //     // try {
    //     //     console.log('removing connection', connectionId, e)
    //     //     await removeConnectionId(client, connectionId, ConnectionTableName)
    //     // } catch (e: any) {
    //     //     console.log("couldn't remove connection")
    //     // }
    // }

    // return { statusCode: 200, body: "Connected." };

}

// const getNotificationsForUser = async () => {
//     let i
//     try {
//         i = await client.send(new ScanCommand({ TableName: NotificationTableName }))
//     } catch (e: any) {
//         console.log('error fetching notifications', e)
//     }
//     return i?.Items ?? []
// }