# LunkBin: outsource your inbox

LinkedIn, like most social networks, does an abysmal job of filtering out harrassment. Reading through your inbox to find the 3% of messages that make it worth it can be demoralizing and exhausting: you're panning for gold in a stream of trolls, dumb questions, and unwanted advances.

LunkBin helps you outsource this problem without having to share your login credentials. Running this Chrome extension will export all recent messages to a Google Sheet that is safe to share with a friend or an assistant. If they can simply tell you which 3% of messages are worth your attention, you can safely ignore the rest.

Because configuring this extension involves getting your own Google Sheets API key, your data is also kept private.

## Usage

[![Watch the demo](https://cdn.loom.com/sessions/thumbnails/8ff596f1eb1a44258d3248a174911231-with-play.gif)](https://www.loom.com/share/8ff596f1eb1a44258d3248a174911231)

1. Navigate to [https://www.linkedin.com/messaging/](https://www.linkedin.com/messaging/).
1. Wait for the page to finish loading.
1. Click the LunkBin button.

## Installation

1. Get a Google Sheets API key and plug it in to `background.js` where it says `API_KEY`. You may also need to get an OAuth key. If there's interest, I can simplify this spelunking process with a more user-friendly OAuth flow - email me at jasoncbenn@gmail.com
1. Download and unzip this repo.
1. Go to [chrome://extensions/](chrome://extensions/), turn on "Developer mode", click "Load unpacked", and select the LunkBin directory.

---

### License
GPL v3
