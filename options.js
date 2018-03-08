let i_interval = document.getElementById('i_interval')
let s_result = document.getElementById('s_result')
browser.storage.sync.get('interval')
    .then(res => i_interval.value = res.interval);
i_interval.addEventListener('input', function() {
    browser.storage.sync.set({'interval': this.value});
    s_result.innerText = ('Saved ' + this.value);
});
