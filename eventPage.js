chrome.browserAction.onClicked.addListener(function(tab) {
    console.log('foo bar');
  chrome.tabs.create({'url': chrome.extension.getURL('jira.html')}, function(tab) {
    // Tab opened.
  });
});
