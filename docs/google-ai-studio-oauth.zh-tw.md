# 設定 Google AI Studio 的 Google OAuth

**語言：** [English](google-ai-studio-oauth.md) | [简体中文](google-ai-studio-oauth.zh-cn.md) | [正體中文](google-ai-studio-oauth.zh-tw.md)

本指南將說明如何為 [AI Code Quota Dashboard](https://github.com/CrystalVibe28/ai-code-quota-dashboard) 設定您自己的 Google OAuth 用戶端。儀表板會使用這個用戶端登入 Google、列出已登入帳號可存取的 Google Cloud 專案，以及讀取 Google AI Studio 的配額與用量資料。

> [!IMPORTANT]
> 每次安裝只需要一組 OAuth 用戶端 ID 和用戶端密鑰。您新增的每個 Google 帳號與每個專案都共用同一組憑證。每個 Google 帳號仍必須獲得 OAuth 應用程式的 **Audience**（目標對象）設定允許，且具備檢視其專案的權限。

Google 偶爾會變更 Cloud Console 的標籤。下列路徑以目前的 **Google Auth Platform** 介面為準。如果標籤不同，請使用主控台搜尋 **Google Auth Platform**、**API Library** 或指定的 API 名稱。

## 開始之前

您需要：

- 可建立或選取 Google Cloud 專案的 Google 帳號。
- 在該專案中啟用 API 的權限。Project Owner（專案擁有者）與 Editor（編輯者）角色均包含必要權限；自訂角色則必須包含 `serviceusage.services.enable`。
- 您打算連線的每個 Google 帳號。當 OAuth 應用程式處於 Testing（測試）狀態時，您會將這些帳號新增為測試使用者。

請選用一個 Google Cloud 專案作為 **OAuth 用戶端專案**。這個專案會擁有同意畫面設定與 OAuth 用戶端。它可以同時是您要監控配額的 AI Studio 專案，但並非必要。

## 1. 建立或選取 OAuth 用戶端專案

1. 開啟 [Google Cloud Console](https://console.cloud.google.com/)。
2. 使用頂端列的專案選取器。
3. 選取現有專案，或選取 **New project** / **Create project**（新增專案／建立專案）。
4. 如果要建立專案，請輸入容易辨識的名稱，例如 `AI Code Quota Dashboard OAuth`；視需要選擇機構或資料夾，然後選取 **Create**（建立）。
5. 繼續之前，請選取剛建立的專案。

記下其 **Project ID**（專案 ID）。專案 ID 建立後便永久不變，且與專案名稱及專案編號不同。

> [!TIP]
> 使用專用的 OAuth 用戶端專案，可讓您更容易找到憑證與同意畫面設定。使用現有 AI Studio 專案也同樣有效，且需要啟用 API 的步驟較少。

<a id="2-enable-the-required-apis"></a>

## 2. 啟用必要 API

選取 OAuth 用戶端專案後，開啟 **APIs & Services > Library**（API 和服務 > 程式庫）。搜尋並啟用下列各項服務：

| 主控台名稱 | 服務名稱 | 儀表板用途 |
| --- | --- | --- |
| Generative Language API | `generativelanguage.googleapis.com` | 列出 Gemini 模型並註冊 Gemini OAuth 範圍 |
| Cloud Resource Manager API | `cloudresourcemanager.googleapis.com` | 列出已登入帳號可檢視的專案 |
| Cloud Quotas API | `cloudquotas.googleapis.com` | 讀取模型配額上限 |
| Cloud Monitoring API | `monitoring.googleapis.com` | 讀取模型用量指標 |

API Library 直接連結：

- [Generative Language API](https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com)
- [Cloud Resource Manager API](https://console.cloud.google.com/apis/library/cloudresourcemanager.googleapis.com)
- [Cloud Quotas API](https://console.cloud.google.com/apis/library/cloudquotas.googleapis.com)
- [Cloud Monitoring API](https://console.cloud.google.com/apis/library/monitoring.googleapis.com)

在每個頁面選取 **Enable**（啟用）之前，確認專案選取器仍顯示 OAuth 用戶端專案。Google 可能會要求您接受服務條款或設定帳單。

### 監控的專案不同時

對於您打算監控的每個其他 Google AI Studio 專案，請在主控台中選取該專案，並確認下列 API 也已在其中啟用：

- Generative Language API
- Cloud Quotas API
- Cloud Monitoring API

Cloud API 可能會針對用戶端專案、資源專案或兩者強制檢查服務是否啟用。如果 Google 傳回 `SERVICE_DISABLED` 或「API has not been used in project ...」，請在該錯誤顯示的專案編號或 ID 中啟用指定的 API，等待數分鐘後再試一次。

## 3. 在 Google Auth Platform 註冊應用程式

1. 選取 OAuth 用戶端專案後，開啟 **Menu > Google Auth Platform > Overview**（選單 > Google Auth Platform > 總覽）。
2. 選取 **Get started**（開始使用）。如果應用程式已註冊，請改為檢查現有的 **Branding**（品牌）與 **Audience**（目標對象）頁面。
3. 在 **App information**（應用程式資訊）下：
   - **App name**（應用程式名稱）：輸入容易辨識的名稱，例如 `AI Code Quota Dashboard (Personal)`。
   - **User support email**（使用者支援電子郵件）：選取您能控制的電子郵件地址。
4. 在 **Audience**（目標對象）下選取 **External**（外部）。這可支援個人 Google 帳號，以及專案所屬機構以外的 Google Workspace 帳號。
5. 在 **Contact information**（聯絡資訊）下，輸入您會查看 Google 通知的電子郵件地址。
6. 接受 Google API Services User Data Policy 確認聲明，然後選取 **Create**（建立）。

若僅供個人在 Testing（測試）狀態下使用，通常不需要標誌、首頁、隱私權政策、服務條款網址及已授權網域。如果之後要申請驗證，請使用位於您擁有且可驗證網域上的公開網址。

## 4. 註冊確切的 OAuth 範圍

1. 開啟 **Google Auth Platform > Data Access**（資料存取權）。
2. 選取 **Add or remove scopes**（新增或移除範圍）。
3. 選取或手動新增下列確切範圍：

   ```text
   https://www.googleapis.com/auth/cloud-platform
   https://www.googleapis.com/auth/generative-language.retriever
   https://www.googleapis.com/auth/userinfo.email
   https://www.googleapis.com/auth/userinfo.profile
   ```

4. 選取 **Update**（更新），然後在系統提示時儲存 Data Access 頁面。

範圍選取器只會顯示屬於已啟用 API 的範圍。如果其中沒有 `generative-language.retriever`，請使用 **Manually add scopes**（手動新增範圍），並確認 Generative Language API 已在 OAuth 用戶端專案中啟用。

儀表板會要求 `cloud-platform` 以讀取 Cloud 專案、配額與監控資料；要求 `generative-language.retriever` 以存取 Generative Language API；並要求兩個 `userinfo` 範圍以識別已連線的帳號。請勿新增無關的範圍。

<a id="test-users"></a>

## 5. 設定 External + Testing 並新增測試使用者

1. 開啟 **Google Auth Platform > Audience**（目標對象）。
2. 確認：
   - **User type**（使用者類型）：External
   - **Publishing status**（發布狀態）：Testing
3. 在 **Test users**（測試使用者）下選取 **Add users**（新增使用者）。
4. 輸入您要連線至儀表板之每個 Google 帳號的確切電子郵件地址。
5. 選取 **Save**（儲存）。

每當您想連線其他 Google 帳號時，請重複此步驟。您**不需要**為該帳號另外建立 OAuth 用戶端。

> [!WARNING]
> 處於 Testing 狀態的 External 應用程式最多可有 100 位測試使用者。由於此儀表板要求基本個人資料以外的範圍，測試使用者的授權及其離線重新整理權杖會在同意後七天到期。到期後請重新登入，或參閱[何時發布至正式環境](#when-to-publish-to-production)。

## 6. 建立 Desktop app OAuth 用戶端

1. 開啟 **Google Auth Platform > Clients**（用戶端）。
2. 選取 **Create client**（建立用戶端）。
3. 在 **Application type**（應用程式類型）選取 **Desktop app**（電腦版應用程式）。
4. 輸入名稱，例如 `AI Code Quota Dashboard Desktop`。
5. 選取 **Create**（建立）。
6. 在建立對話方塊中，立即複製下列兩項：
   - **Client ID**（用戶端 ID，通常以 `.apps.googleusercontent.com` 結尾）
   - **Client secret**（用戶端密鑰）
7. 您也可以下載 JSON 備份。這兩個值分別位於 `installed.client_id` 與 `installed.client_secret`。

Google 只會在用戶端密鑰建立時顯示完整值。如果您關閉對話方塊前未儲存，請從用戶端詳細資料頁面新增密鑰，並使用該新值。

請勿選擇 **Web application**（網頁應用程式）。儀表板是電腦版應用程式，會在隨機的本機回送位址上接聽：

```text
http://127.0.0.1:<random-port>/callback
```

Desktop 用戶端支援此重新導向方式，無需輸入固定連接埠或已授權的重新導向 URI。儀表板也會使用採用 S256 的 PKCE，並在系統瀏覽器中開啟授權流程。

## 7. 在 AI Code Quota Dashboard 中儲存憑證

選擇下列任一方式：

### 第一次設定 Google AI Studio 供應商時

1. 開啟 **Add provider**（新增供應商）。
2. 選取 **Google AI Studio**。
3. 保留或變更顯示名稱；此欄位會一律顯示。
4. 在首次 OAuth 設定區段中，貼上來自同一個 Desktop app 用戶端的 **Client ID** 與 **Client Secret**。
5. 儲存憑證。
6. 選取 **Sign in with Google**（使用 Google 登入）。
7. 在瀏覽器中選擇列在 **Test users** 下的帳號，檢查要求的存取權，然後予以核准。
8. 返回儀表板，選擇專案並新增供應商。

### 新增供應商之前

1. 開啟 **Settings**（設定）。
2. 找到 **Google OAuth credentials**（Google OAuth 憑證）區段。
3. 輸入 Desktop app 用戶端 ID 與用戶端密鑰，然後儲存。
4. 返回 **Add provider > Google AI Studio**（新增供應商 > Google AI Studio），繼續進行 Google 登入與專案選取。

為了安全起見，已儲存的值不會顯示，也無法編輯。若要更換無效、已刪除或已輪替的憑證組合，請在 Settings 中刪除已儲存的 Google OAuth 憑證，再輸入新的一組。刪除本機憑證組合不會刪除 Google Cloud 中的 OAuth 用戶端，也不會撤銷 Google 已核發的授權。

## 8. 驗證設定

符合下列所有條件，即表示設定已正常運作：

1. 儀表板回報 Google OAuth 已設定。
2. **Sign in with Google**（使用 Google 登入）會開啟系統瀏覽器。
3. Google 顯示 Branding 中設定的應用程式名稱與預期的權限。
4. 同意授權後，儀表板會顯示已連線的 Google 帳號。
5. 專案選取器會列出該帳號可存取的有效專案。
6. 選取專案後，供應商成功新增，且配額資料重新整理時不會出現 API 未啟用錯誤。

如果 Google 顯示「Google hasn't verified this app」，而這是您自己的 Testing 用戶端，請先確認專案名稱與用戶端 ID。只有在您認得且控制該 OAuth 用戶端專案時，才繼續操作。

## 疑難排解

### `Error 403: access_denied`

這通常表示所選 Google 帳號未獲准使用處於 Testing 狀態的 External 應用程式，也可能表示使用者拒絕同意授權。

1. 記下在 Google 帳號選擇器中選取的確切電子郵件地址。
2. 在擁有該用戶端 ID 的專案中，開啟 **Google Auth Platform > Audience**。
3. 確認設定為 **External** 與 **Testing**。
4. 在 **Test users** 下新增該確切電子郵件地址並儲存。
5. 等待數分鐘讓變更生效，然後重試登入並核准所要求的存取權。

如有多個帳號，請逐一新增。將 OAuth 專案擁有者加入並不會自動允許該擁有者的其他 Google 帳號。

如果仍然拒絕存取：

- 確認您編輯的是擁有該用戶端 ID 的專案，而不只是您想監控的 AI Studio 專案。
- 檢查您是否選取 **Cancel**（取消）或拒絕必要權限；請重試並核准所要求的範圍。
- 即使帳號已列為測試使用者，Google Workspace 管理員仍可封鎖第三方或未驗證的 OAuth 應用程式。請要求管理員檢查 **Security > Access and data control > API controls**（安全性 > 存取權與資料控管 > API 控制項），或使用該機構允許的帳號。
- 已加入 Advanced Protection（進階保護）的帳號可能會封鎖大多數非 Google 應用程式。
- 如果專案使用 **Internal**（內部）目標對象，該 Google Workspace 機構以外的帳號便無法登入；Google 通常會回報 `org_internal`。

### `redirect_uri_mismatch`

已儲存的用戶端 ID 通常使用了錯誤的應用程式類型。請建立 **Desktop app** 用戶端並更換已儲存的憑證。請勿建立 Web application 用戶端或設定固定的重新導向連接埠。

### `invalid_client` 或錯誤的用戶端密鑰

請確認用戶端 ID 與用戶端密鑰來自同一個 OAuth 用戶端。由於已儲存的值無法檢視或編輯，請刪除本機憑證並輸入正確的一組。如果遺失完整密鑰，請在 **Google Auth Platform > Clients** 新增／輪替密鑰，再輸入新的一組。

### `SERVICE_DISABLED` 或「API has not been used in project」

這是 API 啟用問題，不是測試使用者問題。請開啟 Google 錯誤中附帶的啟用連結，確認錯誤中顯示的專案，啟用指定的 API，等待數分鐘後再試一次。請參閱[啟用必要 API](#2-enable-the-required-apis)。

### 登入後沒有顯示任何專案

- 確認已登入的帳號可在 Google Cloud Console 中開啟該專案。
- 確認專案處於有效狀態，且該帳號至少具有專案的 `resourcemanager.projects.get` 權限。
- 在 OAuth 用戶端專案中啟用 Cloud Resource Manager API。
- 如果選錯 Google 帳號，請使用預定的測試使用者重新登入。

### 登入起初正常，但約一週後失敗

對要求非基本範圍且處於 Testing 狀態的 External 應用程式而言，這是預期行為。Google 會在七天後讓授權與重新整理權杖到期。請重新登入，或在考量下列驗證影響後，將 OAuth 應用程式發布至 Production（正式環境）。

<a id="when-to-publish-to-production"></a>

## 何時發布至 Production

請先從 **External + Testing** 開始，讓只有明確列出的帳號可以授權該用戶端。

符合下列情況時，請維持 Testing：

- 測試帳號不超過 100 個。
- 可以接受每七天重新授權一次。
- 您仍在驗證設定。

當您需要測試使用者清單以外的帳號，或不希望受到 Testing 的七天授權期限限制時，請在 **Google Auth Platform > Audience** 選取 **Publish app**（發布應用程式）。發布會將狀態變更為 **In production**（正式環境）；這**不代表**應用程式已通過驗證。

要求敏感或受限制範圍但尚未驗證的 Production 應用程式，仍可能顯示未驗證應用程式警告，且受到 Google 的 100 位新使用者上限限制。在廣泛散布 OAuth 用戶端之前，或 Google 指示需要驗證時，請完成 Google 的 Branding 與 Data Access 驗證。驗證可能需要您控制的網域、公開的應用程式與隱私權政策頁面、範圍用途說明，以及示範影片。Google Workspace 管理員仍可封鎖已驗證的應用程式。

對於僅供您個人使用的用戶端，請勿與其他使用者共用用戶端 ID／密鑰組合。每位使用者都應建立並設定自己的 OAuth 用戶端。

## 憑證安全性與生命週期

- 切勿將用戶端密鑰或下載的用戶端 JSON 提交至 Git、Issue 或螢幕截圖中。
- 將所有備份存放在安全的機密管理工具或加密密碼管理工具中。
- 電腦版／原生應用程式是公開 OAuth 用戶端，無法保證用戶端密鑰持續保密。仍應妥善保護密鑰，但密鑰無法取代 PKCE 或使用者同意。
- 如果密鑰外洩，請在 Google Auth Platform 中新增密鑰、刪除並更換已儲存的本機憑證、確認登入正常，然後停用並刪除舊密鑰。
- 刪除或停用 Google OAuth 用戶端，會導致該用戶端已核發的現有存取權杖與重新整理權杖失效。
- 從儀表板移除憑證只會影響本機。若要撤銷已連線帳號的授權，還必須在該 Google 帳號的第三方存取權設定中移除應用程式。若要完全停用此應用程式身分，請在 Google Auth Platform 中刪除用戶端。

## Google 官方參考資料

- [Gemini API：OAuth 驗證快速入門](https://ai.google.dev/gemini-api/docs/oauth)
- [iOS 與電腦版應用程式的 OAuth 2.0](https://developers.google.com/identity/protocols/oauth2/native-app)
- [Google Auth Platform 總覽](https://support.google.com/cloud/answer/15548748)
- [管理 OAuth 應用程式品牌](https://support.google.com/cloud/answer/15549049)
- [管理應用程式目標對象與測試使用者](https://support.google.com/cloud/answer/15549945)
- [管理應用程式資料存取權與範圍](https://support.google.com/cloud/answer/15549135)
- [管理 OAuth 用戶端與用戶端密鑰生命週期](https://support.google.com/cloud/answer/15549257)
- [OAuth 應用程式狀態與驗證總覽](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview)
- [建立及管理 Google Cloud 專案](https://cloud.google.com/resource-manager/docs/creating-managing-projects)
- [啟用及停用 Google Cloud 服務](https://cloud.google.com/service-usage/docs/enable-disable)
- [設定 Cloud Quotas API](https://cloud.google.com/docs/quotas/development-environment)
- [啟用 Cloud Monitoring API](https://cloud.google.com/monitoring/api/enable-api)
- [配額專案總覽](https://cloud.google.com/docs/quotas/quota-project)
