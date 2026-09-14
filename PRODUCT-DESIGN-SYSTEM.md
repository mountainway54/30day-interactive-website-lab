# Day 25–30 · Player / One

依使用者確認，最後六天使用獨立產品展示設計系統，完全不受 UI-GUIDELINES.md 的版型、色彩與元件規則限制。IMPLEMENTATION-SPEC.md 的技術結構與清理規則仍適用。

## 視覺基礎

- 夜藍黑 #080A10：整頁與 3D 舞台；不使用網格或硬陰影。
- 冷白 #F0F3F8：主文字、圖示與控制器外殼。
- 灰藍 #8790A2：次要文字。
- 深鋼藍 #2A3040：細線與進度底色。
- 電光藍 #69A7FF：控制器燈帶、焦點與播放進度。
- Display：Bahnschrift / Microsoft JhengHei；Body：Aptos / Microsoft JhengHei；Utility：Consolas。
- 寬鬆留白、全螢幕產品舞台；署名與篇章放上方，播放控制放下方。
- 品牌 player / one 為本次展示的暫定識別，不代表原模型品牌。
- 獨特視覺由冷白控制器、藍色輪廓光和鏡頭細節構成，其他介面保持克制。

## 控制與狀態

48px 圓形 icon 按鈕，提供 aria-label、title、鍵盤焦點；停用時保留位置。
載入進度依下載 bytes 計算，解析／編譯期間保留 loading；錯誤顯示重整提示。
一般模式完成載入後自動播放一次；系統減少動態偏好下保留全景，使用者可自行播放。
切換到背景分頁暫停，回來後由使用者繼續播放。

## Day 25

固定 18 秒，全景 → 搖桿／按鍵 → 側面握把 → 肩鍵／背面 → 全景。只有播放、暫停、重播，無拖曳、換色或捲動控制。
開場與結尾使用水平置中、左右對稱的正面產品構圖，完整呈現主要輸入元件。
來源 Blender 材質含無法直接匯出 glTF 的節點群組，因此保留材質槽名稱，再由 Three.js 建立冷白外殼、深色零件、金屬接點、半透明按鈕與藍色發光材質。
使用 `scripts/export-controller.py` 從 Blender 檔匯出 gzip GLB。輸出使用 `public/models/controller/controller.bin`，避免伺服器對 `.gz` 副檔名自動設定壓縮標頭。

## 本地重建模型

使用 Blender 4.1 執行：`blender --background docs/3d/ps5.controller.blend --python scripts/export-controller.py`。
來源 `.blend`、匯出腳本與瀏覽器用模型都保留在專案中。

## Day 26

沿用控制器與深色產品舞台，將 Day 25 的自動播放改為 Lenis 捲動控制。頁面由四個滿版章節組成：產品開場、觸碰板、類比操作桿、自適應扳機。
Three.js 畫布固定於視窗，內容隨頁面捲動；Lenis 提供平滑捲動進度，GSAP Timeline 將 0～1 的進度映射到四組攝影機位置與注視點。
右側使用垂直細軌顯示閱讀進度與目前章節。文字保持稀疏，產品與藍色輪廓光是主要視覺。
