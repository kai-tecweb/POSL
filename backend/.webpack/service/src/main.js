/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/functions/settings/getSettings.ts":
/*!***********************************************!*\
  !*** ./src/functions/settings/getSettings.ts ***!
  \***********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.handler = void 0;
const response_1 = __webpack_require__(/*! ../../libs/response */ "./src/libs/response.ts");
const validation_1 = __webpack_require__(/*! ../../libs/validation */ "./src/libs/validation.ts");
const dynamodb_1 = __webpack_require__(/*! ../../libs/dynamodb */ "./src/libs/dynamodb.ts");
const env_1 = __webpack_require__(/*! ../../libs/env */ "./src/libs/env.ts");
/**
 * デフォルト設定値を取得
 */
const getDefaultSettings = (settingType) => {
    const defaultSettings = {
        'post-time': {
            enabled: true,
            time: '20:00',
            timezone: 'Asia/Tokyo'
        },
        'week-theme': {
            monday: '月曜日は新しいスタート！',
            tuesday: '火曜日は学びの日',
            wednesday: '水曜日は振り返りの日',
            thursday: '木曜日はトレンドを追いかけよう',
            friday: '金曜日は週末に向けて',
            saturday: '土曜日は自由な発想で',
            sunday: '日曜日はリラックス'
        },
        'event': {
            customEvents: [],
            behavior: 'add'
        },
        'trend': {
            sources: ['google', 'yahoo'],
            mixLevel: 50,
            excludeCategories: []
        },
        'tone': {
            politeness: 70,
            casualness: 60,
            positivity: 80,
            expertise: 50,
            emotionLevel: 70,
            metaphorUsage: 30,
            emojiUsage: 50
        },
        'template': {
            priorities: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        },
        'prompt': {
            additionalRules: '',
            ngWords: [],
            preferredExpressions: []
        }
    };
    return defaultSettings[settingType] || {};
};
/**
 * 設定取得 Lambda 関数
 * GET /settings/{settingType}
 */
const handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    // CORS プリフライト対応
    if (event.httpMethod === 'OPTIONS') {
        return (0, response_1.corsResponse)();
    }
    try {
        // パスパラメータの取得とバリデーション
        const settingType = (0, validation_1.getPathParameter)(event, 'settingType');
        if (!(0, validation_1.isValidSettingType)(settingType)) {
            return (0, response_1.errorResponse)('Invalid setting type', 400);
        }
        const userId = (0, validation_1.getUserId)(event);
        try {
            // DynamoDB から設定を取得
            const setting = await dynamodb_1.DynamoDBHelper.getItem(env_1.ENV.SETTINGS_TABLE, {
                userId,
                settingType
            });
            if (!setting) {
                // 設定が存在しない場合はデフォルト値を返す
                const defaultSettings = getDefaultSettings(settingType);
                return (0, response_1.successResponse)({
                    settingType,
                    userId,
                    data: defaultSettings
                });
            }
            return (0, response_1.successResponse)({
                settingType,
                userId,
                data: setting.data || {}
            });
        }
        catch (dbError) {
            console.error('Error retrieving settings from DynamoDB:', dbError);
            return (0, response_1.internalServerErrorResponse)('Failed to retrieve settings');
        }
    }
    catch (error) {
        console.error('Error in getSettings:', error);
        if (error instanceof Error) {
            return (0, response_1.errorResponse)(error.message, 400);
        }
        return (0, response_1.internalServerErrorResponse)('Failed to retrieve settings');
    }
};
exports.handler = handler;


/***/ }),

/***/ "./src/functions/settings/updateSettings.ts":
/*!**************************************************!*\
  !*** ./src/functions/settings/updateSettings.ts ***!
  \**************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.handler = void 0;
const response_1 = __webpack_require__(/*! ../../libs/response */ "./src/libs/response.ts");
const validation_1 = __webpack_require__(/*! ../../libs/validation */ "./src/libs/validation.ts");
const dynamodb_1 = __webpack_require__(/*! ../../libs/dynamodb */ "./src/libs/dynamodb.ts");
const env_1 = __webpack_require__(/*! ../../libs/env */ "./src/libs/env.ts");
/**
 * 設定更新 Lambda 関数
 * PUT /settings/{settingType}
 */
const handler = async (event) => {
    // CORS プリフライト対応
    if (event.httpMethod === 'OPTIONS') {
        return (0, response_1.corsResponse)();
    }
    try {
        // パスパラメータの取得とバリデーション
        const settingType = (0, validation_1.getPathParameter)(event, 'settingType');
        if (!(0, validation_1.isValidSettingType)(settingType)) {
            return (0, response_1.errorResponse)('Invalid setting type', 400);
        }
        const userId = (0, validation_1.getUserId)(event);
        // リクエストボディの解析
        const body = (0, validation_1.parseBody)(event);
        // 基本的なバリデーション
        if (!body || typeof body !== 'object') {
            return (0, response_1.validationErrorResponse)('Request body must be a valid object');
        }
        // 設定タイプ別のバリデーション
        const validationResult = validateSettingData(settingType, body);
        if (!validationResult.isValid) {
            return (0, response_1.validationErrorResponse)('Invalid setting data', validationResult.errors);
        }
        // TODO: DynamoDB に設定を保存
        try {
            const settingData = {
                userId,
                settingType: settingType,
                data: body,
                updatedAt: new Date().toISOString()
            };
            await dynamodb_1.DynamoDBHelper.putItem(env_1.ENV.SETTINGS_TABLE, settingData);
            return (0, response_1.successResponse)(settingData);
        }
        catch (dbError) {
            console.error('Error saving settings to DynamoDB:', dbError);
            return (0, response_1.internalServerErrorResponse)('Failed to save settings');
        }
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_1.errorResponse)(error.message, 400);
        }
        return (0, response_1.internalServerErrorResponse)('Failed to update settings');
    }
};
exports.handler = handler;
/**
 * 設定データのバリデーション
 */
function validateSettingData(settingType, data) {
    const errors = [];
    switch (settingType) {
        case 'post-time':
            if (data.enabled !== undefined && typeof data.enabled !== 'boolean') {
                errors.push('enabled must be a boolean');
            }
            if (data.time && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.time)) {
                errors.push('time must be in HH:mm format');
            }
            break;
        case 'week-theme':
            const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            for (const day of weekdays) {
                if (data[day] !== undefined && typeof data[day] !== 'string') {
                    errors.push(`${day} must be a string`);
                }
            }
            break;
        case 'tone':
            const toneFields = ['politeness', 'casualness', 'positivity', 'expertise', 'emotionLevel', 'metaphorUsage', 'emojiUsage'];
            for (const field of toneFields) {
                if (data[field] !== undefined) {
                    if (typeof data[field] !== 'number' || data[field] < 0 || data[field] > 100) {
                        errors.push(`${field} must be a number between 0 and 100`);
                    }
                }
            }
            break;
        case 'event':
            if (data.enabled !== undefined && typeof data.enabled !== 'boolean') {
                errors.push('enabled must be a boolean');
            }
            if (data.customEvents !== undefined) {
                if (!Array.isArray(data.customEvents)) {
                    errors.push('customEvents must be an array');
                }
            }
            break;
        case 'trend':
            if (data.enabled !== undefined && typeof data.enabled !== 'boolean') {
                errors.push('enabled must be a boolean');
            }
            if (data.mixRatio !== undefined) {
                if (typeof data.mixRatio !== 'number' || data.mixRatio < 0 || data.mixRatio > 100) {
                    errors.push('mixRatio must be a number between 0 and 100');
                }
            }
            break;
        default:
            // その他の設定タイプでは基本的なチェックのみ
            break;
    }
    return {
        isValid: errors.length === 0,
        errors: errors.length > 0 ? errors : []
    };
}


/***/ }),

/***/ "./src/index.ts":
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


// メインエントリーポイント
// このファイルは webpack のエントリーポイントとして使用されますが、
// 実際の Lambda 関数は個別のファイルから export されます
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__webpack_require__(/*! ./functions/settings/getSettings */ "./src/functions/settings/getSettings.ts"), exports);
__exportStar(__webpack_require__(/*! ./functions/settings/updateSettings */ "./src/functions/settings/updateSettings.ts"), exports);


/***/ }),

/***/ "./src/libs/dynamodb.ts":
/*!******************************!*\
  !*** ./src/libs/dynamodb.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DynamoDBHelper = exports.dynamoClient = void 0;
const client_dynamodb_1 = __webpack_require__(/*! @aws-sdk/client-dynamodb */ "@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = __webpack_require__(/*! @aws-sdk/lib-dynamodb */ "@aws-sdk/lib-dynamodb");
const env_1 = __webpack_require__(/*! ./env */ "./src/libs/env.ts");
/**
 * DynamoDB クライアント設定
 */
const createDynamoDBClient = () => {
    const config = {
        region: env_1.ENV.REGION,
    };
    // ローカル環境の場合はエンドポイントを設定
    if ((0, env_1.isLocal)() && env_1.ENV.AWS_ENDPOINT_URL) {
        config.endpoint = env_1.ENV.AWS_ENDPOINT_URL;
        config.credentials = {
            accessKeyId: 'local',
            secretAccessKey: 'local',
        };
    }
    return new client_dynamodb_1.DynamoDB(config);
};
// DynamoDB クライアント（ドキュメントクライアント）
exports.dynamoClient = lib_dynamodb_1.DynamoDBDocument.from(createDynamoDBClient());
/**
 * DynamoDB 操作のヘルパー関数
 */
class DynamoDBHelper {
    /**
     * アイテムを取得
     */
    static async getItem(tableName, key) {
        try {
            const result = await exports.dynamoClient.get({
                TableName: tableName,
                Key: key,
            });
            return result.Item || null;
        }
        catch (error) {
            console.error('DynamoDB GetItem Error:', error);
            throw new Error(`Failed to get item from ${tableName}`);
        }
    }
    /**
     * アイテムを作成/更新
     */
    static async putItem(tableName, item) {
        try {
            await exports.dynamoClient.put({
                TableName: tableName,
                Item: item,
            });
        }
        catch (error) {
            console.error('DynamoDB PutItem Error:', error);
            throw new Error(`Failed to put item to ${tableName}`);
        }
    }
    /**
     * アイテムを更新
     */
    static async updateItem(tableName, key, updateExpression, expressionAttributeValues, expressionAttributeNames) {
        try {
            const params = {
                TableName: tableName,
                Key: key,
                UpdateExpression: updateExpression,
                ExpressionAttributeValues: expressionAttributeValues,
                ReturnValues: 'ALL_NEW',
            };
            if (expressionAttributeNames) {
                params.ExpressionAttributeNames = expressionAttributeNames;
            }
            const result = await exports.dynamoClient.update(params);
            return result.Attributes;
        }
        catch (error) {
            console.error('DynamoDB UpdateItem Error:', error);
            throw new Error(`Failed to update item in ${tableName}`);
        }
    }
    /**
     * アイテムを削除
     */
    static async deleteItem(tableName, key) {
        try {
            await exports.dynamoClient.delete({
                TableName: tableName,
                Key: key,
            });
        }
        catch (error) {
            console.error('DynamoDB DeleteItem Error:', error);
            throw new Error(`Failed to delete item from ${tableName}`);
        }
    }
    /**
     * クエリ実行
     */
    static async query(tableName, keyConditionExpression, expressionAttributeValues, indexName, expressionAttributeNames, limit, scanIndexForward) {
        try {
            const params = {
                TableName: tableName,
                KeyConditionExpression: keyConditionExpression,
                ExpressionAttributeValues: expressionAttributeValues,
            };
            if (indexName)
                params.IndexName = indexName;
            if (expressionAttributeNames)
                params.ExpressionAttributeNames = expressionAttributeNames;
            if (limit)
                params.Limit = limit;
            if (scanIndexForward !== undefined)
                params.ScanIndexForward = scanIndexForward;
            const result = await exports.dynamoClient.query(params);
            return result.Items || [];
        }
        catch (error) {
            console.error('DynamoDB Query Error:', error);
            throw new Error(`Failed to query ${tableName}`);
        }
    }
    /**
     * スキャン実行
     */
    static async scan(tableName, filterExpression, expressionAttributeValues, expressionAttributeNames, limit) {
        try {
            const params = {
                TableName: tableName,
            };
            if (filterExpression)
                params.FilterExpression = filterExpression;
            if (expressionAttributeValues)
                params.ExpressionAttributeValues = expressionAttributeValues;
            if (expressionAttributeNames)
                params.ExpressionAttributeNames = expressionAttributeNames;
            if (limit)
                params.Limit = limit;
            const result = await exports.dynamoClient.scan(params);
            return result.Items || [];
        }
        catch (error) {
            console.error('DynamoDB Scan Error:', error);
            throw new Error(`Failed to scan ${tableName}`);
        }
    }
    /**
     * バッチでアイテムを取得
     */
    static async batchGetItems(tableName, keys) {
        try {
            const result = await exports.dynamoClient.batchGet({
                RequestItems: {
                    [tableName]: {
                        Keys: keys,
                    },
                },
            });
            return result.Responses?.[tableName] || [];
        }
        catch (error) {
            console.error('DynamoDB BatchGet Error:', error);
            throw new Error(`Failed to batch get items from ${tableName}`);
        }
    }
    /**
     * バッチでアイテムを書き込み
     */
    static async batchWriteItems(tableName, items, operation = 'put') {
        try {
            const writeRequests = items.map(item => {
                if (operation === 'put') {
                    return { PutRequest: { Item: item } };
                }
                else {
                    return { DeleteRequest: { Key: item } };
                }
            });
            // DynamoDB の制限により25件ずつバッチ処理
            const batchSize = 25;
            for (let i = 0; i < writeRequests.length; i += batchSize) {
                const batch = writeRequests.slice(i, i + batchSize);
                await exports.dynamoClient.batchWrite({
                    RequestItems: {
                        [tableName]: batch,
                    },
                });
            }
        }
        catch (error) {
            console.error('DynamoDB BatchWrite Error:', error);
            throw new Error(`Failed to batch write items to ${tableName}`);
        }
    }
}
exports.DynamoDBHelper = DynamoDBHelper;


/***/ }),

/***/ "./src/libs/env.ts":
/*!*************************!*\
  !*** ./src/libs/env.ts ***!
  \*************************/
/***/ ((__unused_webpack_module, exports) => {


/**
 * 環境変数を安全に取得するヘルパー関数
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isProduction = exports.isProd = exports.isDev = exports.isLocal = exports.ENV = exports.getEnvVarAsBoolean = exports.getEnvVarAsNumber = exports.getEnvVar = void 0;
const getEnvVar = (key, defaultValue) => {
    const value = process.env[key];
    if (!value && defaultValue === undefined) {
        throw new Error(`Environment variable ${key} is required but not set`);
    }
    return value || defaultValue || '';
};
exports.getEnvVar = getEnvVar;
const getEnvVarAsNumber = (key, defaultValue) => {
    const value = process.env[key];
    if (!value && defaultValue === undefined) {
        throw new Error(`Environment variable ${key} is required but not set`);
    }
    const numValue = Number(value || defaultValue);
    if (isNaN(numValue)) {
        throw new Error(`Environment variable ${key} must be a valid number`);
    }
    return numValue;
};
exports.getEnvVarAsNumber = getEnvVarAsNumber;
const getEnvVarAsBoolean = (key, defaultValue) => {
    const value = process.env[key];
    if (!value && defaultValue === undefined) {
        throw new Error(`Environment variable ${key} is required but not set`);
    }
    if (!value)
        return defaultValue;
    return value.toLowerCase() === 'true';
};
exports.getEnvVarAsBoolean = getEnvVarAsBoolean;
// 環境変数の定数
exports.ENV = {
    STAGE: (0, exports.getEnvVar)('STAGE', 'local'),
    REGION: (0, exports.getEnvVar)('REGION', 'ap-northeast-1'),
    // DynamoDB テーブル名
    USERS_TABLE: (0, exports.getEnvVar)('USERS_TABLE', 'posl-users-local'),
    SETTINGS_TABLE: (0, exports.getEnvVar)('SETTINGS_TABLE', 'posl-settings-local'),
    POST_LOGS_TABLE: (0, exports.getEnvVar)('POST_LOGS_TABLE', 'posl-post-logs-local'),
    DIARIES_TABLE: (0, exports.getEnvVar)('DIARIES_TABLE', 'posl-diaries-local'),
    PERSONA_PROFILES_TABLE: (0, exports.getEnvVar)('PERSONA_PROFILES_TABLE', 'posl-persona-profiles-local'),
    // S3 バケット
    AUDIO_BUCKET: (0, exports.getEnvVar)('AUDIO_BUCKET', 'posl-audio-bucket-local'),
    // 外部API
    OPENAI_API_KEY: (0, exports.getEnvVar)('OPENAI_API_KEY', 'dummy_key'),
    X_API_KEY: (0, exports.getEnvVar)('X_API_KEY', 'dummy_key'),
    X_API_SECRET: (0, exports.getEnvVar)('X_API_SECRET', 'dummy_secret'),
    X_ACCESS_TOKEN: (0, exports.getEnvVar)('X_ACCESS_TOKEN', 'dummy_token'),
    X_ACCESS_TOKEN_SECRET: (0, exports.getEnvVar)('X_ACCESS_TOKEN_SECRET', 'dummy_token_secret'),
    // AWS エンドポイント（ローカル開発用）
    AWS_ENDPOINT_URL: process.env.AWS_ENDPOINT_URL,
    S3_ENDPOINT_URL: process.env.S3_ENDPOINT_URL,
    // MySQL データベース設定
    MYSQL_HOST: (0, exports.getEnvVar)('MYSQL_HOST', 'localhost'),
    MYSQL_PORT: (0, exports.getEnvVar)('MYSQL_PORT', '3306'),
    MYSQL_USER: (0, exports.getEnvVar)('MYSQL_USER', 'root'),
    MYSQL_PASSWORD: (0, exports.getEnvVar)('MYSQL_PASSWORD', 'password'),
    MYSQL_DATABASE: (0, exports.getEnvVar)('MYSQL_DATABASE', 'posl_db'),
    // その他
    NODE_ENV: (0, exports.getEnvVar)('NODE_ENV', 'development'),
};
const isLocal = () => exports.ENV.STAGE === 'local';
exports.isLocal = isLocal;
const isDev = () => exports.ENV.STAGE === 'dev';
exports.isDev = isDev;
const isProd = () => exports.ENV.STAGE === 'prod';
exports.isProd = isProd;
const isProduction = () => exports.ENV.NODE_ENV === 'production';
exports.isProduction = isProduction;


/***/ }),

/***/ "./src/libs/response.ts":
/*!******************************!*\
  !*** ./src/libs/response.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.corsResponse = exports.internalServerErrorResponse = exports.notFoundResponse = exports.unauthorizedResponse = exports.validationErrorResponse = exports.errorResponse = exports.successResponse = void 0;
// CORS ヘッダー
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json',
};
/**
 * 成功レスポンス
 */
const successResponse = (data, statusCode = 200) => ({
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({
        success: true,
        data,
    }),
});
exports.successResponse = successResponse;
/**
 * エラーレスポンス
 */
const errorResponse = (message, statusCode = 400, error) => ({
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({
        success: false,
        error: error || 'Error',
        message,
    }),
});
exports.errorResponse = errorResponse;
/**
 * バリデーションエラーレスポンス
 */
const validationErrorResponse = (message, details) => ({
    statusCode: 422,
    headers: CORS_HEADERS,
    body: JSON.stringify({
        success: false,
        error: 'ValidationError',
        message,
        details,
    }),
});
exports.validationErrorResponse = validationErrorResponse;
/**
 * 認証エラーレスポンス
 */
const unauthorizedResponse = (message = 'Unauthorized') => ({
    statusCode: 401,
    headers: CORS_HEADERS,
    body: JSON.stringify({
        success: false,
        error: 'Unauthorized',
        message,
    }),
});
exports.unauthorizedResponse = unauthorizedResponse;
/**
 * 404エラーレスポンス
 */
const notFoundResponse = (message = 'Not Found') => ({
    statusCode: 404,
    headers: CORS_HEADERS,
    body: JSON.stringify({
        success: false,
        error: 'NotFound',
        message,
    }),
});
exports.notFoundResponse = notFoundResponse;
/**
 * サーバーエラーレスポンス
 */
const internalServerErrorResponse = (message = 'Internal Server Error', error) => {
    // 本番環境では詳細なエラー情報は隠す
    const isProduction = "development" === 'production';
    const responseBody = {
        success: false,
        error: 'InternalServerError',
        message: isProduction ? 'An internal server error occurred' : message,
        ...(isProduction ? {} : { details: error }),
    };
    return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify(responseBody),
    };
};
exports.internalServerErrorResponse = internalServerErrorResponse;
/**
 * CORS プリフライトレスポンス
 */
const corsResponse = () => ({
    statusCode: 200,
    headers: CORS_HEADERS,
    body: '',
});
exports.corsResponse = corsResponse;


/***/ }),

/***/ "./src/libs/validation.ts":
/*!********************************!*\
  !*** ./src/libs/validation.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isValidSettingType = exports.isInRange = exports.isValidTime = exports.isValidDate = exports.validateRequired = exports.isEmpty = exports.isValidEmail = exports.getUserId = exports.getBearerToken = exports.getHeader = exports.getRequiredQueryParameter = exports.getQueryParameter = exports.getPathParameter = exports.parseBody = void 0;
/**
 * リクエストボディをパースして返す
 */
const parseBody = (event) => {
    if (!event.body) {
        throw new Error('Request body is required');
    }
    try {
        return JSON.parse(event.body);
    }
    catch (error) {
        throw new Error('Invalid JSON in request body');
    }
};
exports.parseBody = parseBody;
/**
 * パスパラメータを取得
 */
const getPathParameter = (event, name) => {
    const value = event.pathParameters?.[name];
    if (!value) {
        throw new Error(`Path parameter '${name}' is required`);
    }
    return value;
};
exports.getPathParameter = getPathParameter;
/**
 * クエリパラメータを取得
 */
const getQueryParameter = (event, name, defaultValue) => {
    const value = event.queryStringParameters?.[name];
    return value || defaultValue;
};
exports.getQueryParameter = getQueryParameter;
/**
 * 必須クエリパラメータを取得
 */
const getRequiredQueryParameter = (event, name) => {
    const value = event.queryStringParameters?.[name];
    if (!value) {
        throw new Error(`Query parameter '${name}' is required`);
    }
    return value;
};
exports.getRequiredQueryParameter = getRequiredQueryParameter;
/**
 * ヘッダーを取得
 */
const getHeader = (event, name) => {
    return event.headers[name] || event.headers[name.toLowerCase()];
};
exports.getHeader = getHeader;
/**
 * Authorization ヘッダーからベアラートークンを取得
 */
const getBearerToken = (event) => {
    const authHeader = (0, exports.getHeader)(event, 'Authorization');
    if (!authHeader) {
        throw new Error('Authorization header is required');
    }
    const match = authHeader.match(/Bearer (.+)/);
    if (!match) {
        throw new Error('Invalid authorization header format');
    }
    return match[1];
};
exports.getBearerToken = getBearerToken;
/**
 * ユーザーIDを取得（認証実装後に使用）
 */
const getUserId = (event) => {
    // 現在は固定値、将来的にはJWTトークンから取得
    return 'default-user';
};
exports.getUserId = getUserId;
/**
 * メールアドレスのバリデーション
 */
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.isValidEmail = isValidEmail;
/**
 * 文字列が空かどうかチェック
 */
const isEmpty = (value) => {
    return value === null || value === undefined || value === '';
};
exports.isEmpty = isEmpty;
/**
 * 必須フィールドのバリデーション
 */
const validateRequired = (data, fields) => {
    const errors = [];
    for (const field of fields) {
        if ((0, exports.isEmpty)(data[field])) {
            errors.push(`Field '${field}' is required`);
        }
    }
    return errors;
};
exports.validateRequired = validateRequired;
/**
 * 日付形式（YYYY-MM-DD）のバリデーション
 */
const isValidDate = (dateString) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
        return false;
    }
    const date = new Date(dateString);
    return !isNaN(date.getTime());
};
exports.isValidDate = isValidDate;
/**
 * 時刻形式（HH:mm）のバリデーション
 */
const isValidTime = (timeString) => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(timeString);
};
exports.isValidTime = isValidTime;
/**
 * 数値範囲のバリデーション
 */
const isInRange = (value, min, max) => {
    return value >= min && value <= max;
};
exports.isInRange = isInRange;
/**
 * 設定タイプのバリデーション
 */
const isValidSettingType = (settingType) => {
    const validTypes = [
        'post-time',
        'week-theme',
        'event',
        'trend',
        'tone',
        'template',
        'prompt',
        'x-auth'
    ];
    return validTypes.includes(settingType);
};
exports.isValidSettingType = isValidSettingType;


/***/ }),

/***/ "@aws-sdk/client-dynamodb":
/*!*******************************************!*\
  !*** external "@aws-sdk/client-dynamodb" ***!
  \*******************************************/
/***/ ((module) => {

module.exports = require("@aws-sdk/client-dynamodb");

/***/ }),

/***/ "@aws-sdk/lib-dynamodb":
/*!****************************************!*\
  !*** external "@aws-sdk/lib-dynamodb" ***!
  \****************************************/
/***/ ((module) => {

module.exports = require("@aws-sdk/lib-dynamodb");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/index.ts");
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=main.js.map