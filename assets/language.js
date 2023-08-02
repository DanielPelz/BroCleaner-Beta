// Get the _locales directory
chrome.runtime.getPackageDirectoryEntry(function (root) {
    root.getDirectory("_locales", { create: false }, function (localesDirEntry) {
        const reader = localesDirEntry.createReader();
        reader.readEntries(function (entries) {
            // Get the select element
            const select = document.getElementById("languageSelect");

            // Add an option for each language
            for (const entry of entries) {
                const option = document.createElement("option");
                option.value = entry.name;
                option.textContent = entry.name;
                select.appendChild(option);
            }

            // Add an event listener for change
            select.addEventListener("change", function () {
                const selectedLanguage = select.value;
                setLanguage(selectedLanguage);
                updatePageLanguage();
                // Start preloader
                getMessage("reloading_page", function (message) {
                    createLoader(message);
                    setTimeout(function() {
                        chrome.runtime.reload();
                    }, 4000);
                });
                //reload the extension

            });

            // Load the current language
            getLanguage(function (lang) {
                select.value = lang;
            });
        });
    });
});

// Function to set language
function setLanguage(lang) {
    chrome.storage.local.set({ 'language': lang });
}

// Function to get language
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

function updatePageLanguage() {
    getLanguage(function (lang) {
        fetch(`_locales/${lang}/messages.json`)
            .then(response => response.json())
            .then(messages => {
                const elements = document.querySelectorAll('[data-i18n]');
                for (const element of elements) {
                    const messageKey = element.getAttribute('data-i18n');
                    element.textContent = messages[messageKey]?.message;
                    if (element.tagName === 'INPUT') {
                        element.placeholder = messageValue;
                    } else {
                        element.textContent = messageValue;
                    }
                }
            });


    });
}

function getMessage(messageKey, callback) {
    getLanguage(function (lang) {
        fetch(`_locales/${lang}/messages.json`)
            .then(response => response.json())
            .then(messages => {
                callback(messages[messageKey]?.message);
            });
    });
}

chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (let key in changes) {
        let storageChange = changes[key];
        if (key === 'language') {
            updatePageLanguage();
        }
    }
});

document.addEventListener('DOMContentLoaded', updatePageLanguage);

