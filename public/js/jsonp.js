/*
* Lightweight JSONP fetcher
* Copyright 2010 Erik Karlsson. All rights reserved.
* BSD licensed
*/


/*
 * The first limitation to this method is that you have to rely on the provider to implement JSONP. 
 * The provider needs to actually support JSONP -- they need to wrap their JSON data with 
 * that callback function name.
 *
 * Then the next limitation -- and this is a big one -- is that JSONP doesn't support POST requests. 
 * Since all data is passed in the query string as GET data, you are severely limited if your 
 * services require the passing of long data (for example, forum posts or comments or articles). 
 * But for the majority of consumer services that fetch more data than they push, 
 * this isn't such a big problem.
 */

/*
* Usage:
* 
* JSONP.get( 'someUrl.php', {param1:'123', param2:'456'}, function(data){
*   //do something with data, which is the JSON object you should retrieve from someUrl.php
* });
*/
var JSONP = (function(){
	var counter = 0, head, query, key, window = this;
	function load(url) {
	    console.log('jsonp url:' + url);
		var script = document.createElement('script'),
			done = false;
		script.src = url;
		script.async = true;
 
		script.onload = script.onreadystatechange = function() {
			if ( !done && (!this.readyState || this.readyState === "loaded" || this.readyState === "complete") ) {
				done = true;
				script.onload = script.onreadystatechange = null;
				if ( script && script.parentNode ) {
					script.parentNode.removeChild( script );
				}
			}
		};
		if ( !head ) {
			head = document.getElementsByTagName('head')[0];
		}
		head.appendChild( script );
	}
	function jsonp(url, params, callback) {
		console.log('calling jsonp:' + url);
		query = "?";
		params = params || {};
		for ( key in params ) {
			if ( params.hasOwnProperty(key) ) {
				query += encodeURIComponent(key) + "=" + encodeURIComponent(params[key]) + "&";
			}
		}
		var jsonp = "json" + (++counter);
		window[ jsonp ] = function(data){
			callback(data);
			try {
				delete window[ jsonp ];
			} catch (e) {}
			window[ jsonp ] = null;
		};
 
		console.log(url);
		load(url + query + "callback=" + jsonp);
		return jsonp;
	}
	return {
		get:jsonp
	};
}());
