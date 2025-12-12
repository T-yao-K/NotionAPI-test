import './style.css';

interface NotionPage {
  id: string;
  title: string;
  date: string | null;
  url: string;
}

interface ApiResponse {
  pages?: NotionPage[];
  error?: string;
  details?: string;
}

// APIのベースURL（開発時はViteのプロキシ、本番時は同一オリジン）
const API_BASE = import.meta.env.DEV ? 'http://localhost:3000' : '';

// 日付をフォーマット
function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ページ一覧を取得
async function fetchPages(): Promise<NotionPage[]> {
  const response = await fetch(`${API_BASE}/api/pages`);
  const data: ApiResponse = await response.json();

  if (data.error) {
    throw new Error(data.details || data.error);
  }

  return data.pages || [];
}

// ページ一覧を描画
function renderPages(pages: NotionPage[]): string {
  if (pages.length === 0) {
    return '<p class="no-data">データがありません</p>';
  }

  return `
    <ul class="page-list">
      ${pages
        .map(
          (page) => `
        <li class="page-item">
          <a href="${page.url}" target="_blank" rel="noopener noreferrer">
            <span class="page-title">${page.title}</span>
            <span class="page-date">${formatDate(page.date)}</span>
          </a>
        </li>
      `
        )
        .join('')}
    </ul>
  `;
}

// エラーメッセージを描画
function renderError(message: string): string {
  return `
    <div class="error">
      <p>エラーが発生しました</p>
      <p class="error-details">${message}</p>
    </div>
  `;
}

// ローディング表示
function renderLoading(): string {
  return '<div class="loading">読み込み中...</div>';
}

// メインのアプリケーション
async function app() {
  const appElement = document.querySelector<HTMLDivElement>('#app')!;

  // 初期HTML
  appElement.innerHTML = `
    <div class="container">
      <header>
        <h1>Notion Database Viewer</h1>
        <p class="subtitle">Notion APIで取得したデータベースの内容を表示します</p>
      </header>
      <main>
        <div class="card">
          <div class="card-header">
            <h2>ページ一覧</h2>
            <button id="refresh" class="refresh-btn">更新</button>
          </div>
          <div id="content">
            ${renderLoading()}
          </div>
        </div>
      </main>
      <footer>
        <p>Notion API Test App</p>
      </footer>
    </div>
  `;

  const contentElement = document.querySelector<HTMLDivElement>('#content')!;
  const refreshButton = document.querySelector<HTMLButtonElement>('#refresh')!;

  // データを取得して表示
  async function loadData() {
    contentElement.innerHTML = renderLoading();

    try {
      const pages = await fetchPages();
      contentElement.innerHTML = renderPages(pages);
    } catch (error) {
      const message = error instanceof Error ? error.message : '不明なエラー';
      contentElement.innerHTML = renderError(message);
    }
  }

  // 更新ボタンのイベント
  refreshButton.addEventListener('click', loadData);

  // 初回読み込み
  await loadData();
}

// アプリケーション起動
app();
