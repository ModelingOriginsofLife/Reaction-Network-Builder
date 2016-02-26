var zoom = 1.0
var previousStates = [];
var showFlux = 0
var showEqFlux = 0
var recording = false
var interval = 0.1
var endpoint = 10.0

function toggleFlux()
{
	if (showFlux)
	{
		showFlux=0
		document.getElementById("fluxbutton").innerHTML = "Show<br>Flux"
	}
	else
	{
		showFlux=1
		document.getElementById("fluxbutton").innerHTML = "Hide<br>Eq. Flux"
	}
}

function toggleEqFlux()
{
	if (showEqFlux)
	{
		showEqFlux=0
		document.getElementById("eqbutton").innerHTML = "Show<br>Eq. Flux"
	}
	else
	{
		showEqFlux=1
		document.getElementById("eqbutton").innerHTML = "Hide<br>Eq. Flux"
	}
}

function ZoomOut()
{
	zoom *= 4.0/3.0
	
	var div = document.getElementById("host")
	cx = div.scrollLeft
	cy = div.scrollTop
	div.scrollLeft = cx*3.0/4.0
	div.scrollTop = cy*3.0/4.0
	
	var svg = document.getElementById("canvas")
	svg.setAttribute("viewBox", "0 0 "+zoom*4000+" "+zoom*4000);
	//~ svg.style.width = 4000/zoom
	//~ svg.style.height = 4000/zoom
}

function ZoomIn()
{
	zoom *= 3.0/4.0

	var div = document.getElementById("host")
	cx = div.scrollLeft
	cy = div.scrollTop
	div.scrollLeft = cx*4.0/3.0
	div.scrollTop = cy*4.0/3.0
	
	var svg = document.getElementById("canvas")
	svg.setAttribute("viewBox", "0 0 "+zoom*4000+" "+zoom*4000);
	//~ svg.style.width = 4000/zoom
	//~ svg.style.height = 4000/zoom
}

function backupNet()
{
	localStorage.setItem("reaction_network_builder_state", JSON.stringify(clone(curNet)))
	previousStates.push( clone(curNet) )
	if (previousStates.length > 20) 
	{
		previousStates.shift()
	}
}

function Undo()
{
	if (previousStates.length)
	{
		newNet = clone(previousStates.pop())
		if ((selComp)&&(newNet.chems[selComp.refname]))
			selComp = newNet.chems[selComp.refname]
		else
			selComp = null
			
		selRxn = null
			
		curNet = newNet
		refIdx = curNet.maxRef + 1
		renderNetwork()
		updateDisplay()
	}
}

var selComp = null
var selRxn = null

function updateCName()
{
	if (selComp)
	{
		selComp.name = document.getElementById("cmpName").value
		renderNetwork()
	}
}

function updateEnergy()
{
	if (selComp)
	{
		selComp.energy = parseFloat(document.getElementById("compEnergy").value)
		
		curNet.recomputeKeq()
		updateDisplay()
	}
}

function updateConc()
{
	if (selComp)
	{
		selComp.conc = parseFloat(document.getElementById("compConc2").value)
		updateNetwork()
		updateDisplay()
	}
}

function updateFlux()
{
	if (selComp)
	{
		selComp.flux = parseFloat(document.getElementById("compFlux").value)
		updateDisplay()
	}
}

function updateRName()
{
	if (selRxn)
	{
		selRxn.name = document.getElementById("rxnName").value
	}
}

function updateRate()
{
	if (selRxn)
	{
		selRxn.rate = parseFloat(document.getElementById("rxnRate2").value)
	}
}

function updateKeq()
{
	if (selRxn)
	{
		selRxn.fixkeq = document.getElementById("fixKeq").checked
		if (selRxn.fixkeq)
		{
			selRxn.keq = parseFloat(document.getElementById("rxnKeq2").value)
		}

		curNet.recomputeKeq()
		updateDisplay()
	}
}

function updateBuffer()
{
	if (selComp)
	{
		selComp.fixConc = document.getElementById("fixBuffer").checked
		updateDisplay()
	}
}

function deleteCatalyst(idx)
{
	backupNet()
	if (selRxn)
		delete selRxn.catalysts[idx]
	
	buildCatlist()
	renderNetwork()
}

function deleteReactant(idx)
{
	backupNet()
	if (selRxn)
		selRxn.reactants.splice(idx,1)
	
	buildCatlist()
	renderNetwork()
}

function deleteProduct(idx)
{
	backupNet()
	if (selRxn)
		selRxn.products.splice(idx,1)
	
	buildCatlist()
	renderNetwork()
}

function buildCatlist()
{
	if (selRxn)
	{
		var parent = document.getElementById("catalystList")
		var newHTML = ""
	
		for (idx in selRxn.catalysts)
		{
			newHTML += "<input value=\"Del\" type=\"button\" onclick=\"deleteCatalyst('"+idx+"')\"> "+curNet.chems[idx].name // Error: Sometimes this gives an error
			newHTML += "<span style=\"position:absolute;left:100px\">"
			newHTML += "<input style=\"position:absolute;left:50px;width:180px\" id=\"catRange_"+idx+"\" "
			newHTML += "type=\"range\" min=-15 max=2 step=0.01 value="+Math.log(selRxn.catalysts[idx])+" oninput=\"selRxn.catalysts['"+idx+"'] = Math.exp(parseFloat(this.value)); document.getElementById('catNum_"+idx+"').value = this.value;\">"
			newHTML += "<input style=\"position:absolute;left:250px;width:80px\" id=\"catNum_"+idx+"\" "
			newHTML += "type=\"number\" min=-15 max=2 step=0.01 value="+Math.log(selRxn.catalysts[idx])+" onchange=\"selRxn.catalysts['"+idx+"'] = Math.exp(parseFloat(this.value)); document.getElementById('catRange_"+idx+"').value = this.value;\"></span><br>"
		}
	
		parent.innerHTML = newHTML

		parent = document.getElementById("reactantList")
		newHTML = ""
	
		for (idx in selRxn.reactants)
		{
			newHTML += "<input value=\"Del\" type=\"button\" onclick=\"deleteReactant('"+idx+"')\"> "+curNet.chems[selRxn.reactants[idx]].name+"<br>"
		}
		
		parent.innerHTML = newHTML

		parent = document.getElementById("productList")
		newHTML = ""
	
		for (idx in selRxn.products)
		{
			newHTML += "<input value=\"Del\" type=\"button\" onclick=\"deleteProduct('"+idx+"')\"> "+curNet.chems[selRxn.products[idx]].name+"<br>"
		}
		
		parent.innerHTML = newHTML
	}
}

function updateDisplay()
{
	if (selComp)
	{
		document.getElementById("cmpName").value = selComp.name

		document.getElementById("compEnergy").value = selComp.energy
		document.getElementById("compEnergy2").value = selComp.energy

		document.getElementById("fixBuffer").checked = selComp.fixConc
		document.getElementById("compConc").value = Math.log(selComp.conc+1e-24)
		document.getElementById("compConc2").value = selComp.conc

		document.getElementById("compFlux").value = selComp.flux
		document.getElementById("compFlux2").value = selComp.flux
	}
	else
	{
		document.getElementById("cmpName").value = null

		document.getElementById("compEnergy").value = null
		document.getElementById("compEnergy2").value = null

		document.getElementById("compConc").value = null
		document.getElementById("compConc2").value = null

		document.getElementById("compFlux").value = null
		document.getElementById("compFlux2").value = null
		document.getElementById("fixBuffer").checked = false
	}
	
	if (selRxn)
	{
		document.getElementById("rxnName").value = selRxn.name

		document.getElementById("rxnRate").value = Math.log(selRxn.rate)
		document.getElementById("rxnRate2").value = selRxn.rate
		
		var eqnString = ""
		var first = 1
		
		for (rx in selRxn.reactants)
		{
			if (!first)
				eqnString += "+ "
			eqnString += curNet.chems[selRxn.reactants[rx]].name + " "
			first = 0
		}
		
		eqnString += "= "
		first = 1
		for (rx in selRxn.products)
		{
			if (!first)
				eqnString += "+ "
			eqnString += curNet.chems[selRxn.products[rx]].name + " "
			first = 0
		}
		
		document.getElementById("rxnEqn").innerHTML = eqnString
		
		document.getElementById("rxnKeq").value = Math.log(selRxn.keq)
		document.getElementById("rxnKeq2").value = selRxn.keq
		document.getElementById("fixKeq").checked = selRxn.fixkeq
		document.getElementById("fflux").innerHTML = selRxn.qf.toExponential(3)
		document.getElementById("bflux").innerHTML = selRxn.qb.toExponential(3)
		document.getElementById("nflux").innerHTML = (selRxn.qf-selRxn.qb).toExponential(3)
		buildCatlist()
	}
	
	document.getElementById("tdisplay").innerHTML = curTime.toExponential(3)
	document.getElementById("dtdisplay").innerHTML = DT.toExponential(3)

	if (!dataStorage.length)
		document.getElementById("dataStatus").innerHTML = "(No data recorded)"
	else
		document.getElementById("dataStatus").innerHTML = dataStorage.length+" data points recorded"
}

var deleting = false
var dragging = false
var dragObj = null

var linking = false
var linkObj = null
var linkType = 0

var initOfsX = 0, initOfsY = 0

function setGroupParams(node)
{
	node.setAttribute("transform","translate("+node.obj.x+","+node.obj.y+")")	
	if (node.fill)
	{
		if (node.obj.fixConc)
			node.fill.setAttribute("fill","rgb(164,100,164)")
		else
			node.fill.setAttribute("fill","rgb(100,164,100)")
	}
}

function setClipParams(node)
{
	var yofs = 30-12*Math.log(node.obj.conc/1e-3 + 1e-16)/Math.log(10)
	if (yofs<-30) yofs = -30
	if (yofs>30) yofs = 30
	node.child.setAttribute("x",-100)
	node.child.setAttribute("width",200)
	node.child.setAttribute("y",yofs)
	node.child.setAttribute("height",200)	
}

function setNodeParams(node)
{
	node.setAttribute("cx",node.obj.x)
	node.setAttribute("cy",node.obj.y)
	
	if (node.obj.reactants)
	{
		if (!showEqFlux)
			node.setAttribute("r",15)
		else
		{
			Q = Math.abs(node.obj.qf) + Math.abs(node.obj.qb);
			
			r = 12 * Math.log(Q/1e-4+1e-8)/Math.log(100)
			if (r>60) r=60
			if (r<1) r=1
			node.setAttribute("r",r)
		}
	}
}

function deleteCompound()
{
	backupNet(); 
	if (selComp)
		curNet.delChem(selComp); 
	renderNetwork(); 
	deleting = true; 
	selComp = null;
	updateDisplay()
}

function deleteReaction()
{
	backupNet(); 
	if (selRxn)
		curNet.delRxn(selRxn); 
	renderNetwork(); 
	deleting = true; 
	selRxn = null; 
	updateDisplay()
}

function setSelcompParams(node)
{
	node.obj = selComp
	if (node.obj)
	{
		offset = parseFloat(node.circ.getAttribute("stroke-dashoffset"))
		node.setAttribute("transform","translate("+node.obj.x+","+node.obj.y+")")
		node.circ.setAttribute("stroke-dashoffset", offset+0.3)
	}
	else
	{
		node.setAttribute("transform","translate(0,0) scale(0)")
	}
}

function setSelrxnParams(node)
{
	node.obj = selRxn
	if (node.obj)
	{
		offset = parseFloat(node.circ.getAttribute("stroke-dashoffset"))
		node.setAttribute("transform","translate("+node.obj.x+","+node.obj.y+")")
		node.circ.setAttribute("stroke-dashoffset", offset+0.3)
	}
	else
	{
		node.setAttribute("transform","translate(0,0) scale(0)")
	}
}

function addChemSelection(svg)
{
	var groupObj = document.createElementNS(NS,"g")
	var nodeObj = document.createElementNS(NS,"circle")

	nodeObj.setAttribute("cx",0)
	nodeObj.setAttribute("cy",0)
	nodeObj.setAttribute("r",45)
	nodeObj.setAttribute("fill","none")
	nodeObj.setAttribute("stroke","rgb(92,48,92)")
	nodeObj.setAttribute("stroke-width", "8")
	nodeObj.setAttribute("stroke-opacity", "0.5")
	nodeObj.setAttribute("stroke-dasharray", "15,8.5")
	nodeObj.setAttribute("stroke-dashoffset","0")
	groupObj.obj = selComp
	groupObj.update = setSelcompParams
	groupObj.circ = nodeObj
	groupObj.appendChild(nodeObj)

	setSelcompParams(groupObj)
	svg.appendChild(groupObj)
}

function addRxnSelection(svg)
{
	var groupObj = document.createElementNS(NS,"g")
	var nodeObj = document.createElementNS(NS,"circle")

	nodeObj.setAttribute("cx",0)
	nodeObj.setAttribute("cy",0)
	nodeObj.setAttribute("r",22)
	nodeObj.setAttribute("fill","none")
	nodeObj.setAttribute("stroke","rgb(92,48,92)")
	nodeObj.setAttribute("stroke-width", "6")
	nodeObj.setAttribute("stroke-opacity", "0.5")
	nodeObj.setAttribute("stroke-dasharray", "10,5.3")
	nodeObj.setAttribute("stroke-dashoffset","0")
	groupObj.obj = selComp
	groupObj.update = setSelrxnParams
	groupObj.circ = nodeObj
	groupObj.appendChild(nodeObj)

	setSelcompParams(groupObj)
	svg.appendChild(groupObj)
}

function addChemNode(svg, cm)
{
	var groupObj = document.createElementNS(NS,"g")
	var nodeObj = document.createElementNS(NS,"circle")
	
	nodeObj.setAttribute("cx",0)
	nodeObj.setAttribute("cy",0)
	nodeObj.setAttribute("r",35)
	nodeObj.setAttribute("fill","rgb(200,180,160)")
	
	groupObj.obj = cm
	groupObj.onclick = function() { selComp = this.obj; updateDisplay() }
	//~ groupObj.ondblclick = function() { }
	groupObj.onmousedown = function(event) { 
		if (event.button == 0)
		{
			backupNet()
			dragging = true; 
			dragObj = this; 
			sx = host.scrollLeft
			sy = host.scrollTop
			initOfsX = event.x*zoom - this.obj.x + sx*zoom; 
			initOfsY = event.y*zoom - this.obj.y + sy*zoom;
		} else if (event.button == 2) {
			if (event.ctrlKey) linkType=2; else linkType=0; 
			linkObj = this.obj; 
			linking = true;
		}
	}
	groupObj.onmouseup = function() { 
		if (dragging)
		{
		}
		
		if (linking)
		{
			if (linkObj && (this.obj != linkObj))
			{
				if (linkObj.refname && this.obj.reactants) // Compound to reaction
				{
					backupNet()
					if (linkType == 0)
						this.obj.reactants.push(linkObj.refname)
					else
						this.obj.catalysts[linkObj.refname] = 1
				}
				else if (linkObj.products && this.obj.refname) // Reaction to compound
				{
					backupNet()
					linkObj.products.push(this.obj.refname)
				}
			}
			renderNetwork()
		}
		
		dragging = false; 
		linking = false;
	}
	
	groupObj.update = setGroupParams
	groupObj.appendChild(nodeObj)

	var clipObj = document.createElementNS(NS,"clipPath")
	clipObj.setAttribute("id","clip_"+cm.refname)
	clipObj.obj = cm
	clipObj.update = setClipParams
	svg.appendChild(clipObj)
	
	var clipRect = document.createElementNS(NS,"rect")
	clipObj.child = clipRect	
	clipObj.appendChild(clipRect)
	
	setClipParams(clipObj)
	
	var fillObj = document.createElementNS(NS,"circle")
	//~ fillObj.update = setNodeParams
	fillObj.setAttribute("r",30)
	fillObj.setAttribute("fill","rgb(100,164,100)")
	fillObj.setAttribute('clip-path', 'url(#clip_'+cm.refname+')');
	groupObj.fill = fillObj
	groupObj.appendChild(fillObj)
	
	var nodeTitle = document.createElementNS(NS,"text")
	nodeTitle.textContent = cm.name
	nodeTitle.setAttribute("x",-5*nodeTitle.textContent.length)
	nodeTitle.setAttribute("y",-15)
	nodeTitle.setAttribute("class", "noselect")
	groupObj.appendChild(nodeTitle)

	setGroupParams(groupObj)
	svg.appendChild(groupObj)
}

function addRxnNode(svg, rx)
{
	var nodeObj = document.createElementNS(NS,"circle")
	
	nodeObj.obj = rx
	nodeObj.setAttribute("r",15)
	nodeObj.setAttribute("fill","rgb(64,64,64)")
	setNodeParams(nodeObj)
	nodeObj.onclick = function() { selRxn = this.obj; updateDisplay() }
	nodeObj.update = setNodeParams
	nodeObj.onmousedown = function(event) { 
		if (event.button == 0)
		{
			backupNet()
			dragging = true; 
			dragObj = this; 
			sx = host.scrollLeft
			sy = host.scrollTop
			initOfsX = event.x*zoom - this.obj.x + sx*zoom; 
			initOfsY = event.y*zoom - this.obj.y + sy*zoom; 
		} else if (event.button == 2) {
			if (event.ctrlKey) linkType=2; else linkType=0; 
			linkObj = this.obj; 
			linking = true;
		}
	}
	nodeObj.ondblclick = function() { }
	//~ nodeObj.onmouseout = function() { dragging = false; }

	nodeObj.onmouseup = function() { 
		if (dragging)
		{
		}
		
		if (linking)
		{
			if (linkObj && (this.obj != linkObj))
			{
				if (linkObj.refname && this.obj.reactants) // Compound to reaction
				{
					backupNet()
					if (linkType == 0)
						this.obj.reactants.push(linkObj.refname)
					else
						this.obj.catalysts[linkObj.refname] = 1
				}
				else if (linkObj.products && this.obj.refname) // Reaction to compound
				{
					backupNet()
					linkObj.products.push(this.obj.refname)
				}
			}
			renderNetwork()
		}
		
		dragging = false; 
		linking = false;
	}
	
	svg.appendChild(nodeObj)
}

function getApproachLine(rx)
{
	dx = 0
	dy = 0
	
	for (i in rx.reactants)
	{
		dx += rx.x - curNet.chems[ rx.reactants[i] ].x
		dy += rx.y - curNet.chems[ rx.reactants[i] ].y
	}

	l = Math.sqrt(dx*dx+dy*dy)
	dx = dx/l 
	dy = dy/l
	
	ct = Math.cos(-0 * 2*3.1415 / 180.0)
	st = Math.sin(-0 * 2*3.1415 / 180.0)
	return { x: dx, y: dy }
}

function getLeavingLine(rx)
{
	dx = 0
	dy = 0
	
	for (i in rx.products)
	{
		dx += curNet.chems[ rx.products[i] ].x - rx.x
		dy += curNet.chems[ rx.products[i] ].y - rx.y
	}

	l = Math.sqrt(dx*dx+dy*dy)
	dx = dx/l 
	dy = dy/l
	
	return { x: dx, y: dy }
}

function setLinkParams(link)
{	
	odx = link.dest.x - link.src.x // Error: Sometimes this gives a type error?
	ody = link.dest.y - link.src.y
	l = Math.sqrt(odx*odx+ody*ody)
	odx = odx/l 
	ody = ody/l
	
	qv = 0
	
	if (link.type == 0) 
	{
		qv = link.dest.qf-link.dest.qb
		if ((qv<0)&&(showFlux)) flip = true
		else flip = false
		
		r = 40
		approach = getApproachLine(link.dest)
	
		dx = approach.x
		dy = approach.y
		ofsx = -ody*link.count*8
		ofsy = odx*link.count*8
		
		if (!flip)
			pathString = "M"+(ofsx+link.src.x)+","+(ofsy+link.src.y)+" C"+(ofsx+link.src.x + 20*odx)+","+(ofsy+link.src.y + 20*ody)+" "+(ofsx+link.dest.x - 4*r*dx)+","+(ofsy+link.dest.y - 4*r*dy)+" "+(link.dest.x-r*dx)+","+(link.dest.y-r*dy);
		else
			pathString = "M"+(ofsx+link.src.x+1.5*r*odx)+","+(ofsy+link.src.y+1.5*r*ody)+" C"+(ofsx+link.src.x + 4.5*r*odx)+","+(ofsy+link.src.y + 4.5*r*ody)+" "+(ofsx+link.dest.x - 4*r*dx)+","+(ofsy+link.dest.y - 4*r*dy)+" "+(link.dest.x)+","+(link.dest.y);
	
		link.setAttribute("d", pathString)
	}
	
	if (link.type == 1) 
	{
		qv = link.src.qf-link.src.qb
		if ((qv<0)&&(showFlux)) flip = true
		else flip = false
		
		r = 60
		leaving = getLeavingLine(link.src)
	
		dx = leaving.x
		dy = leaving.y

		ofsx = ody*link.count*8
		ofsy = -odx*link.count*8

		if (!flip)
			pathString = "M"+link.src.x+","+link.src.y+" C"+(link.src.x + 80*dx)+","+(link.src.y + 80*dy)+" "+(link.dest.x - 1.5*r*odx+ofsx)+","+(link.dest.y - 1.5*r*ody+ofsy)+" "+(link.dest.x-r*odx+ofsx)+","+(link.dest.y-r*ody+ofsy);
		else
			pathString = "M"+(link.src.x+40*dx)+","+(link.src.y+40*dy)+" C"+(link.src.x + 2*r*dx)+","+(link.src.y + 2*r*dy)+" "+(link.dest.x - 1.5*r*odx+ofsx)+","+(link.dest.y - 1.5*r*ody+ofsy)+" "+(link.dest.x+ofsx)+","+(link.dest.y+ofsy);
		link.setAttribute("d", pathString)
	}
	
	if (link.type == 2) 
	{
		r = 0
	
		link.setAttribute("x1",link.src.x)
		link.setAttribute("x2",link.dest.x-r*odx)
		link.setAttribute("y1",link.src.y)
		link.setAttribute("y2",link.dest.y-r*ody)	
	}
	else
	{
		if (showFlux)
		{
			if (qv>0)
			{
				if (link.type == 0)
					link.setAttribute("marker-end","url(#Rarrow)")
				else
					link.setAttribute("marker-end","url(#Parrow)")
				link.setAttribute("marker-start",null)
			}
			else
			{
				if (link.type == 0)
					link.setAttribute("marker-start","url(#rRarrow)")
				else
					link.setAttribute("marker-start","url(#rParrow)")
				link.setAttribute("marker-end",null)
			}
			qv = Math.log(Math.abs(qv)/1e-4+1e-8)/Math.log(100)
			if (qv<0.3) qv=0.3
			if (qv>5) qv=5
			
			link.setAttribute("stroke-width",4*qv)
			link.setAttribute("stroke-opacity",qv)
		}
		else
		{
			if (link.type == 0)
				link.setAttribute("marker-end","url(#Rarrow)")
			else
				link.setAttribute("marker-end","url(#Parrow)")
			link.setAttribute("marker-start",null)
			link.setAttribute("stroke-width",4)
			link.setAttribute("stroke-opacity",1)
		}
	}
}

function addRxnLinks(svg, rx)
{
	for (i in rx.reactants)
	{
		var link = document.createElementNS(NS,"path")
	
		link.type = 0
		link.count = 0
		tcount = 0
		
		for (j=0;j<rx.reactants.length;j++)
		{
			if (rx.reactants[i] == rx.reactants[j])
			{
				if (j<i)
					link.count += 1
				tcount += 1
			}
		}
		tcount -= 1
		link.count -= tcount/2.0
		link.src = curNet.chems[ rx.reactants[i] ]
		link.dest = rx
		setLinkParams(link)
		link.update = setLinkParams
		
		link.setAttribute("stroke", "rgb(128,32,32)")
		link.setAttribute("stroke-width",4)
		link.setAttribute("fill", "none")
		link.setAttribute("marker-end","url(#Rarrow)")
		svg.appendChild(link)
	}
	
	for (i in rx.products)
	{
		var link = document.createElementNS(NS,"path")
		link.type = 1
		link.count = 0
		tcount = 0
		
		for (j=0;j<rx.products.length;j++)
		{
			if (rx.products[i] == rx.products[j])
			{
				if (j<i)
					link.count += 1
				tcount += 1
			}
		}
		tcount -= 1
		link.count -= tcount/2.0
		
		link.src = rx
		link.dest = curNet.chems[ rx.products[i] ]
		setLinkParams(link)
		link.update = setLinkParams
		link.setAttribute("stroke", "rgb(32,32,128)")
		link.setAttribute("stroke-width",4)
		link.setAttribute("fill", "none")
		link.setAttribute("marker-end","url(#Parrow)")
		
		svg.appendChild(link)
	}
	
	for (i in rx.catalysts)
	{
		var link = document.createElementNS(NS,"line")
		link.type = 2
		link.src = curNet.chems[ i ]
		link.dest = rx
		setLinkParams(link)
		link.update = setLinkParams
		link.setAttribute("stroke", "rgb(32,128,32)")
		link.setAttribute("stroke-width",5)
		link.setAttribute("stroke-dasharray", "5,5")
		
		svg.appendChild(link)
	}
}

function renderNetwork()
{
	var svg = document.getElementById("canvas")
	svg.innerHTML = ""
	
	for (rx in curNet.rxns)
	{
		addRxnLinks(svg,curNet.rxns[rx])
	}
	
	for (cm in curNet.chems)
	{
		addChemNode(svg,curNet.chems[cm])
	}
	
	for (rx in curNet.rxns)
	{
		addRxnNode(svg,curNet.rxns[rx])
	}
	
	addChemSelection(svg)
	addRxnSelection(svg)
}

function updateNetwork()
{
	if (document.getElementById("canvas"))
	for (idx in document.getElementById("canvas").childNodes)
	{
		var node = document.getElementById("canvas").childNodes[idx]
		
		if (node.update)
		{
			node.update(node)
		}
	}
}

window.onbeforeunload = function()
{
	backupNet()
}

window.onkeydown = function(event)
{
	if ((event.keyCode == 90)&&(event.ctrlKey))
	{
		Undo();
	}
	if ((event.keyCode == 107)&&(!event.ctrlKey)) ZoomIn()
	if ((event.keyCode == 109)&&(!event.ctrlKey)) ZoomOut()
}

function clearNetwork()
{
	backupNet()
	curNet = new Network()
	refIdx = 0
	selRxn = null
	selComp = null
	updateDisplay()
	renderNetwork()
}

window.onload = function()
{
	net = localStorage.getItem("reaction_network_builder_state")
	if (net)
	{
		curNet = new Network()
		data = JSON.parse(net)
		for (var key in data)
			curNet[key] = data[key]
		
		refIdx = curNet.maxRef+1
	}
	else
	{
		curNet = new Network()
		curNet.addChem(new Node("O", 64, 64))
		curNet.addChem(new Node("H", 256, 64))
		curNet.addChem(new Node("H2O", 92, 256))
		curNet.addChem(new Node("Pt", 192, 256))
		curNet.addRxn(new Reaction(["comp0", "comp1", "comp1"], ["comp2"], 1, 128, 128))
		curNet.rxns[0].catalysts["comp3"] = 1.0
	}
	renderNetwork()
	
	var svg = document.getElementById("canvas")
	
	window.onmouseup = function(event) {
		dragging = false
	}
	svg.onmousemove = function(event) { 
		if (dragging && dragObj) { 
			sx = host.scrollLeft
			sy = host.scrollTop
			dragObj.obj.x = (event.x*zoom - initOfsX + sx*zoom);
			dragObj.obj.y = (event.y*zoom - initOfsY + sy*zoom); 
			updateNetwork() } 
		}

	svg.onclick = function(event) {
		if (event.shiftKey)
		{
			frame = document.getElementById("host")
			sx = host.scrollLeft
			sy = host.scrollTop
			backupNet()
			curNet.addChem(new Node("Empty", (event.x-14+sx)*zoom, (event.y-75+sy)*zoom))
			renderNetwork()
		}
	}
	
	svg.oncontextmenu = function(event) {
		if (event.shiftKey)
		{
			frame = document.getElementById("host")
			sx = host.scrollLeft
			sy = host.scrollTop
			backupNet()
			curNet.addRxn(new Reaction([],[], 1, (event.x-14+sx)*zoom, (event.y-78+sy)*zoom))
			renderNetwork()
		}
		
		event.preventDefault()
		return false
	}
}

function saveNet()
{
	//~ var blob = new Blob([escape(JSON.stringify(curNet))], {type: 'text/json;charset=utf-8'})
	//~ saveAs(blob,"network.js")
	//~ content.Headers.Add("Content-Disposition", "attachment; filename=export.csv");
	window.open('data:text/json;charset=utf-8,' + escape(JSON.stringify(curNet)));
	//~ ;charset=utf-8
	//~ "data:application/octet-stream,
	
	//~ link = document.getElementById("savelink")
	//~ link.href = 'data:text/json;charset=utf-8,' + escape(JSON.stringify(curNet))
	//~ link.download = true
	//~ link.click()
	
}

function loadNet(f)
{
	var reader = new FileReader()
	reader.onload = (function(file) {
		return function(e) {
			//~ console.log(e.target.result)
			curNet = new Network()
			newNet = JSON.parse(e.target.result)
			for (key in newNet)
				curNet[key] = newNet[key]
			// e.target.result
			
			selComp = null
			selRxn = null
			refIdx = curNet.maxRef+1
			renderNetwork()
			updateDisplay()
		}
	})(f)
	
	reader.readAsText(f)
}

function toggleRun()
{
	simulating = !simulating; 
	if (simulating)
	{
		recording = document.getElementById("recordRun").checked
		interval = parseFloat(document.getElementById("tsInterval").value)
		endpoint = parseFloat(document.getElementById("tsEnd").value)
		curTime = 0
		lastTime = -1
		dataStorage = []
		document.getElementById("runButton").value = 'Stop';
		document.getElementById("runButton2").value = 'Stop';
		document.getElementById("cmpName").disabled = "disabled";
		document.getElementById("rxnName").disabled = "disabled";
		document.getElementById("compEnergy2").disabled = "disabled";
		document.getElementById("compConc2").disabled = "disabled";
		document.getElementById("compFlux2").disabled = "disabled";
		document.getElementById("rxnRate2").disabled = "disabled";
		document.getElementById("rxnKeq2").disabled = "disabled";
	}
	else 
	{
		document.getElementById("runButton").value = 'Run';
		document.getElementById("runButton2").value = 'Run';
		document.getElementById("cmpName").disabled = null;
		document.getElementById("rxnName").disabled = null;
		document.getElementById("compEnergy2").disabled = null;
		document.getElementById("compConc2").disabled = null;
		document.getElementById("compFlux2").disabled = null;
		document.getElementById("rxnRate2").disabled = null;
		document.getElementById("rxnKeq2").disabled = null;
	}
}

var simulating = false;
var fast = false;

var iter = 0
var dataStorage = []

function recordState()
{
	var curState = []
	
	curState.push(curTime)
	for (idx in curNet.chems)
	{
		curState.push(curNet.chems[idx].conc)
	}
	
	dataStorage.push(curState)
}

function checkRecording()
{
	if (recording)
	{
		if (curTime-lastTime > interval)
		{
			lastTime = curTime
			recordState()
		}
		
		if (curTime > endpoint)
		{
			toggleRun()
			return false
		}
	}
	return true
}

function mainLoop(dt)
{
	if (simulating)
	{		
		stop=false
		curNet.Iterate()
		if (!checkRecording()) stop=true
		
		if (fast)
		{
			for (var i=0;(i<100)&&!stop;i++)
			{
				curNet.Iterate()
				if (!checkRecording()) stop=true
			}
		}
				
		iter += 1
		
		if (iter%10 == 0)
			updateDisplay()		
	}
	
	updateNetwork()
	requestAnimationFrame(mainLoop);
}

mainLoop(0)

function createHoverWindow()
{
	w = document.createElement("div")
	w.style.position = "absolute"
	w.style.left = 200
	w.style.top = 200
	w.style.width = 500
	w.style.height = 500
	w.style.backgroundColor = "rgb(230,220,200)"
	w.style.boxShadow = "3px 3px 3px 3px rgba(0,0,0,0.5)"
	w2 = document.createElement("div")
	w2.style.position = "absolute"
	w2.style.left = 0
	w2.style.top = 0
	w2.style.width = "100%"
	w2.style.height = 25
	w2.style.backgroundColor = "rgb(164,180,192)"
	w2.parent = w
	
	w2.onmousedown = function(event)
	{
		this.parent.dragging = true
		this.parent.relx = event.x
		this.parent.rely = event.y
		this.parent.orix = parseFloat(this.parent.style.left)
		this.parent.oriy = parseFloat(this.parent.style.top)
	}
	w2.onmouseup = function(event)
	{
		this.parent.dragging = false
	}

	w.onmouseup = function(event)
	{
		this.dragging = false
	}
	w.onmouseout = function(event)
	{
		this.dragging = false
	}
	w.onmousemove = function(event)
	{
		if (this.dragging)
		{
			this.style.left = event.x - this.relx + this.orix
			this.style.top = event.y - this.rely + this.oriy
		}
	}	
	w.appendChild(w2)
	
	b = document.createElement("button")
	b.innerHTML = "x"
	b.style.position = "absolute"
	b.style.right = 5
	b.style.top = 2
	b.parent = w
	
	b.onclick = function(event)
	{
		document.getElementById("bid").removeChild(this.parent)
	}
	
	w2.appendChild(b)
	document.getElementById("bid").appendChild(w)
	
	return w;
}

function setInitial()
{
	for (var idx in curNet.chems)
	{
		curNet.chems[idx].iconc = curNet.chems[idx].conc
	}	
}

function resetConc()
{
	for (var idx in curNet.chems)
	{
		curNet.chems[idx].conc = curNet.chems[idx].iconc
	}
}

function createControllerWindow()
{
	if (!document.getElementById("controllerwindow"))
	{
		w = createHoverWindow()
		w.id = "controllerwindow"
	}
}

function createGraphWindow()
{
	if (!document.getElementById("graphwindow"))
	{
		w = createHoverWindow()
		w.id = "graphwindow"
	}
}

function saveData()
{
	if (dataStorage.length)
	{
		var dataString = ""
		
		dataString = dataString+"Time\t"
		
		for (idx in curNet.chems)
		{
			dataString = dataString+curNet.chems[idx].name+"\t"			
		}
		dataString = dataString+"\n"
		
		for (idx=0;idx<dataStorage.length;idx++)
		{
			sub = dataStorage[idx]
			for (j=0;j<sub.length;j++)
			{
				dataString = dataString+sub[j].toExponential(9)+"\t"
			}
			dataString = dataString+"\n"		
		}
		
		window.open('data:text/json;charset=utf-8,' + escape(dataString))
	}
}
