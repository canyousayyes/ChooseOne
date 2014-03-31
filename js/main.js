var Item, Edge, Node, Graph, TopologicalOrder, GameManager; //Constructor definitions
var gameManager;

Item = function(name, icon){
	"use strict";
	this.name = name;
	this.icon = icon;
};

Edge = function(from, to){
	"use strict";
	this.from = from;
	this.to = to;
	this.next = null;
};

Edge.prototype.isNull = function(){
	"use strict";
	return this.from === null || this.to === null;
};

Node = function(item){
	"use strict";
	this.id = item.id;
	this.name = item.name;
	this.icon = item.icon;
	this.edges = new Edge(null, null);
};

Node.prototype.isDirectlyConnected = function(dest){
	"use strict";
	var edge;
	for (edge = this.edges; !edge.isNull(); edge = edge.next){
		if (edge.to === dest){
			return true;
		}
	}
	return false;
};

Graph = function(items){
	"use strict";
	var i;
	this.nodes = new Array(items.length);
	for (i = 0; i < items.length; i += 1){
		this.nodes[i] = new Node(items[i]);
	}
};

Graph.prototype.addEdge = function(from, to){
	"use strict";
	var edge = new Edge(from, to);
	edge.next = from.edges;
	from.edges = edge;
};

TopologicalOrder = function(graph){
	"use strict";
	var i;
	//Initialization
	this.nodes = [];
	this.isValid = true;
	for (i = 0; i < graph.nodes.length; i += 1){
		graph.nodes[i].visited = 0;
	}
	
	//DFS
	for (i = 0; i < graph.nodes.length; i += 1){
		if (graph.nodes[i].visited === 0){ //Selected an unmarked node to visit
			if (this.visit(graph.nodes[i]) === false){
				this.isValid = false;
				break;
			}
		}
	}
};

TopologicalOrder.prototype.visit = function(node){
	"use strict";
	var edge;
	if (node.visited === 1){
		return false; //Not a DAG
	}
	if (node.visited === 0){
		node.visited = 1;
		for (edge = node.edges; !edge.isNull(); edge = edge.next){
			if (this.visit(edge.to) === false){
				return false;
			}
		}
		node.visited = 2;
		this.nodes.unshift(node);
	}
	return true;
};

TopologicalOrder.prototype.toString = function(){
	"use strict";
	var s = "", i;
	for (i = 0; i < this.nodes.length; i += 1){
		s += this.nodes[i].name;
		if (i !== this.nodes.length - 1){
			s += ", ";
		}
	}
	return s;
};

TopologicalOrder.prototype.getAmbiguousPairList = function(){
	"use strict";
	var i, list;
	list = [];
	for (i = 0; i < this.nodes.length - 1; i += 1){
		if (this.nodes[i].isDirectlyConnected(this.nodes[i+1]) === false){
			list.push([this.nodes[i], this.nodes[i+1]]);
		}
	}
	if (list.length === 0){
		return null; //No ambiguity
	}
	return list;
};

TopologicalOrder.prototype.getRandomAmbiguousPair = function(){
	"use strict";
	var list;
	list = this.getAmbiguousPairList();
	if (list === null){
		return null;
	}
	return list[Math.floor(Math.random()*list.length)];
};

GameManager = function(){
	"use strict";
	var that = this;
	this.state = "stop"; //stop, game, result, about
	this.graph = null;
	this.choiceLeft = null;
	this.choiceRight = null;
	this.topo = null;
	//Prepare items
	this.items = [];
	$.ajax({
		type: "GET",
		url: "items.txt",
		dataType: "text",
		async: false,
		success: function(data){
			var i;
			data = data.split('\n');
			for (i = 0; i < data.length; i += 2){
				that.items.push(new Item(data[i], data[i+1]));
			}
		}
	});
};

GameManager.prototype.getlist = function(){
	"use strict";
	var i, x, total = 10, idx = [], list = [];
	while(idx.length < total){
		x = Math.floor(Math.random()*this.items.length);
		if (idx.indexOf(x) < 0){
			idx.push(x);
		}
	}
	for (i = 0; i < idx.length; i += 1){
		list.push(this.items[idx[i]]);
	}
	return list;
};

GameManager.prototype.start = function(){
	"use strict";
	var data;
	
	//Get data and build graph
	data = this.getlist();
	this.graph = new Graph(data);
	this.state = "game";
	this.nextStep();
};

GameManager.prototype.nextStep = function(){
	"use strict";
	var pair;
	
	//Clear icons and texts
	$('#txtleft').text("");
	$('#txtright').text("");
	$('#iconleft').html("");
	$('#iconright').html("");
	
	//Perform topological sort and get a random ambiguity
	this.topo = new TopologicalOrder(this.graph);
	pair = this.topo.getRandomAmbiguousPair();
	
	if (pair === null){
		//Game over, show topological order
		this.showResult();
	}else{
		//Show the choices
		this.choiceLeft = pair[0];
		this.choiceRight = pair[1];		
		$('#txtleft').text(this.choiceLeft.name);
		$('#txtright').text(this.choiceRight.name);
		$('#iconleft').html(this.choiceLeft.icon);
		$('#iconright').html(this.choiceRight.icon);
	}
};

GameManager.prototype.makeChoice = function(ch){
	"use strict";
	var greater, lesser;
	switch(ch){
		case ">":
			greater = this.choiceLeft;
			lesser = this.choiceRight;
			break;
		case "<":
			greater = this.choiceRight;
			lesser = this.choiceLeft;
			break;
	}
	if (greater !== null && lesser !== null){
		this.graph.addEdge(greater, lesser);
		this.nextStep();
	}
};

GameManager.prototype.showResult = function(){
	"use strict";
	var i, j, item, list, row, cell, cellAngle;
	
	//Stop the game
	this.state = "result";
	
	//Show the first item - the most important thing to you =D
	item = this.topo.nodes[0];
	$('#txtfirst').text(item.name);
	$('#iconfirst').html(item.icon);
	
	//Show other items
	cellAngle = $('<div>');
	cellAngle.addClass('divcell');
	cellAngle.addClass('iconcell');
	cellAngle.addClass('fontM');
	cellAngle.html("<i class=\"fa fa-angle-right\"></i>");
	list = $('#resultlist');
	list.html("");
	for (i = 1, j = 0; i < this.topo.nodes.length; i += 1, j += 1){
		if (j === 0){ //Create a row
			row = $('<div>');
			row.addClass('divrow');
		}
		//Make cell content
		cell = $('<div>');
		cell.addClass('divcell');
		cell.addClass('itemcell');
		cell.addClass('fontS');
		item = this.topo.nodes[i];
		cell.html(item.icon + "<br>" + item.name);
		row.append(cell);
		if (i < (this.topo.nodes.length - 1)){
			row.append(cellAngle.clone());
		}
		if (j === 2 || i === (this.topo.nodes.length - 1)){ //Insert row
			j = -1;
			list.append(row);
		}
	}
	
	//Switch panel
	$('#panelgame').slideToggle("slow");
	$('#panelresult').slideToggle("slow");
};

$(document).ready(function(){
	"use strict";
	var actionLeft, actionRight, actionRestart, actionFacebook, actionPlurk, actionWhat, actionAbout;
	//Prepare game
	gameManager = new GameManager();
	
	//Prepare actions
	actionLeft = function(){
		if (gameManager.state === "game"){
			gameManager.makeChoice("<");
		}
	};
	actionRight = function(){
		if (gameManager.state === "game"){
			gameManager.makeChoice(">");
		}
	};
	actionRestart = function(){
		if (gameManager.state === "result"){
			gameManager.start();
			//Switch panel
			$('#panelgame').slideToggle("slow");
			$('#panelresult').slideToggle("slow");
		}
	};
	actionFacebook = function(){
		var url;
		if (gameManager.state === "result"){
			url = "http://www.facebook.com/sharer.php?";
			url += "u=" + encodeURIComponent(window.location.href);
			url += "t=" + encodeURIComponent(document.title);
			window.open(url);
		}
	};
	actionPlurk = function(){
		var url;
		if (gameManager.state === "result"){
			url = "http://www.plurk.com/?qualifier=shares&status=";
			url += encodeURIComponent(window.location.href);
			url += encodeURIComponent(" (二擇其一)。");
			url += encodeURIComponent("我的選擇是" + gameManager.topo.nodes[0].name + "。");
			window.open(url);
		}
	};
	actionWhat = function(){
		$('#mainpart').slideToggle("slow");
		$('#whatpart').slideToggle("slow");
	};
	actionAbout = function(){
		if (gameManager.state === "game"){
			$('#panelgame').slideToggle("slow");
			$('#panelabout').slideToggle("slow");
		}
	};
	//Link UI controls with actions
	$('#btnleft').click(actionLeft);
	$('#btnright').click(actionRight);
	$('#btnrestart').click(actionRestart);
	$('#btnfacebook').click(actionFacebook);
	$('#btnplurk').click(actionPlurk);
	$('#btnwhat').click(actionWhat);
	$('#btnback').click(actionWhat);
	$('#gametitle').dblclick(actionAbout);
	$('#panelabout').dblclick(actionAbout);
	$(document).keydown(function(e){
		var code = e.keyCode || e.which;
		if (gameManager.state === "game"){
			switch(code){
				case 37: //Left
					$('#btnleft').addClass("active");
					break;
				case 39: //Right
					$('#btnright').addClass("active");
					break;	
			}
		} else if (gameManager.state === "result"){
			switch(code){
				case 82: //Restart
					$('#btnrestart').addClass("active");
					break;
				case 70: //Facebook
					$('#btnfacebook').addClass("active");
					break;
				case 80: //Facebook
					$('#btnplurk').addClass("active");
					break;
			}
		}
	});
	$(document).keyup(function(e){
		var code = e.keyCode || e.which;
		if (gameManager.state === "game"){
			switch(code){
				case 37: //Left
					$('#btnleft').removeClass("active");
					actionLeft();
					break;
				case 39: //Right
					$('#btnright').removeClass("active");
					actionRight();
					break;	
			}
		} else if (gameManager.state === "result"){
			switch(code){
				case 82: //Restart
					$('#btnrestart').removeClass("active");
					actionRestart();
					break;
				case 70: //Facebook
					$('#btnfacebook').removeClass("active");
					actionFacebook();
					break;
				case 80: //Facebook
					$('#btnplurk').removeClass("active");
					actionPlurk();
					break;
			}
		}
	});
	
	//Lets start =D
	gameManager.start();
});
