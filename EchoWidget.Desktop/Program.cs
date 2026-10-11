using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using System.Runtime.InteropServices;

namespace EchoWidget.Desktop;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        ApplicationConfiguration.Initialize();
        Application.Run(new WidgetWindow());
    }
}

internal sealed class WidgetWindow : Form
{
    private const int WmNcLButtonDown = 0x00A1;
    private const int HtCaption = 0x0002;

    private readonly WebView2 browser = new() { Dock = DockStyle.Fill };

    [DllImport("user32.dll")]
    private static extern bool ReleaseCapture();

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    private static extern IntPtr SendMessage(IntPtr handle, int message, IntPtr wParam, IntPtr lParam);

    public WidgetWindow()
    {
        FormBorderStyle = FormBorderStyle.None;
        ShowInTaskbar = true;
        StartPosition = FormStartPosition.Manual;
        TopMost = true;
        Text = "ECHO AI OS";
        Size = new Size(390, 700);
        BackColor = Color.FromArgb(8, 19, 31);
        KeyPreview = true;

        var bounds = Screen.PrimaryScreen?.WorkingArea ?? Screen.GetWorkingArea(Point.Empty);
        Location = new Point(bounds.Right - Width - 24, bounds.Bottom - Height - 24);
        Controls.Add(browser);
        Load += LoadWidget;
        KeyDown += (_, args) =>
        {
            if (args.KeyCode == Keys.Escape) Close();
        };
    }

    private async void LoadWidget(object? sender, EventArgs e)
    {
        try
        {
            var dataDirectory = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "ECHO", "WebView2");
            var environment = await CoreWebView2Environment.CreateAsync(null, dataDirectory);
            await browser.EnsureCoreWebView2Async(environment);
            browser.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            browser.CoreWebView2.Settings.IsStatusBarEnabled = false;
            browser.CoreWebView2.Settings.IsZoomControlEnabled = false;
            browser.CoreWebView2.WebMessageReceived += HandleWebMessage;
            browser.CoreWebView2.SetVirtualHostNameToFolderMapping(
                "echo.local",
                Path.Combine(AppContext.BaseDirectory, "echo-desktop-widget"),
                CoreWebView2HostResourceAccessKind.Allow);
            await browser.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(
                "window.ECHO_DESKTOP_HOST = true; document.documentElement.classList.add('desktop-shell');");
            browser.Source = new Uri("https://echo.local/index.html");
        }
        catch (Exception error)
        {
            MessageBox.Show(
                this,
                $"ECHO could not start its embedded browser. Install the Microsoft Edge WebView2 Runtime and try again.\n\n{error.Message}",
                "ECHO AI OS",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            Close();
        }
    }

    private void HandleWebMessage(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        var message = e.TryGetWebMessageAsString();
        if (message == "close")
        {
            Close();
        }
        else if (message == "dashboard")
        {
            OpenDashboard();
        }
        else if (message == "widget")
        {
            OpenWidget();
        }
        else if (message == "minimize")
        {
            WindowState = FormWindowState.Minimized;
        }
        else if (message == "drag")
        {
            ReleaseCapture();
            SendMessage(Handle, WmNcLButtonDown, (IntPtr)HtCaption, IntPtr.Zero);
        }
    }

    private void OpenDashboard()
    {
        var bounds = Screen.PrimaryScreen?.WorkingArea ?? Screen.GetWorkingArea(Point.Empty);
        FormBorderStyle = FormBorderStyle.Sizable;
        MinimizeBox = true;
        MaximizeBox = true;
        Text = "ECHO Companion Desk";
        Size = new Size(Math.Min(1180, bounds.Width - 40), Math.Min(820, bounds.Height - 40));
        Location = new Point(bounds.Left + (bounds.Width - Width) / 2, bounds.Top + (bounds.Height - Height) / 2);
        TopMost = false;
        WindowState = FormWindowState.Normal;
        browser.Source = new Uri("https://echo.local/dashboard.html");
    }

    private void OpenWidget()
    {
        var bounds = Screen.PrimaryScreen?.WorkingArea ?? Screen.GetWorkingArea(Point.Empty);
        FormBorderStyle = FormBorderStyle.None;
        MinimizeBox = false;
        MaximizeBox = false;
        Text = "ECHO AI OS";
        Size = new Size(390, Math.Min(700, bounds.Height - 24));
        Location = new Point(bounds.Right - Width - 24, bounds.Bottom - Height - 24);
        TopMost = true;
        WindowState = FormWindowState.Normal;
        browser.Source = new Uri("https://echo.local/index.html");
    }
}
