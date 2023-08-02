function getLanguage(callback) {
    chrome.storage.local.get('language', function (data) {
        if (data.language) {
            callback(data.language);
        } else {
            setLanguage('en');
            callback('en');
        }
    });
}

// Function to get message
function getMessage(messageKey, callback) {
    getLanguage(function (lang) {
        fetch(`_locales/${lang}/messages.json`)
            .then(response => response.json())
            .then(messages => {
                callback(messages[messageKey]?.message);
            });
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.command === "clearCache") {
        var millisecondsPerDay = 1000 * 60 * 60 * 24;
        var oneDayAgo = (new Date()).getTime() - millisecondsPerDay;

        chrome.browsingData.removeCache({
            "since": oneDayAgo
        }, function () {
            chrome.storage.local.set({ lastCleared: new Date().toISOString() }, function () {
                getMessage("status_clear_cache", function (message) {
                    sendResponse({ status: message });

                    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                        chrome.tabs.reload(tabs[0].id);
                    });
                });
            });
        });
    } else if (request.command === "scheduleClearing") {
        chrome.storage.local.get(['autoClearTime'], function (data) {
            var autoClearTime = data.autoClearTime || 24;

            chrome.alarms.create('clearCache', {
                delayInMinutes: 60 * autoClearTime,
                periodInMinutes: 60 * autoClearTime
            });

            chrome.storage.local.set({ isScheduled: true }, function () {
                getMessage("start_auto_clear", function (message) {
                    sendResponse({ status: message });
                });
            });
        });
    } else if (request.command === "toggleSchedule") {
        chrome.storage.local.get(['isScheduled'], function (data) {
            var isScheduled = !data.isScheduled;
            chrome.storage.local.set({ isScheduled: isScheduled }, function () {
                if (isScheduled) {
                    chrome.storage.local.set({ autoClearTime: request.time }, function () {
                        chrome.alarms.create('clearCache', {
                            delayInMinutes: 60 * request.time,
                            periodInMinutes: 60 * request.time
                        });
                    });
                } else {
                    chrome.alarms.clear('clearCache');
                }
                getMessage(isScheduled ? "start_auto_clear" : "stop_auto_clear", function (message) {
                    sendResponse({ status: message });
                });
            });
        });

    } else if (request.command === "setAutoClearTime") {
        chrome.storage.local.set({ autoClearTime: request.time }, function () {
            getMessage("auto_clear_set", function (message) {
                sendResponse({ status: message });
            });
        });
    } else if (request.command === "toggleDevMode") {
        chrome.storage.local.get(['isDevMode'], function (data) {
            var isDevMode = !data.isDevMode;
            chrome.storage.local.set({ isDevMode: isDevMode }, function () {
                if (isDevMode) {
                    chrome.alarms.create('devClearCache', {
                        delayInMinutes: 1,
                        periodInMinutes: 1
                    });
                } else {
                    chrome.alarms.clear('devClearCache');
                }
                getMessage(isDevMode ? "dev_mode_on" : "dev_mode_off", function (message) {
                    sendResponse({ status: message });
                });
            });
        });
    } else if (request.command === "toggleDarkmode") {
        chrome.storage.local.get(['isDevMode'], function (data) {
            var isDevMode = !data.isDevMode;
            chrome.storage.local.set({ isDevMode: isDevMode }, function () {
                getMessage(isDevMode ? "dark_mode_on" : "dark_mode_off", function (message) {
                    sendResponse({ status: message });
                });
            });
        });
    } else if (request.command === "removeCookie") {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            let url = tabs[0].url;
            let id = tabs[0].id;
            if (request && request.cookie) {
                chrome.cookies.remove({ url: url, name: request.cookie.name }, function () {
                    getMessage("status_cookies_removed", function (message) {
                        sendResponse({ status: message });
                        chrome.tabs.reload(id);
                    });
                });
            } else {
                getMessage("invalid_request", function (message) {
                    sendResponse({ status: message });
                });
            }
        });
        return true;
    } else if (request.command === "getHistory") {
        chrome.history.search({ text: '', maxResults: 100 }, function (results) {
            getMessage("successful_search", function (message) {
                sendResponse({ status: message, results: results });
            });
        });
        return true;
    } else if (request.command === "clearHistory") {
        var millisecondsPerWeek = 1000 * 60 * 60 * 24 * 7;
        var oneWeekAgo = (new Date()).getTime() - millisecondsPerWeek;
        chrome.browsingData.remove({
            "since": oneWeekAgo
        }, {
            "history": true
        }, function () {
            getMessage("status_clear_history", function (message) {
                sendResponse({ status: message });
            });
        });
    }
    return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "clearCache" || alarm.name === "devClearCache") {
        var millisecondsPerDay = 1000 * 60 * 60 * 24;
        var oneDayAgo = (new Date()).getTime() - millisecondsPerDay;

        chrome.browsingData.removeCache({
            "since": oneDayAgo
        }, function () {
            chrome.storage.local.set({ lastCleared: new Date().toISOString() }, function () {
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    chrome.tabs.reload(tabs[0].id);
                });
            });
        });
    }
});
