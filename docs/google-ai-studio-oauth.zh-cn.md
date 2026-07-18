# 为 Google AI Studio 配置 Google OAuth

**语言：** [English](google-ai-studio-oauth.md) | [简体中文](google-ai-studio-oauth.zh-cn.md) | [正體中文](google-ai-studio-oauth.zh-tw.md)

本指南将为 [AI Code Quota Dashboard](https://github.com/CrystalVibe28/ai-code-quota-dashboard) 配置您自己的 Google OAuth 客户端。仪表板使用该客户端登录 Google、列出已登录账号可访问的 Google Cloud 项目，并读取 Google AI Studio 的配额和用量数据。

> [!IMPORTANT]
> 本次安装只需要一个 OAuth 客户端 ID 和客户端密钥。您添加的所有 Google 账号和项目都应重复使用同一组凭据。每个 Google 账号仍须获得 OAuth 应用“受众”设置的许可，并且必须拥有查看其项目的权限。

Google 偶尔会更改 Cloud Console 中的标签。下列路径与当前的 **Google Auth Platform** 界面一致。如果某个标签不同，请在控制台中搜索 **Google Auth Platform**、**API 库**或指定的 API。

## 开始之前

您需要：

- 一个可以创建或选择 Google Cloud 项目的 Google 账号。
- 在该项目中启用 API 的权限。Project Owner 和 Editor 角色包含所需权限；自定义角色必须包含 `serviceusage.services.enable`。
- 您计划连接的每个 Google 账号。当 OAuth 应用处于“测试”状态时，您需要将这些账号添加为测试用户。

选择一个 Google Cloud 项目作为 **OAuth 客户端项目**。该项目承载 OAuth 同意配置和 OAuth 客户端。它也可以是您要监控配额的 AI Studio 项目，但并非必须如此。

## 1. 创建或选择 OAuth 客户端项目

1. 打开 [Google Cloud Console](https://console.cloud.google.com/)。
2. 使用顶部栏中的项目选择器。
3. 选择现有项目，或选择 **新建项目** / **创建项目**。
4. 如果要创建项目，请输入便于识别的名称，例如 `AI Code Quota Dashboard OAuth`；如果适用，请选择组织或文件夹，然后选择 **创建**。
5. 继续之前，请选择新建的项目。

记录其 **项目 ID**。项目 ID 创建后将永久不变，并且与项目名称和项目编号不同。

> [!TIP]
> 使用专用的 OAuth 客户端项目可以更容易找到凭据和 OAuth 同意设置。使用现有 AI Studio 项目也有效，并且需要启用的 API 更少。

## 2. 启用所需的 API

选中 OAuth 客户端项目后，打开 **API 和服务 > 库**。搜索并启用下列各项服务：

| 控制台名称 | 服务名称 | 仪表板用途 |
| --- | --- | --- |
| Generative Language API | `generativelanguage.googleapis.com` | 列出 Gemini 模型并注册 Gemini OAuth 权限范围 |
| Cloud Resource Manager API | `cloudresourcemanager.googleapis.com` | 列出已登录账号可见的项目 |
| Cloud Quotas API | `cloudquotas.googleapis.com` | 读取模型配额限制 |
| Cloud Monitoring API | `monitoring.googleapis.com` | 读取模型用量指标 |

API 库直达链接：

- [Generative Language API](https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com)
- [Cloud Resource Manager API](https://console.cloud.google.com/apis/library/cloudresourcemanager.googleapis.com)
- [Cloud Quotas API](https://console.cloud.google.com/apis/library/cloudquotas.googleapis.com)
- [Cloud Monitoring API](https://console.cloud.google.com/apis/library/monitoring.googleapis.com)

在每个页面上选择 **启用** 之前，请确认项目选择器仍显示 OAuth 客户端项目。Google 可能会要求您接受服务条款或配置结算账号。

### 被监控项目不同时

对于您计划监控的每个其他 Google AI Studio 项目，请在控制台中分别选择该项目，并确保其中也启用了以下 API：

- Generative Language API
- Cloud Quotas API
- Cloud Monitoring API

Cloud API 可能会针对客户端项目、资源项目或两者强制执行服务启用要求。如果 Google 返回 `SERVICE_DISABLED` 或“API has not been used in project ...”，请在该错误所示的项目编号或 ID 中启用指定的 API，等待几分钟后再重试。

## 3. 在 Google Auth Platform 中注册应用

1. 选中 OAuth 客户端项目后，打开 **菜单 > Google Auth Platform > 概览**。
2. 选择 **开始**。如果应用已经注册，请改为检查现有的 **品牌**和**受众**页面。
3. 在**应用信息**下：
   - **应用名称：** 输入便于识别的名称，例如 `AI Code Quota Dashboard (Personal)`。
   - **用户支持电子邮件：** 选择您可以控制的电子邮件地址。
4. 在**受众**下选择**外部**。这支持个人 Google 账号以及项目组织之外的 Google Workspace 账号。
5. 在**联系信息**下，输入您会查看的电子邮件地址，以接收 Google 通知。
6. 确认并接受 Google API 服务用户数据政策，然后选择**创建**。

对于个人测试用途，通常不需要徽标、首页、隐私政策、条款 URL 和授权域名。如果您以后申请验证，请使用您拥有且可以验证的域名上的公开 URL。

## 4. 注册确切的 OAuth 权限范围

1. 打开 **Google Auth Platform > 数据访问**。
2. 选择**添加或移除权限范围**。
3. 选择或手动添加以下确切的权限范围：

   ```text
   https://www.googleapis.com/auth/cloud-platform
   https://www.googleapis.com/auth/generative-language.retriever
   https://www.googleapis.com/auth/userinfo.email
   https://www.googleapis.com/auth/userinfo.profile
   ```

4. 选择**更新**，然后在系统提示时保存“数据访问”页面。

只有属于已启用 API 的权限范围才会显示在权限范围选择器中。如果其中没有 `generative-language.retriever`，请使用**手动添加权限范围**，并确认 OAuth 客户端项目中已启用 Generative Language API。

仪表板请求 `cloud-platform`，用于读取 Cloud 项目、配额和监控数据；请求 `generative-language.retriever`，用于访问 Generative Language API；并请求两个 `userinfo` 权限范围，用于识别已连接的账号。请勿添加无关的权限范围。

<a id="test-users"></a>

## 5. 设置“外部 + 测试”并添加测试用户

1. 打开 **Google Auth Platform > 受众**。
2. 确认：
   - **用户类型：** 外部
   - **发布状态：** 测试
3. 在**测试用户**下选择**添加用户**。
4. 输入您将连接到仪表板的每个 Google 账号的确切电子邮件地址。
5. 选择**保存**。

每当您要连接另一个 Google 账号时，请重复此步骤。您**不需要**为该账号创建另一个 OAuth 客户端。

> [!WARNING]
> 处于“测试”状态的外部应用最多允许 100 个测试用户。由于此仪表板请求的权限范围超出了基本个人资料信息，测试用户的授权及其离线刷新令牌会在授权同意七天后失效。失效后请重新登录，或查看[何时发布到生产环境](#何时发布到生产环境)。

## 6. 创建桌面应用 OAuth 客户端

1. 打开 **Google Auth Platform > 客户端**。
2. 选择**创建客户端**。
3. 在**应用类型**中选择**桌面应用**。
4. 输入名称，例如 `AI Code Quota Dashboard Desktop`。
5. 选择**创建**。
6. 在创建对话框中，立即复制以下两项：
   - **客户端 ID**（通常以 `.apps.googleusercontent.com` 结尾）
   - **客户端密钥**
7. 您也可以选择下载 JSON 备份。这些值位于 `installed.client_id` 和 `installed.client_secret` 下。

Google 只会在创建客户端密钥时显示完整密钥。如果您在没有保存的情况下关闭对话框，请从客户端详情页面添加新密钥，并使用该新值。

请勿选择 **Web 应用**。仪表板是桌面应用，会监听随机的本地环回地址：

```text
http://127.0.0.1:<random-port>/callback
```

桌面客户端支持此重定向方式，无需输入固定端口或授权重定向 URI。仪表板还使用采用 S256 的 PKCE，并在系统浏览器中打开授权页面。

## 7. 在 AI Code Quota Dashboard 中保存凭据

选择以下任一方式：

### 首次设置 Google AI Studio 提供商时

1. 打开**添加提供商**。
2. 选择 **Google AI Studio**。
3. 保留或更改显示名称；该字段始终可用。
4. 在首次 OAuth 设置区域中，粘贴来自同一个桌面应用客户端的**客户端 ID** 和**客户端密钥**。
5. 保存凭据。
6. 选择**使用 Google 登录**。
7. 在浏览器中选择已列入**测试用户**的账号，检查所请求的访问权限并批准。
8. 返回仪表板，选择一个项目，然后添加提供商。

### 添加提供商之前

1. 打开**设置**。
2. 找到 **Google OAuth 凭据**区域。
3. 输入桌面应用的客户端 ID 和客户端密钥，然后保存。
4. 返回**添加提供商 > Google AI Studio**，继续完成 Google 登录和项目选择。

为了安全起见，已保存的值不会显示，也无法编辑。要替换无效、已删除或已轮换的凭据对，请在“设置”中删除已保存的 Google OAuth 凭据，然后输入新的一对。在本地删除凭据对不会删除 Google Cloud 中的 OAuth 客户端，也不会撤销 Google 已发出的授权。

## 8. 验证设置

同时满足以下所有条件时，表示设置正常：

1. 仪表板报告 Google OAuth 已配置。
2. **使用 Google 登录**会打开系统浏览器。
3. Google 显示在“品牌”中配置的应用名称和预期权限。
4. 同意后，仪表板显示已连接的 Google 账号。
5. 项目选择器列出该账号可以访问的活跃项目。
6. 选择项目后，提供商成功添加，且配额数据刷新时没有 API 未启用错误。

如果您自己的“测试”客户端显示“Google hasn't verified this app”，请先验证项目名称和客户端 ID。只有当您认识并控制该 OAuth 客户端项目时，才应继续。

## 问题排查

### `Error 403: access_denied`

这通常意味着所选 Google 账号无权使用处于“测试”状态的外部应用，也可能意味着用户拒绝了授权请求。

1. 记下在 Google 账号选择器中选中的确切电子邮件地址。
2. 在拥有该客户端 ID 的项目中，打开 **Google Auth Platform > 受众**。
3. 确认已选择**外部**和**测试**。
4. 在**测试用户**下添加该确切电子邮件地址并保存。
5. 等待几分钟让更改生效，然后重试登录并批准所请求的访问权限。

如果使用多个账号，请分别添加每个账号。添加 OAuth 项目所有者，并不会自动允许该所有者的其他 Google 账号。

如果仍然拒绝访问：

- 确保您编辑的是拥有客户端 ID 的项目，而不只是您要监控的 AI Studio 项目。
- 检查您是否选择了**取消**或拒绝了必要权限；请重试并批准所请求的权限范围。
- 即使账号是测试用户，Google Workspace 管理员仍可阻止第三方或未经验证的 OAuth 应用。请让管理员检查**安全性 > 访问权限和数据控制 > API 控件**，或使用该组织允许的账号。
- 已加入“高级保护”的账号可能会阻止大多数非 Google 应用。
- 如果项目使用**内部**受众，则该 Google Workspace 组织之外的账号无法登录；Google 通常会报告 `org_internal`。

### `redirect_uri_mismatch`

保存的客户端 ID 通常属于错误的应用类型。请创建**桌面应用**客户端并替换已保存的凭据。请勿创建 Web 应用客户端或配置固定的重定向端口。

### `invalid_client` 或客户端密钥不正确

请确保客户端 ID 和客户端密钥来自同一个 OAuth 客户端。由于已保存的值无法查看或编辑，请删除本地凭据并输入正确的一对。如果完整密钥已经丢失，请在 **Google Auth Platform > 客户端**中添加或轮换密钥，然后输入新的一对。

### `SERVICE_DISABLED` 或“API has not been used in project”

这是 API 启用问题，不是测试用户问题。打开 Google 错误中包含的启用链接，确认错误中显示的项目，启用指定的 API，等待几分钟后再重试。请查看[启用所需的 API](#2-启用所需的-api)。

### 登录后没有显示任何项目

- 确认已登录的账号可以在 Google Cloud Console 中打开该项目。
- 确认项目处于活跃状态，且该账号至少拥有项目的 `resourcemanager.projects.get` 权限。
- 在 OAuth 客户端项目中启用 Cloud Resource Manager API。
- 如果您选择了错误的 Google 账号，请使用预期的测试用户重试登录。

### 登录正常，但大约一周后失败

对于处于“测试”状态且请求非基本权限范围的外部应用，这是预期行为。Google 会在七天后让授权和刷新令牌失效。请重新登录；或者在考虑下面所述的验证影响后，将 OAuth 应用发布到生产环境。

## 何时发布到生产环境

请从**外部 + 测试**开始，以便只有明确列出的账号才能授权客户端。

在以下情况下保留“测试”状态：

- 测试账号不超过 100 个。
- 可以接受每七天重新授权一次。
- 您仍在验证配置。

当您需要测试用户列表以外的账号，或不希望受到“测试”状态的七天授权有效期限制时，请在 **Google Auth Platform > 受众**中选择**发布应用**。发布会将状态更改为**生产环境**；它**不会**验证应用。

请求敏感或受限权限范围的未验证生产应用仍可能显示“未经验证的应用”警告，并受到 Google 的 100 个新用户上限。在广泛分发 OAuth 客户端之前，或当 Google 表示需要验证时，请完成 Google 的“品牌”和“数据访问”验证。验证可能需要您控制的域名、公开的应用页面和隐私政策页面、权限范围说明以及演示视频。Google Workspace 管理员仍可阻止已验证的应用。

对于仅供您个人使用的客户端，请勿与其他用户分享客户端 ID/密钥对。每位用户都应创建并配置自己的 OAuth 客户端。

## 凭据安全和生命周期

- 切勿将客户端密钥或下载的客户端 JSON 提交到 Git、粘贴到 Issue 中或包含在截图中。
- 将所有备份存放在安全的密钥管理器或加密的密码管理器中。
- 桌面/原生应用是公共 OAuth 客户端，无法保证客户端密钥始终保密。仍应保护该密钥，但它不能替代 PKCE 或用户同意。
- 如果密钥泄露，请在 Google Auth Platform 中添加新密钥，删除并替换已保存的本地凭据，验证登录，然后停用并删除旧密钥。
- 删除或停用 Google OAuth 客户端，会使已向该客户端发出的现有访问令牌和刷新令牌失效。
- 从仪表板中移除凭据只会影响本地。要撤销已连接账号的授权，还需要在该 Google 账号的第三方访问权限设置中移除应用。要彻底停用该应用身份，请在 Google Auth Platform 中删除客户端。

## Google 官方参考资料

- [Gemini API：OAuth 身份验证快速入门](https://ai.google.dev/gemini-api/docs/oauth)
- [适用于 iOS 和桌面应用的 OAuth 2.0](https://developers.google.com/identity/protocols/oauth2/native-app)
- [Google Auth Platform 概览](https://support.google.com/cloud/answer/15548748)
- [管理 OAuth 应用品牌](https://support.google.com/cloud/answer/15549049)
- [管理应用受众和测试用户](https://support.google.com/cloud/answer/15549945)
- [管理应用数据访问权限和权限范围](https://support.google.com/cloud/answer/15549135)
- [管理 OAuth 客户端和客户端密钥生命周期](https://support.google.com/cloud/answer/15549257)
- [OAuth 应用状态和验证概览](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview)
- [创建和管理 Google Cloud 项目](https://cloud.google.com/resource-manager/docs/creating-managing-projects)
- [启用和停用 Google Cloud 服务](https://cloud.google.com/service-usage/docs/enable-disable)
- [设置 Cloud Quotas API](https://cloud.google.com/docs/quotas/development-environment)
- [启用 Cloud Monitoring API](https://cloud.google.com/monitoring/api/enable-api)
- [配额项目概览](https://cloud.google.com/docs/quotas/quota-project)
