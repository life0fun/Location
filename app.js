global.MAX_STREAM = 30

var   sys = require('sys')
	, http = require("http")
	, express = require('express')
	, connect = require('connect')
	, url = require('url')
	, path = require("path")
    , io = require('socket.io');
    //, io = require('socket.io-node');

var app = module.exports.app = express();
var handle = module.exports.handle = require("./handle");
var server = http.createServer(app);

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

// log
if (!module.parent) app.use(express.logger('dev'));
// serve static files from public folder
app.use(express.static(__dirname + '/public'));

// session support
app.use(express.cookieParser('some secret here'));
app.use(express.session());

// parse request bodies (req.body)
app.use(express.bodyParser());

// support _method (PUT in forms etc)
app.use(express.methodOverride());

//----------------------------------------------------
// the route part, have to put it here as module.parent.exports not working in nodester
// require("./routes")
//----------------------------------------------------
app.get('/', function(req, res){
    res.render('playback.jade',{layout:true})
    //res.render('real.jade',{layout:true})
});

app.get('/playback', function(req, res){
	res.render('playback.jade',{ })
})

app.get('/realtime', function(req, res){
	res.render('real.jade',{ })
})

app.get('/droid', function(req, res){
	res.render('droid.jade',{ })
})

app.get('/heatmap', function(req, res){
	res.render('heatmap.jade',{ })
})

app.get('/google', function(req, res){
	res.render('google.jade',{ })
})

app.get('/roadtest', function(req, res){
	res.render('roadtest.jade',{ })
})

app.get('/mylocation', function(req, res){
    res.render('mylocation.jade',{})
})

app.get('/wifilocation', function(req, res){
    res.render('wifilocation.jade',{})
})

app.get("/iostat", function(req,res){
	res.writeHead(200)
	res.end()
})

//curl -d "lat=12.3&lng=23.4" http://localhost/fix
app.post('/fix', function(req, res, params) {
    console.log(req.body.lat);
    console.log(req.body.lng);
	handle.processPostedFix(req.body.lat,req.body.lng);
    if(req.method == 'POST'){
        var data = '';
        req.on('data', function(chunk){
            //console.log('data:', data);
            data += chunk.toString();
        });
        req.on('end', function(){
            var body = querystring.parse(data);
            for(var k in body){
                console.log(k+" -> " + body[k]);
            }
        });
    }
    res.writeHead(200, {'Content-Type': 'text/html'})
    res.write('hello world\n')
    res.end()
})

//----------------------------------------------------
// the socket io handle
// require("./sockets")
//----------------------------------------------------
var io = io.listen(server)
io.sockets.on("connection", function(client){
  console.log("websocket connection client come in:");
  //client.emit('foo', {hello:'world'});

  client.on("realtimeclientjoin", function(msg){
      console.log("client emit realtimeclientjoin:", msg)
      handle.incomingMsg("realtimeclientjoin", client)
  });
  client.on("message", function(msg){
	console.log("websocket client msg:", msg)
    handle.incomingMsg(msg, client)
  });
  client.on("disconnect", function(){
    handle.disconnect(client)
  });
})

io.sockets.on("message", function(msg){
    console.log('get socket msg, not client msg:' + msg);
})

//----------------------------------------------------
// never crash
//----------------------------------------------------
process.on("uncaughtException", function(err){
    console.warn("Caught unhandled exception:")
    console.warn(err.stack || err)
})

console.log("running on localhost")
server.listen(3000)

