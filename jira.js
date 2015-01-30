goog.require('goog.net.XhrIo');

var db = {
    sprint: {
	start: null,
	end: null
    },

    effort: {
	estimated: null,
	remaining: null,
	actual: null
    },

    effort_aggrigated: {
        estimated: 0,
        remaining: 0,
        actual: 0
    },

    days_remaining_effort: {},
    days_estimated_effort: [],
    days_actual_effort: [],
    rows: []
};

/**
 * Retrieve JSON data using XhrIo's static send() method.
 *
 * @param {string} dataUrl The url to request.
 */
function getData(dataUrl, username, password) {
  goog.net.XhrIo.send(dataUrl, function(e) {
      var xhr = e.target;
      var obj = xhr.getResponseJson();
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

      // TODO: find another way instead of using index [0].
      db.sprint.start = obj.sprintsData.sprints[0].startDate;
      db.sprint.end = obj.sprintsData.sprints[0].endDate;


      var issues = obj['issuesData']['issues'];
      db.issues = issues;
      var len = issues.length;
      // tasks = [];
      // for(var i=0; i<len; i++){
      // 	  var issue = issues[i];
      // 	  if(issue.typeName = 'sub-task')
      // 	      tasks.push(issue);
      // 	  // console.log(issue.typeName);
      // 	  // console.log(issue.summary);
      // }
      // //calc_progress(tasks);
      calc_progress(issues);
  });
}

function calc_progress(issues) {
    var issue = 'https://nicusa.atlassian.net/rest/api/2/issue/';
    var total_estimated = 0;
    var total_time_spent = 0;

    var len = issues.length;
    for(var i=0; i<len; i++){
	var url = issue + issues[i].key + '?expand=changelog';
	goog.net.XhrIo.send(url, function(e) {
	    var xhr = e.target;
	    var obj = xhr.getResponseJson();
	    var fields = obj.fields;
	    db.effort_aggrigated.remaining += fields.aggregatetimeestimate; //in seconds
	    db.effort_aggrigated.estimated += fields.aggregatetimeoriginalestimate;
	    db.effort_aggrigated.actual += fields.aggregatetimespent;

	    var progress = fields.aggregateprogress;
	    // console.log(progress.percent);
	    // console.log(progress.progress);
	    // console.log(progress.total);
	    // console.log('total estimated : ' + total_estimated);
	    // console.log('total time spent: ' + total_time_spent);
	    // console.log(fields.worklog.worklogs);
	    //drawChart(db.effort_aggrigated.estimated/(60*60));
	    populate_data(obj);
	});
    }
}

function populate_data(issue){
    db.days_remaining_effort[issue.key] = {};

    histories = issue.changelog.histories;
    var sprint_start = new Date(Date.parse(db.sprint.start));

    for(var i=0; i<histories.length; i++) {
	var history = histories[i];
	var date = new Date(Date.parse(history.created));
	var items = history.items;

	var day = Math.round((date - sprint_start)/(1000*60*60*24));
	//if(day < 0) continue; // ignore previous work.
	
	var remaining_effort = 0;
	var estimated_effort = 0;
	var actual_effort = 0;

	for(var j=0; j<items.length; j++){
	    var item = items[j];

	    if(item.field == "timeoriginalestimate"){
		//var original_estimate = item.to; // string in seconds.. needs to be parsed to int.
		estimated_effort += parseInt(item.to);
	    }
	    if(item.field == "timeestimate"){ // Remaining effort.
		db.days_remaining_effort[issue.key][day] = parseInt(item.to);

		//remaining_effort += parseInt(item.to);
	
	    }
	    if(item.field == "timespent"){
		actual_effort += parseInt(item.to);
	    }
	}

	//if(db.days_remaining_effort[day] == undefined)  db.days_remaining_effort[day] = 0;
	if(db.days_estimated_effort[day] == undefined)  db.days_estimated_effort[day] = 0;
	if(db.days_actual_effort[day] == undefined)  db.days_actual_effort[day] = 0;

	db.days_estimated_effort[day] += estimated_effort;
	db.days_actual_effort[day] += actual_effort;
	
	// if(issue.fields.status.name != "NIC DEV - DONE"){
	//     db.days_remaining_effort[issue.key][day] = 0;
	// }
    }

    // When the issue is done, set remaining work to '0'.
    //obj.fields.status.name == "NIC DEV - DONE";

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

function drawChart() {

    var total_estimated_effort = db.effort_aggrigated.estimated/(60*60);

    var data = new google.visualization.DataTable();
    data.addColumn('number', 'X');
    data.addColumn('number', 'Remaining');
    data.addColumn('number', 'Estimated');
//    data.addColumn('number', 'Actual');

    var start = new Date(Date.parse(db.sprint.start));
    var end = new Date(Date.parse(db.sprint.end));
    //console.log((end - start)/(1000*60*60*24));
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

    // Calculate initial effort
    for(var k in db.days_remaining_effort){
        var issue = db.days_remaining_effort[k];
        for(var day in issue){
            var e = issue[day];
            if(day <= 0){
                foo += issue[day];
                rows[0][1] == null? rows[0][1] = issue[day] : rows[0][1] += issue[day];
            }
            else{
                rows[day][1] == null? rows[day][1] = issue[day] : rows[day][1] += issue[day];
            }
        }
    }
    db.rows = rows;
    // Convert to hours
    for(var i=0; i<= days; i++){
        rows[i][1] = rows[i][1]/(60*60);
    }

    // rows[0][1] = estimate;
    // rows[1][1] = 30;
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

    };

    var chart = new google.visualization.LineChart(document.getElementById('ex2'));
    chart.draw(data, options);
}
