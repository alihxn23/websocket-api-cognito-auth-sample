// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from "aws-cdk-lib";
import * as iot from "aws-cdk-lib/aws-iot";
import { Construct } from "constructs";
import { Auth } from "../construct/auth";
import { Storage } from "../construct/storage";
import { Handler } from "../construct/handler";
import { WebSocket } from "../construct/websocket";

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const auth = new Auth(this, `Auth`);
    const storage = new Storage(this, `Storage`);
    const handler = new Handler(this, `Handler`, {
      userPool: auth.userPool,
      userPoolClient: auth.userPoolClient,
      connectionIdTable: storage.connectionIdTable,
      notificationsTable: storage.notificationsTable,
    });

    const websocket = new WebSocket(this, `Websocket`, {
      authHandler: handler.authHandler,
      websocketHandler: handler.websocketHandler,
      connectHandler: handler.connectHandler,
      disconnectHandler: handler.disconnectHandler,
      sendNotificationHandler: handler.sendNotificationHandler,
      getNotificationHandler: handler.getNotificationHandler,
      sendToTopicHandler: handler.websocketToIotCore,
    });

    websocket.api.grantManageConnections(handler.websocketHandler);
    websocket.api.grantManageConnections(handler.sendNotificationHandler);
    websocket.api.grantManageConnections(handler.getNotificationHandler);
    websocket.api.grantManageConnections(handler.notificationStreamHandler);
    websocket.api.grantManageConnections(handler.iotCoreToWebsocket);

    const iotTopicRuleSql = 'SELECT * from "websocket/outgoing"';
    // const iotTopicRule = new iot.CfnTopicRule(
    //   this, "iotRule", {topicRulePayload: {sql: iotTopicRuleSql, actions: []}}
    // )
    const topicRule = new iot.CfnTopicRule(this, "TopicRule", {
      topicRulePayload: {
        sql: iotTopicRuleSql,
        actions: [{ lambda: { functionArn: handler.iotCoreToWebsocket.functionArn } }],
      },
    });

    handler.iotCoreToWebsocket.addPermission("GrantIotRule", {
      principal: new cdk.aws_iam.ServicePrincipal("iot.amazonaws.com"),
      sourceArn: topicRule.attrArn,
    });

    // handler.websocketToIotCore.addToRolePolicy(new cdk.aws_iam.)

    {
      new cdk.CfnOutput(this, `Region`, {
        value: cdk.Stack.of(this).region,
      });

      new cdk.CfnOutput(this, `UserPoolId`, {
        value: auth.userPool.userPoolId,
      });

      new cdk.CfnOutput(this, `UserPoolWebClientId`, {
        value: auth.userPoolClient.userPoolClientId,
      });

      new cdk.CfnOutput(this, `WebSocketEndpoint`, {
        value: websocket.apiEndpoint,
      });
    }
  }
}
