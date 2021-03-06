(function() {"use strict";/**
 * Vector class
 */
var Vector = function(x, y) {
    this.x = x;
    this.y = y;
};

Vector.random = function() {
    return new Vector(Math.random(), Math.random());
};

Vector.prototype.add = function(v2) {
    return new Vector(this.x + v2.x, this.y + v2.y);
};

Vector.prototype.subtract = function(v2) {
    return new Vector(this.x - v2.x, this.y - v2.y);
};

Vector.prototype.multiply = function(n) {
    return new Vector(this.x * n, this.y * n);
};

Vector.prototype.divide = function(n) {
    return new Vector((this.x / n) || 0, (this.y / n) || 0); // Avoid divide by zero errors..
};

Vector.prototype.magnitude = function() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
};

Vector.prototype.normal = function() {
    return new Vector(-this.y, this.x);
};

Vector.prototype.normalise = function() {
    return this.divide(this.magnitude());
};
;
/**
 * Node Class
 */
function Node(x, y, w, h) {

    this.pos = new Vector(x, y);
    this.size = new Vector(w, h);

    this.velocity = new Vector(0, 0);
    this.acceleration = new Vector(0, 0);
    this.mass = 1;
}

Node.prototype.getDiagonalLength = function() {
    return Math.sqrt(this.size.x * this.size.x + this.size.y * this.size.y);
}

Node.prototype.vectorTo = function(otherNode) {
    return otherNode.pos.subtract(this.pos);
}

Node.prototype.applyForce = function(force) {
    this.acceleration = this.acceleration.add(force.divide(this.mass));
}

Node.prototype.energy = function() {
    var speed = this.velocity.magnitude();
    return 0.5 * this.mass * speed * speed;
}

/**
 * Edge class
 */
function Edge(sourceID, targetId, springLength, k) {
    this.sourceId = sourceID;
    this.targetId = targetId;
}

/**
 * Graph class
 */
function Graph() {
    this.nodeList = [];
    this.edgeList = [];
    this.adjacency = [];
}

Graph.prototype.getEdgeNodes = function(edge) {
    return [this.nodeList[edge.sourceId], this.nodeList[edge.targetId]];
}

Graph.prototype.totalEnergy = function() {
    var energy = 0.0;
    this.forEachNode(function(node) {
        energy += node.energy();
    });

    return energy;
};

/**
 * Add a new node.
 * Node are defined by:
 * 	- a position: { x, y }
 *  - a size: { w,h }
 *
 * Additional user datacan be stored in each node by providing a data argument
 *
 * Each node must be uniquely identified.
 * Unique ID are automaticly assigned for each node ( using a single incremented integer )
 * Or can be provided using the id parameter
 */
Graph.prototype.addNode = function(x, y, w, h, data, id ) {
    var node = new Node(x, y, w, h);
    node.data = data;
    node.id = id || this.nodeList.length;
    this.nodeList.push(node);
    return node;
}

/**
 * Iterator over the list of nodes
 */
Graph.prototype.forEachNode = function(callback) {
    var t = this;
    this.nodeList.forEach(function(node) {
        callback.call(t, node);
    });
};

/**
 * Add an edge between to nodes
 */
Graph.prototype.addEdge = function(sourceId, targetId) {

    if (!(sourceId in this.adjacency)) {
        this.adjacency[sourceId] = [];
    }
    if (!(targetId in this.adjacency[sourceId])) {
        var edge = new Edge(sourceId, targetId);
        this.adjacency[sourceId][targetId] = edge;
        this.edgeList.push(edge);
    } else {
        throw new Error('Edge already exist');
        return null;
    }

    return this.adjacency[sourceId][targetId];
}

Graph.prototype.forEachEdge = function(callback) {
    var t = this;
    this.edgeList.forEach(function(edge) {
        callback.call(t, edge);
    });
};
;/**
 * Provide an adaptor to create a graph from a set of dom elements
 * Adaptor are created this way:
 * 	var divAdaptor = graphLayout.newDivAdaptor();
 * 	divAdaptor.setup(graph, '.node', document);
 */
function DivAdaptor() {

}

/**
 * This should be called on each layout update to move the dom elements according to the current state of the layout
 * @param  The currently used graph
 */
DivAdaptor.prototype.apply = function(graph) {
    graph.forEachNode(function(n) {
        n.data.style.top = n.pos.y+"px";
        n.data.style.left = n.pos.x+"px";
    });
}

/**
 * Build the graph
 * @param  graph        The graph to setup
 * @param  nodeSelector CSS selector to select with childs elements of rootElement should be interpreted as nodes
 * @param  rootElement  The root element
 */
DivAdaptor.prototype.setup = function(graph, nodeSelector, rootElement) {

    var nodes = rootElement.querySelectorAll(nodeSelector);

    for (var i = 0; i < nodes.length; i++) {
        var x = parseFloat(nodes[i].style.left);
        var y = parseFloat(nodes[i].style.top);
        graph.addNode(x, y, nodes[i].offsetWidth, nodes[i].offsetHeight, nodes[i]);
    }
    
    for (var i = 0; i < nodes.length; i++) {
        for (var j = 0; j < nodes.length; j++) {
            if (j != i) {
                graph.addEdge(i, j);
            }
        }
    }
    return graph;
}
;function Layout(graph, options) {
    if (options === undefined) {
        options = {};
    }
    this.graph = graph;
    this.springList = {};

    this.repulsionForce = options.repulsionForce || 400.0; // repulsionForce constant
    this.velocityDamping = options.velocityDamping || 0.7; // velocity velocityDamping factor
    this.minEnergyThreshold = options.minEnergyThreshold || 2; //threshold used to determine render stop
    this.maxIterationCount = options.maxIterationCount || 60 * 3;
    this.springStiffness = options.springStiffness || 20.0; // spring stiffness constant
    this.springMarginLength = options.springMarginLength || 10;
}

Layout.prototype.start = function(onUpdate, onGraphStable) {

    var self = this;
    var iterationCount = 0;
    var t0 = new Date().getTime();

    var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
        window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

    requestAnimationFrame(function step() {

        // Compute delta time
        var t1 = new Date().getTime();
        var dt = 0.001 * (t1 - t0);
        t0 = t1;

        iterationCount++;
        self._update(dt);
        onUpdate(self.graph);

        if (self._isStable() || iterationCount >= self.maxIterationCount) {
            if (onGraphStable !== undefined) {
                onGraphStable(self.graph);
            }
        } else {
            requestAnimationFrame(step);
        }
    });
}

Layout.prototype._getSpring = function(edge) {

    function Spring(length, stiffness) {
        this.length = length;
        this.stiffness = stiffness
    }

    if (!_.contains(this.springList, edge)) {
        var nodes = this.graph.getEdgeNodes(edge);
        var springLength = nodes[0].getDiagonalLength() + nodes[1].getDiagonalLength() + this.springMarginLength;

        this.springList[edge] = new Spring(springLength, this.springStiffness);
    }

    return this.springList[edge];
}

Layout.prototype._update = function(timestep) {
    this._applyCoulombsLaw();
    this._applyHookesLaw();
    this._updateNodes(timestep);
}

Layout.prototype._applyCoulombsLaw = function() {

    var self = this;
    if (self.repulsionForce == 0.0)
        return;

    self.graph.forEachNode(function(n1) {
        self.graph.forEachNode(function(n2) {

            if (n1 !== n2) {
                var d = n2.vectorTo(n1);
                var distance = d.magnitude() + 0.1; // avoid massive forces at small distances (and divide by zero)
                var direction = d.normalise();

                // apply force to each end points
                n1.applyForce(direction.multiply(self.repulsionForce).divide(distance * distance * 0.5));
                n2.applyForce(direction.multiply(self.repulsionForce).divide(distance * distance * -0.5));

            }
        });
    });
};

Layout.prototype._applyHookesLaw = function() {
    var self = this;
    self.graph.forEachEdge(function(edge) {

        var spring = self._getSpring(edge);
        var nodes = self.graph.getEdgeNodes(edge);

        var d = nodes[0].vectorTo(nodes[1]);
        var displacement = spring.length - d.magnitude();
        var direction = d.normalise();

        // apply force to each end point
        nodes[0].applyForce(direction.multiply(spring.stiffness * displacement * -0.5));
        nodes[1].applyForce(direction.multiply(spring.stiffness * displacement * 0.5));
    });
};

Layout.prototype._updateNodes = function(timestep) {
    var self = this;
    self.graph.forEachNode(function(node) {
        node.velocity = node.velocity.add(node.acceleration.multiply(timestep));
        node.velocity = node.velocity.multiply(self.velocityDamping);
        node.acceleration = new Vector(0, 0);
        node.pos = node.pos.add(node.velocity.multiply(timestep));

    });
};

Layout.prototype._isStable = function() {
    return this.graph.totalEnergy() < this.minEnergyThreshold;
}
;window.graphLayout = {
    newGraph: function() {
        return new Graph();
    },
    newLayout: function(graph) {
        return new Layout(graph);
    },
    newDivAdaptor: function( nodeSelector, rootElement ) {
        return new DivAdaptor(nodeSelector, rootElement);
    }
}
}).call(this);