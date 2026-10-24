/**
 * IDOL TAITE RADAR - Application Logic
 * 複数アイドルのライブ被り・タイテ照合＆参戦判定
 */

// ==========================================
// 1. Storage & State Management
// ==========================================
const STORAGE_KEY_GROUPS = 'idol_radar_groups_v1';
const STORAGE_KEY_EVENTS = 'idol_radar_events_v1';

// Initial Demo Groups
const DEFAULT_GROUPS = [
  {
    id: 'grp-kasumi',
    name: 'かすみ草とステラ',
    twitter: 'kasumi_staff',
    rank: 'S', // S: 本命, A: 準推し, B: 気になる
    color: '#ff2a85', // ネオンピンク
    memo: '吉川実早 推し / 青春エモ系'
  },
  {
    id: 'grp-fruits',
    name: 'FRUITS ZIPPER',
    twitter: 'FRUITS_ZIPPER',
    rank: 'A',
    color: '#00e5ff', // シアン
    memo: '櫻井優衣 推し / NEW KAWAII'
  },
  {
    id: 'grp-takaneko',
    name: '高嶺のなでしこ',
    twitter: 'takaneko_official',
    rank: 'A',
    color: '#a855f7', // パープル
    memo: '松本ももな 推し / 可愛くてごめん'
  },
  {
    id: 'grp-appare',
    name: 'Appare!',
    twitter: 'official_appare',
    rank: 'B',
    color: '#ffb703', // アンバー
    memo: '対バンフェスで盛り上がりたい時'
  },
  {
    id: 'grp-devi',
    name: 'Devil ANTHEM.',
    twitter: 'devilanthem',
    rank: 'B',
    color: '#10b981', // エメラルド
    memo: '楽曲派ロックサウンド'
  }
];

// Initial Events (空からスタート)
const DEFAULT_EVENTS = [];

const SAMPLE_EVENTS = [
  {
    id: 'ev-001',
    title: 'IDOL WAVE FES 2026 AUTUMN',
    date: '2026-10-25',
    venue: 'Spotify O-EAST (渋谷)',
    openTime: '11:30',
    startTime: '12:00',
    status: 'going', // going, considering, skip
    url: 'https://tiget.net/events/demo-01',
    notes: 'チケットA番確保済。S+A推し被りの最重要現場！',
    schedules: [
      {
        groupId: 'grp-kasumi',
        liveStart: '14:20',
        liveEnd: '14:45',
        tokutenStart: '15:10',
        tokutenEnd: '16:10'
      },
      {
        groupId: 'grp-fruits',
        liveStart: '15:00',
        liveEnd: '15:25',
        tokutenStart: '15:45',
        tokutenEnd: '16:45'
      }
    ]
  },
  {
    id: 'ev-002',
    title: 'GIRLS LIVE CLASH Vol.18',
    date: '2026-10-31',
    venue: '品川ステラボール',
    openTime: '10:30',
    startTime: '11:00',
    status: 'considering',
    url: 'https://ticketdive.com/event/demo-02',
    notes: 'AとBが出るけど出番が7時間離れてる…待ち時間が長すぎて微妙？',
    schedules: [
      {
        groupId: 'grp-fruits',
        liveStart: '12:10',
        liveEnd: '12:35',
        tokutenStart: '13:00',
        tokutenEnd: '14:00'
      },
      {
        groupId: 'grp-appare',
        liveStart: '19:40',
        liveEnd: '20:05',
        tokutenStart: '20:20',
        tokutenEnd: '21:20'
      }
    ]
  },
  {
    id: 'ev-003',
    title: 'TOKYO IDOL SPARK 2026',
    date: '2026-11-03',
    venue: '新宿BLAZE & 新宿ReNY (サーキット)',
    openTime: '12:00',
    startTime: '12:30',
    status: 'considering',
    url: '',
    notes: 'サーキットフェス。出番が5分差で被り気味なので動線要確認',
    schedules: [
      {
        groupId: 'grp-kasumi',
        liveStart: '15:30',
        liveEnd: '15:55',
        tokutenStart: '16:15',
        tokutenEnd: '17:15'
      },
      {
        groupId: 'grp-takaneko',
        liveStart: '15:45',
        liveEnd: '16:10',
        tokutenStart: '16:30',
        tokutenEnd: '17:30'
      }
    ]
  },
  {
    id: 'ev-004',
    title: 'かすみ草とステラ 単独定期公演「星の約束」',
    date: '2026-11-08',
    venue: '白金高輪SELENE b2',
    openTime: '17:30',
    startTime: '18:15',
    status: 'going',
    url: 'https://tiget.net/events/demo-04',
    notes: 'Sランク本命の単独公演。絶対参戦！',
    schedules: [
      {
        groupId: 'grp-kasumi',
        liveStart: '18:15',
        liveEnd: '19:45',
        tokutenStart: '20:00',
        tokutenEnd: '21:30'
      }
    ]
  },
  {
    id: 'ev-005',
    title: 'HALLOWEEN IDOL FEST 2026',
    date: '2026-10-31',
    venue: '豊洲PIT',
    openTime: '11:00',
    startTime: '11:45',
    status: 'considering',
    url: '',
    notes: '3組被りの大型フェス！',
    schedules: [
      {
        groupId: 'grp-kasumi',
        liveStart: '13:00',
        liveEnd: '13:25',
        tokutenStart: '13:45',
        tokutenEnd: '14:45'
      },
      {
        groupId: 'grp-takaneko',
        liveStart: '14:15',
        liveEnd: '14:40',
        tokutenStart: '15:00',
        tokutenEnd: '16:00'
      },
      {
        groupId: 'grp-appare',
        liveStart: '15:15',
        liveEnd: '15:40',
        tokutenStart: '16:00',
        tokutenEnd: '17:00'
      }
    ]
  }
];

class IdolRadarApp {
  constructor() {
    this.groups = this.loadGroups();
    this.events = this.loadEvents();
    this.activeFilter = 'all';
    this.currentSearch = '';
    this.sortOrder = 'asc'; // 'asc' | 'desc'
    
    // Calendar state (defaults dynamically to today)
    const now = new Date();
    this.calYear = now.getFullYear();
    this.calMonth = now.getMonth(); // 0-indexed
    this.calSelectedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Temp storage for raw notice import
    this.pendingParsedEvent = null;

    this.initElements();
    this.bindEvents();
    this.render();
    this.syncStateWithAntigravity('アプリ初期起動・状態同期');

    // Auto-sync shared cloud state from GitHub repository (Smart non-destructive merge)
    fetch('/api/state')
      .then(res => res.json())
      .then(result => {
        const data = result.data || result;
        if (data && (Array.isArray(data.groups) || Array.isArray(data.events))) {
          let needsRender = false;

          // 1. Smart merge groups: NEVER overwrite or delete locally added groups!
          if (Array.isArray(data.groups) && data.groups.length > 0) {
            const existingIds = new Set(this.groups.map(g => g.id));
            const existingNames = new Set(this.groups.map(g => (g.name || '').toLowerCase().trim()));
            let addedFromCloud = 0;

            data.groups.forEach(cloudGrp => {
              if (!cloudGrp || !cloudGrp.name) return;
              const cleanName = cloudGrp.name.toLowerCase().trim();
              if (!existingIds.has(cloudGrp.id) && !existingNames.has(cleanName)) {
                this.groups.push(cloudGrp);
                existingIds.add(cloudGrp.id);
                existingNames.add(cleanName);
                addedFromCloud++;
              }
            });

            if (addedFromCloud > 0) {
              localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(this.groups));
              needsRender = true;
            }
          }

          // 2. Smart merge events: NEVER overwrite or delete locally added events!
          if (Array.isArray(data.events) && data.events.length > 0) {
            const existingUrls = new Set(this.events.map(e => e.url).filter(Boolean));
            const existingKeys = new Set(this.events.map(e => `${e.title}_${e.date}`));
            let addedEventsFromCloud = 0;

            data.events.forEach(cloudEv => {
              if (!cloudEv || !cloudEv.title) return;
              const key = `${cloudEv.title}_${cloudEv.date}`;
              const matchByUrl = cloudEv.url && existingUrls.has(cloudEv.url);
              const matchByKey = existingKeys.has(key);

              if (!matchByUrl && !matchByKey) {
                this.events.push(cloudEv);
                if (cloudEv.url) existingUrls.add(cloudEv.url);
                existingKeys.add(key);
                addedEventsFromCloud++;
              }
            });

            if (addedEventsFromCloud > 0) {
              localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(this.events));
              needsRender = true;
            }
          }

          if (needsRender) {
            console.log('[Cloud Sync] Smart merge completed successfully');
            this.render();
          }

          // Push merged complete state back to server so cloud stays up-to-date with new local groups
          this.syncStateWithAntigravity('双方向マージ同期');
        }
      }).catch(() => {});
  }

  loadGroups() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_GROUPS);
      return data ? JSON.parse(data) : DEFAULT_GROUPS;
    } catch (e) {
      return DEFAULT_GROUPS;
    }
  }

  saveGroups(action = '推しグループ更新') {
    localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(this.groups));
    this.syncStateWithAntigravity(action);
  }

  loadEvents() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_EVENTS);
      return data ? JSON.parse(data) : DEFAULT_EVENTS;
    } catch (e) {
      return DEFAULT_EVENTS;
    }
  }

  saveEvents(action = 'イベント更新') {
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(this.events));
    this.syncStateWithAntigravity(action);
  }

  syncStateWithAntigravity(action = 'データ同期') {
    try {
      fetch('/api/sync-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groups: this.groups,
          events: this.events,
          lastAction: action
        })
      }).catch(() => {});
    } catch (e) {}
  }

  // ==========================================
  // 2. Initialization & Navigation
  // ==========================================
  initElements() {
    // Navigation
    this.navItems = document.querySelectorAll('.bottom-nav .nav-item');
    this.views = document.querySelectorAll('.view-section');

    // Filter Chips
    this.filterChips = document.querySelectorAll('.quick-chip-scroll .chip');
    this.searchInput = document.getElementById('eventSearchInput');
    this.btnSortToggle = document.getElementById('btnSortToggle');
    this.sortLabel = document.getElementById('sortLabel');

    // List & Radar Card
    this.eventsListContainer = document.getElementById('eventsListContainer');
    this.radarSummaryTitle = document.getElementById('radarSummaryTitle');
    this.radarSummaryDesc = document.getElementById('radarSummaryDesc');

    // Calendar
    this.calTitle = document.getElementById('calCurrentMonthTitle');
    this.btnCalPrev = document.getElementById('btnCalPrev');
    this.btnCalNext = document.getElementById('btnCalNext');
    this.calDaysGrid = document.getElementById('calDaysGrid');
    this.calSelectedDayTitle = document.getElementById('calSelectedDayTitle');
    this.calSelectedDayCount = document.getElementById('calSelectedDayCount');
    this.calSelectedDayEvents = document.getElementById('calSelectedDayEvents');

    // Verdict View
    this.taiteEventSelect = document.getElementById('taiteEventSelect');
    this.taiteVerdictBoard = document.getElementById('taiteVerdictBoard');

    // Groups View
    this.groupsListContainer = document.getElementById('groupsListContainer');
    this.btnOpenAddGroupModal = document.getElementById('btnOpenAddGroupModal');

    // Import View
    this.importRawText = document.getElementById('importRawText');
    this.btnFillSampleImport = document.getElementById('btnFillSampleImport');
    this.btnAnalyzeRawText = document.getElementById('btnAnalyzeRawText');
    this.parseResultPreview = document.getElementById('parseResultPreview');
    this.parsePreviewContent = document.getElementById('parsePreviewContent');
    this.btnEditBeforeSave = document.getElementById('btnEditBeforeSave');
    this.btnConfirmImportSave = document.getElementById('btnConfirmImportSave');

    // Modals
    this.modalEventDetail = document.getElementById('modalEventDetail');
    this.modalGroupForm = document.getElementById('modalGroupForm');
    this.modalEventForm = document.getElementById('modalEventForm');
    this.toastContainer = document.getElementById('toastContainer');
  }

  bindEvents() {
    // Tab switching
    this.navItems.forEach(item => {
      item.addEventListener('click', () => {
        const target = item.getAttribute('data-target');
        this.switchView(target);
      });
    });

    // Top action
    document.getElementById('btnQuickAdd').addEventListener('click', () => {
      this.switchView('viewImport');
    });

    // Filters
    this.filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.activeFilter = chip.getAttribute('data-filter');
        this.renderEventsList();
      });
    });

    // Search
    this.searchInput.addEventListener('input', (e) => {
      this.currentSearch = e.target.value.toLowerCase().trim();
      this.renderEventsList();
    });

    // Sort Toggle
    this.btnSortToggle.addEventListener('click', () => {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
      this.sortLabel.textContent = this.sortOrder === 'asc' ? '日付順' : '降順';
      this.renderEventsList();
    });

    // Calendar navigation
    this.btnCalPrev.addEventListener('click', () => {
      this.calMonth--;
      if (this.calMonth < 0) {
        this.calMonth = 11;
        this.calYear--;
      }
      this.renderCalendar();
    });

    this.btnCalNext.addEventListener('click', () => {
      this.calMonth++;
      if (this.calMonth > 11) {
        this.calMonth = 0;
        this.calYear++;
      }
      this.renderCalendar();
    });

    // Taite Event Select
    this.taiteEventSelect.addEventListener('change', (e) => {
      this.renderTaiteVerdict(e.target.value);
    });

    // Group Form Modal Open
    this.btnOpenAddGroupModal.addEventListener('click', () => {
      this.openGroupModal();
    });

    // Group Form Close
    document.getElementById('btnCloseGroupModal').addEventListener('click', () => this.closeModal('modalGroupForm'));
    document.getElementById('btnCancelGroup').addEventListener('click', () => this.closeModal('modalGroupForm'));

    // Group Color Presets
    document.querySelectorAll('.preset-color').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const color = e.target.getAttribute('data-color');
        document.getElementById('groupColor').value = color;
        document.getElementById('colorHexLabel').textContent = color;
      });
    });

    document.getElementById('groupColor').addEventListener('input', (e) => {
      document.getElementById('colorHexLabel').textContent = e.target.value;
    });

    // Save Group
    document.getElementById('formGroup').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveGroupFromForm();
    });

    // Event Modal Close
    document.getElementById('btnCloseEventModal').addEventListener('click', () => this.closeModal('modalEventDetail'));
    document.getElementById('btnCloseEventFormModal').addEventListener('click', () => this.closeModal('modalEventForm'));
    document.getElementById('btnCancelEventForm').addEventListener('click', () => this.closeModal('modalEventForm'));

    // Save Event Form
    document.getElementById('formEvent').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveEventFromForm();
    });

    // Import Actions
    this.btnFillSampleImport.addEventListener('click', () => {
      this.importRawText.value = `【ライブ出演情報】
2026/11/15(日) 『SHIBUYA SUPER LIVE 2026』
■会場：渋谷duo MUSIC EXCHANGE
■時間：OPEN 11:00 / START 11:30
■出演：かすみ草とステラ / 高嶺のなでしこ / Devil ANTHEM. / 他
■タイムテーブル：
13:40-14:05 かすみ草とステラ（終演後物販 15:00-16:00）
14:15-14:40 高嶺のなでしこ（終演後物販 15:30-16:30）
15:00-15:25 Devil ANTHEM.（終演後物販 16:00-17:00）
■チケット：前方¥5,000 / 一般¥3,000 (D代別)
https://tiget.net/events/sample-nov15`;
    });

    this.btnAnalyzeRawText.addEventListener('click', () => {
      this.handleParseNotice();
    });

    this.btnConfirmImportSave.addEventListener('click', () => {
      if (this.pendingParsedEvent) {
        this.events.unshift(this.pendingParsedEvent);
        this.saveEvents();
        this.showToast('告知からイベントを一括登録しました！', 'success');
        this.pendingParsedEvent = null;
        this.parseResultPreview.classList.add('hidden');
        this.importRawText.value = '';
        this.render();
        this.switchView('viewEvents');
      }
    });

    this.btnEditBeforeSave.addEventListener('click', () => {
      if (this.pendingParsedEvent) {
        this.openEventFormModal(this.pendingParsedEvent);
      }
    });

    // Backup & Restore Handlers
    const btnExportData = document.getElementById('btnExportData');
    if (btnExportData) {
      btnExportData.addEventListener('click', () => {
        const backupData = {
          version: '1.0',
          exportedAt: new Date().toISOString(),
          groups: this.groups,
          events: this.events
        };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        a.href = url;
        a.download = `idol_radar_backup_${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showToast('バックアップJSONをダウンロードしました！', 'pink');
      });
    }

    const importFileInput = document.getElementById('importFileInput');
    if (importFileInput) {
      importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            if (data.groups && Array.isArray(data.groups)) {
              this.groups = data.groups;
              this.saveGroups();
            }
            if (data.events && Array.isArray(data.events)) {
              this.events = data.events;
              this.saveEvents();
            }
            this.render();
            this.showToast('バックアップから推しデータを復元しました！', 'success');
          } catch (err) {
            alert('ファイルの読み込みに失敗しました。有効なJSONファイルを選択してください。');
          }
        };
        reader.readAsText(file);
        e.target.value = '';
      });
    }

    // Delete All Events (不要なデモイベントを全消去)
    const btnDeleteAllEvents = document.getElementById('btnDeleteAllEvents');
    if (btnDeleteAllEvents) {
      btnDeleteAllEvents.addEventListener('click', () => {
        if (confirm('登録されているすべてのイベントを削除しますか？（推しグループ設定は残ります）')) {
          this.events = [];
          this.saveEvents();
          this.render();
          this.showToast('すべてのイベントを削除しました', 'pink');
        }
      });
    }

    // Clear All Data (完全まっさらから始める)
    const btnClearAllData = document.getElementById('btnClearAllData');
    if (btnClearAllData) {
      btnClearAllData.addEventListener('click', () => {
        if (confirm('イベントも推しグループも全削除して、完全なまっさら（空）の状態にしますか？')) {
          this.events = [];
          this.groups = [];
          this.saveEvents();
          this.saveGroups();
          this.render();
          this.showToast('全データをクリアしました。ご自身の推しを登録してください！', 'pink');
        }
      });
    }

    const btnResetDefaultData = document.getElementById('btnResetDefaultData');
    if (btnResetDefaultData) {
      btnResetDefaultData.addEventListener('click', () => {
        if (confirm('サンプルのデモデータ（かすてら等）を読み込みますか？')) {
          this.groups = [...DEFAULT_GROUPS];
          this.events = [...SAMPLE_EVENTS];
          this.saveGroups();
          this.saveEvents();
          this.render();
          this.showToast('サンプルデモデータを読み込みました');
        }
      });
    }

    // Auto Crawl: Twitter(X) -> Ticket Site Pipeline
    const btnTriggerAutoCrawl = document.getElementById('btnTriggerAutoCrawl');
    const crawlLogBox = document.getElementById('crawlLogBox');
    const crawlLogContent = document.getElementById('crawlLogContent');

    if (btnTriggerAutoCrawl) {
      btnTriggerAutoCrawl.addEventListener('click', async () => {
        crawlLogBox.classList.remove('hidden');
        crawlLogContent.innerHTML = '<div class="crawl-log-item">⏳ サーバー巡回エンジンを起動中...</div>';
        btnTriggerAutoCrawl.disabled = true;
        btnTriggerAutoCrawl.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" class="spin">
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
          </svg>
          推しの公式Xとチケットサイトを巡回中...
        `;

        try {
          const res = await fetch('/api/crawl', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groups: this.groups })
          });

          const rawText = await res.text();
          let data;
          try {
            data = JSON.parse(rawText);
          } catch (pe) {
            throw new Error(res.status === 504 || res.status === 502 
              ? 'サーバー通信タイムアウト（処理件数が多いため、もう一度お試しください）' 
              : 'サーバー一時応答エラー（スリープ復帰待機中）');
          }

          if (data.success) {
            crawlLogContent.innerHTML = '';
            (data.logs || []).forEach(log => {
              const div = document.createElement('div');
              div.className = 'crawl-log-item';
              div.textContent = log;
              crawlLogContent.appendChild(div);
            });

            let addedCount = 0;
            let mergedGroupCount = 0;
            (data.events || []).forEach(discovered => {
              const prevEventsLen = this.events.length;
              const exists = this.events.find(e => (e.url && discovered.url && e.url === discovered.url) || (e.title === discovered.title && e.date === discovered.date));
              const prevSchedLen = exists ? (exists.schedules || []).length : 0;

              this.addTicketEventToSchedule(discovered, false);

              if (this.events.length > prevEventsLen) {
                addedCount++;
              } else if (exists && (exists.schedules || []).length > prevSchedLen) {
                mergedGroupCount++;
              }
            });

            if (addedCount > 0 || mergedGroupCount > 0) {
              this.saveEvents();
              this.render();
              this.showToast(`チケットサイトから実在ライブを検知！ (新規: ${addedCount}件, 複数推し出演統合: ${mergedGroupCount}件)`, 'success');
              this.syncStateWithAntigravity('自動巡回より実在チケット追加・複数推し統合');
            } else {
              this.showToast(data.events && data.events.length > 0 ? '検知されたライブは全て登録済みです' : '直近のチケット販売イベントはありませんでした', 'pink');
            }
          } else {
            crawlLogContent.innerHTML += `<div style="color:var(--accent-red);">エラー: ${data.error || '不明なエラー'}</div>`;
          }
        } catch (e) {
          crawlLogContent.innerHTML += `<div style="color:var(--accent-red);">巡回通信エラー: ${e.message}</div>`;
        } finally {
          btnTriggerAutoCrawl.disabled = false;
          btnTriggerAutoCrawl.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
            今すぐ推しのXとチケットサイトを自動巡回する
          `;
        }
      });
    }

    // Direct Ticket URL Scrape Button
    const btnScrapeTicketUrl = document.getElementById('btnScrapeTicketUrl');
    const inpDirectTicketUrl = document.getElementById('inpDirectTicketUrl');
    if (btnScrapeTicketUrl && inpDirectTicketUrl) {
      btnScrapeTicketUrl.addEventListener('click', async () => {
        const url = inpDirectTicketUrl.value.trim();
        if (!url) {
          this.showToast('チケットサイトのURLを入力してください');
          return;
        }

        btnScrapeTicketUrl.disabled = true;
        btnScrapeTicketUrl.textContent = '取得中...';

        try {
          const res = await fetch('/api/scrape-ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
          });
          const result = await res.json();
          if (result.success && result.data) {
            const d = result.data;
            const matchedSchedules = [];
            const performers = d.performers || [];
            this.groups.forEach(g => {
              const hit = performers.some(p => p.toLowerCase().includes(g.name.toLowerCase()) || g.name.toLowerCase().includes(p.toLowerCase())) ||
                          (d.title || '').toLowerCase().includes(g.name.toLowerCase());
              if (hit) {
                matchedSchedules.push({
                  groupId: g.id,
                  liveStart: d.startTime || '12:30',
                  liveEnd: '13:00',
                  tokutenStart: '13:15',
                  tokutenEnd: '14:15'
                });
              }
            });

            this.openEventFormModal({
              id: 'ev-' + Date.now(),
              title: d.title || 'チケットサイト連携イベント',
              date: d.date || '2026-10-18',
              venue: d.venue || '都内ライブハウス',
              openTime: d.openTime || '12:00',
              startTime: d.startTime || '12:30',
              url: d.url || url,
              status: 'considering',
              notes: performers.length > 0 ? `出演: ${performers.join(', ')}` : 'チケットサイトから直接自動取得',
              schedules: matchedSchedules
            });
            this.showToast('チケットサイトからイベント情報を取得しました！', 'success');
          } else {
            alert('チケット情報の取得に失敗しました。');
          }
        } catch (e) {
          alert('サーバー通信エラー: ' + e.message);
        } finally {
          btnScrapeTicketUrl.disabled = false;
          btnScrapeTicketUrl.textContent = '取得';
        }
      });
    }

    // Initialize Ticket Search Engine
    this.initTicketSearch();
  }

  // ==========================================
  // Real Ticket Site Search Engine (TIGET等)
  // ==========================================
  initTicketSearch() {
    const quickPills = document.getElementById('quickGroupSearchPills');
    const inpKeyword = document.getElementById('inpTicketSearchKeyword');
    const btnSearch = document.getElementById('btnSearchTicketSite');
    const resultsContainer = document.getElementById('ticketSearchResultsContainer');
    const resultsList = document.getElementById('ticketSearchResultsList');
    const countSpan = document.getElementById('ticketSearchCount');
    const btnAddAll = document.getElementById('btnAddAllSearchedTickets');

    if (!btnSearch || !inpKeyword) return;

    // Render quick pills from registered groups
    const renderPills = () => {
      if (!quickPills) return;
      quickPills.innerHTML = '';
      if (!this.groups || this.groups.length === 0) {
        quickPills.innerHTML = '<span style="font-size:11px; color:var(--text-dim);">推しグループが未登録です（推し設定タブで登録可能）</span>';
        return;
      }
      this.groups.forEach(g => {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'btn-pill-compact';
        pill.style.border = `1px solid ${g.color}`;
        pill.style.color = '#fff';
        pill.style.background = 'rgba(255,255,255,0.06)';
        pill.style.cursor = 'pointer';
        pill.innerHTML = `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${g.color}; margin-right:4px;"></span>${g.name}`;
        pill.addEventListener('click', () => {
          inpKeyword.value = g.name;
          doSearch(g.name);
        });
        quickPills.appendChild(pill);
      });
    };

    let currentFoundEvents = [];

    const doSearch = async (query) => {
      if (!query || !query.trim()) {
        this.showToast('検索するアイドル名を入力してください');
        return;
      }

      btnSearch.disabled = true;
      btnSearch.textContent = '検索中...';
      resultsContainer.style.display = 'block';
      resultsList.innerHTML = '<div style="font-size:12px; color:var(--text-muted); text-align:center; padding:16px;">4大チケットサイト（TIGET / TicketDive / LivePocket / PayLove）から実在ライブを横断検索中...</div>';

      try {
        const res = await fetch('/api/search-tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: query.trim() })
        });
        const data = await res.json();

        if (data.success) {
          currentFoundEvents = data.events || [];
          countSpan.textContent = `検索結果: ${currentFoundEvents.length}件 (${query})`;
          resultsList.innerHTML = '';

          if (currentFoundEvents.length === 0) {
            resultsList.innerHTML = '<div style="font-size:12px; color:var(--text-muted); text-align:center; padding:16px;">4大チケットサイトで該当する販売イベントは見つかりませんでした</div>';
            if (btnAddAll) btnAddAll.style.display = 'none';
            return;
          }

          if (btnAddAll) btnAddAll.style.display = currentFoundEvents.length > 1 ? 'block' : 'none';

          const todayStr = '2026-10-18'; // Current local date

          currentFoundEvents.forEach(ev => {
            const isToday = ev.date === todayStr;
            const isAlreadyAdded = this.events.some(e => (e.url && e.url === ev.url) || (e.title === ev.title && e.date === ev.date));

            // Site badge color
            let siteColor = 'var(--accent-cyan)';
            let siteBg = 'rgba(0, 229, 255, 0.15)';
            if (ev.site === 'TicketDive') {
              siteColor = '#ff2a85';
              siteBg = 'rgba(255, 42, 133, 0.15)';
            } else if (ev.site === 'LivePocket') {
              siteColor = '#10b981';
              siteBg = 'rgba(16, 185, 129, 0.15)';
            } else if (ev.site === 'PayLove') {
              siteColor = '#a855f7';
              siteBg = 'rgba(168, 85, 247, 0.15)';
            }

            const card = document.createElement('div');
            card.className = 'crawler-feature-card';
            card.style.margin = '0';
            card.style.background = isToday ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.04)';
            card.style.borderColor = isToday ? 'var(--accent-red)' : 'rgba(255, 255, 255, 0.1)';

            card.innerHTML = `
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                <div style="flex:1;">
                  <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px; flex-wrap:wrap;">
                    <span style="font-size:10px; font-weight:800; color:${siteColor}; background:${siteBg}; border:1px solid ${siteColor}; padding:1px 6px; border-radius:4px;">${ev.site || 'TIGET'}</span>
                    ${isToday ? '<span class="neon-badge-today">🚨 本日開催！</span>' : ''}
                    <span style="font-size:11px; font-weight:700; color:#fff;">📅 ${ev.date}</span>
                    ${ev.venue ? `<span style="font-size:10px; color:var(--text-muted); background:rgba(255,255,255,0.08); padding:1px 6px; border-radius:4px;">📍 ${ev.venue}</span>` : ''}
                  </div>
                  <div style="font-size:13px; font-weight:800; color:#fff; line-height:1.35; margin-bottom:4px;">
                    ${ev.title}
                  </div>
                  <div style="font-size:10px; color:var(--text-muted); display:flex; align-items:center; gap:8px;">
                    <span>推し一致: <strong style="color:#fff;">${ev.matchedGroup}</strong></span>
                    <a href="${ev.url}" target="_blank" rel="noopener" style="color:${siteColor}; text-decoration:none;">${ev.site || 'サイト'}で確認 ↗</a>
                  </div>
                </div>
                <div style="flex-shrink:0;">
                  <button type="button" class="btn-pill-compact btn-add-ticket" style="font-size:11px; cursor:pointer; ${isAlreadyAdded ? 'background:rgba(16,185,129,0.2); border:1px solid var(--accent-green); color:#34d399;' : 'background:rgba(0,229,255,0.15); border:1px solid var(--accent-cyan); color:var(--accent-cyan);'}">
                    ${isAlreadyAdded ? '✓ 追加済' : '＋ 追加'}
                  </button>
                </div>
              </div>
            `;

            const btnAdd = card.querySelector('.btn-add-ticket');
            btnAdd.addEventListener('click', () => {
              this.addTicketEventToSchedule(ev);
              btnAdd.style.background = 'rgba(16,185,129,0.2)';
              btnAdd.style.borderColor = 'var(--accent-green)';
              btnAdd.style.color = '#34d399';
              btnAdd.textContent = '✓ 追加済';
            });

            resultsList.appendChild(card);
          });
        } else {
          resultsList.innerHTML = `<div style="color:var(--accent-red); padding:12px; font-size:12px;">エラー: ${data.error}</div>`;
        }
      } catch (e) {
        resultsList.innerHTML = `<div style="color:var(--accent-red); padding:12px; font-size:12px;">通信エラー: ${e.message}</div>`;
      } finally {
        btnSearch.disabled = false;
        btnSearch.textContent = '4サイト一括検索';
      }
    };

    btnSearch.addEventListener('click', () => doSearch(inpKeyword.value));
    inpKeyword.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        doSearch(inpKeyword.value);
      }
    });

    if (btnAddAll) {
      btnAddAll.addEventListener('click', () => {
        let addedCount = 0;
        currentFoundEvents.forEach(ev => {
          const exists = this.events.some(e => (e.url && e.url === ev.url) || (e.title === ev.title && e.date === ev.date));
          if (!exists) {
            this.addTicketEventToSchedule(ev, false);
            addedCount++;
          }
        });
        this.saveEvents();
        this.render();
        this.showToast(`${addedCount} 件のライブをカレンダーに追加しました！`, 'success');
        doSearch(inpKeyword.value);
      });
    }

    this.updateQuickSearchPills = renderPills;
    renderPills();
  }

  isGroupActuallyInEvent(groupName, ev) {
    if (!groupName || !ev) return false;
    const cleanStr = (s) => (s || '').toLowerCase().replace(/[\s\.\*＊!！]/g, '');
    const cleanGroup = cleanStr(groupName);

    let regexes = [];
    if (cleanGroup.includes('falench') || cleanGroup.includes('ファレンチ')) {
      regexes = [/\bFalench\.?\b/i, /ファレンチ/];
    } else if (cleanGroup.includes('jyapon') || cleanGroup.includes('ジャポン')) {
      regexes = [/SUPER\s*[\*☆]?\s*JYAPON/i, /スーパージャポン/i, /すーぱーじゃぽん/i];
    } else if (cleanGroup.includes('てるてる')) {
      regexes = [/アイテムはてるてるのみ/, /てるてるのみ/, /てるてる/];
    } else if (cleanGroup.includes('ネコプラ')) {
      regexes = [/ネコプラ/];
    } else if (cleanGroup.includes('カタコト') || cleanGroup.includes('katacoto')) {
      regexes = [/KATACOTO[\s\*＊]*BANK/i, /カタコトバンク/];
    } else if (cleanGroup.includes('真骨頂') || cleanGroup.includes('しんこっちょう')) {
      regexes = [/にっぽん[！!]\s*真骨頂/, /真骨頂/];
    } else if (cleanGroup.includes('ネクスタリア') || cleanGroup.includes('nextaria')) {
      regexes = [/ネクスタリア/, /\bnextaria\b/i];
    } else if (cleanGroup.includes('アオノシグナル')) {
      regexes = [/アオノシグナル/, /青のシグナル/];
    } else {
      const escaped = groupName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      regexes = [new RegExp(escaped, 'i')];
    }

    if (ev.title && regexes.some(r => r.test(ev.title))) return true;
    if (Array.isArray(ev.performers) && ev.performers.length > 0) {
      if (ev.performers.some(p => regexes.some(r => r.test(p)))) return true;
    }
    if (ev.notes && regexes.some(r => r.test(ev.notes))) return true;
    return false;
  }

  addTicketEventToSchedule(ev, triggerRender = true) {
    // Strictly filter registered groups that ACTUALLY perform in this event
    const matchedGroups = this.groups.filter(g => this.isGroupActuallyInEvent(g.name, ev));

    // If no registered group performs in this event, DISCARD it completely
    if (matchedGroups.length === 0) {
      console.log(`[DISCARD] Non-relevant event skipped: ${ev.title}`);
      return;
    }

    const dMatch = (ev.date || '').match(/(\d{4})[年\/-](\d{1,2})[月\/-](\d{1,2})/);
    const normalizedDate = dMatch ? `${dMatch[1]}-${String(dMatch[2]).padStart(2, '0')}-${String(dMatch[3]).padStart(2, '0')}` : ev.date;

    const existsIndex = this.events.findIndex(e => 
      (e.url && ev.url && e.url === ev.url) || 
      (e.title === ev.title && e.date === normalizedDate)
    );

    if (existsIndex >= 0) {
      // MERGE GROUPS INTO EXISTING EVENT!
      const existing = this.events[existsIndex];
      if (!Array.isArray(existing.schedules)) existing.schedules = [];

      matchedGroups.forEach((grp) => {
        const alreadyHas = existing.schedules.some(s => s.groupId === grp.id);
        if (!alreadyHas) {
          // Do not generate fake/estimated slot times: leave empty until officially announced
          existing.schedules.push({
            groupId: grp.id,
            liveStart: '',
            liveEnd: '',
            tokutenStart: '',
            tokutenEnd: ''
          });
        }
      });

      if (Array.isArray(ev.performers) && ev.performers.length > 0) {
        existing.performers = [...new Set([...(existing.performers || []), ...ev.performers])];
      }
      if (ev.venue && (!existing.venue || existing.venue === '都内ライブハウス')) {
        existing.venue = ev.venue;
      }
      if (ev.url && !existing.url) existing.url = ev.url;

      const groupNames = existing.schedules.map(s => {
        const g = this.getGroup(s.groupId);
        return g ? g.name : '';
      }).filter(Boolean);

      existing.notes = `${existing.site || ev.site || 'チケットサイト'}連携 (${groupNames.join(', ')})`;
    } else {
      // NEW EVENT: add all matched groups without fake times
      const schedules = matchedGroups.map(grp => ({
        groupId: grp.id,
        liveStart: '',
        liveEnd: '',
        tokutenStart: '',
        tokutenEnd: ''
      }));

      const newEvent = {
        id: ev.id || ('ev-' + Date.now()),
        title: ev.title,
        date: normalizedDate,
        venue: ev.venue || '都内ライブハウス',
        openTime: ev.openTime || '12:00',
        startTime: ev.startTime || '12:30',
        status: 'considering',
        url: ev.url,
        site: ev.site || 'チケットサイト',
        performers: ev.performers || [],
        notes: `${ev.site || 'チケットサイト'}連携 (${matchedGroups.map(g => g.name).join(', ')})`,
        schedules: schedules
      };
      this.events.push(newEvent);
    }

    // Always sort this.events by date ascending (closest/today first)
    this.events.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    if (triggerRender) {
      this.saveEvents();
      this.render();
      const count = matchedGroups.length;
      this.showToast(`「${ev.title}」（推し${count}組出演）を追加・更新しました！`, 'success');
      this.syncStateWithAntigravity('チケットサイトからライブを追加・グループ統合');
    }
  }

  switchView(viewId) {
    this.views.forEach(v => v.classList.remove('active'));
    this.navItems.forEach(n => n.classList.remove('active'));

    const targetView = document.getElementById(viewId);
    if (targetView) targetView.classList.add('active');

    const targetNav = document.querySelector(`.bottom-nav .nav-item[data-target="${viewId}"]`);
    if (targetNav) targetNav.classList.add('active');

    // Scroll to top
    document.getElementById('mainContent').scrollTop = 0;

    // View specific refresh
    if (viewId === 'viewVerdict') {
      this.populateVerdictSelector();
    } else if (viewId === 'viewCalendar') {
      this.renderCalendar();
    }
  }

  showToast(message, type = 'normal') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M20 6L9 17l-5-5"></path>
      </svg>
      <span>${message}</span>
    `;
    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s';
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  openModal(modalId) {
    document.getElementById(modalId).classList.add('open');
  }

  closeModal(modalId) {
    document.getElementById(modalId).classList.remove('open');
  }

  // ==========================================
  // 3. Core Logic: Overlap & Taite Verdict
  // ==========================================
  getGroup(groupId) {
    return this.groups.find(g => g.id === groupId);
  }

  // Calculate Overlap score for an event
  calculateOverlap(event) {
    const groupIds = (event.schedules || []).map(s => s.groupId);
    const eventGroups = groupIds.map(id => this.getGroup(id)).filter(Boolean);
    
    const count = eventGroups.length;
    const hasRankS = eventGroups.some(g => g.rank === 'S');
    const hasRankA = eventGroups.some(g => g.rank === 'A');
    const hasRankB = eventGroups.some(g => g.rank === 'B');

    // Hot overlap: S + A or 2+ (S or A)
    const isHot = (hasRankS && hasRankA) || (eventGroups.filter(g => g.rank === 'S' || g.rank === 'A').length >= 2);

    return {
      count,
      groups: eventGroups,
      hasRankS,
      hasRankA,
      hasRankB,
      isHot
    };
  }

  // Time conversion helper: "14:20" -> minutes from midnight
  timeToMinutes(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return null;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  minutesToTime(mins) {
    const h = Math.floor(mins / 60).toString().padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  analyzeTaite(event) {
    const totalGroups = (event.schedules || []).length;
    const schedules = (event.schedules || [])
      .map(s => ({
        ...s,
        group: this.getGroup(s.groupId),
        startMin: this.timeToMinutes(s.liveStart),
        endMin: this.timeToMinutes(s.liveEnd),
        tokutenStartMin: this.timeToMinutes(s.tokutenStart),
        tokutenEndMin: this.timeToMinutes(s.tokutenEnd)
      }))
      .filter(s => s.group && s.startMin !== null && s.endMin !== null)
      .sort((a, b) => a.startMin - b.startMin);

    if (schedules.length === 0) {
      return {
        status: 'unannounced',
        headline: totalGroups >= 2 ? `推し${totalGroups}組出演（タイテ未発表）` : (totalGroups === 1 ? 'タイテ未発表（出演のみ確定）' : 'タイテ未登録'),
        badgeClass: 'type-gap',
        advice: 'チケット情報から出演は確定していますが、各グループの個別タイテ（出演時間）は未発表です。公式Xでタイテが出たら「告知テキストコピペ解析」等で登録してください。',
        gaps: [],
        schedules: []
      };
    }

    if (schedules.length < 2) {
      return {
        status: schedules.length === 1 ? 'single' : 'none',
        headline: totalGroups >= 2 ? `推し${totalGroups}組出演（タイテ一部確定）` : '1組のみ出演',
        badgeClass: 'type-good',
        advice: schedules.length === 1 ? '推しグループの単独出演または1組のみです' : '一部グループのタイムテーブルが未登録です',
        gaps: [],
        schedules
      };
    }

    const gaps = [];
    let hasClash = false;
    let hasTokutenClash = false;
    let hasGodTaite = false;
    let hasWideGap = false;

    for (let i = 0; i < schedules.length - 1; i++) {
      const cur = schedules[i];
      const next = schedules[i + 1];

      // Difference between cur end and next start
      const diff = next.startMin - cur.endMin;

      let gapType = 'normal';
      let label = '';

      if (diff < 0) {
        // Overlapping live slots!
        gapType = 'clash';
        hasClash = true;
        label = `出番が${Math.abs(diff)}分重なっています！`;
      } else if (diff <= 15) {
        // God taite! Zero waiting time
        gapType = 'god';
        hasGodTaite = true;
        label = diff === 0 ? '出番が連続！神タイテ' : `空き${diff}分で即次の出番（神タイテ）`;
      } else if (diff <= 50) {
        gapType = 'good';
        label = `空き${diff}分（特典会や休憩に最適）`;
      } else {
        // Wide gap
        gapType = 'wide-gap';
        hasWideGap = true;
        const hours = (diff / 60).toFixed(1);
        label = `出番間隔が約${hours}時間（${diff}分）空いています`;
      }

      // Check tokutenkai clash with next live
      if (cur.tokutenStartMin && cur.tokutenEndMin) {
        if (next.startMin < cur.tokutenEndMin && next.endMin > cur.tokutenStartMin) {
          hasTokutenClash = true;
        }
      }

      gaps.push({
        cur,
        next,
        diff,
        gapType,
        label
      });
    }

    // Verdict summary calculation
    let status = 'good';
    let headline = '回りやすい良タイテ！';
    let badgeClass = 'type-good';
    let advice = '出番の間隔が適度で、特典会や移動もスムーズにこなせます。';

    if (hasClash) {
      status = 'clash';
      headline = '出番が被っています（タイテ被り注意）';
      badgeClass = 'type-clash';
      advice = 'ステージ時間が重複しているため、どちらか一方を優先するか途中で移動する必要があります。';
    } else if (hasGodTaite && !hasWideGap) {
      status = 'god';
      headline = '文句なしの神タイテ！行く価値大';
      badgeClass = 'type-god';
      advice = '推しの出番が連続またはほぼノータイムで繋がっており、待ち時間ゼロで最高に楽しめます！';
    } else if (hasWideGap) {
      status = 'wide-gap';
      headline = '被っているが出番が離れすぎ（待機長め）';
      badgeClass = 'type-gap';
      advice = '「被ってるから行きたい」と思っても出番が大幅に離れています。途中で抜けるか、回し現場の検討を推奨します。';
    }

    if (hasTokutenClash) {
      advice += ' ※前グループの特典会と次グループの出番時間が一部重複しています。';
    }

    return {
      status,
      headline,
      badgeClass,
      advice,
      gaps,
      schedules
    };
  }

  // 前日（昨日）より前の過ぎたイベントを自動消去
  purgeExpiredPastEvents() {
    const now = new Date();
    // 前日（昨日）の 00:00:00 を算出 (YYYY-MM-DD)
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    const originalCount = this.events.length;
    this.events = this.events.filter(e => {
      if (!e.date) return false;
      const dMatch = e.date.match(/(\d{4})[年\/-](\d{1,2})[月\/-](\d{1,2})/);
      const isoDate = dMatch ? `${dMatch[1]}-${String(dMatch[2]).padStart(2, '0')}-${String(dMatch[3]).padStart(2, '0')}` : e.date;
      return isoDate >= yesterdayStr;
    });

    if (this.events.length < originalCount) {
      console.log(`[Auto Purge] 前日より前の過去イベントを ${originalCount - this.events.length} 件 自動消去しました`);
      this.saveEvents('前日より前の過ぎたイベント自動消去');
    }
  }

  // ==========================================
  // 4. Render Methods
  // ==========================================
  render() {
    this.renderEventsList();
    this.renderCalendar();
    this.renderGroupsList();
    this.populateVerdictSelector();
  }

  // 4.1 Render Events List & Overlap radar
  renderEventsList() {
    this.purgeExpiredPastEvents();
    // Filter & Search
    let list = [...this.events];

    // Filter by tab
    if (this.activeFilter === 'overlap-multi') {
      list = list.filter(e => this.calculateOverlap(e).count >= 2);
    } else if (this.activeFilter === 'god-taite') {
      list = list.filter(e => {
        const v = this.analyzeTaite(e);
        return v.status === 'god';
      });
    } else if (this.activeFilter === 'rank-s') {
      list = list.filter(e => this.calculateOverlap(e).hasRankS);
    } else if (this.activeFilter === 'status-going') {
      list = list.filter(e => e.status === 'going');
    }

    // Search query
    if (this.currentSearch) {
      list = list.filter(e => {
        const matchTitle = (e.title || '').toLowerCase().includes(this.currentSearch);
        const matchVenue = (e.venue || '').toLowerCase().includes(this.currentSearch);
        const matchGroups = (e.schedules || []).some(s => {
          const g = this.getGroup(s.groupId);
          return g && g.name.toLowerCase().includes(this.currentSearch);
        });
        return matchTitle || matchVenue || matchGroups;
      });
    }

    // Helper: Normalize date string
    const normalizeDateStr = (s) => {
      if (!s) return '9999-99-99';
      const m = s.match(/(\d{4})[年\/-](\d{1,2})[月\/-](\d{1,2})/);
      return m ? `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}` : s;
    };

    // Helper: Get earliest performance / start / open time for sorting
    const getEventSortTime = (ev) => {
      // 1. Earliest liveStart of registered idol groups
      const liveStarts = (ev.schedules || [])
        .map(s => s.liveStart)
        .filter(t => t && /^\d{1,2}:\d{2}$/.test(t));
      if (liveStarts.length > 0) {
        liveStarts.sort();
        return liveStarts[0].padStart(5, '0');
      }
      // 2. Event start time
      if (ev.startTime && /^\d{1,2}:\d{2}$/.test(ev.startTime)) {
        return ev.startTime.padStart(5, '0');
      }
      // 3. Event open time
      if (ev.openTime && /^\d{1,2}:\d{2}$/.test(ev.openTime)) {
        return ev.openTime.padStart(5, '0');
      }
      return '99:99';
    };

    // Sort strictly by Date first, then by Time (昼公演 ➔ 夜公演)
    list.sort((a, b) => {
      const da = normalizeDateStr(a.date);
      const db = normalizeDateStr(b.date);
      if (da !== db) {
        return this.sortOrder === 'asc' ? da.localeCompare(db) : db.localeCompare(da);
      }
      const ta = getEventSortTime(a);
      const tb = getEventSortTime(b);
      return this.sortOrder === 'asc' ? ta.localeCompare(tb) : tb.localeCompare(ta);
    });

    // Update Radar Summary Card
    const hotEvents = this.events.filter(e => this.calculateOverlap(e).isHot);
    if (hotEvents.length > 0) {
      this.radarSummaryTitle.textContent = `推し被りライブを ${hotEvents.length} 件 検知！`;
      const nextHot = hotEvents[0];
      const overlap = this.calculateOverlap(nextHot);
      const names = overlap.groups.map(g => g.name).join(' ＆ ');
      this.radarSummaryDesc.textContent = `直近の注目: ${nextHot.date.slice(5)} 『${nextHot.title}』 (${names})`;
    } else {
      this.radarSummaryTitle.textContent = '直近の被りライブはありません';
      this.radarSummaryDesc.textContent = '推しグループの告知を登録すると被り判定が作動します';
    }

    // Render Cards
    this.eventsListContainer.innerHTML = '';
    if (list.length === 0) {
      this.eventsListContainer.innerHTML = `
        <div style="text-align:center; padding: 40px 10px; color: var(--text-dim);">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:8px;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          <p style="font-weight:700;">条件に一致するイベントがありません</p>
          <p style="font-size:12px; margin-top:4px;">フィルターを変更するか右上の「＋」から告知を登録してください</p>
        </div>
      `;
      return;
    }

    list.forEach(event => {
      const overlap = this.calculateOverlap(event);
      const verdict = this.analyzeTaite(event);

      const card = document.createElement('div');
      card.className = `event-card ${overlap.isHot ? 'card-overlap-hot' : ''}`;

      // Date format (例: 10/25 (日))
      const [y, m, d] = event.date.split('-');
      const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
      const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];
      const isWeekend = dayOfWeek === '日' || dayOfWeek === '土';

      // Check if event is Today
      const nowObj = new Date();
      const todayStr = `${nowObj.getFullYear()}-${String(nowObj.getMonth() + 1).padStart(2, '0')}-${String(nowObj.getDate()).padStart(2, '0')}`;
      const isToday = event.date === todayStr;

      // Badge HTML: accurately reflect actual group ranks
      let todayBadgeHtml = isToday ? `<span class="badge-today-live">🚨 本日開催！</span>` : '';
      let overlapBadgeHtml = '';

      if (overlap.count >= 2) {
        const ranks = [...new Set(overlap.groups.map(g => g.rank))];
        let badgeIcon = '✨';
        let badgeClass = 'badge-overlap-normal';
        let badgeText = '';

        if (ranks.includes('S') && ranks.includes('A')) {
          badgeIcon = '🔥';
          badgeClass = 'badge-overlap-hot';
          badgeText = `S+A被り (${overlap.count}組)`;
        } else if (ranks.includes('S') && ranks.includes('B')) {
          badgeIcon = '🔥';
          badgeClass = 'badge-overlap-hot';
          badgeText = `S+B被り (${overlap.count}組)`;
        } else if (ranks.includes('S')) {
          badgeIcon = '⭐';
          badgeClass = 'badge-overlap-hot';
          badgeText = `Sランク${overlap.count}組被り`;
        } else if (ranks.includes('A') && ranks.includes('B')) {
          const aCount = overlap.groups.filter(g => g.rank === 'A').length;
          badgeIcon = aCount >= 2 ? '🔥' : '✨';
          badgeClass = aCount >= 2 ? 'badge-overlap-hot' : 'badge-overlap-normal';
          badgeText = `A+B被り (${overlap.count}組)`;
        } else if (ranks.includes('A')) {
          badgeIcon = '🔥';
          badgeClass = 'badge-overlap-hot';
          badgeText = `Aランク${overlap.count}組被り`;
        } else {
          badgeIcon = '✨';
          badgeClass = 'badge-overlap-normal';
          badgeText = `Bランク${overlap.count}組出演`;
        }

        overlapBadgeHtml = `
          <span class="${badgeClass}">
            <span>${badgeIcon}</span> ${badgeText}
          </span>
        `;
      } else if (overlap.count === 1) {
        const grp = overlap.groups[0];
        if (grp && grp.rank === 'S') {
          overlapBadgeHtml = `<span class="badge-overlap-normal">⭐ Sランク単独</span>`;
        }
      }

      // Taite verdict badge
      let taiteBadgeHtml = '';
      if (verdict.status === 'god') {
        taiteBadgeHtml = `<span class="badge-god-taite">🎯 神タイテ</span>`;
      } else if (verdict.status === 'clash') {
        taiteBadgeHtml = `<span class="badge-gap-alert">⚡ 出番被り警告</span>`;
      } else if (verdict.status === 'wide-gap') {
        taiteBadgeHtml = `<span class="badge-gap-warn">⏳ 離れすぎ(${verdict.gaps[0]?.diff || ''}分)</span>`;
      } else if (verdict.status === 'unannounced') {
        taiteBadgeHtml = `<span class="badge-god-taite" style="background:rgba(255,255,255,0.06); border-color:rgba(255,255,255,0.18); color:var(--text-muted);">⏳ タイテ未発表</span>`;
      }

      // Status tag
      const statusLabels = {
        going: '🎫 参戦確定',
        considering: '🤔 検討中',
        skip: '🙅 見送り'
      };

      // Groups mini preview
      const groupsPreviewHtml = (event.schedules || []).map(s => {
        const grp = this.getGroup(s.groupId);
        if (!grp) return '';
        return `
          <div class="group-row-mini">
            <div class="group-pill-mini">
              <span class="group-color-dot" style="background:${grp.color};"></span>
              <span class="group-rank-badge rank-${grp.rank}">${grp.rank}</span>
              <span class="group-name-text">${grp.name}</span>
            </div>
            <span class="group-slot-time">
              ${s.liveStart ? `${s.liveStart}〜${s.liveEnd || ''}` : '<span style="color:var(--text-dim); font-size:11px;">タイテ未発表</span>'}
            </span>
          </div>
        `;
      }).join('');

      card.innerHTML = `
        <div class="event-card-header">
          <div class="event-date-box">
            <span class="event-date-day" style="${isToday ? 'color: var(--accent-cyan); font-weight:900;' : (isWeekend ? 'color: var(--accent-pink);' : '')}">
              ${Number(m)}/${Number(d)} (${dayOfWeek}) ${event.startTime ? `<span style="font-size:12px; font-weight:700; color:var(--text-muted); margin-left:4px;">${event.startTime}〜</span>` : ''}
            </span>
            <span class="event-venue-text">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              ${event.venue || '会場未定'}
            </span>
          </div>
          <div class="event-badges-row">
            ${todayBadgeHtml}
            ${overlapBadgeHtml}
            ${taiteBadgeHtml}
            <button type="button" class="btn-del-single-event" title="このイベントを削除">&times;</button>
          </div>
        </div>

        <div class="event-title">${event.title}</div>

        <div class="event-groups-preview">
          ${groupsPreviewHtml || '<div style="font-size:11px;color:var(--text-dim);">出演グループ未登録</div>'}
        </div>

        <div class="card-verdict-summary">
          <div class="verdict-left">
            <span>判定:</span>
            <strong style="color:#fff;">${verdict.headline}</strong>
          </div>
          <div class="verdict-right" style="display:flex; gap:6px; align-items:center;">
            ${event.url ? `
              <a href="${event.url}" target="_blank" rel="noopener noreferrer" class="btn-ticket-link" onclick="event.stopPropagation()" title="チケット販売ページを開く">
                🎫 チケ発 ↗
              </a>
            ` : ''}
            <span class="status-tag status-${event.status}">${statusLabels[event.status] || '未定'}</span>
          </div>
        </div>
      `;

      // Event Card Delete button
      const btnDel = card.querySelector('.btn-del-single-event');
      if (btnDel) {
        btnDel.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`イベント「${event.title}」を削除しますか？`)) {
            this.events = this.events.filter(ev => ev.id !== event.id);
            this.saveEvents();
            this.render();
            this.showToast('イベントを削除しました');
          }
        });
      }

      card.addEventListener('click', () => {
        this.openEventDetailModal(event.id);
      });

      this.eventsListContainer.appendChild(card);
    });
  }

  // 4.2 Render Calendar View
  renderCalendar() {
    const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    this.calTitle.textContent = `${this.calYear}年 ${monthNames[this.calMonth]}`;

    // Days in current month
    const firstDayIndex = new Date(this.calYear, this.calMonth, 1).getDay();
    const lastDate = new Date(this.calYear, this.calMonth + 1, 0).getDate();
    const prevLastDate = new Date(this.calYear, this.calMonth, 0).getDate();

    this.calDaysGrid.innerHTML = '';

    // Prev month padding
    for (let x = firstDayIndex; x > 0; x--) {
      const cell = document.createElement('div');
      cell.className = 'cal-day-cell other-month';
      cell.textContent = prevLastDate - x + 1;
      this.calDaysGrid.appendChild(cell);
    }

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Current month days
    for (let day = 1; day <= lastDate; day++) {
      const dateStr = `${this.calYear}-${String(this.calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = this.events.filter(e => e.date === dateStr);

      const cell = document.createElement('div');
      cell.className = 'cal-day-cell';
      if (dateStr === this.calSelectedDate) cell.classList.add('selected');
      if (dateStr === todayStr) cell.classList.add('today');

      // Day number
      const numSpan = document.createElement('span');
      numSpan.textContent = day;
      cell.appendChild(numSpan);

      // Overlap indicator dots
      if (dayEvents.length > 0) {
        const dotsBar = document.createElement('div');
        dotsBar.className = 'cal-dots-bar';

        const hasHot = dayEvents.some(e => this.calculateOverlap(e).isHot);
        const hasGoing = dayEvents.some(e => e.status === 'going');

        if (hasHot) {
          const dot = document.createElement('span');
          dot.className = 'cal-dot hot-overlap';
          dotsBar.appendChild(dot);
        } else {
          const dot = document.createElement('span');
          dot.className = 'cal-dot single-event';
          dotsBar.appendChild(dot);
        }

        if (hasGoing) {
          const dot = document.createElement('span');
          dot.className = 'cal-dot has-going';
          dotsBar.appendChild(dot);
        }

        cell.appendChild(dotsBar);
      }

      cell.addEventListener('click', () => {
        document.querySelectorAll('.cal-day-cell').forEach(c => c.classList.remove('selected'));
        cell.classList.add('selected');
        this.calSelectedDate = dateStr;
        this.renderCalendarDayDetail(dateStr);
      });

      this.calDaysGrid.appendChild(cell);
    }

    this.renderCalendarDayDetail(this.calSelectedDate);
  }

  renderCalendarDayDetail(dateStr) {
    // Get earliest time for sorting
    const getSortTime = (ev) => {
      const liveStarts = (ev.schedules || []).map(s => s.liveStart).filter(t => t && /^\d{1,2}:\d{2}$/.test(t));
      if (liveStarts.length > 0) { liveStarts.sort(); return liveStarts[0].padStart(5, '0'); }
      if (ev.startTime && /^\d{1,2}:\d{2}$/.test(ev.startTime)) return ev.startTime.padStart(5, '0');
      if (ev.openTime && /^\d{1,2}:\d{2}$/.test(ev.openTime)) return ev.openTime.padStart(5, '0');
      return '99:99';
    };

    const dayEvents = this.events
      .filter(e => e.date === dateStr)
      .sort((a, b) => getSortTime(a).localeCompare(getSortTime(b)));

    const [y, m, d] = dateStr.split('-');
    this.calSelectedDayTitle = document.getElementById('calSelectedDayTitle');
    this.calSelectedDayTitle.textContent = `${Number(m)}月${Number(d)}日の予定`;
    this.calSelectedDayCount.textContent = `${dayEvents.length}件`;

    this.calSelectedDayEvents.innerHTML = '';
    if (dayEvents.length === 0) {
      this.calSelectedDayEvents.innerHTML = `
        <div style="padding: 16px; text-align: center; color: var(--text-dim); font-size: 12px;">
          この日の登録イベントはありません
        </div>
      `;
      return;
    }

    dayEvents.forEach(ev => {
      const overlap = this.calculateOverlap(ev);
      const verdict = this.analyzeTaite(ev);
      const item = document.createElement('div');
      item.className = 'group-card';
      item.style.cursor = 'pointer';
      item.style.marginBottom = '6px';

      const timeLabel = ev.startTime ? `${ev.startTime}〜` : (ev.openTime ? `${ev.openTime}開場` : '');

      item.innerHTML = `
        <div class="group-info-left" style="flex:1; min-width:0; margin-right:8px;">
          <div style="display:flex; flex-direction:column; align-items:center; min-width:44px; flex-shrink:0;">
            <span style="font-family: var(--font-brand); font-weight:800; font-size:15px; color:${overlap.isHot ? 'var(--accent-pink)' : 'var(--accent-cyan)'}; line-height:1.1;">
              ${overlap.count}組
            </span>
            ${timeLabel ? `<span style="font-size:10px; font-weight:700; color:var(--text-muted); margin-top:2px;">${timeLabel}</span>` : ''}
          </div>
          <div style="overflow:hidden; text-overflow:ellipsis;">
            <div style="font-weight:700; color:#fff; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${ev.title}</div>
            <div style="font-size:11px; color:var(--text-muted);">${ev.venue} (${verdict.headline})</div>
          </div>
        </div>
        <div style="display:flex; gap:6px; align-items:center; flex-shrink:0;">
          ${ev.url ? `
            <a href="${ev.url}" target="_blank" rel="noopener noreferrer" class="btn-ticket-link-sm" onclick="event.stopPropagation()" title="チケット販売ページを開く">
              🎫 チケ発 ↗
            </a>
          ` : ''}
          <button class="btn-primary-compact">タイテ照合</button>
        </div>
      `;

      item.addEventListener('click', () => {
        this.switchView('viewVerdict');
        this.taiteEventSelect.value = ev.id;
        this.renderTaiteVerdict(ev.id);
      });

      this.calSelectedDayEvents.appendChild(item);
    });
  }

  // 4.3 Render Taite Verdict View
  populateVerdictSelector() {
    this.taiteEventSelect.innerHTML = '';
    
    // Sort events: multi-group events first
    const sorted = [...this.events].sort((a, b) => {
      const countA = (a.schedules || []).length;
      const countB = (b.schedules || []).length;
      return countB - countA;
    });

    sorted.forEach(ev => {
      const opt = document.createElement('option');
      opt.value = ev.id;
      const count = (ev.schedules || []).length;
      const timeStr = ev.startTime ? ` ${ev.startTime}〜` : '';
      opt.textContent = `${ev.date.slice(5)}${timeStr} 『${ev.title}』 (${count}組出演)`;
      this.taiteEventSelect.appendChild(opt);
    });

    if (sorted.length > 0) {
      this.taiteEventSelect.value = sorted[0].id;
      this.renderTaiteVerdict(sorted[0].id);
    } else {
      this.taiteVerdictBoard.innerHTML = '<div style="color:var(--text-dim);padding:20px;">イベントが登録されていません</div>';
    }
  }

  renderTaiteVerdict(eventId) {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return;

    const verdict = this.analyzeTaite(event);
    const overlap = this.calculateOverlap(event);

    // Calculate time bounds for the graphical timeline
    let minTime = 12 * 60; // default 12:00
    let maxTime = 18 * 60; // default 18:00

    if (verdict.schedules.length > 0) {
      const allStarts = verdict.schedules.map(s => s.startMin);
      const allEnds = verdict.schedules.map(s => s.tokutenEndMin || s.endMin);
      minTime = Math.max(0, Math.min(...allStarts) - 30);
      maxTime = Math.min(24 * 60, Math.max(...allEnds) + 30);
    }
    const totalDuration = Math.max(60, maxTime - minTime);

    // Timeline tracks HTML
    const tracksHtml = verdict.schedules.map(sch => {
      const grp = sch.group;
      const liveLeft = Math.max(0, ((sch.startMin - minTime) / totalDuration) * 100);
      const liveWidth = Math.max(4, ((sch.endMin - sch.startMin) / totalDuration) * 100);

      let tokutenHtml = '';
      if (sch.tokutenStartMin && sch.tokutenEndMin) {
        const tokutenLeft = Math.max(0, ((sch.tokutenStartMin - minTime) / totalDuration) * 100);
        const tokutenWidth = Math.max(4, ((sch.tokutenEndMin - sch.tokutenStartMin) / totalDuration) * 100);
        tokutenHtml = `
          <div class="slot-block slot-tokutenkai" style="left: ${tokutenLeft}%; width: ${tokutenWidth}%;" title="特典会 ${sch.tokutenStart}〜${sch.tokutenEnd}">
            特典会
          </div>
        `;
      }

      return `
        <div class="track-row">
          <div class="track-group-meta">
            <span class="track-group-name">
              <span class="group-color-dot" style="background:${grp.color};"></span>
              ${grp.name}
              <span class="group-rank-badge rank-${grp.rank}">${grp.rank}</span>
            </span>
            <span class="group-slot-time">出演: ${sch.liveStart}〜${sch.liveEnd}</span>
          </div>
          <div class="track-bar-canvas">
            <!-- Live Performance slot -->
            <div class="slot-block slot-live" style="left: ${liveLeft}%; width: ${liveWidth}%; --slot-color: ${grp.color};" title="ライブ ${sch.liveStart}〜${sch.liveEnd}">
              ライブ (${sch.liveEnd - sch.liveStart || 25}分)
            </div>
            <!-- Tokutenkai slot -->
            ${tokutenHtml}
          </div>
        </div>
      `;
    }).join('');

    // Comparisons detail between consecutive groups
    const comparisonItemsHtml = (verdict.gaps || []).map(gap => {
      let icon = '🎯';
      let bg = 'rgba(16, 185, 129, 0.2)';
      let color = 'var(--accent-green)';

      if (gap.gapType === 'clash') {
        icon = '⚡';
        bg = 'rgba(239, 68, 68, 0.2)';
        color = 'var(--accent-red)';
      } else if (gap.gapType === 'wide-gap') {
        icon = '⏳';
        bg = 'rgba(255, 183, 3, 0.2)';
        color = 'var(--accent-amber)';
      }

      return `
        <div class="comparison-item">
          <div class="comp-icon-box" style="background:${bg}; color:${color};">
            ${icon}
          </div>
          <div class="comp-content">
            <h5>${gap.cur.group.name} ➔ ${gap.next.group.name}</h5>
            <p>${gap.label}</p>
          </div>
        </div>
      `;
    }).join('');

    this.taiteVerdictBoard.innerHTML = `
      <!-- Verdict Hero Card -->
      <div class="verdict-hero-card">
        <div class="verdict-overall-badge ${verdict.badgeClass}">
          ${verdict.status === 'god' ? '🎯 神タイテ判定' : (verdict.status === 'clash' ? '⚡ 重複警告' : (verdict.status === 'wide-gap' ? '⏳ 離れすぎ判定' : '✨ 参戦検討'))}
        </div>
        <div class="verdict-headline">${verdict.headline}</div>
        <div class="verdict-advice">${verdict.advice}</div>
        ${event.url ? `
          <a href="${event.url}" target="_blank" rel="noopener noreferrer" class="btn-ticket-hero" style="margin-top:12px;">
            🎫 このイベントのチケ発ページを開く (${event.site || '公式'}) ↗
          </a>
        ` : ''}
      </div>

      <!-- Graphical Timeline -->
      <div class="taite-timeline-card">
        <div class="timeline-header">
          <h4>グラフィカル・タイムライン</h4>
          <div class="timeline-legend">
            <span>■ ライブ枠</span>
            <span>▨ 特典会枠</span>
          </div>
        </div>
        <div class="timeline-scale-bar">
          <span>${this.minutesToTime(minTime)}</span>
          <span>${this.minutesToTime(Math.round((minTime + maxTime) / 2))}</span>
          <span>${this.minutesToTime(maxTime)}</span>
        </div>
        <div class="timeline-tracks-container">
          ${tracksHtml || '<div style="font-size:12px;color:var(--text-dim);">タイテデータがありません</div>'}
        </div>
      </div>

      <!-- Gap / Waiting analysis -->
      <div class="comparison-analysis-card">
        <h4 style="font-size:13px; font-weight:700; color:#fff; margin-bottom:8px;">グループ間ギャップ・待機時間分析</h4>
        ${comparisonItemsHtml || '<div style="font-size:12px; color:var(--text-dim);">照合対象が1組以下です</div>'}
      </div>
    `;
  }

  // 4.4 Render Groups List
  renderGroupsList() {
    this.groupsListContainer.innerHTML = '';
    this.groups.forEach(group => {
      const card = document.createElement('div');
      card.className = 'group-card';
      card.innerHTML = `
        <div class="group-info-left">
          <div class="group-color-avatar" style="background:${group.color};">
            ${group.rank}
          </div>
          <div class="group-text-box">
            <h4 style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              ${group.name}
              ${group.twitter ? `<span style="font-size:10px;color:var(--accent-cyan);font-family:var(--font-mono);background:rgba(0,229,255,0.12);padding:1px 6px;border-radius:4px;">@${group.twitter}</span>` : '<span style="font-size:10px;color:var(--text-dim);">X未設定</span>'}
            </h4>
            <div class="group-memo">${group.memo || 'メモなし'}</div>
          </div>
        </div>
        <div class="group-actions-right">
          <button class="btn-icon-sm btn-edit-grp" title="編集">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="btn-icon-sm btn-del-grp" title="削除">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;

      card.querySelector('.btn-edit-grp').addEventListener('click', () => {
        this.openGroupModal(group);
      });

      card.querySelector('.btn-del-grp').addEventListener('click', () => {
        if (confirm(`「${group.name}」を推しリストから削除しますか？`)) {
          this.groups = this.groups.filter(g => g.id !== group.id);
          this.saveGroups();
          this.render();
          this.showToast('グループを削除しました');
        }
      });

      this.groupsListContainer.appendChild(card);
    });

    this.updateQuickSearchPills?.();
  }

  // ==========================================
  // 5. Notice Text Parser (X告知 / TIGETコピペ)
  // ==========================================
  handleParseNotice() {
    const text = this.importRawText.value.trim();
    if (!text) {
      this.showToast('告知テキストを入力してください');
      return;
    }

    const parsed = this.parseNoticeText(text);
    this.pendingParsedEvent = parsed;

    // Display preview
    this.parseResultPreview.classList.remove('hidden');

    const matchedGroupNames = parsed.schedules.map(s => {
      const g = this.getGroup(s.groupId);
      return g ? `${g.name} (${s.liveStart ? `${s.liveStart}〜` : 'タイテ記載あり'})` : '';
    }).join('、 ');

    this.parsePreviewContent.innerHTML = `
      <div class="preview-row">
        <span class="preview-label">イベント名:</span>
        <span class="preview-value">${parsed.title || '（タイトル不明）'}</span>
      </div>
      <div class="preview-row">
        <span class="preview-label">開催日:</span>
        <span class="preview-value">${parsed.date}</span>
      </div>
      <div class="preview-row">
        <span class="preview-label">会場:</span>
        <span class="preview-value">${parsed.venue}</span>
      </div>
      <div class="preview-row">
        <span class="preview-label">OPEN/START:</span>
        <span class="preview-value">${parsed.openTime || '--:--'} / ${parsed.startTime || '--:--'}</span>
      </div>
      <div class="preview-row">
        <span class="preview-label">検出推し組:</span>
        <span class="preview-value" style="color:var(--accent-pink);">${matchedGroupNames || '該当なし（手動で選択可能）'}</span>
      </div>
    `;
  }

  parseNoticeText(raw) {
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

    // 1. Title Extraction
    let title = '対バンライブ (名称未定)';
    for (const line of lines) {
      // Matches 【...】 or 『...』 or "..."
      const bracketMatch = line.match(/[【『「]([^】』」]+)[】』」]/);
      if (bracketMatch) {
        title = bracketMatch[1];
        break;
      }
    }

    // 2. Date Extraction (YYYY/MM/DD, YYYY-MM-DD, M/D, M月D日)
    let date = '2026-10-25';
    const dateMatch = raw.match(/(?:(\d{4})[./年\-])?\s*(\d{1,2})[./月\-](\d{1,2})/);
    if (dateMatch) {
      const y = dateMatch[1] || '2026';
      const m = String(dateMatch[2]).padStart(2, '0');
      const d = String(dateMatch[3]).padStart(2, '0');
      date = `${y}-${m}-${d}`;
    }

    // 3. Venue Extraction (会場：... or @...)
    let venue = '都内ライブハウス';
    const venueMatch = raw.match(/(?:会場|場所|PLACE)[：:\s]+([^\n\r]+)/i) || raw.match(/@([^\n\r\s]+)/);
    if (venueMatch) {
      venue = venueMatch[1].trim();
    }

    // 4. Open / Start extraction
    let openTime = '12:00';
    let startTime = '12:30';
    const openMatch = raw.match(/OPEN\s*[:：]?\s*(\d{1,2}:\d{2})/i);
    const startMatch = raw.match(/START\s*[:：]?\s*(\d{1,2}:\d{2})/i);
    if (openMatch) openTime = openMatch[1];
    if (startMatch) startTime = startMatch[1];

    // 5. Matched Groups & Taite extraction
    const schedules = [];
    this.groups.forEach(group => {
      // Check if group name appears in text
      if (raw.includes(group.name)) {
        // Try to find schedule line with time for this group
        // e.g. "14:20-14:45 かすみ草とステラ" or "14:20~ かすみ草とステラ"
        let liveStart = '';
        let liveEnd = '';
        let tokutenStart = '';
        let tokutenEnd = '';

        for (const line of lines) {
          if (line.includes(group.name)) {
            // Find time pattern in the same line
            const timeRange = line.match(/(\d{1,2}:\d{2})\s*[-~〜]\s*(\d{1,2}:\d{2})/);
            const singleTime = line.match(/(\d{1,2}:\d{2})/);
            if (timeRange) {
              liveStart = timeRange[1];
              liveEnd = timeRange[2];
            } else if (singleTime) {
              liveStart = singleTime[1];
            }

            // Check for tokutenkai / buppan time
            const tokutenMatch = line.match(/(?:特典会|物販)\s*[:：]?\s*(\d{1,2}:\d{2})\s*[-~〜]\s*(\d{1,2}:\d{2})/);
            if (tokutenMatch) {
              tokutenStart = tokutenMatch[1];
              tokutenEnd = tokutenMatch[2];
            }
            break;
          }
        }

        schedules.push({
          groupId: group.id,
          liveStart: liveStart || '14:00',
          liveEnd: liveEnd || '14:25',
          tokutenStart: tokutenStart || '',
          tokutenEnd: tokutenEnd || ''
        });
      }
    });

    return {
      id: 'ev-' + Date.now(),
      title,
      date,
      venue,
      openTime,
      startTime,
      status: 'considering',
      url: '',
      notes: '告知文より自動パース登録',
      schedules
    };
  }

  // ==========================================
  // 6. Modals (Detail, Form)
  // ==========================================
  openEventDetailModal(eventId) {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return;

    const overlap = this.calculateOverlap(event);
    const verdict = this.analyzeTaite(event);

    document.getElementById('modalEventTitle').textContent = event.title;

    const body = document.getElementById('modalEventBody');
    body.innerHTML = `
      <div style="margin-bottom:12px;">
        <div style="font-size:16px; font-weight:800; color:var(--accent-cyan); margin-bottom:4px;">
          📅 ${event.date} ＠ ${event.venue}
        </div>
        <div style="font-size:12px; color:var(--text-muted); margin-bottom: 8px;">
          OPEN ${event.openTime || '--:--'} / START ${event.startTime || '--:--'}
        </div>
        ${event.url ? `
          <a href="${event.url}" target="_blank" rel="noopener noreferrer" class="btn-ticket-hero">
            🎫 チケ発ページを開く (${event.site || 'チケット公式'}) ↗
          </a>
        ` : ''}
      </div>

      <div class="radar-summary-card" style="margin-bottom:14px;">
        <div style="font-size:13px; font-weight:800; color:#fff; margin-bottom:2px;">
          ${verdict.headline}
        </div>
        <div style="font-size:11px; color:var(--text-muted);">
          ${verdict.advice}
        </div>
      </div>

      <div style="margin-bottom:14px;">
        <h4 style="font-size:13px; font-weight:700; color:#fff; margin-bottom:8px;">出演推しグループ＆タイムテーブル</h4>
        <div class="event-groups-preview">
          ${(event.schedules || []).map(s => {
            const grp = this.getGroup(s.groupId);
            if (!grp) return '';
            return `
              <div style="padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-weight:700; color:#fff; display:flex; align-items:center; gap:6px;">
                    <span class="group-color-dot" style="background:${grp.color}"></span>
                    ${grp.name}
                    <span class="group-rank-badge rank-${grp.rank}">${grp.rank}</span>
                  </span>
                  <span style="font-family:var(--font-mono); font-size:12px; color:var(--accent-cyan);">
                    ライブ: ${s.liveStart || '--:--'}〜${s.liveEnd || '--:--'}
                  </span>
                </div>
                ${s.tokutenStart ? `
                  <div style="font-size:11px; color:var(--text-dim); margin-top:2px; padding-left:14px;">
                    特典会: ${s.tokutenStart}〜${s.tokutenEnd}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>

      ${event.notes ? `
        <div style="margin-bottom:14px;">
          <h4 style="font-size:12px; font-weight:700; color:var(--text-dim); margin-bottom:4px;">メモ</h4>
          <div style="font-size:12px; color:var(--text-main); background:var(--bg-card-subtle); padding:8px 10px; border-radius:8px;">
            ${event.notes}
          </div>
        </div>
      ` : ''}
    `;

    const footer = document.getElementById('modalEventFooter');
    footer.innerHTML = `
      ${event.url ? `<a href="${event.url}" target="_blank" rel="noopener noreferrer" class="btn-ticket-link" style="padding:7px 12px; font-size:12px; text-decoration:none;">🎫 チケ発 ↗</a>` : ''}
      <button class="btn-outline" id="btnEditEventDetail">編集する</button>
      <button class="btn-primary" id="btnJumpToVerdict">タイテ判定で見る</button>
    `;

    document.getElementById('btnEditEventDetail').addEventListener('click', () => {
      this.closeModal('modalEventDetail');
      this.openEventFormModal(event);
    });

    document.getElementById('btnJumpToVerdict').addEventListener('click', () => {
      this.closeModal('modalEventDetail');
      this.switchView('viewVerdict');
      this.taiteEventSelect.value = event.id;
      this.renderTaiteVerdict(event.id);
    });

    this.openModal('modalEventDetail');
  }

  openGroupModal(group = null) {
    document.getElementById('modalGroupTitle').textContent = group ? '推しグループ編集' : '推しグループ登録';
    document.getElementById('groupEditId').value = group ? group.id : '';
    document.getElementById('groupName').value = group ? group.name : '';
    document.getElementById('groupTwitter').value = group ? (group.twitter || '') : '';
    document.getElementById('groupColor').value = group ? group.color : '#ff2a85';
    document.getElementById('colorHexLabel').textContent = group ? group.color : '#ff2a85';
    document.getElementById('groupMemo').value = group ? (group.memo || '') : '';

    const rank = group ? group.rank : 'S';
    const radio = document.querySelector(`input[name="groupRank"][value="${rank}"]`);
    if (radio) radio.checked = true;

    this.openModal('modalGroupForm');
  }

  saveGroupFromForm() {
    const id = document.getElementById('groupEditId').value || ('grp-' + Date.now());
    const name = document.getElementById('groupName').value.trim();
    const twitter = document.getElementById('groupTwitter').value.trim().replace(/^@/, '');
    const rank = document.querySelector('input[name="groupRank"]:checked')?.value || 'A';
    const color = document.getElementById('groupColor').value;
    const memo = document.getElementById('groupMemo').value.trim();

    if (!name) return;

    const existingIndex = this.groups.findIndex(g => g.id === id);
    const newGroup = { id, name, twitter, rank, color, memo };

    if (existingIndex >= 0) {
      this.groups[existingIndex] = newGroup;
      this.showToast('グループを更新しました', 'pink');
    } else {
      this.groups.push(newGroup);
      this.showToast('グループを新しく登録しました！', 'pink');
    }

    this.saveGroups();
    this.closeModal('modalGroupForm');
    this.render();
  }

  openEventFormModal(event = null) {
    document.getElementById('modalEventFormTitle').textContent = event ? 'イベント編集' : '新規イベント登録';
    document.getElementById('eventEditId').value = event ? event.id : '';
    document.getElementById('evTitle').value = event ? event.title : '';
    document.getElementById('evDate').value = event ? event.date : '2026-10-25';
    document.getElementById('evVenue').value = event ? event.venue : '';
    document.getElementById('evOpen').value = event ? (event.openTime || '11:30') : '11:30';
    document.getElementById('evStart').value = event ? (event.startTime || '12:00') : '12:00';
    document.getElementById('evUrl').value = event ? (event.url || '') : '';
    document.getElementById('evNotes').value = event ? (event.notes || '') : '';

    const status = event ? event.status : 'considering';
    const radio = document.querySelector(`input[name="evStatus"][value="${status}"]`);
    if (radio) radio.checked = true;

    // Render group slot selection inside form
    const container = document.getElementById('eventGroupsFormContainer');
    container.innerHTML = '';

    const existingSchedules = event ? (event.schedules || []) : [];

    this.groups.forEach(grp => {
      const matchSchedule = existingSchedules.find(s => s.groupId === grp.id);
      const isChecked = Boolean(matchSchedule);

      const slotCard = document.createElement('div');
      slotCard.className = 'group-slot-input-card';
      slotCard.innerHTML = `
        <div class="slot-toggle-row">
          <input type="checkbox" id="chk_${grp.id}" value="${grp.id}" ${isChecked ? 'checked' : ''}>
          <label for="chk_${grp.id}" style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-bottom:0;">
            <span class="group-color-dot" style="background:${grp.color}"></span>
            <strong>${grp.name}</strong>
            <span class="group-rank-badge rank-${grp.rank}">${grp.rank}</span>
          </label>
        </div>
        <div class="slot-times-grid ${isChecked ? '' : 'disabled'}" id="timesGrid_${grp.id}">
          <div class="sub-field">
            <label>出番 (開始)</label>
            <input type="time" class="inp-live-start" value="${matchSchedule?.liveStart || '13:00'}">
          </div>
          <div class="sub-field">
            <label>出番 (終了)</label>
            <input type="time" class="inp-live-end" value="${matchSchedule?.liveEnd || '13:25'}">
          </div>
          <div class="sub-field">
            <label>特典会 (開始)</label>
            <input type="time" class="inp-toku-start" value="${matchSchedule?.tokutenStart || '14:00'}">
          </div>
          <div class="sub-field">
            <label>特典会 (終了)</label>
            <input type="time" class="inp-toku-end" value="${matchSchedule?.tokutenEnd || '15:00'}">
          </div>
        </div>
      `;

      const chk = slotCard.querySelector(`#chk_${grp.id}`);
      const grid = slotCard.querySelector(`#timesGrid_${grp.id}`);
      chk.addEventListener('change', () => {
        if (chk.checked) {
          grid.classList.remove('disabled');
        } else {
          grid.classList.add('disabled');
        }
      });

      container.appendChild(slotCard);
    });

    this.openModal('modalEventForm');
  }

  saveEventFromForm() {
    const id = document.getElementById('eventEditId').value || ('ev-' + Date.now());
    const title = document.getElementById('evTitle').value.trim();
    const date = document.getElementById('evDate').value;
    const venue = document.getElementById('evVenue').value.trim();
    const openTime = document.getElementById('evOpen').value;
    const startTime = document.getElementById('evStart').value;
    const status = document.querySelector('input[name="evStatus"]:checked')?.value || 'considering';
    const url = document.getElementById('evUrl').value.trim();
    const notes = document.getElementById('evNotes').value.trim();

    // Gather selected groups and their times
    const schedules = [];
    this.groups.forEach(grp => {
      const chk = document.getElementById(`chk_${grp.id}`);
      if (chk && chk.checked) {
        const grid = document.getElementById(`timesGrid_${grp.id}`);
        const liveStart = grid.querySelector('.inp-live-start').value;
        const liveEnd = grid.querySelector('.inp-live-end').value;
        const tokutenStart = grid.querySelector('.inp-toku-start').value;
        const tokutenEnd = grid.querySelector('.inp-toku-end').value;

        schedules.push({
          groupId: grp.id,
          liveStart,
          liveEnd,
          tokutenStart,
          tokutenEnd
        });
      }
    });

    const newEvent = {
      id,
      title,
      date,
      venue,
      openTime,
      startTime,
      status,
      url,
      notes,
      schedules
    };

    const existingIndex = this.events.findIndex(e => e.id === id);
    if (existingIndex >= 0) {
      this.events[existingIndex] = newEvent;
      this.showToast('イベントを更新しました', 'success');
    } else {
      this.events.unshift(newEvent);
      this.showToast('イベントを新規追加しました！', 'success');
    }

    this.saveEvents();
    this.closeModal('modalEventForm');
    this.render();
  }
}

// Instantiate on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  window.idolApp = new IdolRadarApp();
});
