// Respond to the background script searching for Yahoo! mail tabId
browser.runtime.onMessage.addListener(() => Promise.resolve(true));
