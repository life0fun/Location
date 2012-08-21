;(function($, io, toString){

var map, poly;

var canvas = $("#map_canvas");
var routepoints = [];
var routepath;
var socket;
var listitems = []
var markers = []
var infowindow;

$(document).ready(function() {
	console.log('document ready, before page content(images, etc) are downloaded'); 
});

$(window).load(function(){
	console.log('window loaded, page contents downloaded');
	initialize();
	createWebSocket();
});

// do not create scope for global objects
function initialize() {
    var myLatlng = new google.maps.LatLng(42.288, -88.000);
    var downtown = new google.maps.LatLng(42.884, -87.625);
    var myOptions = {
      zoom: 8,
      center: myLatlng,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    }
    map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
	console.log('init called');

	var polyOption = {
		strokeColor: "#FF0000",
		strokeOpacity: 1.0,
		strokeWeight: 2
	};
	poly = new google.maps.Polyline(polyOption);
	//poly.setMap(map);

	var routelayer = new google.maps.KmlLayer('file:///Users/e51141/macsrc/maps/chicago.kml',
	//var routelayer = new google.maps.KmlLayer('http://www.searcharoo.net/SearchKml/newyork.kml',
		{  suppressInfoWindows: true,
		   map: map
		});
	//layer = new google.maps.FusionTablesLayer(139529);
	//layer.setMap(map);

	console.log('init done successfully..wont working if not hit here');
}

function createWebSocket(){
  //socket = new io.Socket(location.hostname)
  socket = io.connect(location.hostname);
  console.log("connecting to server" + location.hostname + ":socket="+socket)

  socket.on("msg", function(message){
	console.log("socket.on.message ::" + message)
	handleMsg(message);
  });
  console.log("sending join method to server");
  //socket.broadcast.emit('playbackclientjoin');
}

function handleMsg(message){
	var info = JSON.parse(message);
	switch (info.method){
		case "trackfiles":
			console.log('trackfile :' + info.file);
			setListContent($('#navbar > ul'), info.file);
			break;
		case "marker":
			console.log('drawing marker:'+info.data);
			drawRecvdMarker(info.data);
			break;
		default:
			console.log('unknown method:'+message);
			break;
	}
}

function addMarkerStep() {
	for(var i=0;i<locations.length;i+=2){
		var tmoutcb = function(idx){
			return function(){
				console.log('adding mark:' + idx);
				drawMarker(locations[idx], locations[idx+1], idx);
			}
		}(i);
		setTimeout(tmoutcb, i * 200);
	}
	lineMarkers();
}


function drawRecvdMarker(message){
	place = JSON.parse(message);
	console.log('WS::'+place['lat'] + place['lgt'] + place['poi'] + place['accuracy']);
	drawMarker(parseFloat(place['lat']), parseFloat(place['lgt']), place);
}

function setMarkerFlag(marker, place){
    var image;
    if(place['_id'] != undefined){
	    image = new google.maps.MarkerImage('images/purple.png', new google.maps.Size(20,32), new google.maps.Point(0,0), new google.maps.Point(0,32), new google.maps.Size(20,32));
    }else if(place['poi'] == 'Transient'){
	    image= new google.maps.MarkerImage('images/yellow.png', new google.maps.Size(20,32), new google.maps.Point(0,0), new google.maps.Point(0,32), new google.maps.Size(20,32));
    }else if(place['poi'] != 'null'){
	    image = new google.maps.MarkerImage('images/green.png', new google.maps.Size(20,32), new google.maps.Point(0,0), new google.maps.Point(0,32), new google.maps.Size(20,32));
    }
    marker.setIcon(image);
    marker.setZIndex(3);
}

function drawMarker(lat, lng, place){
    title = formatMarkerTitle(place);

	latlng = new google.maps.LatLng(lat, lng);
	routepoints.push(latlng);
    var marker = new google.maps.Marker({
        position: latlng, 
        map: map,
		animation: google.maps.Animation.DROP,
        title: title
    });   

    markers.push(marker);
    setMarkerFlag(marker, place);
    marker.setDraggable(true);

    console.log('drawing marker:'+lat+':'+lng+':'+title);
    var toggleBounce = function(sock, marker) {
        return function(){   // static scoping context to callback closure
            if (marker.getAnimation() != null) {
		        marker.setAnimation(null);
	        } else {
		        marker.setAnimation(google.maps.Animation.BOUNCE);
	        }
            console.log('sending message from marker=' + marker+ ' to sockek='+sock);
			//marker.setMap(null);
        }
    }(socket, marker);
	//google.maps.event.addListener(marker, 'click', toggleBounce);

    var setInfoWindow = function(marker,title){
        return function(){
            if(infowindow) infowindow.close();
            infowindow = new google.maps.InfoWindow({
                content:'<div id="content"><p>'+title+'<br/></p></div>'
            });
            infowindow.open(map, marker);
        }
    }(marker,title);
	google.maps.event.addListener(marker, 'click', setInfoWindow);

    map.setCenter(latlng);
    map.setZoom(14);

	drawRouteLine(latlng);
}

function formatMarkerTitle(place){
    var title='';
    for(key in place){
        if(key == 'lat' || key == 'lgt' || key == 'type' || key == 'method')
            continue
        if(key == '_id'){
            title += ' '+'Type'+':' + 'POI';
        }
        title += ' '+key+':' + place[key];
    }
    return title;
}

function drawRouteLine(latlng){
	var path = poly.getPath();
	path.push(latlng);
	poly.setMap(map);
}

function lineMarkers(){
	routepath = new google.maps.Polyline({
		path: routepoints,
		strokeColor: "#FF0000",
		strokeOpacity: 1.0,
		strokeWeight: 2
	});
	routepath.setMap(map);
}

function clearMarkers(){
	console.log('num of markers:'+markers.length);
    for(var i=0;i<markers.length;i++){
        markers[i].setMap(null);
    }
    markers = [];  // clear

	console.log('remove poly');
    var path = poly.getPath();
	while(path.getLength() > 0){
		path.pop();
	}
	poly.setMap(null);
}

function addListClickEventCallbackAll(){
	$('#navbar > ul > li').each(function(index){
        $(this).bind('click', function(e){
            var text = $(this).text();
            console.log('list itme '+index+ ' clicked...'+text);
            console.log('global socket;'+socket);
            clearMarkers();
            //socket.broadcast.json.send(JSON.stringify({'method':'playbackstreaming', 'file':text}));
            socket.broadcast.json.send({'method':'playbackstreaming', 'file':text});
        });
    });
}

function addListClickEventCallback(){
	li_item = $('#navbar > ul > li').last();
	console.log(li_item);
	//$('#navbar > ul > li').last().bind('click', function(e){
	li_item.bind('click', function(e){
       var text = $(this).text();
       console.log('list itme '+index+ ' clicked...'+text);
       console.log('global socket;'+socket);
       clearMarkers();
       //socket.send(JSON.stringify({'method':'playbackstreaming', 'file':text}));
       socket.broadcast.json.send({'method':'playbackstreaming', 'file':text});
    });
}

function setListContent(field, item){
	/*
	itemcontainer = document.createElement("li");
	itemcontainer.id = 'listitemsdiv';
	itemcontainer.style.position = "absolute"
	itemcontainer.style.top = "-100px"
	*/

	listitems.push(item);
	field.append("<li><a>"+item+"</a></li>");
    console.log('setting list item'+item);

    addListClickEventCallback();

	/*
	for(var i=0;i<listitems.length;i++){
		field.append("<li>"+listitems[i]+"</li>");
		window.scrollBy(0, document.body.scrollHeight - document.body.scrollTop);
	}
	*/
}

})(jQuery, io, Object.prototype.toString)
