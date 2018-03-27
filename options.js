let m_error = document.getElementById('m_error');
let i_interval = document.getElementById('i_interval');
let m_interval = document.getElementById('m_interval');
let i_notify = document.getElementById('i_notify');
let m_notify = document.getElementById('m_notify');

browser.storage.sync.get(['interval', 'notify'])
    .then(res => {
        i_interval.value = res.interval;
        i_notify.checked = res.notify;
    });
i_interval.addEventListener('input', function() {
    browser.storage.sync.set({ interval: this.value })
        .then(() => m_interval.innerText = 'Saved ' + this.value,
            () => error => m_error.innerText = error);
});
i_notify.addEventListener('input', function() {
    browser.storage.sync.set({ notify: this.checked })
        .then(() => m_notify.innerText = (this.checked ? 'Will' : "Won't"
                ) + " notify about new emails",
            () => error => m_error.innerText = error);
});
