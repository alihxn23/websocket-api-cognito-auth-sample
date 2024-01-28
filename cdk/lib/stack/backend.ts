// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from "aws-cdk-lib";
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
      notificationsTable: storage.notificationsTable
    });

    const websocket = new WebSocket(this, `Websocket`, {
      authHandler: handler.authHandler,
      websocketHandler: handler.websocketHandler,
      connectHandler: handler.connectHandler,
      disconnectHandler: handler.disconnectHandler,
      sendNotificationHandler: handler.sendNotificationHandler
    });

    websocket.api.grantManageConnections(handler.websocketHandler);
    websocket.api.grantManageConnections(handler.sendNotificationHandler);

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
