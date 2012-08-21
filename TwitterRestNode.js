var sys          = require('sys'),
    http         = require('http'),
    query        = require('querystring'),
    EventEmitter = require('events').EventEmitter,
    TwitterNode  = require('twitter-node').TwitterNode,
    Buffer       = require('buffer').Buffer;

function extend(a, b){
    Object.keys(b).forEach(function (key) {
        a[key] = b[key];
      });
    return a;
};

var basicAuth = function basicAuth(user, pass) {
      return "Basic " + new Buffer(user + ":" + pass).toString('base64');
};


TwitterNode.prototype.RestUrl = function(params) {
    //return "http://api.twitter.com/1/statuses/user_timeline.json?user=locstream";

    var resturl = this.requestUrl();
    if(typeof params == 'undefined' || params == null || Object.keys(params) == 0){
        return resturl;
    }

    if (resturl.indexOf('?') < 0 && params != null) {
        resturl += "?"+query.stringify(params);
    }else{
        resturl += "&"+query.stringify(params);
    }
    //console.log("http://api.twitter.com/1/statuses/user_timeline.json?user=locstream");
    return resturl;
}
    
// prototype inheritant object augment
TwitterNode.prototype.RestApi = function() {
      if (this._clientResponse && this._clientResponse.connection) {
              this._clientResponse.socket.end();
      }

      if (this.action === 'filter' && this.buildParams() === '') return;

      var client  = this._createClient(this.port, this.host),
          headers = extend({}, this.headers),
          twit    = this,
          request;

      headers['Host'] = 'api.twitter.com';

      if (this.user) {
        //headers['Authorization'] = basicAuth(this.user, this.password);
      }

      request = client.request("GET", this.RestUrl({user:'locstream'}), headers);

      var buffer = '';   // private variable is static and shared ?
      var parseRestData = function(chunk){
          buffer += chunk.toString('utf8'); // bind to the current val of outside
          //console.log('buf==>' + buffer);
          if(buffer.indexOf('}]') + 2 == buffer.length){
              var json = JSON.parse(buffer);
              twit.parseTwitText(json);
              //console.log(json.text);
          }
      };

      request.addListener('response', function(response) {
              twit._clientResponse = response;

              response.addListener('data', parseRestData);

              response.addListener('end', function() {
                        twit.emit('end', this);
                        twit.emit('close', this);
              });
      });
      request.end();
      return this;
};

// Rest Data do not have \r\n delimit...but [{...}] delimit.
TwitterNode.prototype.parseTwitText = function(jsonp) {
    var ratelimite = 2;
    for(var idx in jsonp.slice(0, ratelimite).reverse()){
		if(this.getDateTime(jsonp[idx].created_at) > 0){
			//console.log(jsonp[idx].text);
			this.emit('tweet', jsonp[idx].text);
		}
    }
}

TwitterNode.prototype.getDateTime = function(dtstr) {
	var dt = new Date(dtstr);
	if(!this.lastupdate || dt.getTime() > this.lastupdate.getTime()){
		this.lastupdate = dt;
		return dt.getTime();
	}
	return -1;
}

//http://api.twitter.com/statuses/user_timeline.json?user=locstream 
var TwitterRestNode = module.exports.TwitterRestNode = function(user, pass){
    EventEmitter.call(this);
    this.twit = new TwitterNode({
        host:'api.twitter.com',
        path:'/1/statuses/',
        action: 'user_timeline',  // requestUrl
        user:user,
        password:pass
    });
    this.rawdata = '';
	this.lastupdate=null;
    return this;
};

// Prototype Inheritance
sys.inherits(TwitterRestNode, EventEmitter);

TwitterRestNode.prototype.RestApi = function() {
    var self = this;
    this.twit.addListener('tweet', function(tweet){
        console.log('RestApi Tweet:'+tweet);
        self.emit('twitLocation', tweet);
    })
    this.twit.RestApi();
};

// uncomment to unit test
//var twit = new TwitterRestNode('locstream', 'locstream1');
//twit.RestApi()

