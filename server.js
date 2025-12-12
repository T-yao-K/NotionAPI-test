import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Client } from '@notionhq/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Notion クライアントの初期化
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// ミドルウェア
app.use(cors());
app.use(express.json());

// 静的ファイルの配信（ビルド後のファイル用）
app.use(express.static(path.join(__dirname, 'dist')));

// Notion データベースからページ一覧を取得するAPI
app.get('/api/pages', async (req, res) => {
  try {
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!databaseId) {
      return res.status(400).json({ error: 'NOTION_DATABASE_ID が設定されていません' });
    }

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
      // タイトルプロパティを取得（プロパティ名は「名前」または「Name」など）
      const titleProperty = Object.values(page.properties).find(
        (prop) => prop.type === 'title'
      );

      // 日付プロパティを取得（プロパティ名は「日付」または「Date」など）
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

    res.json({ pages });
  } catch (error) {
    console.error('Notion API エラー:', error);
    res.status(500).json({
      error: 'Notion APIからデータを取得できませんでした',
      details: error.message
    });
  }
});

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// SPA用のフォールバック
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
  console.log('');
  console.log('Notion API 設定状況:');
  console.log(`  NOTION_API_KEY: ${process.env.NOTION_API_KEY ? '設定済み' : '未設定'}`);
  console.log(`  NOTION_DATABASE_ID: ${process.env.NOTION_DATABASE_ID ? '設定済み' : '未設定'}`);
});
