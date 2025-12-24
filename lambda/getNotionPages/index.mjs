/**
 * Lambda関数: Notion データベースからページ一覧を取得
 * 
 * 環境変数:
 *   - SECRET_NAME: Secrets Manager のシークレット名
 *   - AWS_REGION: リージョン（Lambdaでは自動設定）
 *   - NOTION_API_KEY: (ローカルテスト用) 直接APIキーを指定
 *   - NOTION_DATABASE_ID: (ローカルテスト用) 直接Database IDを指定
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Client } from '@notionhq/client';

// シークレットをキャッシュ（Lambda のコールドスタート対策）
let cachedSecrets = null;

/**
 * Secrets Manager からシークレットを取得
 */
async function getSecrets() {
    // ローカルテスト用: 環境変数が直接設定されている場合はそちらを使用
    if (process.env.NOTION_API_KEY && process.env.NOTION_DATABASE_ID) {
        return {
            NOTION_API_KEY: process.env.NOTION_API_KEY,
            NOTION_DATABASE_ID: process.env.NOTION_DATABASE_ID,
        };
    }

    // キャッシュがあればそれを返す
    if (cachedSecrets) {
        return cachedSecrets;
    }

    const secretName = process.env.SECRET_NAME || 'notion-api-credentials';
    const client = new SecretsManagerClient({
        region: process.env.AWS_REGION || 'ap-southeast-2',
    });

    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);

    if (!response.SecretString) {
        throw new Error('シークレットが見つかりません');
    }

    cachedSecrets = JSON.parse(response.SecretString);
    return cachedSecrets;
}

/**
 * Notion データベースからページ一覧を取得
 */
async function fetchNotionPages(apiKey, databaseId) {
    const notion = new Client({ auth: apiKey });

    const response = await notion.databases.query({
        database_id: databaseId,
        sorts: [
            {
                property: '日付',
                direction: 'descending',
            },
        ],
    });

    // ページデータを整形
    const pages = response.results.map((page) => {
        // タイトルプロパティを取得
        const titleProperty = Object.values(page.properties).find(
            (prop) => prop.type === 'title'
        );

        // 日付プロパティを取得
        const dateProperty = Object.values(page.properties).find(
            (prop) => prop.type === 'date'
        );

        const title = titleProperty?.title?.[0]?.plain_text || '無題';
        const date = dateProperty?.date?.start || null;

        return {
            id: page.id,
            title,
            date,
            url: page.url,
        };
    });

    return pages;
}

/**
 * Lambda ハンドラー
 */
export async function handler(event) {
    console.log('Lambda invoked:', JSON.stringify(event, null, 2));

    try {
        // シークレットを取得
        const secrets = await getSecrets();
        const { NOTION_API_KEY, NOTION_DATABASE_ID } = secrets;

        if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: 'APIキーまたはデータベースIDが設定されていません',
                }),
            };
        }

        // Notion からページ一覧を取得
        const pages = await fetchNotionPages(NOTION_API_KEY, NOTION_DATABASE_ID);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ pages }),
        };
    } catch (error) {
        console.error('Error:', error);

        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Notion APIからデータを取得できませんでした',
                details: error.message,
            }),
        };
    }
}
