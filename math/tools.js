function basic(op){
    let a = Number(document.getElementById("baseA").value);
    let b = Number(document.getElementById("baseB").value);

    let r = eval(a + op + b);
    document.getElementById("resBasic").innerText = r;
}

function pythagoras(){
    let a = Number(document.getElementById("a").value);
    let b = Number(document.getElementById("b").value);

    document.getElementById("resPyth").innerText =
        Math.sqrt(a*a + b*b).toFixed(2);
}

function quadratic(){
    let a = Number(document.getElementById("qa").value);
    let b = Number(document.getElementById("qb").value);
    let c = Number(document.getElementById("qc").value);

    let d = b*b - 4*a*c;

    if(d < 0){
        document.getElementById("resQuad").innerText = "No real roots";
        return;
    }

    let x1 = (-b + Math.sqrt(d)) / (2*a);
    let x2 = (-b - Math.sqrt(d)) / (2*a);

    document.getElementById("resQuad").innerText = `${x1}, ${x2}`;
}

function trig(type){
    let a = document.getElementById("angle").value * Math.PI/180;
    document.getElementById("resTrig").innerText = Math[type](a).toFixed(4);
}

function average(){
    let arr = document.getElementById("avgInput").value.split(",").map(Number);
    let sum = arr.reduce((a,b)=>a+b,0);
    document.getElementById("resAvg").innerText = sum/arr.length;
}

function circle(){
    let r = Number(document.getElementById("r").value);
    document.getElementById("resCircle").innerText = Math.PI*r*r;
}

async function convert(){
    let amount = document.getElementById("amount").value;
    let from = document.getElementById("from").value;
    let to = document.getElementById("to").value;

    let res = await fetch(`https://open.er-api.com/v6/latest/${from}`);
    let data = await res.json();

    document.getElementById("resConvert").innerText =
        amount * data.rates[to];
}

/* calculator */
let s = "";

function c(v){
    s += v;
    document.getElementById("screen").innerText = s;
}

function calc(){
    s = eval(s).toString();
    document.getElementById("screen").innerText = s;
}

function clearCalc(){
    s = "";
    document.getElementById("screen").innerText = "0";
}

function toggleCalc(){
    let el = document.getElementById("calc");
    el.style.display = el.style.display === "block" ? "none" : "block";
}

/* search */
function filterTools(){
    let q = document.getElementById("searchBar").value.toLowerCase();
    document.querySelectorAll(".tool-card").forEach(c=>{
        c.style.display = c.innerText.toLowerCase().includes(q) ? "block" : "none";
    });
}