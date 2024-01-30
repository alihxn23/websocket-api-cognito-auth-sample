import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { v4 as uuidv4 } from 'uuid';
import { getManagementApi, removeConnectionId } from "./utils";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ConnectionTableName = process.env.CONNECTION_TABLE_NAME!;
const NotificationTableName = process.env.NOTIFICATION_TABLE_NAME!;

export const handler = async (event: any) => {
    console.log(event);
    event.Records.forEach((r: any) => {
        console.log('id', r.eventID)
        console.log('event name', r.eventName)
        console.log('ddb record', r.dynamodb)
    })
    // const routeKey = event.requestContext.routeKey!;
    // const connectionId = event.requestContext.connectionId!;
    // const notificationId = uuidv4()
    // const body = JSON.parse(event.body || '')
    // const content = body.content
    // console.log('request body', body)
    // console.log('unique id', notificationId)


    const content: any[] = []
    event.Records.forEach((r: any) => {
        // console.log('from inside forEach', r.dynamodb.NewImage)
        if (r.eventName !== "REMOVE") {
            let a: any = {}
            let keys = Object.keys(r.dynamodb.NewImage)
            keys.forEach(k => { a[k] = r.dynamodb.NewImage[k].S })
            content.push(a)
        }
    })

    console.log('content', content)

    if (content.length == 0) return { statusCode: 200, body: "nothing to publish." };

    // MANAGEMENT API START
    const domainName = "dy6liiv8sg.execute-api.us-east-1.amazonaws.com";
    // // When we use a custom domain, we don't need to append a stage name
    // const endpoint = domainName.endsWith("amazonaws.com")
    //     ? `https://${event.requestContext.domainName}/${event.requestContext.stage}`
    //     : `https://${event.requestContext.domainName}`;
    // const managementApi = new ApiGatewayManagementApiClient({
    //     endpoint,
    // });
    const managementApi = getManagementApi({ domainName, stage: "prod" })
    // MANAGEMENT API END

    // const userId = event.requestContext.authorizer!.userId;
    // const groups = event.requestContext.authorizer!.groups;
    // const email = event.requestContext.authorizer?.email ?? "none@email.com"

    // return { statusCode: 200, body: "sending message" }

    // try {
    //     await client.send(
    //         new PutCommand({
    //             TableName: NotificationTableName,
    //             Item: {
    //                 // userId: userId,
    //                 notificationId: notificationId,
    //                 // groups: groups,
    //                 // removedAt: Math.ceil(Date.now() / 1000) + 3600 * 3,
    //                 sender: email,
    //                 content: content,
    //                 timestamp: new Date().toISOString()
    //             },
    //         }),
    //     );
    //     // return { statusCode: 200, body: "Saved to notifications table." };
    // } catch (err) {
    //     console.error(err);
    //     return { statusCode: 500, body: "Could save notification." };
    // }

    const activeConnections = await client.send(new ScanCommand({ TableName: ConnectionTableName }))
    console.log('active connections', activeConnections)

    // const n = { 'action': 'notifications', content, count: 1 }

    let sendMessaages = activeConnections.Items?.map(async c => {
        try {
            await managementApi.send(new PostToConnectionCommand({ ConnectionId: c.connectionId, Data: JSON.stringify({ action: "notifications", content }) }))
        } catch (e: any) {
            // if (e.statusCode == 410) {
            try {
                console.log('error sending to connection', e)
                console.log('removing connection', c)
                await removeConnectionId(client, c.connectionId, ConnectionTableName)
            } catch (e: any) {
                console.log("couldn't remove connection")
            }
            // console.log('removing connection', c)
            // } else {
            // console.log(e)
            // throw e
            // }
        }
    }) ?? []

    await Promise.all(sendMessaages)

    // try {
    //     await managementApi.send(
    //         new PostToConnectionCommand({ ConnectionId: connectionId, Data: "Saved Notification" })
    //     )
    // } catch (e: any) {
    //     if (e.statusCode == 410) {
    //         await removeConnectionId(client, connectionId, ConnectionTableName);
    //     } else {
    //         console.log(e);
    //         throw e;
    //     }
    // }

    return { statusCode: 200, body: "Saved to notifications table." };
}

// const removeConnectionId = async (connectionId: string) => {
//     return await client.send(
//         new DeleteCommand({
//             TableName: ConnectionTableName,
//             Key: {
//                 connectionId,
//             },
//         }),
//     );
// };
