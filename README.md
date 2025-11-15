# IP Masker

IP Masker is a browser extension designed to automatically find and hide IPv4 addresses on any webpage. It's perfect for creating clean screenshots, recording screencasts, or enhancing privacy during live presentations without revealing sensitive network information.

## Key Features

-   **Automatic IP Masking**: Scans pages and replaces IP addresses with a discreet `[Masked IP]` badge.
-   **Interactive Reveal**: Click on any masked badge to temporarily view the original IP address. Click again to hide it.
-   **Whitelist Functionality**: Easily add websites where you don't want masking to occur. Supports wildcard patterns (e.g., `https://*.example.com/*`).
-   **Custom Rules**: Define your own patterns for what constitutes a "local IP" that should be masked.
-   **Simple Controls**: A clean popup allows you to quickly toggle the extension on/off or enable/disable local IP masking.
-   **Multi-Language Support**: Available in English and Polish.

## Installation (for local development)

As this extension is not yet on an official web store, you can load it manually:

1.  **Download:** Clone or download this repository as a ZIP file and extract it.
2.  **Open Extensions Page:** Open your browser's extension page.
    -   For Chrome: `chrome://extensions`
    -   For Edge: `edge://extensions`
3.  **Enable Developer Mode:** Turn on the "Developer mode" toggle, usually located in the top-right corner.
4.  **Load the Extension:** Click the "Load unpacked" button and select the directory where you extracted the files.
5.  **Done!** The IP Masker icon should now appear in your browser's toolbar.

## How to Use

-   **From the Popup**: Click the IP Masker icon in your toolbar to access the main toggles. You can quickly enable or disable the extension from here.
-   **From the Settings Page**: Click the "Settings & Whitelist" button in the popup to open the full settings page. Here you can manage your whitelist and custom IP rules.
