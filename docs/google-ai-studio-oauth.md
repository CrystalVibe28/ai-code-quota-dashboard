# Configure Google OAuth for Google AI Studio

**Languages:** [English](google-ai-studio-oauth.md) | [简体中文](google-ai-studio-oauth.zh-cn.md) | [正體中文](google-ai-studio-oauth.zh-tw.md)

This guide configures your own Google OAuth client for [AI Code Quota Dashboard](https://github.com/CrystalVibe28/ai-code-quota-dashboard). The dashboard uses that client to sign in to Google, list the Google Cloud projects available to the signed-in account, and read Google AI Studio quota and usage data.

> [!IMPORTANT]
> You need only one OAuth Client ID and Client Secret for this installation. Reuse the same pair for every Google account and every project you add. Each Google account must still be allowed by the OAuth app's Audience settings and must have permission to view its projects.

Google changes Cloud Console labels occasionally. The paths below match the current **Google Auth Platform** interface. If a label differs, use the console search for **Google Auth Platform**, **API Library**, or the named API.

## Before you begin

You need:

- A Google Account that can create or select a Google Cloud project.
- Permission to enable APIs in that project. Project Owner and Editor include the required permissions; a custom role must include `serviceusage.services.enable`.
- Every Google Account that you plan to connect. You will add these accounts as test users while the OAuth app is in Testing.

Use one Google Cloud project as the **OAuth client project**. It owns the consent configuration and OAuth client. This may also be the AI Studio project whose quota you monitor, but it does not have to be.

## 1. Create or select the OAuth client project

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Use the project selector in the top bar.
3. Select an existing project, or select **New project** / **Create project**.
4. If creating a project, enter a recognizable name such as `AI Code Quota Dashboard OAuth`, choose the organization or folder if applicable, and select **Create**.
5. Select the resulting project before continuing.

Record its **Project ID**. The Project ID is permanent after creation and is different from the project name and project number.

> [!TIP]
> A dedicated OAuth client project makes the credentials and consent settings easier to find. Using an existing AI Studio project is also valid and requires fewer API-enable steps.

## 2. Enable the required APIs

Open **APIs & Services > Library** while the OAuth client project is selected. Search for and enable each service:

| Console name | Service name | Used by the dashboard for |
| --- | --- | --- |
| Generative Language API | `generativelanguage.googleapis.com` | Listing Gemini models and registering the Gemini OAuth scope |
| Cloud Resource Manager API | `cloudresourcemanager.googleapis.com` | Listing projects visible to the signed-in account |
| Cloud Quotas API | `cloudquotas.googleapis.com` | Reading model quota limits |
| Cloud Monitoring API | `monitoring.googleapis.com` | Reading model usage metrics |

Direct API Library links:

- [Generative Language API](https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com)
- [Cloud Resource Manager API](https://console.cloud.google.com/apis/library/cloudresourcemanager.googleapis.com)
- [Cloud Quotas API](https://console.cloud.google.com/apis/library/cloudquotas.googleapis.com)
- [Cloud Monitoring API](https://console.cloud.google.com/apis/library/monitoring.googleapis.com)

Confirm that the project selector still shows the OAuth client project before selecting **Enable** on each page. Google may ask you to accept service terms or configure billing.

### When the monitored project is different

For every additional Google AI Studio project you plan to monitor, select that project in the console and make sure these APIs are enabled there as well:

- Generative Language API
- Cloud Quotas API
- Cloud Monitoring API

Cloud APIs can enforce service activation against the client project, the resource project, or both. If Google returns `SERVICE_DISABLED` or “API has not been used in project ...”, enable the named API in the project number or ID shown in that error, wait several minutes, and retry.

## 3. Register the app in Google Auth Platform

1. With the OAuth client project selected, open **Menu > Google Auth Platform > Overview**.
2. Select **Get started**. If the app is already registered, review the existing **Branding** and **Audience** pages instead.
3. Under **App information**:
   - **App name:** enter a recognizable name, such as `AI Code Quota Dashboard (Personal)`.
   - **User support email:** select an email address you control.
4. Under **Audience**, select **External**. This supports personal Google Accounts and Google Workspace accounts outside the project's organization.
5. Under **Contact information**, enter an email address you monitor for Google notices.
6. Accept the Google API Services User Data Policy acknowledgement and select **Create**.

For personal Testing use, a logo, homepage, privacy policy, terms URL, and authorized domains are normally unnecessary. If you later request verification, use public URLs on a domain you own and can verify.

## 4. Register the exact OAuth scopes

1. Open **Google Auth Platform > Data Access**.
2. Select **Add or remove scopes**.
3. Select or manually add the following exact scopes:

   ```text
   https://www.googleapis.com/auth/cloud-platform
   https://www.googleapis.com/auth/generative-language.retriever
   https://www.googleapis.com/auth/userinfo.email
   https://www.googleapis.com/auth/userinfo.profile
   ```

4. Select **Update**, then save the Data Access page if prompted.

Only scopes belonging to enabled APIs appear in the scope picker. If `generative-language.retriever` is absent, use **Manually add scopes** and verify that the Generative Language API is enabled in the OAuth client project.

The dashboard requests `cloud-platform` to read Cloud projects, quotas, and monitoring data; `generative-language.retriever` to access the Generative Language API; and the two `userinfo` scopes to identify the connected account. Do not add unrelated scopes.

<a id="test-users"></a>

## 5. Set External + Testing and add test users

1. Open **Google Auth Platform > Audience**.
2. Confirm:
   - **User type:** External
   - **Publishing status:** Testing
3. Under **Test users**, select **Add users**.
4. Enter the exact email address of every Google Account you will connect to the dashboard.
5. Select **Save**.

Repeat this step whenever you want to connect another Google account. You do **not** need another OAuth client for that account.

> [!WARNING]
> External apps in Testing allow up to 100 test users. Because this dashboard requests scopes beyond basic profile information, a test user's authorization—and its offline refresh token—expires seven days after consent. Sign in again when it expires, or review [When to publish to Production](#when-to-publish-to-production).

## 6. Create a Desktop app OAuth client

1. Open **Google Auth Platform > Clients**.
2. Select **Create client**.
3. For **Application type**, select **Desktop app**.
4. Enter a name such as `AI Code Quota Dashboard Desktop`.
5. Select **Create**.
6. On the creation dialog, immediately copy both:
   - **Client ID** (normally ends in `.apps.googleusercontent.com`)
   - **Client secret**
7. Optionally download the JSON backup. The values are under `installed.client_id` and `installed.client_secret`.

Google only displays the full client secret when it is created. If you close the dialog without saving it, add a new secret from the client details page and use that new value.

Do not choose **Web application**. The dashboard is a desktop app and listens on a random local loopback address:

```text
http://127.0.0.1:<random-port>/callback
```

Desktop clients support this redirect method without entering a fixed port or authorized redirect URI. The dashboard also uses PKCE with S256 and opens authorization in the system browser.

## 7. Save the credentials in AI Code Quota Dashboard

Choose either route:

### During first Google AI Studio provider setup

1. Open **Add provider**.
2. Select **Google AI Studio**.
3. Keep or change the display name; it is always available.
4. In the first-time OAuth setup section, paste the **Client ID** and **Client Secret** from the same Desktop app client.
5. Save the credentials.
6. Select **Sign in with Google**.
7. In the browser, choose an account listed under **Test users**, review the requested access, and approve it.
8. Return to the dashboard, choose a project, and add the provider.

### Before adding a provider

1. Open **Settings**.
2. Find the **Google OAuth credentials** section.
3. Enter the Desktop app Client ID and Client Secret, then save.
4. Return to **Add provider > Google AI Studio** and continue with Google sign-in and project selection.

For safety, saved values are not displayed and cannot be edited. To replace an invalid, deleted, or rotated credential pair, delete the saved Google OAuth credentials in Settings and enter the new pair. Deleting the local pair does not delete the OAuth client in Google Cloud or revoke grants already issued by Google.

## 8. Verify the setup

The setup is working when all of the following are true:

1. The dashboard reports that Google OAuth is configured.
2. **Sign in with Google** opens the system browser.
3. Google shows the app name configured in Branding and the expected permissions.
4. After consent, the dashboard shows the connected Google account.
5. The project selector lists active projects that account can access.
6. After selecting a project, the provider is added and quota data refreshes without an API-disabled error.

If Google displays “Google hasn't verified this app” while this is your own Testing client, verify the project name and Client ID first. Continue only when you recognize and control that OAuth client project.

## Troubleshooting

### `Error 403: access_denied`

This commonly means the selected Google Account is not allowed to use an External app in Testing. It can also mean the user declined consent.

1. Note the exact email address selected in Google's account chooser.
2. In the project that owns the Client ID, open **Google Auth Platform > Audience**.
3. Confirm **External** and **Testing**.
4. Under **Test users**, add that exact email address and save.
5. Wait several minutes for the change to propagate, then retry sign-in and approve the requested access.

For multiple accounts, add every account separately. Adding the OAuth-project owner does not automatically allow that owner's other Google accounts.

If access is still denied:

- Make sure you edited the project that owns the Client ID, not merely the AI Studio project you want to monitor.
- Check whether you selected **Cancel** or denied a required permission; retry and approve the requested scopes.
- A Google Workspace administrator can block third-party or unverified OAuth apps even when the account is a test user. Ask the administrator to review **Security > Access and data control > API controls**, or use an account permitted by that organization.
- Accounts enrolled in Advanced Protection can block most non-Google apps.
- If the project uses an **Internal** audience, accounts outside that Google Workspace organization cannot sign in; Google normally reports `org_internal`.

### `redirect_uri_mismatch`

The saved Client ID is usually the wrong application type. Create a **Desktop app** client and replace the saved credentials. Do not create a Web application client or configure a fixed redirect port.

### `invalid_client` or an incorrect Client Secret

Make sure the Client ID and Client Secret came from the same OAuth client. Because saved values cannot be viewed or edited, delete the local credentials and enter the correct pair. If the full secret was lost, add/rotate a secret on **Google Auth Platform > Clients**, then enter the new pair.

### `SERVICE_DISABLED` or “API has not been used in project”

This is an API activation problem, not a test-user problem. Open the activation link included in Google's error, confirm the project shown in the error, enable the named API, wait several minutes, and retry. Review [Enable the required APIs](#2-enable-the-required-apis).

### No projects appear after sign-in

- Confirm the signed-in account can open the project in Google Cloud Console.
- Confirm the project is active and the account has at least `resourcemanager.projects.get` permission on it.
- Enable the Cloud Resource Manager API in the OAuth client project.
- If you selected the wrong Google account, retry sign-in with the intended test user.

### Login works, then fails about a week later

This is expected for External apps in Testing that request non-basic scopes. Google expires the authorization and refresh token after seven days. Sign in again or publish the OAuth app to Production after considering the verification implications below.

## When to publish to Production

Start with **External + Testing** so only explicitly listed accounts can authorize the client.

Keep Testing when:

- You have no more than 100 test accounts.
- Reauthorizing every seven days is acceptable.
- You are still validating the configuration.

On **Google Auth Platform > Audience**, select **Publish app** when you need accounts outside the test-user list or do not want the Testing seven-day authorization lifetime. Publishing changes the status to **In production**; it does **not** verify the app.

An unverified Production app that requests sensitive or restricted scopes can still show an unverified-app warning and is subject to Google's 100-new-user cap. Complete Google's Branding and Data Access verification before distributing the OAuth client broadly or when Google indicates verification is required. Verification can require a domain you control, public application and privacy-policy pages, scope justification, and a demonstration video. Google Workspace administrators can still block a verified app.

For a personal client used only by you, do not share the Client ID/Secret pair with other users. Each user should create and configure their own OAuth client.

## Credential security and lifecycle

- Never commit the Client Secret or downloaded client JSON to Git, an issue, or a screenshot.
- Store any backup in a secure secret manager or encrypted password manager.
- A desktop/native app is a public OAuth client and cannot guarantee that a client secret remains confidential. The secret should still be protected, but it is not a substitute for PKCE or user consent.
- If the secret is exposed, add a new secret in Google Auth Platform, delete and replace the saved local credentials, verify sign-in, then disable and delete the old secret.
- Deleting or disabling the Google OAuth client causes existing access and refresh tokens issued to that client to fail.
- Removing the credentials from the dashboard is local only. To revoke a connected account's grant, also remove the app under that Google Account's third-party access settings. To retire the app identity entirely, delete the client in Google Auth Platform.

## Official Google references

- [Gemini API: Authentication with OAuth quickstart](https://ai.google.dev/gemini-api/docs/oauth)
- [OAuth 2.0 for iOS & Desktop Apps](https://developers.google.com/identity/protocols/oauth2/native-app)
- [Google Auth Platform overview](https://support.google.com/cloud/answer/15548748)
- [Manage OAuth app branding](https://support.google.com/cloud/answer/15549049)
- [Manage app audience and test users](https://support.google.com/cloud/answer/15549945)
- [Manage app data access and scopes](https://support.google.com/cloud/answer/15549135)
- [Manage OAuth clients and client-secret lifecycle](https://support.google.com/cloud/answer/15549257)
- [OAuth app state and verification overview](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview)
- [Create and manage Google Cloud projects](https://cloud.google.com/resource-manager/docs/creating-managing-projects)
- [Enable and disable Google Cloud services](https://cloud.google.com/service-usage/docs/enable-disable)
- [Set up the Cloud Quotas API](https://cloud.google.com/docs/quotas/development-environment)
- [Enable the Cloud Monitoring API](https://cloud.google.com/monitoring/api/enable-api)
- [Quota project overview](https://cloud.google.com/docs/quotas/quota-project)
