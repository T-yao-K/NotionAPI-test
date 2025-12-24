/**
 * ローカルテスト用スクリプト
 * 
 * 使い方:
 *   1. .env ファイルを作成（.env.example を参照）
 *   2. npm run test を実行
 */

import { handler } from './index.mjs';

async function main() {
    console.log('=== Lambda関数のローカルテスト ===\n');

    // テストイベント（API Gateway形式）
    const testEvent = {
        httpMethod: 'GET',
        path: '/pages',
        headers: {},
        queryStringParameters: null,
    };

    try {
        const result = await handler(testEvent);
        console.log('Status Code:', result.statusCode);
        console.log('Headers:', result.headers);
        console.log('Body:', JSON.parse(result.body));
    } catch (error) {
        console.error('テスト失敗:', error);
    }
}

main();
