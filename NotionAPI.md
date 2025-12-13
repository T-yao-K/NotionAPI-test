● Notion API の使い方 - このリポジトリを例に解説  

このリポジトリは、Notion API を使ってデータベースの内容を取得・表示するシンプルな Web アプリです。   
 
---   
 
1. セットアップ  

必要なパッケージ  

"@notionhq/client": "^2.2.15" // 公式 Notion SDK クライアント  

環境変数（.env）  

NOTION_API_KEY=secret_xxxxxxxxxx # インテグレーションの API キー  
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxx # 対象データベースの ID  

取得方法：  

- API Key: https://www.notion.so/my-integrations でインテグレーションを作成  
- Database ID: データベースの URL の notion.so/ の後ろの部分（?v=の前まで）  

---   

2. Notion クライアントの初期化（server.js:14-17）  

import { Client } from '@notionhq/client';   

const notion = new Client({   
auth: process.env.NOTION_API_KEY,  
});  

auth に API キーを渡すだけで初期化完了です。  

---  

3. データベースからデータを取得（server.js:35-43）   
  
const response = await notion.databases.query({  
database_id: databaseId,   
sorts: [    
{  
property: '日付', // ソート対象のプロパティ名  
direction: 'descending', // 降順  
},  
],  
});   
  
主なオプション：  

- database_id: 対象のデータベース ID  
- sorts: ソート条件の配列   
- filter: フィルタ条件（このコードでは未使用） 
   
---  
  
4. レスポンスデータの取り扱い（server.js:46-66）  
  
const pages = response.results.map((page) => {  
// タイトルプロパティを探す（type === 'title'のもの）  
const titleProperty = Object.values(page.properties).find(  
(prop) => prop.type === 'title'  
);

    // 日付プロパティを探す（type === 'date'のもの）
    const dateProperty = Object.values(page.properties).find(
      (prop) => prop.type === 'date'
    );

    // 値を取得
    const title = titleProperty?.title?.[0]?.plain_text || '無題';
    const date = dateProperty?.date?.start || null;

    return {
      id: page.id,
      title,
      date,
      url: page.url,  // Notionページへの直接リンク
    };

});  
  
ポイント：  

- response.results が各ページの配列  
- 各ページの properties からプロパティを取得  
- プロパティの type で種類を判別（title, date, rich_text など）  
- タイトルは title[0].plain_text で取得  

---

5. アーキテクチャ概要  

┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐  
│ フロントエンド │────▶│ Express サーバー │────▶│ Notion API │  
│ (main.ts)       │ │ (server.js)     │ │                  │  
└─────────────────┘ └─────────────────┘ └─────────────────┘   
fetch('/api/pages') notion.databases.query()  

フロントエンドから直接 Notion API を呼ばず、サーバー経由にしている理由：  

- API キーの保護: ブラウザに API キーを露出させない
- CORS 対策: Notion API はブラウザからの直接アクセスを許可していない

---

6. 重要な注意点   
  
- インテグレーションの接続: Notion のデータベースページで、作成したインテグレーションを「接続」する必要がある
- プロパティ名の一致: sorts で指定するプロパティ名は、Notion データベースの実際のプロパティ名と一致させる必要がある（例：日付）
-  ページネーション: 100 件以上のデータがある場合は start_cursor を使ったページネーションが必要

<img width="685" height="787" alt="image" src="https://github.com/user-attachments/assets/9ed2c389-adc9-4952-866a-1cd660d5e0c9" />
<img width="693" height="900" alt="image" src="https://github.com/user-attachments/assets/8dc473b8-c714-4b8a-bc65-e594eda82201" />


