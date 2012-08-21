$(function() {

var map, geocoder, poly;

var canvas = $("#map_canvas");
var routepoints = [];
var routepath;
var socket;
var listitems = [];
var instreaming = false;
var infowindows = []

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
    var downtown = new google.maps.LatLng(41.884411,-87.625984);
    var myOptions = {
      zoom: 5,
      center: downtown,
      mapTypeId: google.maps.MapTypeId.TERRAIN
    }
    map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);

    geocoder = new google.maps.Geocoder();
	console.log('init called');

	var polyOption = {
		strokeColor: "#FF0000",
		strokeOpacity: 1.0,
		strokeWeight: 2
	};
	poly = new google.maps.Polyline(polyOption);
	poly.setMap(map);

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
  //socket.connect()
  //console.log("connecting to server" + location.hostname + ":socket="+socket)
  var socket = io.connect(location.hostname);
  console.log("connecting to server: " + location.hostname + ":socket="+socket)

  socket.on("message", function(message){
	console.log("socket.on.message ::" + message)
	handleMsg(message);
  });
  console.log("sending start monitoring method to server");
  socket.send('tweetclientjoin');
}

function handleMsg(message){
	var info = JSON.parse(message);
	switch (info.method){
		case "trackfiles":
			console.log('trackfile :' + info.file);
			//setListContent($('#navbar > ul'), info.file);
            if(!instreaming){
                instreaming = true;
                socket.send(JSON.stringify({'method':'twitterstreaming', 'interval':60000}));
            }
			break;
		case "tweet":
			console.log('drawing tweet with marker:'+info.data);
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
    var dataobj = JSON.parse(message);
    var  user = dataobj.user
        ,img  = dataobj.img
        ,text = dataobj.text
        ,lat  = dataobj.lat
        ,lgt  = dataobj.lgt

    if(isNaN(parseFloat(lat))){
        console.log('drawing location:'+lat);
    }

    console.log('user:'+user + ' :text:'+text);
	drawTweet(lat, lgt, dataobj);
}

// each invocation of this method has its own copy of private var tweet.
function drawTweet(lat, lng, tweet){
    if(isNaN(parseFloat(lat))){
        geocoder.geocode({ 'address': lat}, function(results, ret) {
            var latlng;
            if(ret == google.maps.GeocoderStatus.OK) {
                latlng = results[0].geometry.location;
            }else{
                latlng = new google.maps.LatLng(42.288, -88.000);
                console.log("Geocode was not successful for the following reason: " + ret);
            }
            drawTweetInfoWindowAtLatLng(latlng, tweet);
        });
    }else{
        drawTweetInfoWindowAtLatLng( new google.maps.LatLng(lat, lng), tweet);
    }
}

function drawTweetInfoWindowAtLatLng(latlng, tweet){
    var image = new google.maps.MarkerImage(tweet.img, new google.maps.Size(40,64), new google.maps.Point(0,0), new google.maps.Point(0,64));

    var infowin = new google.maps.InfoWindow({
        content: tweet.text,
        position: latlng,
        maxWidth: 7
    });
    infowin.open(map);

    infowindows.push(infowin);
    if(infowindows.length > 5){
        infowin = infowindows.shift();
        infowin.close();
    }

    map.setCenter(latlng);
    map.setZoom(5);
}

function drawMarker(lat, lng, place){
    title = formatMarkerTitle(place);
	//var image = 'images/detection.png';
	var image = new google.maps.MarkerImage('images/detection.png', new google.maps.Size(20,32), new google.maps.Point(0,0), new google.maps.Point(0,32));
	latlng = new google.maps.LatLng(lat, lng);
	routepoints.push(latlng);
    var marker = new google.maps.Marker({
        position: latlng, 
        map: map,
		animation: google.maps.Animation.DROP,
        title: title
    });   

    if(place['type'] == 'detection')
        marker.setIcon(image);

    console.log('drawing marker:'+lat+':'+lng+':'+title);
    var toggleBounce = function(sock, marker) {
        return function(){   // static scoping context to callback closure
            if (marker.getAnimation() != null) {
		        marker.setAnimation(null);
	        } else {
		        marker.setAnimation(google.maps.Animation.BOUNCE);
	        }
            console.log('sending message from marker=' + marker+ ' to sockek='+sock);
        }
    }(socket, marker);

    var clearMarker = function(marker){
        return function(){
            marker.setMap(null);
        }
    }(marker);

	google.maps.event.addListener(marker, 'click', toggleBounce);
	google.maps.event.addListener(marker, 'dbclick', clearMarker);

    map.setCenter(latlng);
    map.setZoom(5);

	//drawRouteLine(latlng);
}

function formatMarkerTitle(place){
    var title='';
    for(key in place){
        if(key == 'lat' || key == 'lgt' || key == 'type' || key == 'method')
            continue
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

// async programming never do RETURN....
// always break your task into pieces and wrap them inside callbacks!
// and bind variables thru callbacks.
function geocodeAddress(address, callback){
    var latlng = null;
    geocoder.geocode( { 'address': address}, function(results, ret) {
        if(ret == google.maps.GeocoderStatus.OK) {
            latlng = results[0].geometry.location;
            callback(latlng);
        } else {
           console.log("Geocode was not successful for the following reason: " + ret);
        }
    });
}

}); // end of this jquery function file.
