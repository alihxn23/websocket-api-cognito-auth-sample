import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { v4 as uuidv4 } from "uuid";
import { getManagementApi, removeConnectionId } from "./utils";
import { IoTDataPlaneClient, PublishCommand } from "@aws-sdk/client-iot-data-plane";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const iotClient = new IoTDataPlaneClient();
const ConnectionTableName = process.env.CONNECTION_TABLE_NAME!;
const NotificationTableName = process.env.NOTIFICATION_TABLE_NAME!;

export const handler: APIGatewayProxyHandler = async (event, context) => {
  console.log(event);
  const routeKey = event.requestContext.routeKey!;
  const connectionId = event.requestContext.connectionId!;
  const body = JSON.parse(event.body || "");
  let content = { message: body.content, from: event.requestContext.authorizer?.email, connectionId };
  const topicName = body.topicName;
  console.log("request body", body);

  const input = {
    topic: topicName,
    // payload: Buffer.from(content),
    payload: JSON.stringify(content),
    qos: 0
  };

  const command = new PublishCommand(input);
  //   console.log("command", command);

  try {
    const response = await iotClient.send(command);
    console.log("response", response);
  } catch (e: any) {
    console.log("error publishing message", e);
  }

  //   console.log("response", response);

  return { statusCode: 200, body: "Published Command." };
};
