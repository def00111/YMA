// Author: Ngo Kim Phu

// Right-click menu
browser.contextMenus.create({
    title: "Check now",
    contexts: ["browser_action"],
    onclick: check,
});
browser.contextMenus.create({
    type: "separator",
    contexts: ["browser_action"],
});
browser.contextMenus.create({
    title: "Options",
    contexts: ["browser_action"],
    onclick: () => browser.runtime.openOptionsPage(),
});

function setBadge(text = '') {
    browser.browserAction.setBadgeText({ text });
}

// Open Yahoo! mail when clicking the extension icon or the notification
(openYahooMail => {
    browser.browserAction.onClicked.addListener(openYahooMail);
    browser.notifications.onClicked.addListener(openYahooMail);
})(() => (setBadge(), browser.tabs.create({ url: "https://mail.yahoo.com" })));

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
                setBadge(text);
                if (text > lastUnread) {
                    audio.paused || audio.pause();
                    audio.currentTime = 0;
                    audio.play();
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
browser.storage.sync.get(['interval', 'sound'])
    .then(res => {
        interval = res.interval;
        if (interval === undefined) {
            interval = 300;
            browser.storage.sync.set({ interval });
        } else {
            jobId = setInterval(check, interval * 1000);
            browser.storage.sync.set({ jobId });
        }

        sound = res.sound;
        if (sound === undefined) {
            sound = 'sounds/default.wav';
            browser.storage.sync.set({ sound });
        } else {
            audio = new Audio(sound);
        }
    });
// Update after option changes
browser.storage.onChanged.addListener(changes => {
    // Set new interval job when interval option changes
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
    // Initialize new sound player when sound option changes
    if (changes.sound && changes.sound.newValue != changes.sound.oldValue) {
        audio = new Audio(changes.sound.newValue);
    }
});

// First check after installation
check();
