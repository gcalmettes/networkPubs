// Sliders
const linkStrengthSlider = d3.select("#linkStrengthSlider")
let linkStrengthSliderRange = Array.prototype.map.call(linkStrengthSlider.selectAll("input")._groups[0], getSliderCurrentVals)

linkStrengthSlider.on("input", function () {
    linkStrengthSliderRange = Array.prototype.map.call(linkStrengthSlider.selectAll("input")._groups[0], getSliderCurrentVals)
    linkStrengthScale.range(linkStrengthSliderRange)
    // update simulation with new scales and relaunch
    updateScaleRanges(graph)
    simulation
      .nodes(graph.nodes)
      .on("tick", ticked);
    simulation.force("link")
      .links(graph.edges)
    simulation.alphaTarget(0.3).restart()
});


const sizeStrengthSlider = d3.select("#nodeStrengthSlider")
let sizeStrengthSliderRange = Array.prototype.map.call(sizeStrengthSlider.selectAll("input")._groups[0], getSliderCurrentVals)

sizeStrengthSlider.on("input", function () {
    sizeStrengthSliderRange = Array.prototype.map.call(sizeStrengthSlider.selectAll("input")._groups[0], getSliderCurrentVals)
    sizeStrengthScale.range(sizeStrengthSliderRange.reverse())
    // update simulation with new scales and relaunch
    updateScaleRanges(graph)
    simulation
      .nodes(graph.nodes)
      .on("tick", ticked);
    simulation.force("link")
      .links(graph.edges)
    simulation.alphaTarget(0.3).restart()
});


// scales for nodes and links
const nodeScale = d3.scaleLinear().range([2, 20])
const labelScale = d3.scaleLinear().range([6, 20])
const edgeScale = d3.scaleLinear().range([1, 10])
const opacityScale = d3.scaleLinear().range([1, 1])
const nodeColorScale = d3.scaleSequential(d3.interpolateCool)
const edgeColorScale = d3.scaleSequential(d3.interpolatePuRd)

let nodes, graph, context,  canvas,
    width = document.querySelector("#viz").clientWidth

const viz = d3.select('#viz'),
      height = 500


// force layout simulation
const linkStrengthScale = d3.scaleLinear()
  .range(linkStrengthSliderRange);
const sizeStrengthScale = d3.scaleLinear()
  .range(sizeStrengthSliderRange.reverse());

const simulation = d3.forceSimulation()
  .force("link", d3.forceLink().id(d => d.id).strength(d => linkStrengthScale(+d.size)))
  .force("charge", d3.forceManyBody().strength(d => sizeStrengthScale(+d.size)))
  .force("center", d3.forceCenter(width / 2, height / 2))


function createCanvas(container, ratio){
	//////////////////////////////////////////////////////
  // Create canvas but with increased resolution
  // so text looks crisp! 
  // see https://stackoverflow.com/questions/15661339/how-do-i-fix-blurry-text-in-my-html5-canvas
  let PIXEL_RATIO = (function () {
    let ctx = document.createElement("canvas").getContext("2d"),
        dpr = window.devicePixelRatio || 1,
        bsr = ctx.webkitBackingStorePixelRatio ||
              ctx.mozBackingStorePixelRatio ||
              ctx.msBackingStorePixelRatio ||
              ctx.oBackingStorePixelRatio ||
              ctx.backingStorePixelRatio || 1;
    return dpr / bsr;
  })();
  // let ratio // optionally set this variable to something, e.g.: 4
  if (!ratio) { ratio = PIXEL_RATIO; }

  let canvas = container.selectAll('canvas').data([null]);
  canvas = canvas.enter().append("canvas")
    .merge(canvas)
      .attr("width", width*ratio) // *ratio
      .attr("height", height*ratio) //*ratio
    .node()

  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  context = canvas.getContext("2d")
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  ///////////////////////////////////////////////
  return canvas
}

async function buildNetwork(query = "calmettes[author]", limit=60, filterMax=false){
	canvas = createCanvas(viz)

	const iterator = getResultIterator(query, limit)
	let publications = []
	for await(const pub of iterator) {
		publications.push(pub)
		const graphData = constructGraph(publications, graph, width, height, filterMax)
    graph = graphData
    // console.log(graph)
		// ascending order for graph.edges so thicher edges will be drawn on top
	    graph.edges.sort((a, b) => a.size-b.size)
	    render();
	    //simulation.alphaTarget(0.3).restart()
	    // document.querySelector("#waiting").style.opacity="0"
	}
}


// render on window resize
window.addEventListener('resize', render);

function render() {
  width = document.querySelector("#viz").clientWidth
  drawScene(graph, viz, {
    width: width,
    height: height
  });
}

function drawScene(graph, container, props) {
  const { width, height } = props;
  updateScaleRanges(graph)


  simulation
    .force("center", d3.forceCenter(width / 2, height / 2));
  
  simulation
    .nodes(graph.nodes)
    .on("tick", ticked);
  simulation.force("link")
    .links(graph.edges);


  d3.select(canvas)
    .call(d3.drag()
      .container(canvas)
      .subject(dragsubject)
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));
  simulation.alphaTarget(0.3).restart()

}

//////
function ticked() {
    context.clearRect(0, 0, width, height);
    graph.edges.forEach(drawEdges);
    graph.nodes.forEach(drawNode);
}

function dragsubject() {
    return simulation.find(d3.event.x, d3.event.y);
}
function dragstarted() {
  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
  d3.event.subject.fx = d3.event.subject.x;
  d3.event.subject.fy = d3.event.subject.y;
}

function dragged() {
  d3.event.subject.fx = d3.event.x;
  d3.event.subject.fy = d3.event.y;
}

function dragended() {
  if (!d3.event.active) simulation.alphaTarget(0);
  d3.event.subject.fx = null;
  d3.event.subject.fy = null;
}

function drawEdges(d) {
  // keep the nodes within the boundaries of the canvas
  d.target.x = d.target.x < 0 ? 0 : d.target.x > width ? width : d.target.x
  d.target.y = d.target.y < 0 ? 0 : d.target.y > height ? height : d.target.y
  d.source.x = d.source.x < 0 ? 0 : d.source.x > width ? width : d.source.x
  d.source.y = d.source.y < 0 ? 0 : d.source.y > height ? height : d.source.y

  const dx = d.target.x - d.source.x,
        dy = d.target.y - d.source.y
  const dr = Math.sqrt(dx * dx + dy * dy);

  context.strokeStyle = edgeColorScale(d.size);

  context.beginPath();
  const p = new Path2D(`M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`);
  context.lineWidth = edgeScale(d.size)
  context.stroke(p);
}

function drawNode(d) {
  context.moveTo(d.x + 3, d.y);
  context.beginPath();
  context.fillStyle = nodeColorScale(d.size)
  context.strokeStyle = "black";
  context.lineWidth = 1
  context.arc(d.x, d.y, nodeScale(d.size), 0, 2 * Math.PI);
  context.fill();
  context.stroke();

  context.font = `${labelScale(d.size)}px Raleway`
  context.fillStyle = "black" //"#BFBFBF";
  context.textAlign = "center";
  context.textBaseline = "middle"; 
  context.fillText(`${d.id}`, d.x, d.y-nodeScale(d.size));
            
}

function updateScaleRanges(graph){
  // set scales domain from data
  nodeScale.domain(d3.extent(graph.nodes, d => d.size))
  nodeColorScale.domain(d3.extent(graph.nodes, d => d.size))
  labelScale.domain(d3.extent(graph.nodes, d => d.size))
  edgeColorScale.domain(d3.extent(graph.edges, d => d.size))
  edgeScale.domain(d3.extent(graph.edges, d => d.size))
  opacityScale.domain(d3.extent(graph.edges, d => d.size))

  // set forces domain from data
  linkStrengthScale
    .domain(d3.extent(graph.edges, d => d.size))
  sizeStrengthScale
    .domain(d3.extent(graph.nodes, d => d.size))
}


function getSliderCurrentVals(slider){
  return +slider.value
}
