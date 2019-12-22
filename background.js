// Author: Ngo Kim Phu

// Right-click menu
browser.contextMenus.create({
    title: 'Check now',
    contexts: ['browser_action'],
    onclick: check,
});
browser.contextMenus.create({
    type: 'separator',
    contexts: ['browser_action'],
});
browser.contextMenus.create({
    title: 'Options',
    contexts: ['browser_action'],
    onclick: () => browser.runtime.openOptionsPage(),
});

function setBadge(text = '') {
    return browser.browserAction.setBadgeText({ text });
}
function setIcon(path = 'icons/yma-48.png') {
    return browser.browserAction.setIcon({ path });
}

function getYahooTab() {
    return new Promise((resolve, reject) =>
        browser.tabs.query({}).then(tabs => Promise.all(
            tabs.filter(tab => !tab.incognito)
                .sort((tabA, tabB) => tabB.lastAccessed - tabA.lastAccessed)
                .map(tab => browser.tabs.sendMessage(tab.id, null)
                    .then(found => found && resolve(tab), () => {}))
            ).then(() => reject())));
}

// Open Yahoo! mail when clicking the extension icon or the notification
(openYahooMail => {
    browser.browserAction.onClicked.addListener(openYahooMail);
    browser.notifications.onClicked.addListener(openYahooMail);
})(() => {
    setBadge();
    (createTab => {
        // switch to a Yahoo mail tab if it exists, otherwise create one
        getYahooTab()
            // check that it's not closed
            .then(tab => browser.tabs.get(tab.id)
                // set active/focused for window and for tab
                .then(tab => browser.windows.update(tab.windowId,
                        { focused: true })
                    .then(() => browser.tabs.update(tab.id, { active: true }),
                        createTab),
                    createTab),
                createTab);
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
    )(createData => browser.windows.create(createData),
        createData => browser.tabs.create(createData),
        'https://mail.yahoo.com'));
});

function onLoadSuccess(unread) {
    setIcon();
    setBadge(unread.toString());
    if (notify && unread > lastUnread) {
        audio.paused || audio.pause();
        audio.currentTime = 0;
        audio.play();
        browser.notifications.create('newEmail', {
            type: 'basic',
            title: 'Yahoo! Mail Alerter',
            message: `You have ${unread} unread emails`,
            iconUrl: 'icons/yma-48.png',
        });
    }
    lastUnread = unread;
}
function onLoadError() {
    setIcon('icons/loadfail.png');
}
function onAuthError() {
    setIcon('icons/loadfail.png');
}

var lastUnread = 0;
async function check(){
    setIcon('icons/loading.png');
    let xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://mail.yahoo.com/b/', true);
    xhr.withCredentials = true;
    xhr.responseType = 'document';
    xhr.timeout = 60000;
    xhr.ontimeout = onLoadError;
    xhr.onerror = onLoadError;
    xhr.onload = function() {
        let target;
        try {
            target = JSON.parse(this.response.scripts.nodinJsVars.text.substring(22));
        } catch(error) {
            console.error('Unexpected Yahoo mail webpage content', error);
        }

        if (target) {
            onLoadSuccess(target.unreadCount);
        } else {
            onAuthError();
        }
    };
    xhr.send();
}

// Initialization after installation
browser.storage.sync.get(['interval', 'notify', 'sound'])
    .then(res => {
        interval = res.interval;
        if (interval === undefined) {
            interval = 300;
            browser.storage.sync.set({ interval });
        } else {
            jobId = setInterval(check, interval * 1000);
            browser.storage.local.set({ jobId });
        }

        notify = res.notify;
        if (notify === undefined) {
            notify = true;
            browser.storage.sync.set({ notify });
        }

        sound = res.sound;
        if (sound === undefined || sound === 'sounds/default.wav') {
            sound = 'Default';
            browser.storage.sync.set({ sound });
        } else {
            audio = new Audio('sounds/' + sound + '.wav');
        }
    });
// Update after option changes
browser.storage.onChanged.addListener(changes => {
    // Set new interval job when interval option changes
    if (changes.interval && changes.interval.newValue != changes.interval.oldValue) {
        // Schedule new job
        jobId = setInterval(check, changes.interval.newValue * 1000);
        // Remove old job
        browser.storage.local.get('jobId')
            .then(res => {
                clearInterval(res.jobId);
                // Save new job
                browser.storage.local.set({ jobId });
            });
    }
    // Update notification preference
    if (changes.notify) {
        notify = changes.notify.newValue;
    }
    // Initialize new sound player when sound option changes
    if (changes.sound && changes.sound.newValue != changes.sound.oldValue) {
        audio = new Audio('sounds/' + changes.sound.newValue + '.wav');
    }
});

// First check after installation
check();
