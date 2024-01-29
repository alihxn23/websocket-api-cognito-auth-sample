// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Construct } from "constructs";
import { aws_dynamodb as dynamo, RemovalPolicy } from "aws-cdk-lib";
import { StreamViewType } from "aws-cdk-lib/aws-dynamodb";

export class Storage extends Construct {
  readonly connectionIdTable: dynamo.ITable;
  readonly notificationsTable: dynamo.Table

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const connectionIdTable = new dynamo.Table(this, "ConnectionIdTable", {
      partitionKey: { name: "connectionId", type: dynamo.AttributeType.STRING },
      timeToLiveAttribute: "removedAt",
      billingMode: dynamo.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      // stream: StreamViewType.NEW_IMAGE,
    });

    const notificationsTable = new dynamo.Table(this, "NotificationsTable", {
      partitionKey: { name: "notificationId", type: dynamo.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      // stream: StreamViewType.NEW_IMAGE,
    })

    connectionIdTable.addGlobalSecondaryIndex({
      partitionKey: { name: "userId", type: dynamo.AttributeType.STRING },
      indexName: "userIdIndex",
    });

    this.connectionIdTable = connectionIdTable;
    this.notificationsTable = notificationsTable
  }
}
