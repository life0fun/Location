;(function($, io, toString){

var map, poly;

var canvas = $("#map_canvas");
var routepoints = [];
var routepath;
var socket;
var listitems = []
var markers = []
var infowindow;

var locReader;
var SQR; 
var PACK;
var dropZone; 

$(document).ready(function() {
	console.log('document ready, before page content(images, etc) are downloaded'); 
});

$(window).load(function(){
	console.log('window loaded, page contents downloaded');
	initialize();
	//createWebSocket();
});

// do not create scope for global objects
function initialize() {
	console.log('init called');
    $('#map_canvas').hide();        

    initDBParser();
	console.log('init done successfully..wont working if not hit here');
    wifi = '00:15:70:91:17:71';
    //getGoogLocJson(wifi);
}

function initDBParser(){
    dropZone = document; //.getElementById('drop_zone');
    dropZone.addEventListener('dragover', handleDragOver, false);
    dropZone.addEventListener('drop', handleFileDrop, false);
    //SQR = new Sqlite3Reader();
    //PACK = new JSPack();
    locReader = new LocReader();

    $.strPad = function(i,l,s) {
        var o = i.toString();
        if (!s) { s = '0'; }
        while (o.length < l) {
            o = s + o;
        }
        return o;
    };

    // register callback for file uploaded.
    $('#fileselector').change(function(e) {
       i = this.files;
       handleFileSelect(i);
    });

    $(document).bind('sqlready', function(e) {
        $('#infobox').hide();
        $('#map_canvas').show();        

        console.log('sqlready....');
        data = SQR.read_table('loctime');
        console.log('sqlready..read table done....');
            
        var latlngbounds = new google.maps.LatLngBounds( );
        $.each(data, function(i,row) { 
            var myLatLng = new google.maps.LatLng(row[5], row[6]);
            var image = 'beachflag.png';
            var beachMarker = new google.maps.Marker({
                                 position: myLatLng,
                                 map: GOOG_map
                              });
        });
    });

    // bind callback to msg triggered when read uploaded file is done.
    $(document).bind('ev_dataready', function(e){
        $('#infobox').hide();
        $('#map_canvas').show();        

        console.log('loc data ready....');

        var locations = parseFileContentString(); 

        drawMyLocations(locations);
    });

    // bind form submit button with ev preventdefault
    //$('#submit').bind('submit', function(e){
    $('#submit').click(function(e){
        e.preventDefault();
        console.log('form submit button clicked');
        ssids = $('#bssids').val()
        // note that s.split('\\s+') does not work. only reg exp works
        lssids = ssids.split(/\s+/g).filter(function(e){return e!='';});
        console.log('textarea input bssids', lssids);
        if(lssids.length > 0){
			handleJsonp(lssids);
            //socket.send(JSON.stringify({'method':'resolvewifi', 'data':lssids}));
        }
    });

    console.log("initDBParser done...");
}

function handleJsonp(wifi){

	reqjson = {};
	reqjson['host'] = 'maps.google.com';
	reqjson['version'] = '1.1.0';
	reqjson['wifi_towers'] = [];
	reqjson['wifi_towers'].push({'mac_address':wifi})

	console.log('handling jsonp with wifi:' + wifi);
	JSONP.get('http://www.google.com/loc/json', reqjson, function(data){
		console.log('wifi location:' + data);
	});
}

// hanle the input type file event callback
// create a FileReader and read the content of the uploaded file into a string
// once loaded, trigger event to get the string parsed into json object array. 
function handleFileSelect(input) {
    var files = [];
    var dbfile = input[0];  // single upload
    console.log('processing input db file:', dbfile, dbfile.name);

    var dbreader = new FileReader();
    dbreader.onload = locReader.loadFile(dbfile, dbreader);  // create a closure over reader
    dbreader.readAsText(dbfile);
    dbreader.onerror = function(e) { alert(e) }

    //db.onload = SQR.loadfile(db);
    //db.readAsText(dbfile);   // dbfile.result contains the data
    //db.readAsBinaryString(dbfile);
    //db.onerror = function(e) { alert(e) }
}

// hanle the input type file event callback
function handleFileDrop(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    //$('#wait').show();
    var files = evt.dataTransfer.files; // FileList object.
    handleFileSelect(files);
}
function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();       
}

function createWebSocket(){
  //socket = new io.Socket(location.hostname)
  //socket.connect()
  socket = io.connect(location.hostname)
  console.log("connecting to server" + location.hostname + ":socket="+socket)

  socket.on("message", function(message){
	console.log("Web socket.on.message ::" + message.toString());
	handleMsg(message);
  });
  console.log("sending join method to server");
  socket.send('resolvewifiloc');
}

function handleMsg(message){
	var info = JSON.parse(message);
    console.log('handleMsg:', info);
	switch (info.method){
		case "trackfiles":
			console.log('trackfile :' + info.file);
			setListContent($('#navbar > ul'), info.file);
			break;
		case "marker":
			console.log('drawing marker:'+info.data);
			drawRecvdMarker(info.data);
			break;
        case "wifiloc":
            console.log('WifiLoc:', info.data);
			drawRecvdMarker(info.data);
            break;
		default:
			console.log('unknown method:'+message);
			break;
	}
}

// uploaded table text read into a string, and parse it into location jsons.
function parseFileContentString(){
    var locations = []
    var data = locReader.getData();
    //console.log('drawLocation...', data);
    var lines = data.split('\n');
    for(var e in lines){
        console.log('line:', e, ' =:', lines[e]);
        loc = lines[e].split('|');
        console.log('lat/lng/acc=', loc[1], loc[2], loc[6]);
        if(typeof(loc[1]) !== 'undefined'){
            locations.push({'lat':loc[1], 'lng':loc[2], 'accuracy':loc[6], 'starttime':loc[3], 'endtime':loc[4], 'count':loc[5], 'name':loc[8], 'poi':loc[9]});
        }
    }

    for(var i=0;i<locations.length;i++){
        console.log('locjson:', locations[i]);
    }
    return locations;
}

// get the parsed location jsons after reading uploaded txt file, draw one by one
function drawMyLocations(locations){
    var work = new google.maps.LatLng(42.288377,-88.000316);
    map = new google.maps.Map(document.getElementById("map_canvas"),{
                              zoom:12,
                              center:work,
                              mapTypeId: google.maps.MapTypeId.ROADMAP});

    console.log('drawing my locations...');
    for(var i=0;i<locations.length;i++){
		var tmoutcb = function(idx){
			return function(){
				drawMarker(locations[idx]);
			}
		}(i);
		setTimeout(tmoutcb, i * 200);
        console.log('locjson:', locations[i]);
    }
}

// draw a location with give json attribute
function drawMarker(loc){
    var lat = parseFloat(loc['lat']);
    var lng = parseFloat(loc['lng']);
    var accuracy = parseInt(loc['accuracy']);
    var name = loc['name'];
    var info = loc['name'] + '<br>' + loc['starttime'] + '.....' + loc['endtime'] + ' ' + loc['count'] + '<br>' +loc['poi']; 

	var latlng = new google.maps.LatLng(lat, lng);
    var marker = new google.maps.Marker({
        position: latlng, 
        map: map,
		animation: google.maps.Animation.DROP,
        title: name
    });   
    marker.setDraggable(true);
    markers.push(marker);

    var circle = new google.maps.Circle({ 
						fillOpacity: 0.0,
                        strokeWeight: 2,
                        strokeOpacity : 0.3,
                        strokeColor : 'blue',
                        clickable   : true,
                });
    circle.setRadius(accuracy);
    circle.setCenter(latlng);
    circle.setMap(map);

    var setInfoWindow = function(marker,info){
        return function(){
            if(infowindow) infowindow.close();
            infowindow = new google.maps.InfoWindow({
                content:'<div id="content"><p>'+info+'<br></p></div>'
            });
            infowindow.open(map, marker);
        }
    }(marker,info);
	google.maps.event.addListener(marker, 'click', setInfoWindow);

    var toggleBounce = function(marker) {
        return function(){   // static scoping context to callback closure
            if (marker.getAnimation() != null) {
		        marker.setAnimation(null);
	        } else {
		        marker.setAnimation(google.maps.Animation.BOUNCE);
	        }
			//marker.setMap(null);
        }
    }(marker);
	google.maps.event.addListener(marker, 'click', toggleBounce);

    map.setCenter(latlng);
    map.setZoom(13);
    console.log('drawing marker:', JSON.stringify(loc));

	//drawRouteLine(latlng);
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
            socket.send(JSON.stringify({'method':'playbackstreaming', 'file':text}));
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
       socket.send(JSON.stringify({'method':'playbackstreaming', 'file':text}));
    });
}

// called to add road test location trace playback file into the left panel list
function setListContent(field, item){
	listitems.push(item);
	field.append("<li><a>"+item+"</a></li>");
    console.log('setting list item'+item);
    addListClickEventCallback();
}

function drawRecvdMarker(message){
	places = JSON.parse(message)['location'];

    console.log('wifi location:', places);

    var loc = {'lat':places.latitude, 'lng':places.longitude, 'accuracy':places.accuracy, 'name':''};

    console.log('lat:', places.latitude, ' lng:', places.longitude, ' accu:', places.accuracy);
    var locations = [];
    locations.push(loc)

    $('#infobox').hide();
    $('#map_canvas').show();        

    drawMyLocations(locations);
	//drawMarker(parseFloat(place['lat']), parseFloat(place['lgt']), parseInt(place['accuracy']));
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


function getGoogLocJson(wifi){
    /*  ajax jsonp already dynamically create a script tag and execute the script
    //create element
    console.log('start create dynamic script...');
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.onload = function(){ console.log('external js loaded') };
    script.src = '/public/js/locjson.js';
    document.getElementsByTagName("head")[0].appendChild(script);
    console.log('fin create dynamic script...');
    */

    URL = 'http://www.google.com/loc/json';
    reqjson = {};
    reqjson['version'] = '1.1.0';
    reqjson['host'] = 'maps.google.com';
    //reqjson['host'] = 'localhost';
    reqjson['wifi_towers'] = [];
    reqjson['wifi_towers'].push({'mac_address':wifi});

    console.log('http req:', JSON.stringify(reqjson));

    var xhr = $.ajax({
        //type: 'POST',
        url : URL, // converted to url get with callback XXX.com/xx?par=xx?callback=xx
        contentType: 'application/json',
        crossDomain: true,
        //data: JSON.stringify(reqjson),
        data: reqjson,
        success: function(data) { console.log('get data:', data);},
        error: function(err){ console.log('post error:')},
        dataType: 'jsonp'
    });
	console.log('waiting for....');
}

})(jQuery, io, Object.prototype.toString)
