const SELECTORS = {
    PROFILE_IMG: ".nav-item__profile-member-photo",

    PREVIEW_CONTAINER: ".msg-conversations-container__conversations-list",
    PREVIEW: 'li.msg-conversation-listitem',
    CLICKABLE_PREVIEW: 'a.msg-conversation-listitem__link',
    PREVIEW_NAME: "h3",
    PREVIEW_INMAIL: " .msg-conversation-card__pill",

    THREAD_CONTAINER: ".msg-thread",
    THREAD_CONTAINER_NAME: ".msg-thread .msg-entity-lockup__entity-title",
    THREAD_CONTAINER_DATE: ".msg-s-message-list__top-banner time",
    THREAD_DATE_SEPERATOR: ".msg-s-message-list__time-heading",
    HIDDEN_LOADING_SPINNER: ".msg-s-message-list__loader.hidden",
    VISIBLE_LOADING_SPINNER: ".msg-s-message-list__loader:not(.hidden)",

    THREAD_MESSAGES: '.msg-s-message-list__event',
    THREAD_MESSAGE_PROFILE_PICTURE: 'img.msg-s-event-listitem__profile-picture',
    THREAD_MESSAGE_LINK_PREVIEW: ".msg-content-preview a",

    PROFILE_LINK: "a.msg-s-message-group__profile-link",
    JOB_TITLE: ".msg-entity-lockup__entity-info",
    SUBJECT: "h3",
    BODY: ".msg-s-event-listitem__body",
    DATETIME: "time",
}

const ROOT_URL = "https://www.linkedin.com";


const waitFor = (condition, callback) => {
    if (condition()) {
        callback();
    } else {
        setTimeout(() => {
            waitFor(condition, callback);
        }, 500);
    }
}


function clickPreview(preview) {
    preview.scrollIntoView()
    $(preview).find(SELECTORS.CLICKABLE_PREVIEW)[0].click()
}


function visitMessage(preview) {
    return new Promise((resolve, reject) => {
        const myName = $(SELECTORS.PROFILE_IMG).attr('alt')

        function makeReadyToScrapeThread(preview) {
            clickPreview(preview)
            const namesMatch = $(preview).find(SELECTORS.PREVIEW_NAME).text().trim() === $(SELECTORS.THREAD_CONTAINER_NAME).text().trim()
            const spinnersHidden = $(SELECTORS.HIDDEN_LOADING_SPINNER).length > 0 && $(SELECTORS.VISIBLE_LOADING_SPINNER).length === 0
            return namesMatch && spinnersHidden
        }

        waitFor(() => makeReadyToScrapeThread(preview), () => {
            waitFor(() => $(SELECTORS.VISIBLE_LOADING_SPINNER).length === 0, () => {
                const $thread = $(SELECTORS.THREAD_CONTAINER)
                const threadPersonName = $(SELECTORS.THREAD_CONTAINER_NAME).text().trim();
                const url = ROOT_URL + $thread.find(SELECTORS.PROFILE_LINK).attr('href');
                const jobTitle = $thread.find(SELECTORS.JOB_TITLE).text().trim();
                const isInMail = !!$(preview).find(SELECTORS.PREVIEW_INMAIL).length;
                const threadMessages = $thread.find(SELECTORS.THREAD_MESSAGES);
                let mostRecentThreadDate = chrono.parseDate($(SELECTORS.THREAD_CONTAINER_DATE).text().trim())
                let mostRecentThreadMessageName = threadPersonName
                let threadMessageDate
                const threadMessagesData = threadMessages.map((i, message) => {
                    const $message = $(message)
                    const subject = $message.find(SELECTORS.SUBJECT).text().trim();
                    let body = $message.find(SELECTORS.BODY).text().trim();
                    const messageRelativeLink = $message.find(SELECTORS.THREAD_MESSAGE_LINK_PREVIEW).attr('href')
                    if (!body && messageRelativeLink) body = ROOT_URL + messageRelativeLink
                    const threadMessageName = $message.find(SELECTORS.THREAD_MESSAGE_PROFILE_PICTURE).attr('alt')
                    threadMessageDate = chrono.parseDate($message.find(SELECTORS.DATETIME).text().trim(),);
                    if (!subject && !body) return
                    if (threadMessageDate) mostRecentThreadDate = threadMessageDate
                    if (threadMessageName) mostRecentThreadMessageName = threadMessageName
                    return {dateTime: mostRecentThreadDate, subject, body, name: mostRecentThreadMessageName}
                }).filter((i, message) => message)
                const numMessages = threadMessagesData.length
                const numReplies = threadMessagesData.filter((i, message) => message.name === myName).length
                const message = {
                    name: threadPersonName,
                    url,
                    jobTitle,
                    isInMail,
                    numMessages,
                    numReplies,
                    threadMessagesData
                }
                resolve(message)
            })
        })
    })
}


const LAST_SCRAPED_DATE_KEY = 'lastScrapedDate';
const MAX_THREADS_TO_SCRAPE = 5;
const TESTING = true

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.messageType === "browserClicked") {
        let i = 0
        const threads = []
        const preview = $(SELECTORS.PREVIEW)[0]
        const firstPreviewDate = chrono.parseDate($(preview).find(SELECTORS.DATETIME).text().trim())

        function recursiveVisitThreads(preview) {
            const lastScrapedDate = chrono.parseDate(localStorage.getItem(LAST_SCRAPED_DATE_KEY)) || chrono.parseDate("2 days ago")
            const previewDate = chrono.parseDate($(preview).find(SELECTORS.DATETIME).text().trim())
            const isDoneScraping = TESTING ? i >= MAX_THREADS_TO_SCRAPE : (lastScrapedDate >= previewDate) || (i >= MAX_THREADS_TO_SCRAPE)

            if (!isDoneScraping) {
                return visitMessage(preview).then(thread => {
                    threads.push(thread)
                    i += 1
                    const nextPreview = $(preview).next()[0]
                    return recursiveVisitThreads(nextPreview)
                })
            } else {
                localStorage.setItem(LAST_SCRAPED_DATE_KEY, firstPreviewDate)
                return Promise.resolve(threads)
            }
        }

        recursiveVisitThreads(preview).then(threads => {
            console.log('done scraping! threads', threads)
            chrome.runtime.sendMessage({messageType: "threadsScraped", threads}, function (response) {
                console.log('response', response);
                if (response.messageType === "createSpreadsheetSuccessful") {
                    alert(`LunkBin done: https://docs.google.com/spreadsheets/d/${response.spreadsheetId}/edit#gid=0`)
                } else if (response.messageType === "createSpreadsheetFail") {
                    alert("LunkBin: creating spreadsheet failed")
                }
            });
        })
    }
})
