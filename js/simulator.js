/* clone function from http://stackoverflow.com/a/728400 */
function clone(obj) {
    if(obj == null || typeof(obj) != 'object')
        return obj;    
    var temp = new obj.constructor(); 
    for(var key in obj)
        temp[key] = clone(obj[key]);    
    return temp;
}

var NS="http://www.w3.org/2000/svg";
var refIdx = 0
var curTemp = 1.0
var curTime = 0
var lastTime = 0
var adaptDt = true
var DT = 0.01

function getNewRefname()
{
	var name = "comp"+refIdx;
	refIdx += 1
	
	return name
}

function Node(name,x,y)
{
	this.name = name
	this.refname = getNewRefname()
	this.iconc = 0
	this.conc = 0
	this.dconc = 0	
	this.flux = 0
	this.energy = 0
	this.fixConc = 0
	this.x = x
	this.y = y
}

function Reaction(reactants, products, rate, x, y)
{
	this.name = "Reaction"
	this.reactants = reactants
	this.products = products
	this.catalysts = {}
	this.rate = rate
	this.keq = 1
	this.fixkeq = false
	this.qf = 0
	this.qb = 0
	
	this.x = x
	this.y = y
}

function Network()
{
	this.chems = {}
	this.rxns = []
	this.maxRef = 0
}

Network.prototype.delChem = function(chem)
{
	var cname = chem.refname
	
	for (var idx in this.rxns)
	{
		var rx = this.rxns[idx]
		var markdel = 0
		
		for (var idx2=0;idx2<rx.reactants.length;idx2++)
		{
			if (rx.reactants[idx2] == cname)
			{
				rx.reactants.splice(idx2,1)
				idx2 -= 1
			}
				//~ markdel = 1
		}
		for (var idx2=0;idx2<rx.products.length;idx2++)
		{
			if (rx.products[idx2] == cname)
			{
				rx.products.splice(idx2,1)
				idx2 -= 1
			}
				//~ markdel = 1
		}
		for (var idx2 in rx.catalysts)
		{
			if (idx2 == cname)
				delete rx.catalysts[idx2]
			//~ if (idx2 == cname)
				//~ markdel = 1
		}
		
		//~ if (markdel)
			//~ this.rxns.splice(idx,1)
	}

	delete this.chems[cname]
}

Network.prototype.delRxn = function(rxn)
{
	for (var idx in this.rxns)
	{
		if (this.rxns[idx] == rxn)
			this.rxns.splice(idx,1)
	}
}

Network.prototype.addChem = function(chem)
{
	if (this.maxRef < refIdx) this.maxRef = refIdx
	this.chems[chem.refname] = chem
}

Network.prototype.addRxn = function(rxn)
{
	this.rxns.push(rxn)
}

Network.prototype.getDT = function()
{
	dt = DT * 1.01
	if (dt>1.0) dt = 1.0
	
	for (idx in this.chems)
	{
		if ((!this.chems[idx].fixConc)&&(this.chems[idx].conc>1e-16))
		{
			if (dt * (1e-16 + Math.abs( this.chems[ idx ].dconc)) > 0.05 * (this.chems[ idx ].conc))
				dt = 0.025 * this.chems[ idx ].conc / (Math.abs(this.chems[ idx ].dconc) + 1e-16)
		}
	}

	DT = dt
	if ((recording)&&(DT>interval)) DT=interval
}

Network.prototype.Iterate = function()
{	
	for (idx in this.chems)
	{
		this.chems[idx].dconc = 0
		if (this.chems[idx].flux > 1e-16)
			this.chems[idx].dconc = this.chems[idx].flux
		else if (this.chems[idx].flux < -1e-16)
			this.chems[idx].dconc = this.chems[idx].flux * this.chems[idx].conc
	}
	
	for (idx in this.rxns)
	{
		rx = this.rxns[idx]
		var kf = Math.sqrt(rx.keq), kb = 1.0/Math.sqrt(rx.keq);
		var rate = rx.rate
		
		for (idx in rx.reactants)
		{
			kf *= this.chems[ rx.reactants[idx] ].conc
		}
		for (idx in rx.products)
		{
			kb *= this.chems[ rx.products[idx] ].conc
		}
		for (idx in rx.catalysts)
		{
			rate += this.chems[ idx ].conc * rx.catalysts[idx] / ( 1.0 + this.chems[ idx ].conc ) // Single-reaction Michaelis-Menten
		}
		//~ kf = Math.exp(kf)
		//~ kb = Math.exp(kb)
		for (idx in rx.reactants)
		{
			this.chems [ rx.reactants[idx] ].dconc += rate * (kb-kf)
		}
		for (idx in rx.products)
		{
			this.chems [ rx.products[idx] ].dconc += rate * (kf-kb)
		}
		
		rx.qf = rate*kf
		rx.qb = rate*kb
	}
	
	// dA/dt = -A*B + C*D
	// dB/dt = -A*B + C*D
	// dC/dt = C*D - A*B
	// dD/dt = C*D - A*B
	//
	// a = (A-A0)
	// b = (B-B0)
	// c = (C-C0)
	// d = (D-D0)
	// Ideally such that A0*B0 = C0*D0, minimizing 1/A^2 (A-A0)^2 + 1/B^2 (B-B0)^2 + 1/C^2 (C-C0)^2 + 1/D^2 (D-D0)^2
	// But maybe we just say, for the A equation set B0=B, C0=C, D0=D, then A0 = C0*D0/B0
	//
	// dA/dt = -(a+A0)*(b+B0) + (c+C0)*(d+D0)
	// dA/dt = -(a+C*D/B)*B+C*D
	// dA/dt = -a*B 
	
	
	if (adaptDt) this.getDT()
	
	for (idx in this.chems)
	{
		if (!this.chems[idx].fixConc)
			this.chems[ idx ].conc += DT * this.chems[ idx ].dconc
			
		if (this.chems[idx].conc<0) this.chems[idx].conc=0
		if (this.chems[idx].conc>100) this.chems[idx].conc=100
	}
	
	curTime += dt
	return dt
}

Network.prototype.recomputeKeq = function()
{
	for (idx in this.rxns)
	{
		rx = this.rxns[idx]
		
		if (!rx.fixkeq)
		{
			var Ereac = 0, Eprod = 0

			for (idx in rx.reactants)
			{
				Ereac += this.chems[ rx.reactants[idx] ].energy
			}
			for (idx in rx.products)
			{
				Eprod += this.chems[ rx.products[idx] ].energy
			}
			
			rx.keq = Math.exp(-(Eprod - Ereac) / curTemp)
		}
	}
}

Network.prototype.getDerivs = function()
{
	err = 0
	
	for (idx in this.chems)
	{
		this.chems[idx].deriv = 0
	}

	for (idx in this.rxns)
	{
		rx = this.rxns[idx]
		
		if (rx.fixkeq)
		{
			var Ereac = 0, Eprod = 0

			for (idx in rx.reactants)
			{
				Ereac += this.chems[ rx.reactants[idx] ].energy
			}
			for (idx in rx.products)
			{
				Eprod += this.chems[ rx.products[idx] ].energy
			}
			
			lerr = (rx.keq - Math.exp(-(Eprod - Ereac) / curTemp)) / rx.keq
			
			for (idx in rx.reactants)
			{
				this.chems[ rx.reactants[idx] ].deriv += -1.0 * -1.0 * -1.0 * lerr * Math.exp(-(Eprod - Ereac)/curTemp) / curTemp
			}
			
			for (idx in rx.products)
			{
				this.chems[ rx.products[idx] ].deriv += -1.0 * -1.0 * lerr * Math.exp(-(Eprod - Ereac)/curTemp) / curTemp
			}

			err += Math.abs(lerr)
		}
	}
	
	return err
}

function calcEnergies()
{
	err = 0
	backupNet()
	stepsize = 100.0
	oldderivs = 1.0
	newderivs = 1.0
	
	for (iter = 0;iter < 10000;iter ++)
	{
		err = curNet.getDerivs()
		
		//~ stepsize *= 1.01
		//~ if (stepsize > 100.0) stepsize = 100.0
		scale = Math.exp(-iter/1000.0) //1.0/(1.0+iter)
		
		//~ oldderivs = newderivs
		//~ newderivs = 0
		
		//~ for (idx in curNet.chems)
		//~ {
			//~ newderivs += Math.abs(curNet.chems[idx].deriv)
		//~ }
		
		//~ if (newderivs/oldderivs > 1.0) stepsize *= 0.5
		//~ if (newderivs*stepsize > 0.5*scale) stepsize = 0.5*scale/newderivs
		
		for (idx in curNet.chems)
		{
			stepsize = 1e5
			
			if (Math.abs(curNet.chems[idx].deriv) * stepsize > 0.5*scale)
				stepsize = 0.5*scale / Math.abs(curNet.chems[idx].deriv)
			curNet.chems[idx].energy -= stepsize * curNet.chems[idx].deriv
		}
	}
	alert("Residual error: "+err)
}

var curNet;
