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
    init();
});

function init() {
    console.log('init called');
    canvas.append("this text was appended");
    var mymenu = new YAHOO.widget.AccordionView('mymenu', {collapsible: true, expandable: false, width: '240px', animate: true, animationSpeed: '0.5'});     
    mymenu.addPanel({label: 'SINGLE_LINK', content: '<a href="http://www.yahoo.com/">Yahoo!</a>'}, 1);
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

//init();

});
