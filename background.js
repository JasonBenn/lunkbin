const API_KEY = '...';
const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];
const SCOPES = "https://www.googleapis.com/auth/spreadsheets";

function onGAPILoad() {
    gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: DISCOVERY_DOCS,
    })
}


const formatDate = dateTimeString => chrono.parseDate(dateTimeString).toLocaleString().replace(',', "")

const formatMessage = message => {
    return `${message.subject} (${formatDate(message.dateTime)})\n${message.body}`
}

function messageCurrentTab(message) {
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, message)
    });
}

chrome.browserAction.onClicked.addListener(function (tab) {
    messageCurrentTab({messageType: "browserClicked"});
});


chrome.extension.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.messageType !== "threadsScraped") return
    const threads = request.threads;
    if (!threads || !threads.length) return

    chrome.identity.getAuthToken({interactive: true}, function (token) {
        gapi.auth.setToken({
            'access_token': token,
        });

        const todaysSheetName = `LunkBin ${(new Date()).toLocaleString()}`
        gapi.client.sheets.spreadsheets.create({
            properties: {
                title: todaysSheetName
            }
        }).then(function (createSheetResponse) {
            const spreadsheetId = JSON.parse(createSheetResponse.body).spreadsheetId
            var params = {spreadsheetId: spreadsheetId};

            const formattedThreads = threads.map(thread => {
                const messages = thread.threadMessagesData;
                const myLastMessageIndex = _.findLastIndex(messages, x => x.name !== thread.name)
                const myLastMessageDate = (myLastMessageIndex !== -1) ? formatDate(messages[myLastMessageIndex].dateTime) : ""

                // for threads where allie posted last: auto-code with "followup if needed"
                const lastMessageIsFromMe = (messages.length - 1) === myLastMessageIndex
                const categorization = lastMessageIsFromMe ? "Follow up if needed" : ""

                const [newSenderMessages, threadHistory] = _.partition(messages, x => formatDate(x.dateTime) >= myLastMessageDate)
                const lastMessage = messages[messages.length - 1];
                return [
                    thread.url,
                    thread.name,
                    thread.jobTitle,
                    formatDate(lastMessage.dateTime),
                    thread.isInMail,
                    lastMessage.subject || "",
                    newSenderMessages.map(formatMessage).join("\n\n"),
                    threadHistory.map(formatMessage).join("\n\n"),
                    categorization
                ]
            })

            var batchUpdateValuesRequestBody = {
                // The values will be parsed as if the user typed them into the UI. Numbers will stay as numbers, but
                // strings may be converted to numbers, dates, etc.
                valueInputOption: 'USER_ENTERED',
                data: [{
                    "range": `A1:I${threads.length + 1}`,
                    "majorDimension": "ROWS",
                    "values": [["URL", "Sender name", "Title", "Date sent", "Is InMail", "Subject", "Recent messages", "Thread history", "Categorization"], ...formattedThreads]
                }]
            };

            var gapiRequest = gapi.client.sheets.spreadsheets.values.batchUpdate(params, batchUpdateValuesRequestBody);
            gapiRequest.then(function (response) {
                console.log(response.result);
                sendResponse({
                    messageType: "createSpreadsheetSuccessful",
                    spreadsheetId: response.result.spreadsheetId
                });
            }, function (reason) {
                console.error('error: ' + reason.result.error.message);
                sendResponse({messageType: "createSpreadsheetFail"});
            });
        })
    })
    return true
})

