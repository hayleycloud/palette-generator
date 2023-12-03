
type ColorRGB  = { r: number, g: number, b: number };

type ColorHSV = { h: number, s: number, v: number };

function rgb2str(color: ColorRGB): string {
	let r = color.r.toString(16).toUpperCase();
	if(r.length == 1)
		r = "0" + r;

	let g = color.g.toString(16).toUpperCase();
	if(g.length == 1)
		g = "0" + g;

	let b = color.b.toString(16).toUpperCase();
	if(b.length == 1)
		b = "0" + b;

	return "#" + r + g + b;
}

function str2rgb(hex: string): ColorRGB {
	if(hex[0] == "#") {
		hex = hex.substr(1);
	}

	const chunkSize : number = (hex.length == 3) ? 1 : 2;
	
	const r : string = "0x" + hex.substr(0, chunkSize);
	const g : string = "0x" + hex.substr(chunkSize, chunkSize);
	const b : string = "0x" + hex.substr(chunkSize*2, chunkSize);

	return {
		r: parseInt(r), g: parseInt(g), b: parseInt(b)
	};
}

function hsv2rgb(color: ColorHSV): ColorRGB {
	if(color.h < 0.0)
		color.h = 360.0 + color.h;
	else if(color.h >= 360.0)
		color.h = 0 + (color.h - 360.0);

	const c = (color.s * 0.01) * (color.v * 0.01);
	const x = c * (1 - Math.abs((color.h / 60.0) % 2 - 1));
	const m = (color.v * 0.01) - c;

	let r, g, b: number;
	if(color.h >= 0.0 && color.h < 60.0) {
		r = c;
		g = x;
		b = 0;
	} else if(color.h >= 60.0 && color.h < 120.0) {
		r = x;
		g = c;
		b = 0;
	} else if(color.h >= 120.0 && color.h < 180.0) {
		r = 0;
		g = c;
		b = x;
	} else if(color.h >= 180.0 && color.h < 240.0) {
		r = 0;
		g = x;
		b = c;
	} else if(color.h >= 240.0 && color.h < 300.0) {
		r = x;
		g = 0;
		b = c;
	} else if(color.h >= 300.0 && color.h < 360) {
		r = c;
		g = 0;
		b = x;
	}

	return {
		r: Math.round((r + m) * 255),
		g: Math.round((g + m) * 255),
		b: Math.round((b + m) * 255),
	};
}

interface Sampler {
	id(): string;

	htmlID(): number;

	sample(): ColorRGB[];

	createHTML(): HTMLTableRowElement;

	serialize(): string;
}

var g_samplers : Sampler[] = [];
var g_accumulator: number = 0;

///////////////////////////////////////////////////////////////////////////////
// Linear RGB Sampler

function generateColorsLerp(start: ColorRGB, end: ColorRGB, count: number)
: ColorRGB[] 
{
	const dr = (end.r - start.r) / (count - 1);
	const dg = (end.g - start.g) / (count - 1);
	const db = (end.b - start.b) / (count - 1);

	const colors: ColorRGB[] = [];
	for(let i = 0; i < count; i++) {
		colors.push({
			r: Math.round(start.r + (dr * i)),
			g: Math.round(start.g + (dg * i)),
			b: Math.round(start.b + (db * i))
		});
	}

	return colors;
}

class LinearRGBSampler implements Sampler {
	_htmlID: number;

	start: ColorRGB;
	end: ColorRGB;
	num: number;

	id(): string {
		return "linear";
	}

	htmlID(): number {
		return this._htmlID;
	}

	constructor(
		htmlID: number,
		start: ColorRGB = { r: 0, g: 0, b: 0 }, 
		end: ColorRGB = { r: 255, g: 255, b: 255 },
		num: number = 16) 
	{
		this._htmlID = htmlID;

		this.start = start;
		this.end = end;
		this.num = num;
	}
	
	public serialize(): string {
		return "LinearRGBSampler:" + JSON.stringify(this);
	}

	public static deserialize(code: string): LinearRGBSampler {
		const params = JSON.parse(code);

		return new LinearRGBSampler(
			params._htmlID, params.start, params.end, params.num
		);
	}

	sample(): ColorRGB[] {
		return generateColorsLerp(this.start, this.end, this.num);
	}

	public createHTML(): HTMLTableRowElement {
		const id = "sampler-" + this._htmlID;
		const tr = document.createElement("tr");
		tr.id = id;
		
		const td = [
			document.createElement("td"),
			document.createElement("td"),
			document.createElement("td")
		];

		td[0].innerHTML = "Linear<br/><i>(RGB)</i>";
		td[0].classList.add("pseudo-th");

		const innerTbl = document.createElement("div");
		innerTbl.classList.add("parameters-list", "parameters-list-linear");

		const innerDivs = [
			document.createElement("div"),
			document.createElement("div"),
			document.createElement("div")
		];

		const startColorID = id + "-start";
		const startColor = <HTMLInputElement> document.createElement("input");
		startColor.type = "color";
		startColor.id = startColorID;
		startColor.value = rgb2str(this.start);
		startColor.onchange = () => {
			this.start = str2rgb(startColor.value);
			syncPaletteView();
		};
		const startLbl = <HTMLLabelElement> document.createElement("label");
		startLbl.htmlFor = startColorID;
		startLbl.textContent = "Start:";

		innerDivs[0].append(startLbl, document.createElement("br"), startColor);

		const endColorID = id + "-end";
		const endColor = <HTMLInputElement> document.createElement("input");
		endColor.type = "color";
		endColor.id = endColorID;
		endColor.value = rgb2str(this.end);
		endColor.onchange = () => {
			this.end = str2rgb(endColor.value);
			syncPaletteView();
		};
		const endLbl = <HTMLLabelElement> document.createElement("label");
		endLbl.htmlFor = endColorID;
		endLbl.textContent = "End:";

		innerDivs[1].append(endLbl, document.createElement("br"), endColor);

		const numColorsID = id + "-num";
		const numColors = <HTMLInputElement> document.createElement("input");
		numColors.type = "number";
		numColors.id = numColorsID;
		numColors.min = "1";
		numColors.max = "255";
		numColors.step = "1";
		numColors.value = this.num.toString();
		numColors.size = 4;
		numColors.onchange = () => {
			let value = parseInt(numColors.value);

			value = Math.max(value, parseInt(numColors.min));
			value = Math.min(value, parseInt(numColors.max));

			this.num = value;
			numColors.value = value.toString();

			syncPaletteView();
		};
		const numLbl = <HTMLLabelElement> document.createElement("label");
		numLbl.htmlFor = numColorsID;
		numLbl.textContent = "Count:";

		innerDivs[2].append(numLbl, document.createElement("br"), numColors);
		
		innerTbl.append(innerDivs[0], innerDivs[1], innerDivs[2]);

		td[1].appendChild(innerTbl);

		tr.append(td[0], td[1], td[2]);

		return tr;
	}
}

///////////////////////////////////////////////////////////////////////////////
// Linear sRGB Sampler

function linear2srgb(val: number) {
	val = val / 255.0;
	val = val ** 2.2;
	return Math.round(val * 255);
}

class LinearSRGBSampler implements Sampler {
	_htmlID: number;

	start: ColorRGB;
	end: ColorRGB;
	num: number;

	id(): string {
		return "linear-srgb";
	}

	htmlID(): number {
		return this._htmlID;
	}

	constructor(
		htmlID: number,
		start: ColorRGB = { r: 0, g: 0, b: 0 }, 
		end: ColorRGB = { r: 255, g: 255, b: 255 },
		num: number = 16) 
	{
		this._htmlID = htmlID;

		this.start = start;
		this.end = end;
		this.num = num;
	}
	
	public serialize(): string {
		return "LinearSRGBSampler:" + JSON.stringify(this);
	}

	public static deserialize(code: string): LinearSRGBSampler {
		const params = JSON.parse(code);

		return new LinearSRGBSampler(
			params._htmlID, params.start, params.end, params.num
		);
	}

	sample(): ColorRGB[] {
		const dr = (this.end.r - this.start.r) / (this.num - 1);
		const dg = (this.end.g - this.start.g) / (this.num - 1);
		const db = (this.end.b - this.start.b) / (this.num - 1);

		const colors : ColorRGB[] = [];
		for(let i = 0; i < this.num; i++) {
			colors.push({
				r: linear2srgb(Math.round(this.start.r + (dr * i))),
				g: linear2srgb(Math.round(this.start.g + (dg * i))),
				b: linear2srgb(Math.round(this.start.b + (db * i)))
			});
		}

		return colors;
	}

	public createHTML(): HTMLTableRowElement {
		const id = "sampler-" + this._htmlID;
		const tr = document.createElement("tr");
		tr.id = id;
		
		const td = [
			document.createElement("td"),
			document.createElement("td"),
			document.createElement("td")
		];

		td[0].innerHTML = "Linear<br/><i>(sRGB)</i>";
		td[0].classList.add("pseudo-th");

		const innerTbl = document.createElement("div");
		innerTbl.classList.add("parameters-list", "parameters-list-linear");

		const innerDivs = [
			document.createElement("div"),
			document.createElement("div"),
			document.createElement("div")
		];

		const startColorID = id + "-start";
		const startColor = <HTMLInputElement> document.createElement("input");
		startColor.type = "color";
		startColor.id = startColorID;
		startColor.value = rgb2str(this.start);
		startColor.onchange = () => {
			this.start = str2rgb(startColor.value);
			syncPaletteView();
		};
		const startLbl = <HTMLLabelElement> document.createElement("label");
		startLbl.htmlFor = startColorID;
		startLbl.textContent = "Start:";

		innerDivs[0].append(startLbl, document.createElement("br"), startColor);

		const endColorID = id + "-end";
		const endColor = <HTMLInputElement> document.createElement("input");
		endColor.type = "color";
		endColor.id = endColorID;
		endColor.value = rgb2str(this.end);
		endColor.onchange = () => {
			this.end = str2rgb(endColor.value);
			syncPaletteView();
		};
		const endLbl = <HTMLLabelElement> document.createElement("label");
		endLbl.htmlFor = endColorID;
		endLbl.textContent = "End:";

		innerDivs[1].append(endLbl, document.createElement("br"), endColor);

		const numColorsID = id + "-num";
		const numColors = <HTMLInputElement> document.createElement("input");
		numColors.type = "number";
		numColors.id = numColorsID;
		numColors.min = "1";
		numColors.max = "255";
		numColors.step = "1";
		numColors.value = this.num.toString();
		numColors.size = 4;
		numColors.onchange = () => {
			let value = parseInt(numColors.value);

			value = Math.max(value, parseInt(numColors.min));
			value = Math.min(value, parseInt(numColors.max));

			this.num = value;
			numColors.value = value.toString();

			syncPaletteView();
		};
		const numLbl = <HTMLLabelElement> document.createElement("label");
		numLbl.htmlFor = numColorsID;
		numLbl.textContent = "Count:";

		innerDivs[2].append(numLbl, document.createElement("br"), numColors);
		
		innerTbl.append(innerDivs[0], innerDivs[1], innerDivs[2]);

		td[1].appendChild(innerTbl);

		tr.append(td[0], td[1], td[2]);

		return tr;
	}
}

///////////////////////////////////////////////////////////////////////////////
// Bezier Fast Sampler

function linear2quadbez_fast(t: number, p1: number) {
	t = t / 255.0;
	return Math.round(((2.0 * (1.0 - t) * t * p1) + (t * t)) * 255);
}

class BezierFastSampler implements Sampler {
	_htmlID: number;

	start: ColorRGB;
	end: ColorRGB;
	num: number;
	controlPoint: number;

	id(): string {
		return "bezier-fast";
	}

	htmlID(): number {
		return this._htmlID;
	}

	constructor(
		htmlID: number,
		start: ColorRGB = { r: 0, g: 0, b: 0 }, 
		end: ColorRGB = { r: 255, g: 255, b: 255 },
		num: number = 16,
		controlPoint: number = 0.25)
	{
		this._htmlID = htmlID;

		this.start = start;
		this.end = end;
		this.num = num;
		this.controlPoint = controlPoint;
	}
	
	public serialize(): string {
		return "BezierFastSampler:" + JSON.stringify(this);
	}

	public static deserialize(code: string): BezierFastSampler {
		const params = JSON.parse(code);

		return new BezierFastSampler(
			params._htmlID, 
			params.start, params.end, params.num, 
			params.controlPoint
		);
	}

	sample(): ColorRGB[] {
		const linColors = generateColorsLerp(this.start, this.end, this.num);

		const colors : ColorRGB[] = [];
		linColors.forEach(color => {
			colors.push({
				r: linear2quadbez_fast(color.r, this.controlPoint),
				g: linear2quadbez_fast(color.g, this.controlPoint),
				b: linear2quadbez_fast(color.b, this.controlPoint)
			});
		});

		return colors;
	}

	public createHTML(): HTMLTableRowElement {
		const id = "sampler-" + this._htmlID;
		const tr = document.createElement("tr");
		tr.id = id;
		
		const td = [
			document.createElement("td"),
			document.createElement("td"),
			document.createElement("td")
		];

		td[0].innerHTML = "Bézier<br/><i>(Fast)</i>";
		td[0].classList.add("pseudo-th");

		const innerTbl = document.createElement("div");
		innerTbl.classList.add("parameters-list", "parameters-list-bezier1");

		const innerDivs = [
			document.createElement("div"),
			document.createElement("div"),
			document.createElement("div"),
			document.createElement("div")
		];

		const startColorID = id + "-start";
		const startColor = <HTMLInputElement> document.createElement("input");
		startColor.type = "color";
		startColor.id = startColorID;
		startColor.value = rgb2str(this.start);
		startColor.onchange = () => {
			this.start = str2rgb(startColor.value);
			syncPaletteView();
		};
		const startLbl = <HTMLLabelElement> document.createElement("label");
		startLbl.htmlFor = startColorID;
		startLbl.textContent = "Start:";

		innerDivs[0].append(startLbl, document.createElement("br"), startColor);

		const endColorID = id + "-end";
		const endColor = <HTMLInputElement> document.createElement("input");
		endColor.type = "color";
		endColor.id = endColorID;
		endColor.value = rgb2str(this.end);
		endColor.onchange = () => {
			this.end = str2rgb(endColor.value);
			syncPaletteView();
		};
		const endLbl = <HTMLLabelElement> document.createElement("label");
		endLbl.htmlFor = endColorID;
		endLbl.textContent = "End:";

		innerDivs[1].append(endLbl, document.createElement("br"), endColor);

		const numColorsID = id + "-num";
		const numColors = <HTMLInputElement> document.createElement("input");
		numColors.type = "number";
		numColors.id = numColorsID;
		numColors.min = "1";
		numColors.max = "255";
		numColors.step = "1";
		numColors.value = this.num.toString();
		numColors.size = 4;
		numColors.onchange = () => {
			let value = parseInt(numColors.value);

			value = Math.max(value, parseInt(numColors.min));
			value = Math.min(value, parseInt(numColors.max));

			this.num = value;
			numColors.value = value.toString();

			syncPaletteView();
		};
		const numLbl = <HTMLLabelElement> document.createElement("label");
		numLbl.htmlFor = numColorsID;
		numLbl.textContent = "Count:";

		innerDivs[2].append(numLbl, document.createElement("br"), numColors);

		const ctrlPntID = id + "-cp";
		const ctrlPnt = <HTMLInputElement> document.createElement("input");
		ctrlPnt.type = "number";
		ctrlPnt.id = ctrlPntID;
		ctrlPnt.min = "0.0";
		ctrlPnt.max = "1.0";
		ctrlPnt.step = "0.01";
		ctrlPnt.value = this.controlPoint.toString();
		ctrlPnt.size = 4;
		ctrlPnt.onchange = () => {
			let value = parseFloat(ctrlPnt.value);

			value = Math.max(value, parseFloat(ctrlPnt.min));
			value = Math.min(value, parseFloat(ctrlPnt.max));

			this.controlPoint = value;
			ctrlPnt.value = value.toString();

			syncPaletteView();
		};
		const cpLbl = <HTMLLabelElement> document.createElement("label");
		cpLbl.htmlFor = ctrlPntID;
		cpLbl.textContent = "Control Point:";

		innerDivs[3].append(cpLbl, document.createElement("br"), ctrlPnt);
		
		innerTbl.append(innerDivs[0], innerDivs[1], innerDivs[2], innerDivs[3]);

		td[1].appendChild(innerTbl);

		tr.append(td[0], td[1], td[2]);

		return tr;
	}
}

///////////////////////////////////////////////////////////////////////////////
// Bezier Sampler

function quadBezierEq(t: number, p: number): number {
	return (2.0 * (1.0 - t) * t * p) + (t * t);
}

function quadBezierTFromX(
	p: number, 
	x: number, 
	tStep: number = 0.1,
	tSet: number = 0,
	precision: number = 0.0001): number
{
	let tSet2 = tSet;
	let xSet2 = 0.0;

	if(tStep < precision)
		return tSet;

	while(xSet2 < x) {
		tSet = tSet2;
		tSet2 = tSet2 + tStep;
		xSet2 = quadBezierEq(tSet2, p);
	}

	return quadBezierTFromX(p, x, tStep * 0.5, tSet);
}

function linear2quadbez(x: number, p: [number,number]): number {
	x = x / 255.0;

	const t = quadBezierTFromX(p[0], x);
	const y = quadBezierEq(t, p[1]);

	return Math.round(y * 255);
}

class BezierQuadraticSampler implements Sampler {
	_htmlID: number;

	start: ColorRGB;
	end: ColorRGB;
	num: number;
	controlPoint: [number,number];

	id(): string {
		return "bezier-quad";
	}

	htmlID(): number {
		return this._htmlID;
	}

	constructor(
		htmlID: number,
		start: ColorRGB = { r: 0, g: 0, b: 0 }, 
		end: ColorRGB = { r: 255, g: 255, b: 255 },
		num: number = 16,
		controlPoint: [number,number] = [0.50, 0.15])
	{
		this._htmlID = htmlID;

		this.start = start;
		this.end = end;
		this.num = num;
		this.controlPoint = controlPoint;
	}
	
	public serialize(): string {
		return "BezierQuadraticSampler:" + JSON.stringify(this);
	}

	public static deserialize(code: string): BezierQuadraticSampler {
		const params = JSON.parse(code);

		return new BezierQuadraticSampler(
			params._htmlID, 
			params.start, params.end, params.num, 
			params.controlPoint
		);
	}

	sample(): ColorRGB[] {
		const linColors = generateColorsLerp(this.start, this.end, this.num);

		const colors : ColorRGB[] = [];
		linColors.forEach(color => {
			colors.push({
				r: linear2quadbez(color.r, this.controlPoint),
				g: linear2quadbez(color.g, this.controlPoint),
				b: linear2quadbez(color.b, this.controlPoint)
			});
		});

		return colors;
	}

	public createHTML(): HTMLTableRowElement {
		const id = "sampler-" + this._htmlID;
		const tr = document.createElement("tr");
		tr.id = id;
		
		const td = [
			document.createElement("td"),
			document.createElement("td"),
			document.createElement("td")
		];

		td[0].innerHTML = "Bézier<br/><i>(Quadratic)</i>";
		td[0].classList.add("pseudo-th");

		const innerTbl = document.createElement("div");
		innerTbl.classList.add("parameters-list", "parameters-list-bezier2");

		const innerDivs = [
			document.createElement("div"),
			document.createElement("div"),
			document.createElement("div"),
			document.createElement("div")
		];

		const startColorID = id + "-start";
		const startColor = <HTMLInputElement> document.createElement("input");
		startColor.type = "color";
		startColor.id = startColorID;
		startColor.value = rgb2str(this.start);
		startColor.onchange = () => {
			this.start = str2rgb(startColor.value);
			syncPaletteView();
		};
		const startLbl = <HTMLLabelElement> document.createElement("label");
		startLbl.htmlFor = startColorID;
		startLbl.textContent = "Start:";

		innerDivs[0].append(startLbl, document.createElement("br"), startColor);

		const endColorID = id + "-end";
		const endColor = <HTMLInputElement> document.createElement("input");
		endColor.type = "color";
		endColor.id = endColorID;
		endColor.value = rgb2str(this.end);
		endColor.onchange = () => {
			this.end = str2rgb(endColor.value);
			syncPaletteView();
		};
		const endLbl = <HTMLLabelElement> document.createElement("label");
		endLbl.htmlFor = endColorID;
		endLbl.textContent = "End:";

		innerDivs[1].append(endLbl, document.createElement("br"), endColor);

		const numColorsID = id + "-num";
		const numColors = <HTMLInputElement> document.createElement("input");
		numColors.type = "number";
		numColors.id = numColorsID;
		numColors.min = "1";
		numColors.max = "255";
		numColors.step = "1";
		numColors.value = this.num.toString();
		numColors.size = 4;
		numColors.onchange = () => {
			let value = parseInt(numColors.value);

			value = Math.max(value, parseInt(numColors.min));
			value = Math.min(value, parseInt(numColors.max));

			this.num = value;
			numColors.value = value.toString();

			syncPaletteView();
		};
		const numLbl = <HTMLLabelElement> document.createElement("label");
		numLbl.htmlFor = numColorsID;
		numLbl.textContent = "Count:";

		innerDivs[2].append(numLbl, document.createElement("br"), numColors);

		const ctrlPntXID = id + "-cp-x";
		const ctrlPntX = <HTMLInputElement> document.createElement("input");
		ctrlPntX.type = "number";
		ctrlPntX.id = ctrlPntXID;
		ctrlPntX.min = "0.0";
		ctrlPntX.max = "1.0";
		ctrlPntX.step = "0.01";
		ctrlPntX.value = this.controlPoint[0].toString();
		ctrlPntX.size = 4;
		ctrlPntX.onchange = () => {
			let value = parseFloat(ctrlPntX.value);

			value = Math.max(value, parseFloat(ctrlPntX.min));
			value = Math.min(value, parseFloat(ctrlPntX.max));

			this.controlPoint[0] = value;
			ctrlPntX.value = value.toString();

			syncPaletteView();
		};

		const ctrlPntYID = id + "-cp-y";
		const ctrlPntY = <HTMLInputElement> document.createElement("input");
		ctrlPntY.type = "number";
		ctrlPntY.id = ctrlPntYID;
		ctrlPntY.min = "0.0";
		ctrlPntY.max = "1.0";
		ctrlPntY.step = "0.01";
		ctrlPntY.value = this.controlPoint[1].toString();
		ctrlPntY.size = 4;
		ctrlPntY.onchange = () => {
			let value = parseFloat(ctrlPntY.value);

			value = Math.max(value, parseFloat(ctrlPntY.min));
			value = Math.min(value, parseFloat(ctrlPntY.max));

			this.controlPoint[1] = value;
			ctrlPntY.value = value.toString();

			syncPaletteView();
		};
		const cpLbl = <HTMLLabelElement> document.createElement("label");
		cpLbl.textContent = "Control Point:";

		innerDivs[3].append(
			cpLbl,
			document.createElement("br"),
			ctrlPntX, ctrlPntY);
		
		innerTbl.append(innerDivs[0], innerDivs[1], innerDivs[2], innerDivs[3]);

		td[1].appendChild(innerTbl);

		tr.append(td[0], td[1], td[2]);

		return tr;
	}
}

///////////////////////////////////////////////////////////////////////////////
// HSV Sampler

class HSVSampler implements Sampler {
	_htmlID: number;

	start: ColorHSV;
	end: ColorHSV;
	hueCount: number;
	satCount: number;
	valCount: number;

	id(): string {
		return "hsv";
	}

	htmlID(): number {
		return this._htmlID;
	}

	constructor(
		htmlID: number,
		start: ColorHSV = { h: 0, s: 100, v: 100 },
		end: ColorHSV = { h: 360, s: 30, v: 30 },
		hueCount: number = 8,
		satCount: number = 3,
		valCount: number = 3)
	{
		this._htmlID = htmlID;

		this.start = start;
		this.end = end;
		this.hueCount = hueCount;
		this.satCount = satCount;
		this.valCount = valCount;
	}
	
	public serialize(): string {
		return "HSVSampler:" + JSON.stringify(this);
	}

	public static deserialize(code: string): HSVSampler {
		const params = JSON.parse(code);

		return new HSVSampler(
			params._htmlID,
			params.start, params.end, 
			params.hueCount, params.satCount, params.valCount
		);
	}

	sample(): ColorRGB[] {
		const hStep = (this.end.h - this.start.h) / (this.hueCount - 1);
		const sStep = (this.end.s - this.start.s) / (this.satCount - 1);
		const vStep = (this.end.v - this.start.v) / (this.valCount - 1);

		const colors : ColorHSV[] = [];
		for(let sIndex = 0; sIndex < this.satCount; sIndex++) {
			const s = Math.round((sIndex * sStep) + this.start.s);

			for(let vIndex = 0; vIndex < this.valCount; vIndex++) {
				const v = Math.round((vIndex * vStep) + this.start.v);

				for(let hIndex = 0; hIndex < this.hueCount; hIndex++) {
					const h = Math.round((hIndex * hStep) + this.start.h);

					colors.push({ h: h, v: v, s: s });
				}
			}
		}

		return colors.map(color => {
			return hsv2rgb(color);
		});
	}

	public createHTML(): HTMLTableRowElement {
		const id = "sampler-" + this._htmlID;
		const tr = document.createElement("tr");
		tr.id = id;
		
		const td = [
			document.createElement("td"),
			document.createElement("td"),
			document.createElement("td")
		];

		td[0].innerHTML = "Hue<br/>Saturation</br>Value";
		td[0].classList.add("pseudo-th");

		const innerTbl = document.createElement("div");
		innerTbl.classList.add("parameters-tbl");

		const header = document.createElement("div");

		const headerCells = [
			document.createElement("div"),
			document.createElement("div"),
			document.createElement("div"),
			document.createElement("div")
		];

		headerCells[1].textContent = "Hue";
		headerCells[2].textContent = "Saturation";
		headerCells[3].textContent = "Value";

		header.append(
			headerCells[0], headerCells[1], headerCells[2], headerCells[3]);

		const body = document.createElement("div");

		const bodyRows = [
			document.createElement("div"),
			document.createElement("div"),
			document.createElement("div")
		];

		const startCells = [
			document.createElement("div"),
			document.createElement("div"),
			document.createElement("div"),
			document.createElement("div")
		];

		startCells[0].textContent = "Start: ";

		const startHueID = id + "-start-hue";
		const startHue = <HTMLInputElement> document.createElement("input");
		startHue.type = "number";
		startHue.id = startHueID;
		startHue.min = "0";
		startHue.max = "360";
		startHue.step = "1";
		startHue.value = this.start.h.toString();
		startHue.onchange = () => {
			this.start.h = parseInt(startHue.value);
			syncPaletteView();
		};

		startCells[1].appendChild(startHue);

		const startSatID = id + "-start-sat";
		const startSat = <HTMLInputElement> document.createElement("input");
		startSat.type = "number";
		startSat.id = startSatID;
		startSat.min = "0";
		startSat.max = "100";
		startSat.step = "1";
		startSat.value = this.start.s.toString();
		startSat.onchange = () => {
			let value = parseInt(startSat.value);

			value = Math.max(value, parseInt(startSat.min));
			value = Math.min(value, parseInt(startSat.max));

			this.start.s = value;
			startSat.value = value.toString();

			syncPaletteView();
		};

		startCells[2].appendChild(startSat);

		const startValID = id + "-start-val";
		const startVal = <HTMLInputElement> document.createElement("input");
		startVal.type = "number";
		startVal.id = startValID;
		startVal.min = "0";
		startVal.max = "100";
		startVal.step = "1";
		startVal.value = this.start.v.toString();
		startVal.onchange = () => {
			let value = parseInt(startVal.value);

			value = Math.max(value, parseInt(startVal.min));
			value = Math.min(value, parseInt(startVal.max));

			this.start.v = value;
			startVal.value = value.toString();

			syncPaletteView();
		};

		startCells[3].appendChild(startVal);
		
		const endCells = [
			document.createElement("div"),
			document.createElement("div"),
			document.createElement("div"),
			document.createElement("div")
		];

		endCells[0].textContent = "End: ";

		const endHueID = id + "-end-hue";
		const endHue = <HTMLInputElement> document.createElement("input");
		endHue.type = "number";
		endHue.id = endHueID;
		endHue.min = "0";
		endHue.max = "360";
		endHue.step = "1";
		endHue.value = this.end.h.toString();
		endHue.onchange = () => {
			this.end.h = parseInt(endHue.value);
			syncPaletteView();
		};

		endCells[1].appendChild(endHue);

		const endSatID = id + "-end-sat";
		const endSat = <HTMLInputElement> document.createElement("input");
		endSat.type = "number";
		endSat.id = endSatID;
		endSat.min = "0";
		endSat.max = "100";
		endSat.step = "1";
		endSat.value = this.end.s.toString();
		endSat.onchange = () => {
			let value = parseInt(endSat.value);

			value = Math.max(value, parseInt(endSat.min));
			value = Math.min(value, parseInt(endSat.max));

			this.end.s = value;
			endSat.value = value.toString();

			syncPaletteView();
		};

		endCells[2].appendChild(endSat);

		const endValID = id + "-end-val";
		const endVal = <HTMLInputElement> document.createElement("input");
		endVal.type = "number";
		endVal.id = endValID;
		endVal.min = "0";
		endVal.max = "100";
		endVal.step = "1";
		endVal.value = this.end.v.toString();
		endVal.onchange = () => {
			let value = parseInt(endVal.value);

			value = Math.max(value, parseInt(endVal.min));
			value = Math.min(value, parseInt(endVal.max));

			this.end.v = value;
			endVal.value = value.toString();

			syncPaletteView();
		};

		endCells[3].appendChild(endVal);

		const countCells = [
			document.createElement("td"),
			document.createElement("td"),
			document.createElement("td"),
			document.createElement("td")
		];

		countCells[0].textContent = "Bands: ";

		const hueCountID = id + "-hues";
		const hueCount = <HTMLInputElement> document.createElement("input");
		hueCount.type = "number";
		hueCount.id = hueCountID;
		hueCount.min = "1";
		hueCount.max = "99";
		hueCount.step = "1";
		hueCount.value = this.hueCount.toString();
		hueCount.onchange = () => {
			let value = parseInt(hueCount.value);

			value = Math.max(value, parseInt(hueCount.min));
			value = Math.min(value, parseInt(hueCount.max));

			this.hueCount = value;
			hueCount.value = value.toString();

			syncPaletteView();
		};

		countCells[1].appendChild(hueCount);

		const satCountID = id + "-sats";
		const satCount = <HTMLInputElement> document.createElement("input");
		satCount.type = "number";
		satCount.id = satCountID;
		satCount.min = "1";
		satCount.max = "99";
		satCount.step = "1";
		satCount.value = this.satCount.toString();
		satCount.onchange = () => {
			let value = parseInt(satCount.value);

			value = Math.max(value, parseInt(satCount.min));
			value = Math.min(value, parseInt(satCount.max));

			this.satCount = value;
			satCount.value = value.toString();

			syncPaletteView();
		};

		countCells[2].appendChild(satCount);

		const valCountID = id + "-vals";
		const valCount = <HTMLInputElement> document.createElement("input");
		valCount.type = "number";
		valCount.id = valCountID;
		valCount.min = "1";
		valCount.max = "99";
		valCount.step = "1";
		valCount.value = this.valCount.toString();
		valCount.onchange = () => {
			let value = parseInt(valCount.value);

			value = Math.max(value, parseInt(valCount.min));
			value = Math.min(value, parseInt(valCount.max));

			this.valCount = value;
			valCount.value = value.toString();

			syncPaletteView();
		};

		countCells[3].appendChild(valCount);

		header.append(
			headerCells[0], headerCells[1], headerCells[2], headerCells[3]);

		bodyRows[0].append(
			startCells[0], startCells[1], startCells[2], startCells[3]);
		bodyRows[1].append(
			endCells[0], endCells[1], endCells[2], endCells[3]);
		bodyRows[2].append(
			countCells[0], countCells[1], countCells[2], countCells[3]);

		innerTbl.append(
			header, bodyRows[0], bodyRows[1], bodyRows[2]);

		td[1].appendChild(innerTbl);

		tr.append(td[0], td[1], td[2]);

		return tr;
	}
}

function getColorsFrom(samplers: Sampler[]): ColorRGB[] {
	let colors : ColorRGB[] = [];
	
	samplers.forEach(sampler => { colors = colors.concat(sampler.sample()); });

	return colors;
}

function getSamplers(): Sampler[] {
	return g_samplers;
}

function setSamplers(samplers: Sampler[]) {
	g_samplers = samplers;
}

function genSamplerID(): number {
	g_accumulator++;
	return g_accumulator;
}

function resetSamplers() {
	g_samplers = []

	g_accumulator = 0;

	const properties = document.getElementById("properties");
	properties.innerHTML = "";
}

function removeDuplicates(colors: ColorRGB[]): ColorRGB[] {
	let cleanedColors: ColorRGB[] = [];

	colors.forEach(color => {
		const duplicate = cleanedColors.find(color2 => {
			const equality: boolean = 
				(color.r == color2.r) && 
				(color.g == color2.g) && 
				(color.b == color2.b);
			return equality;
		});
		if(!duplicate)
			cleanedColors.push(color);
	});

	return cleanedColors;
}

