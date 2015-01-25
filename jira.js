goog.require('goog.net.XhrIo');

var data = {
    sprint: {
	start: null,
	end: null
    },

    effort: {
	estimated: null,
	remaining: null,
	actual: null
    }
};

/**
 * Retrieve JSON data using XhrIo's static send() method.
 *
 * @param {string} dataUrl The url to request.
 */
function getData(dataUrl, username, password) {
  console.log('Sending simple request for ['+ dataUrl + ']');

  goog.net.XhrIo.send(dataUrl, function(e) {
      var xhr = e.target;
      var obj = xhr.getResponseJson();
      console.log(obj);
  }, null, null, make_auth_header(username, password));
}

function make_auth_header(username, password){
    return {
	'Authorization': 'Basic' + btoa(username + ":" + password)
    };
}

var base = 'https://nicusa.atlassian.net/rest/';

function greenhopper(){
    return getData(base + 'greenhopper/1.0/rapidview');
}

function get_issues_for_current_sprint(){
    var url = 'https://nicusa.atlassian.net/rest/greenhopper/1.0/xboard/work/allData.json?rapidViewId=96';

  goog.net.XhrIo.send(url, function(e) {
      var xhr = e.target;
      var obj = xhr.getResponseJson();
      console.log(obj);
      //"23/Dec/14 2:23 PM"
      var sprint_start = obj.sprintsData.sprints[1].startDate;
      var sprint_end = obj.sprintsData.sprints[1].endDate;

      console.log(obj['issuesData']['issues']);

      var issues = obj['issuesData']['issues'];
      var len = issues.length;
      tasks = [];
      for(var i=0; i<len; i++){
      	  var issue = issues[i];
      	  if(issue.typeName = 'sub-task')
      	      tasks.push(issue);
      	  // console.log(issue.typeName);
      	  // console.log(issue.summary);
      }
      calc_progress(tasks, sprint_start, sprint_end);

  });
}

function calc_progress(issues, sprint_start, sprint_end) {
    var issue = 'https://nicusa.atlassian.net/rest/api/2/issue/';
    var total_estimated = 0;
    var total_time_spent = 0;

    var len = issues.length;
    for(var i=0; i<len; i++){
	var url = issue + issues[i].key + '?expand=changelog';
	goog.net.XhrIo.send(url, function(e) {
	    var xhr = e.target;
	    var obj = xhr.getResponseJson();
	    console.log(obj);
	    var fields = obj.fields;
	    total_estimated += fields.aggregatetimeestimate; //in seconds
	    fields.aggregatetimeoriginalestimate;
	    total_time_spent += fields.aggregatetimespent;

	    var progress = fields.aggregateprogress;
	    // console.log(progress.percent);
	    // console.log(progress.progress);
	    // console.log(progress.total);
	    console.log('total estimated : ' + total_estimated);
	    console.log('total time spent: ' + total_time_spent);
	    console.log(fields.worklog.worklogs);
	    drawChart(total_estimated/(60*60), sprint_start, sprint_end);
	});
    }
}

/*
histories = obj.changelog.histories;

for(var i=0; i<histories.length; i++) {
  var history = histories[i];
  var date = new Date(Date.parse(history.created));
  var items = history.items;

  for(var j=0; j<items.length; j++){
    var item = items[i];
    if(item.field == "timeoriginalestimate"){
      var original_estimate = item.to; // string in seconds.. needs to be parsed to int.
    }
    if(item.field == "timeestimate"){
      //TODO: remaining work
    }
    if(item.field == "timespent"){
      //TODO: actual time spent
    }
  }
}

// When the issue is done, set remaining work to '0'.
obj.fields.status.name == "NIC DEV - DONE";

*/



/*
14: 
ObjectcanEdit: false
id: 96
name: "Java Team Board"
showDaysInColumn: false
sprintSupportEnabled: true
*/


google.load('visualization', '1', {packages: ['corechart']});
google.setOnLoadCallback(get_issues_for_current_sprint);

function drawChart(total_estimated_effort, sprint_start, sprint_end) {

    var data = new google.visualization.DataTable();
    data.addColumn('number', 'X');
    data.addColumn('number', 'Estimated');
    data.addColumn('number', 'Remaining');
//    data.addColumn('number', 'Actual');

    var start = new Date(Date.parse(sprint_start));
    var end = new Date(Date.parse(sprint_end));
    console.log((end - start)/(1000*60*60*24));
    var daysOfYear = [];
    for (var d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
	daysOfYear.push(new Date(d));
    }

    var estimate = total_estimated_effort || 40;
    var days = (end - start)/(1000*60*60*24);
    var rows = [];
    var step = estimate / days;
    var work = 0;
    for(var i=0; i<= days; i++){
        var day = i;
        var est = estimate - (i*step);
        var w = estimate - work;
        rows.push([day, null, est]);
    }


    rows[0][1] = estimate;
    rows[1][1] = 30;
    data.addRows(rows);


    var options = {
	title: 'Effort Burndown Chart',
        width: 1200,
        height: 563,
        hAxis: {
            title: 'Days'
        },
        vAxis: {
            title: 'Effort (hours)'
        },
	legend: { position: 'bottom' },

          curveType: 'function',
    };

    var chart = new google.visualization.LineChart(document.getElementById('ex2'));
    chart.draw(data, options);
}
