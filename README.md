# Zaptip

Tip Bitcoin to any GitHub developer over Lightning, without leaving the page.

## How it works

Zaptip detects Lightning addresses on GitHub profiles and repo About sections 
and injects a Zap button. Click it, pick an amount, send sats.

## Try it out

Visit [github.com/Camillarhi](https://github.com/Camillarhi) or the 
[Zaptip repo](https://github.com/Camillarhi/zaptip) with the extension 
installed and you will see a Zap button.

## Setup

### As a tipper
1. Clone this repo
2. Go to `chrome://extensions`
3. Enable Developer Mode
4. Click Load unpacked and select the project folder
5. Visit any GitHub profile or repo with a Lightning address and click Zap

### As a developer (to receive tips)
Add your Lightning address to your GitHub bio or repo About section.
Example: `Tips: you@wallet.com`

That's it. Anyone with Zaptip installed will see a Zap button on your profile.

## Payment
- If you have a WebLN wallet like Alby installed, it handles the payment automatically
- Otherwise a QR code appears that you can scan with any Lightning wallet

## Stack
Vanilla JS, Manifest V3, no backend, no build step