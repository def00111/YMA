// Author: Ngo Kim Phu

// Open Yahoo! mail when clicking the extension icon or the notification
(openYahooMail => {
    browser.browserAction.onClicked.addListener(openYahooMail);
    browser.notifications.onClicked.addListener(openYahooMail);
})(() => (check(), browser.tabs.create({ url: "https://mail.yahoo.com" })));


var lastUnread = 0;
async function check(){
    browser.browserAction.setIcon({
        path: "icons/loading.png",
    });
    let xhr = new XMLHttpRequest();
    xhr.open('GET', "https://mail.yahoo.com/neo/b/launch", true);
    xhr.withCredentials = true;
    xhr.responseType = 'document';
    xhr.onload = function() {
        browser.browserAction.setIcon({
            path: "icons/yma-48.png",
        })
            .then(() => {
                text = this.responseXML.title.match(/ (?:\((\d+)\) )?-/)[1] || "";
                browser.browserAction.setBadgeText({ text });
                if (text > lastUnread) {
                    browser.notifications.create("newEmail", {
                        type: 'basic',
                        title: 'Yahoo! Mail Alerter',
                        message: `You have ${text} unread emails`,
                        iconUrl: 'icons/yma-48.png',
                    });
                }
                lastUnread = +text;
            });
    };
    xhr.send();
}

// Initialization after installation
browser.storage.sync.get('interval')
    .then(res => {
        interval = res.interval;
        if (interval === undefined) {
            interval = 300;
            browser.storage.sync.set({interval});
        } else {
            jobId = setInterval(check, interval * 1000);
            browser.storage.sync.set({jobId});
        }
    });
// Set new interval job when option changes
browser.storage.onChanged.addListener(changes => {
    if (changes.interval && changes.interval.newValue != changes.interval.oldValue) {
        // Schedule new job
        jobId = setInterval(check, changes.interval.newValue * 1000);
        // Remove old job
        browser.storage.sync.get('jobId')
            .then(res => {
                clearInterval(res.jobId);
                // Save new job
                browser.storage.sync.set({jobId});
            });
    }
});

// First check after installation
check();
