var nodeCount = 10;

var container = document.querySelector('.container');

function generateInitialLayout() {
    for (var i = 0; i < nodeCount; i++) {

        var div = document.createElement("div");
        container.appendChild(div);

        div.className += " node";

        var spread = 400;
        var x = Math.random() * spread + container.offsetWidth / 2 - spread;
        var y = Math.random() * spread + container.offsetHeight / 2 - spread / 2;

        div.style.top = y+"px";
        div.style.left = x+"px";
    }
}

generateInitialLayout();

var graph = graphLayout.newGraph();
var layout = graphLayout.newLayout(graph);
var divAdaptor = graphLayout.newDivAdaptor();

divAdaptor.setup(graph, '.node', document);

layout.start(function(graph) {

    divAdaptor.apply(graph);

}, function(graph) {
    console.log('Graph is stable');
});
