# ECHO AI OS

ECHO is a Windows desktop companion with a public web preview, a connected full dashboard, an optional AI chat service, and user-controlled local routines.

## What it does

- Shows a time-aware greeting, today's priorities, and a live clock.
- Saves tasks on the current device. Optional due-time reminders run while the widget is open.
- Offers an optional 25-minute focus timer and opt-in desktop notifications.
- Provides a warm AI chat when connected to the separately hosted API. Provider credentials stay on that backend.
- Keeps chat history on-device only when the user enables that setting.
- Opens a full-size dashboard from the widget; priorities, focus sessions, and preferences are shared between both views.

## Publish the web preview

1. In the GitHub repository, open **Settings > Pages** and set the build source to **GitHub Actions**.
2. Run the **Deploy ECHO web widget** workflow, or merge a change to `main` under `echo-desktop-widget/`.
3. The site will be available at `https://zero143zapp-design.github.io/alpha/`. The full dashboard is at `https://zero143zapp-design.github.io/alpha/dashboard.html`.

The workflow accepts the repository Actions variable `ECHO_API_URL`. Set it to the deployed API base URL to preconfigure AI chat in the web version. Users may also enter an API URL in Companion settings.

## Enable hosted AI chat

The repository includes a small OpenAI-compatible API service. To deploy it:

1. Create a Render web service from this repository using the included `render.yaml` Blueprint.
2. In Render, set `OPENAI_API_KEY` to a key from the AI provider you choose. Configure `OPENAI_BASE_URL` and `OPENAI_MODEL` if using a compatible provider other than OpenAI.
3. Copy the service URL and set it as the GitHub repository Actions variable `ECHO_API_URL`. Re-run **Deploy ECHO web widget**.
4. Copy the generated `ECHO_ACCESS_CODE` from Render's environment settings. In ECHO, open **Companion settings**, enter the API URL and access code, and save.

The API checks the browser origin, requires the generated access code, limits requests and message sizes, and sends chat messages to the configured AI provider. Do not put provider API keys into the webpage or the repository. The free Render service may sleep while idle. Provider usage may incur charges.

## Build and download the Windows widget

The Windows release workflow builds a portable, self-contained x64 desktop app. Create and push a version tag to publish a GitHub Release:

```powershell
git tag v1.0.0
git push origin v1.0.0
```

Download `ECHO-Widget-Windows-x64.zip` from the release, extract it, and run `EchoWidget.Desktop.exe`. The widget opens as a topmost desktop window. Microsoft Edge WebView2 Runtime is required; it is preinstalled on most current Windows systems. Press Escape or use the close control to exit.

## Privacy and limits

Tasks and preferences are stored in the browser profile on the current device. Chat history is not persisted unless the user enables **Remember this chat on this device**. When AI chat is used, the conversation is sent through the configured ECHO API to the selected provider. Reminders require explicit notification permission and run only while the widget is open; **Quiet reminders** suppress notifications.
