import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { ENV, isLocal } from './env';

/**
 * DynamoDB クライアント設定
 */
const createDynamoDBClient = () => {
  const config: any = {
    region: ENV.REGION,
  };

  // ローカル環境の場合はエンドポイントを設定
  if (isLocal() && ENV.AWS_ENDPOINT_URL) {
    config.endpoint = ENV.AWS_ENDPOINT_URL;
    config.credentials = {
      accessKeyId: 'local',
      secretAccessKey: 'local',
    };
  }

  return new DynamoDB(config);
};

// DynamoDB クライアント（ドキュメントクライアント）
export const dynamoClient = DynamoDBDocument.from(createDynamoDBClient());

/**
 * DynamoDB 操作のヘルパー関数
 */
export class DynamoDBHelper {
  /**
   * アイテムを取得
   */
  static async getItem<T>(tableName: string, key: Record<string, any>): Promise<T | null> {
    try {
      const result = await dynamoClient.get({
        TableName: tableName,
        Key: key,
      });
      
      return result.Item as T || null;
    } catch (error) {
      console.error('DynamoDB GetItem Error:', error);
      throw new Error(`Failed to get item from ${tableName}`);
    }
  }

  /**
   * アイテムを作成/更新
   */
  static async putItem<T extends Record<string, any>>(tableName: string, item: T): Promise<void> {
    try {
      await dynamoClient.put({
        TableName: tableName,
        Item: item as Record<string, any>,
      });
    } catch (error) {
      console.error('DynamoDB PutItem Error:', error);
      throw new Error(`Failed to put item to ${tableName}`);
    }
  }

  /**
   * アイテムを更新
   */
  static async updateItem(
    tableName: string,
    key: Record<string, any>,
    updateExpression: string,
    expressionAttributeValues: Record<string, any>,
    expressionAttributeNames?: Record<string, string>
  ): Promise<any> {
    try {
      const params: any = {
        TableName: tableName,
        Key: key,
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      };

      if (expressionAttributeNames) {
        params.ExpressionAttributeNames = expressionAttributeNames;
      }

      const result = await dynamoClient.update(params);
      return result.Attributes;
    } catch (error) {
      console.error('DynamoDB UpdateItem Error:', error);
      throw new Error(`Failed to update item in ${tableName}`);
    }
  }

  /**
   * アイテムを削除
   */
  static async deleteItem(tableName: string, key: Record<string, any>): Promise<void> {
    try {
      await dynamoClient.delete({
        TableName: tableName,
        Key: key,
      });
    } catch (error) {
      console.error('DynamoDB DeleteItem Error:', error);
      throw new Error(`Failed to delete item from ${tableName}`);
    }
  }

  /**
   * クエリ実行
   */
  static async query<T>(
    tableName: string,
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, any>,
    indexName?: string,
    expressionAttributeNames?: Record<string, string>,
    limit?: number,
    scanIndexForward?: boolean
  ): Promise<T[]> {
    try {
      const params: any = {
        TableName: tableName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      };

      if (indexName) params.IndexName = indexName;
      if (expressionAttributeNames) params.ExpressionAttributeNames = expressionAttributeNames;
      if (limit) params.Limit = limit;
      if (scanIndexForward !== undefined) params.ScanIndexForward = scanIndexForward;

      const result = await dynamoClient.query(params);
      return result.Items as T[] || [];
    } catch (error) {
      console.error('DynamoDB Query Error:', error);
      throw new Error(`Failed to query ${tableName}`);
    }
  }

  /**
   * スキャン実行
   */
  static async scan<T>(
    tableName: string,
    filterExpression?: string,
    expressionAttributeValues?: Record<string, any>,
    expressionAttributeNames?: Record<string, string>,
    limit?: number
  ): Promise<T[]> {
    try {
      const params: any = {
        TableName: tableName,
      };

      if (filterExpression) params.FilterExpression = filterExpression;
      if (expressionAttributeValues) params.ExpressionAttributeValues = expressionAttributeValues;
      if (expressionAttributeNames) params.ExpressionAttributeNames = expressionAttributeNames;
      if (limit) params.Limit = limit;

      const result = await dynamoClient.scan(params);
      return result.Items as T[] || [];
    } catch (error) {
      console.error('DynamoDB Scan Error:', error);
      throw new Error(`Failed to scan ${tableName}`);
    }
  }

  /**
   * バッチでアイテムを取得
   */
  static async batchGetItems<T>(
    tableName: string,
    keys: Record<string, any>[]
  ): Promise<T[]> {
    try {
      const result = await dynamoClient.batchGet({
        RequestItems: {
          [tableName]: {
            Keys: keys,
          },
        },
      });

      return result.Responses?.[tableName] as T[] || [];
    } catch (error) {
      console.error('DynamoDB BatchGet Error:', error);
      throw new Error(`Failed to batch get items from ${tableName}`);
    }
  }

  /**
   * バッチでアイテムを書き込み
   */
  static async batchWriteItems<T extends Record<string, any>>(
    tableName: string,
    items: T[],
    operation: 'put' | 'delete' = 'put'
  ): Promise<void> {
    try {
      const writeRequests = items.map(item => {
        if (operation === 'put') {
          return { PutRequest: { Item: item } };
        } else {
          return { DeleteRequest: { Key: item } };
        }
      });

      // DynamoDB の制限により25件ずつバッチ処理
      const batchSize = 25;
      for (let i = 0; i < writeRequests.length; i += batchSize) {
        const batch = writeRequests.slice(i, i + batchSize);
        
        await dynamoClient.batchWrite({
          RequestItems: {
            [tableName]: batch as any[],
          } as Record<string, any[]>,
        });
      }
    } catch (error) {
      console.error('DynamoDB BatchWrite Error:', error);
      throw new Error(`Failed to batch write items to ${tableName}`);
    }
  }
}