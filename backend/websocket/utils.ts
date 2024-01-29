import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
import { DeleteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const removeConnectionId = async (client: DynamoDBDocumentClient, connectionId: string, ConnectionTableName: string) => {
    return await client.send(
        new DeleteCommand({
            TableName: ConnectionTableName,
            Key: {
                connectionId,
            },
        }),
    );
};

const getManagementApi = (requestContext: any) : ApiGatewayManagementApiClient => {
    const domainName = requestContext.domainName!;
    // When we use a custom domain, we don't need to append a stage name
    const endpoint = domainName.endsWith("amazonaws.com")
        ? `https://${requestContext.domainName}/${requestContext.stage}`
        : `https://${requestContext.domainName}`;
    const managementApi = new ApiGatewayManagementApiClient({
        endpoint,
    });
    return managementApi

}


export { removeConnectionId, getManagementApi }