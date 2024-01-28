// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Construct } from "constructs";
import { aws_dynamodb as dynamo, aws_lambda as lambda, aws_lambda_nodejs as lambdanode, aws_cognito as cognito } from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";

interface HandlerProps {
  connectionIdTable: dynamo.ITable;
  notificationsTable: dynamo.ITable;
  userPool: cognito.IUserPool;
  userPoolClient: cognito.IUserPoolClient;
}

export class Handler extends Construct {
  readonly authHandler: lambda.IFunction;
  readonly websocketHandler: lambda.IFunction;
  readonly connectHandler: lambda.IFunction;
  readonly disconnectHandler: lambda.IFunction;
  readonly sendNotificationHandler: lambda.IFunction;

  constructor(scope: Construct, id: string, props: HandlerProps) {
    super(scope, id);

    const authHandler = new lambdanode.NodejsFunction(this, "AuthHandler", {
      runtime: Runtime.NODEJS_18_X,
      entry: "../backend/authorizer/index.ts",
      environment: {
        USER_POOL_ID: props.userPool.userPoolId,
        APP_CLIENT_ID: props.userPoolClient.userPoolClientId,
      },
    });

    const websocketHandler = new lambdanode.NodejsFunction(this, "WebSocketHandler", {
      runtime: Runtime.NODEJS_18_X,
      entry: "../backend/websocket/index.ts",
      environment: {
        CONNECTION_TABLE_NAME: props.connectionIdTable.tableName,
      },
    });

    const connectHandler = new lambdanode.NodejsFunction(this, "connectHandler", {
      runtime: Runtime.NODEJS_18_X,
      entry: "../backend/websocket/connect.ts",
      environment: {
        CONNECTION_TABLE_NAME: props.connectionIdTable.tableName
      }
    })

    const disconnectHandler = new lambdanode.NodejsFunction(this, 'disconnectHandler', {
      runtime: Runtime.NODEJS_18_X,
      entry: '../backend/websocket/connect.ts',
      environment: {
        CONNECTION_TABLE_NAME: props.connectionIdTable.tableName
      }
    })

    const sendNotificationHandler = new lambdanode.NodejsFunction(this, 'sendNotificationHandler', {
      runtime: Runtime.NODEJS_18_X,
      entry: '../backend/websocket/sendNotification.ts',
      environment: {
        CONNECTION_TABLE_NAME: props.connectionIdTable.tableName,
        NOTIFICATION_TABLE_NAME: props.notificationsTable.tableName
      }
    })

    props.connectionIdTable.grantReadWriteData(websocketHandler);
    props.connectionIdTable.grantReadWriteData(connectHandler)
    props.connectionIdTable.grantReadWriteData(disconnectHandler)

    props.notificationsTable.grantReadWriteData(sendNotificationHandler)

    this.authHandler = authHandler;
    this.websocketHandler = websocketHandler;
    this.connectHandler = connectHandler;
    this.disconnectHandler = disconnectHandler
    this.sendNotificationHandler = sendNotificationHandler
  }
}
