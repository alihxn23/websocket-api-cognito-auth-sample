// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Construct } from "constructs";
import { aws_dynamodb as dynamo, aws_lambda as lambda, aws_lambda_nodejs as lambdanode, aws_cognito as cognito, Duration } from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { DynamoEventSource } from "aws-cdk-lib/aws-lambda-event-sources";

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
  readonly getNotificationHandler: lambda.IFunction;
  readonly notificationStreamHandler: lambda.IFunction;
  readonly iotCoreToWebsocket: lambda.IFunction;
  readonly websocketToIotCore: lambda.IFunction;

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
        CONNECTION_TABLE_NAME: props.connectionIdTable.tableName,
        NOTIFICATION_TABLE_NAME: props.notificationsTable.tableName,
      },
    });

    const disconnectHandler = new lambdanode.NodejsFunction(this, "disconnectHandler", {
      runtime: Runtime.NODEJS_18_X,
      entry: "../backend/websocket/connect.ts",
      environment: {
        CONNECTION_TABLE_NAME: props.connectionIdTable.tableName,
      },
    });

    const sendNotificationHandler = new lambdanode.NodejsFunction(this, "sendNotificationHandler", {
      runtime: Runtime.NODEJS_18_X,
      entry: "../backend/websocket/sendNotification.ts",
      environment: {
        CONNECTION_TABLE_NAME: props.connectionIdTable.tableName,
        NOTIFICATION_TABLE_NAME: props.notificationsTable.tableName,
      },
      timeout: Duration.seconds(30),
    });

    const getNotificationHandler = new lambdanode.NodejsFunction(this, "getNotificationHandler", {
      runtime: Runtime.NODEJS_18_X,
      entry: "../backend/websocket/getNotification.ts",
      environment: {
        NOTIFICATION_TABLE_NAME: props.notificationsTable.tableName,
      },
      timeout: Duration.seconds(30),
    });

    const notificationStreamHandler = new lambdanode.NodejsFunction(this, "notificationStreamHandler", {
      runtime: Runtime.NODEJS_18_X,
      entry: "../backend/websocket/notificationStreamHandler.ts",
      environment: {
        CONNECTION_TABLE_NAME: props.connectionIdTable.tableName,
        NOTIFICATION_TABLE_NAME: props.notificationsTable.tableName,
      },
      timeout: Duration.seconds(30),
    });

    notificationStreamHandler.addEventSource(
      new DynamoEventSource(props.notificationsTable, {
        startingPosition: lambda.StartingPosition.LATEST,
      }),
    );

    const iotCoreToWebsocket = new lambdanode.NodejsFunction(this, "iotCoreToWebsocketHandler", {
      runtime: Runtime.NODEJS_18_X,
      entry: "../backend/websocket/iotCoreToWebsocket.ts",
      environment: {
        CONNECTION_TABLE_NAME: props.connectionIdTable.tableName,
        // NOTIFICATION_TABLE_NAME: props.notificationsTable.tableName
      },
      // timeout: Duration.seconds(30)
    });

    const websocketToIotCore = new lambdanode.NodejsFunction(this, "websocketToIotCoreHandler", {
      runtime: Runtime.NODEJS_18_X,
      entry: "../backend/websocket/websocketToIotCore.ts",
      environment: {
        CONNECTION_TABLE_NAME: props.connectionIdTable.tableName,
        // NOTIFICATION_TABLE_NAME: props.notificationsTable.tableName
      },
      // timeout: Duration.seconds(30)
    });

    props.connectionIdTable.grantReadWriteData(websocketHandler);
    props.connectionIdTable.grantReadWriteData(connectHandler);
    props.connectionIdTable.grantReadWriteData(disconnectHandler);
    props.connectionIdTable.grantReadWriteData(sendNotificationHandler);
    props.connectionIdTable.grantReadWriteData(notificationStreamHandler);
    props.connectionIdTable.grantReadWriteData(iotCoreToWebsocket);

    props.notificationsTable.grantReadWriteData(sendNotificationHandler);
    props.notificationsTable.grantReadWriteData(getNotificationHandler);
    props.notificationsTable.grantReadWriteData(notificationStreamHandler);

    this.authHandler = authHandler;
    this.websocketHandler = websocketHandler;
    this.connectHandler = connectHandler;
    this.disconnectHandler = disconnectHandler;
    this.sendNotificationHandler = sendNotificationHandler;
    this.getNotificationHandler = getNotificationHandler;
    this.notificationStreamHandler = notificationStreamHandler;
    this.iotCoreToWebsocket = iotCoreToWebsocket;
    this.websocketToIotCore = websocketToIotCore;
  }
}
