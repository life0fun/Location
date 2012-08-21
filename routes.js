var sys = require('sys')
var app = module.parent.exports.app
var handle = module.parent.exports.handle
var querystring = require('querystring')

app.get('/', function(req, res){
    //res.render('playback.jade',{layout:true})
    res.render('real.jade',{layout:true})
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

app.get("/tail", function(req, res){
  if(req.cookies.userkey !== undefined) {
	//res.render('index.jade', { layout: "layout.arena.jade", 
	//						   locals: { name: "tail", 
	//									 user: req.cookies.name,
	//									}})
	}
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

app.post('/login', function(req, res, params) {
  req.authenticate(['admin'], function(error, authenticated) { 
    res.writeHead(200, {'Content-Type': 'text/html'})
		var theUser = req.getAuthDetails()
		var userKey = theUser.user.providerName + "|" + theUser.user.preferredUsername + "|" + theUser.user.email
		console.log("User Key: "+ userKey)

		res.writeHead(301, [
		    ['Location', '/'],
		    ['Content-Type', 'text/plain'],		
		    ['Set-Cookie', 'userkey='+userKey],
		    ['Set-Cookie', 'name='+theUser.user.preferredUsername]
		]);
		res.end()
  });
})
