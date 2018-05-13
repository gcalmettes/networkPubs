// Sliders
const linkStrengthSlider = d3.select("#linkStrengthSlider")
let linkStrengthSliderRange = Array.prototype.map.call(linkStrengthSlider.selectAll("input")._groups[0], getSliderCurrentVals)

linkStrengthSlider.on("input", function () {
    linkStrengthSliderRange = Array.prototype.map.call(linkStrengthSlider.selectAll("input")._groups[0], getSliderCurrentVals)
    linkStrengthScale.range(linkStrengthSliderRange)
    simulation.alphaTarget(0.3).restart()
    render()
});


const sizeStrengthSlider = d3.select("#nodeStrengthSlider")
let sizeStrengthSliderRange = Array.prototype.map.call(sizeStrengthSlider.selectAll("input")._groups[0], getSliderCurrentVals)

sizeStrengthSlider.on("input", function () {
    sizeStrengthSliderRange = Array.prototype.map.call(sizeStrengthSlider.selectAll("input")._groups[0], getSliderCurrentVals)
    sizeStrengthScale.range(sizeStrengthSliderRange.reverse())
    simulation.alphaTarget(0.3).restart()
    render()
});


// scales for nodes and links
const nodeScale = d3.scaleLinear().range([2, 20])
const labelScale = d3.scaleLinear().range([0.4, 1])
const edgeScale = d3.scaleLinear().range([0.01, 8])
const opacityScale = d3.scaleLinear().range([1, 1])
const nodeColorScale = d3.scaleSequential(d3.interpolateCool)
const edgeColorScale = d3.scaleSequential(d3.interpolatePuRd)

let nodes, graph, context, 
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
  .force("center", d3.forceCenter(width / 2, height / 2));


// For development purpose, can use pre-saved data
function showMeTheGraphForFile(fileName){
  // get the data and draw graph
  d3.json(fileName).then(graphData => {

    graph = graphData
    render();
    simulation.alphaTarget(0.3).restart()
    console.log("Enjoy!")
  });
}

function showMeTheGraphFor(authorsList){
  // get the data and draw graph
  getAuthorGraph(authorsList, width, height).then(graphData => {

    // const toSave = JSON.stringify(graphData)
    // downloadToJSON(toSave, 'network_file.txt', 'text/plain');

    graph = graphData
    render();
    simulation.alphaTarget(0.3).restart()
    console.log("Enjoy!")
  });
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

  // canvas for drawing edges
  let canvas = container.selectAll('canvas').data([null]);
  canvas = canvas.enter().append("canvas")
    .merge(canvas)
      .attr("width", width)
      .attr("height", height);
  context = canvas.node()
    .getContext("2d");

  // svg for nodes so tracking is possible  
  let svg = container.selectAll('svg').data([null]);
  svg = svg.enter().append('svg')
    .merge(svg)
      .attr('width', width)
      .attr('height', height);

  nodes = svg.selectAll(".node").data(graph.nodes)
  nodes.exit().remove()
  
  nodesEnter = nodes.enter().append("g")
      .attr("class", "node")
  nodesEnter.append("circle")
      .attr("class", "nodeCircle")
      .attr("r", d => nodeScale(d.size))
      .attr("fill", d => nodeColorScale(d.size))
  nodesEnter.append("text")
      .attr("class", "nodeLabel")
      .attr("dx", 0)
      .attr("dy", 15)
      .style("text-anchor", "middle")
      .text(d => d.id)
      .style("font-size", d => `${labelScale(d.size)}em`)
      
  
  nodesMerge = nodesEnter.merge(nodes)
  nodesMerge.select(".nodeCircle")
      .attr("r", d => nodeScale(d.size))
      .attr("fill", d => nodeColorScale(d.size))
  nodesMerge.select(".nodeLabel")
      .text(d => d.id)
      .style("font-size", d => `${labelScale(d.size)}em`)
  nodesMerge.call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

  simulation.force("center", d3.forceCenter(width / 2, height / 2));
  simulation
    .nodes(graph.nodes)
    .on("tick", ticked);
  simulation.force("link")
    .links(graph.edges);
  // simulation.alphaTarget(0.3).restart()

  // draw links
  context.clearRect(0, 0, width, height);
  graph.edges.forEach(d => {

    // keep the nodes within the boundaries of the svg
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
  });

}


function ticked() {
  // update nodes
  nodesMerge
    .attr("transform", d => {
      // keep the node within the boundaries of the svg
      d.x = d.x < 0 ? 0 : d.x > width ? width : d.x
      d.y = d.y < 0 ? 0 : d.y > height ? height : d.y
      return `translate(${d.x}, ${d.y})`
    })

  // draw links
  context.clearRect(0, 0, width, height);
  graph.edges.forEach(d => {

    // keep the nodes within the boundaries of the svg
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
  });
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

function dragstarted(d) {
  if (!d3.event.active) simulation.alphaTarget(0.8).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(d) {
  d.fx = d3.event.x;
  d.fy = d3.event.y;
}

function dragended(d) {
  if (!d3.event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}


function getSliderCurrentVals(slider){
  return +slider.value
}
