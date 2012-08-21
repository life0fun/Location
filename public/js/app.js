;(function($, io, toString){
  io.setPath("/js/socketio/")
  var items = []
  var panel = $("#items")

  var socket = new io.Socket(location.hostname)
  console.log("connecting to server" + location.hostname)
  socket.connect()
  socket.on("message", function(message){
	console.log("socket.on.message ::" + message)
	setDivContent($("#items"), message)
  })

  window.start = function start() {
     console.log("Starting game");  
  }
  
  function main() { }

  var setDivContent = function(field, message) {
	itemcontainer = document.createElement("div")
	itemcontainer.id = "itemsdiv"
	itemcontainer.style.position = "absolute"
	itemcontainer.style.top = "-100px"

	items.unshift(message)
	if(items.length > 10)
		items.pop()
	for(var i=0;i<items.length;i++){
		//field.append("<li>"+items[i]+"</li>");
		//window.scrollBy(0, document.body.scrollHeight - document.body.scrollTop);
	}

	smoothAdd('items', message)
  }


  //http://www.fiveminuteargument.com/blog/scrolling-list
  var smoothAdd = function(id, text) {

	var el = $('#' + id);
	var h = el.height();

	el.css({
		height:   h,
		overflow: 'hidden'
	});

	var ulPaddingTop    = parseInt(el.css('padding-top'));
	var ulPaddingBottom = parseInt(el.css('padding-bottom'));

	var first = $('li:first', el);
	var last  = $('li:last',  el);
	var foh = first.outerHeight();
	var heightDiff = foh - last.outerHeight();
	var oldMarginTop = first.css('margin-top');

	first.css({
		marginTop: 0 - foh,
		position:  'relative',
		top:       0 - ulPaddingTop
	});

	last.css('position', 'relative');

	el.prepend('<li>' + text + '</li>');
	el.animate({ height: h + heightDiff }, 1500)

	//$.animate( properties, [ duration ], [callback] )
	first.animate({ top: 0 }, 25, function() {
		first.animate({ marginTop: oldMarginTop }, 100, function() {
			last.animate({ top: ulPaddingBottom }, 250, function() {
				last.remove();
				el.css({
					height:   'auto',
					overflow: 'visible'
				});
			});
		});
	});
  }

})(jQuery, io, Object.prototype.toString)
