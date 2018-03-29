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
})(() => {
    setBadge();
    (createTab => {
        // switch to existing Yahoo mail tab (opened by YMA)
        if (typeof tabId !== 'undefined') {
            // check that it's not closed
            browser.tabs.get(tabId)
                .then(
                    // set active/focused for tab and for window
                    tab => browser.tabs.update(tabId, { active: true })
                        .then(
                            tab => browser.windows.update(windowId,
                                { focused: true }),
                            createTab),
                    createTab,
                );
        } else {
            createTab();
        }
    })(() => ((createWin, createTab, url) =>
        browser.windows.getCurrent()
            .then(win => win.incognito
                    // open Yahoo! mail in a non-private window
                    ? browser.windows.getAll({ windowTypes: ['normal'] })
                        .then(wins => (
                                wins = wins.filter(win => !win.incognito)
                            ).length == 1
                                // switch to the only non-private window
                                ? (createTab({ url, windowId: wins[0].id }),
                                    browser.windows.update(wins[0].id,
                                        { focused: true }))
                                // or create new window
                                : createWin({ url }))
                    : createTab({ url }),
                createTab.bind({ url }))
    )(createData => browser.windows.create(createData)
            .then(win => (tabId = win.tabs[0].id, windowId = win.id)),
        createData => browser.tabs.create(createData)
            .then(tab => (tabId = tab.id, windowId = tab.windowId)),
        "https://mail.yahoo.com"));
});

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
                if (notify && text > lastUnread) {
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
browser.storage.sync.get(['interval', 'sound', 'notify'])
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

        notify = res.notify;
        if (notify === undefined) {
            notify = true;
            browser.storage.sync.set({ notify });
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
    // Update notification preference
    if (changes.notify) {
        notify = changes.notify.newValue;
    }
});

// First check after installation
check();
