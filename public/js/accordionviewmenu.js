$(function() {

var canvas = $("#map_canvas");
var canvasHeight;
var canvasWidth;
var ctx;
var dt = 0.1;
var accordion;

$(document).ready(function() {
	console.log('document ready, before page content(images, etc) are downloaded'); 
});

$(window).load(function(){
	console.log('window loaded, page contents downloaded');
	//createWebSocket();
    createLogsMenu();
    //createmenu6();
});

function init() {
    console.log('init called');
    canvas.append("this text was appended");
};

function createWebSocket(){
  io.setPath("/js/socketio/")
  socket = new io.Socket(location.hostname)
  console.log("connecting to server" + location.hostname + ":socket="+socket)
  socket.connect()

  socket.on("message", function(message){
	console.log("socket.on.message ::" + message)
	handleMsg(message);
  });
  console.log("sending join method to server");
  socket.send('join');
}

function handleMsg(message){
	var info = JSON.parse(message);
	switch (info.method){
		case "trackfiles":
			console.log('trackfile :' + info.file);
			//setListContent($('#navbar > ul'), info.file);
			break;
		case "marker":
			console.log('drawing marker:'+info.data);
			break;
		default:
			console.log('unknown method:'+message);
			break;
	}
}


function createLogsMenu() {
    var logfilesmenu = new YAHOO.widget.AccordionView('logfiles', {collapsible: false, expandable: false, width: '300px', animate: true, animationSpeed: '0.2'});
    var modelPanels = [
        {label: 'Downtown Model', content: '<p>Downtown road test logs</p>'},
        {label: 'Urban Modle ', content: '<div class="padded"><ul><li>Dec 22 Tests</li><li>Jan 06 Tests</li><li>Jan 09 Tests</li></ul></div>'},
        {label: 'Rural Model', content: '<p><img src="http://farm3.static.flickr.com/2238/2293037745_c688d7a09c_m.jpg" alt="" class="block"></p>'},
        {label: 'Suburban Model', content: '<p>Logs from internal people\'s Tests</p>'}
    ];
    logfilesmenu.addPanels(modelPanels);
    logfilesmenu.appendTo('roadtestlogsmenu');
}

});
